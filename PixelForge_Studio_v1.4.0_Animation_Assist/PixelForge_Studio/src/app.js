(() => {
const $ = id => document.getElementById(id);
const art = $('artCanvas'), overlay = $('overlayCanvas'), ctx = art.getContext('2d'), octx = overlay.getContext('2d');
let W=64,H=64,zoom=8,grid=true,onion=false,onionRange=1,onionOpacity=.24,tool='pencil',color='#e6a45b',playing=false,playTimer=null;
let brushSize=1,brushShape='square',mirrorX=false,mirrorY=false;
let layerDefs=[{id:'layer-1',name:'Layer 1',visible:true,opacity:1,locked:false}], nextLayerId=2;
let clips=[{id:'clip-1',name:'Idle',fps:8,loop:true,frames:[makeFrame()]}],activeClipId='clip-1',frames=clips[0].frames,frameIndex=0, layerIndex=0, swatches=['#101319','#252b38','#4c5366','#9b83ff','#e6a45b','#e9d8bd','#f3f0e8','#a94f56','#547c68','#ffffff'];
let undoStack=[], redoStack=[];
let selection=null, selectionStart=null, clipboard=null;
let selectedFrames=new Set([0]), referenceDataUrl=null, autoSaveTimer=null, thumbCache=new WeakMap();
function makeCel(){return {pixels:new Uint8ClampedArray(W*H*4)}}
function makeFrame(){return {layers:layerDefs.map(()=>makeCel()),duration:1000/8,pivot:{x:Math.floor(W/2),y:Math.floor(H*.875)},event:''}}
function current(){return frames[frameIndex]}
function activeClip(){return clips.find(c=>c.id===activeClipId)||clips[0]}
function syncClip(){activeClip().frames=frames}
function active(){return current().layers[layerIndex]}
function idx(x,y){return (y*W+x)*4}
function hexRgb(hex){return [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)]}
function rgbHex(r,g,b){return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('')}
function snapshot(){
  undoStack.push(JSON.stringify(serialize()));
  if(undoStack.length>80)undoStack.shift();
  redoStack=[];
  updateHistoryButtons();
}
function restoreSnapshot(raw){
  const d=JSON.parse(raw);
  loadProject(d);
  updateHistoryButtons();
}
function undo(){
  if(!undoStack.length)return;
  redoStack.push(JSON.stringify(serialize()));
  const previous=undoStack.pop();
  restoreSnapshot(previous);
  $('saveStatus').textContent='Отменить';
}
function redo(){
  if(!redoStack.length)return;
  undoStack.push(JSON.stringify(serialize()));
  const next=redoStack.pop();
  restoreSnapshot(next);
  $('saveStatus').textContent='Повторить';
}
function updateHistoryButtons(){
  const u=$('undoBtn'),r=$('redoBtn');
  if(u)u.disabled=!undoStack.length;
  if(r)r.disabled=!redoStack.length;
}
function serialize(){syncClip();const pack=fs=>fs.map(f=>({duration:f.duration,pivot:f.pivot||{x:Math.floor(W/2),y:Math.floor(H*.875)},event:f.event||'',layers:f.layers.map(c=>({pixels:Array.from(c.pixels)}))}));return {version:5,width:W,height:H,layers:layerDefs.map(l=>({...l})),clips:clips.map(c=>({id:c.id,name:c.name,fps:c.fps,loop:c.loop,frames:pack(c.frames)})),activeClipId,frames:pack(frames),frameIndex,layerIndex,fps:+$('fpsInput').value}}
function loadProject(d){
  W=Math.max(1,Math.min(512,Number(d.width)||64));H=Math.max(1,Math.min(512,Number(d.height)||64));
  const oldFrames=Array.isArray(d.frames)&&d.frames.length?d.frames:[{duration:125,layers:[]}];
  if(Array.isArray(d.layers)&&d.layers.length){layerDefs=d.layers.map((l,i)=>({id:l.id||`layer-${i+1}`,name:l.name||`Layer ${i+1}`,visible:l.visible!==false,opacity:Number.isFinite(+l.opacity)?Math.max(0,Math.min(1,+l.opacity)):1,locked:!!l.locked}));}
  else {const first=oldFrames[0]?.layers||[];layerDefs=first.length?first.map((l,i)=>({id:`layer-${i+1}`,name:l.name||`Layer ${i+1}`,visible:l.visible!==false,opacity:Number.isFinite(+l.opacity)?Math.max(0,Math.min(1,+l.opacity)):1,locked:!!l.locked})): [{id:'layer-1',name:'Layer 1',visible:true,opacity:1,locked:false}];}
  nextLayerId=Math.max(1,...layerDefs.map(l=>Number(String(l.id).replace(/\D/g,''))||0))+1;
  const decode=srcFrames=>srcFrames.map(f=>({duration:Number(f.duration)||125,pivot:f.pivot||{x:Math.floor(W/2),y:Math.floor(H*.875)},event:f.event||'',layers:layerDefs.map((def,i)=>{const src=f.layers?.[i];const raw=src?.pixels||[];const pixels=new Uint8ClampedArray(W*H*4);pixels.set(raw.slice(0,pixels.length));return {pixels}})}));
  clips=Array.isArray(d.clips)&&d.clips.length?d.clips.map((c,i)=>({id:c.id||`clip-${i+1}`,name:c.name||`Clip ${i+1}`,fps:Math.max(1,Math.min(60,Number(c.fps)||8)),loop:c.loop!==false,frames:decode(c.frames?.length?c.frames:oldFrames)})):[{id:'clip-1',name:'Idle',fps:Math.max(1,Math.min(60,Number(d.fps)||8)),loop:true,frames:decode(oldFrames)}];
  activeClipId=clips.some(c=>c.id===d.activeClipId)?d.activeClipId:clips[0].id;frames=activeClip().frames;
  frameIndex=Math.min(Math.max(0,Number(d.frameIndex)||0),frames.length-1);layerIndex=Math.min(Math.max(0,Number(d.layerIndex)||0),Math.max(0,layerDefs.length-1));
  $('fpsInput').value=activeClip().fps;$('clipLoop').checked=activeClip().loop;$('frameDuration').value=Math.round(current().duration);$('docWidth').value=W;$('docHeight').value=H;$('docSize').textContent=`${W} × ${H}`;resizeCanvases();renderAll();
}
function resizeCanvases(){art.width=overlay.width=W;art.height=overlay.height=H;art.style.width=overlay.style.width=(W*zoom)+'px';art.style.height=overlay.style.height=(H*zoom)+'px';}
function composite(frame=current()){let out=new Uint8ClampedArray(W*H*4);for(let li=0;li<frame.layers.length;li++){const def=layerDefs[li],l=frame.layers[li];if(!def||!def.visible)continue;let p=l.pixels;for(let i=0;i<p.length;i+=4){let a=p[i+3]/255*def.opacity;if(!a)continue;let da=out[i+3]/255,oa=a+da*(1-a);if(!oa)continue;for(let c=0;c<3;c++)out[i+c]=(p[i+c]*a+out[i+c]*da*(1-a))/oa;out[i+3]=oa*255}}return out}
function drawPixels(c, pixels){let image=c.createImageData(W,H);image.data.set(pixels);c.putImageData(image,0,0)}
function render(){thumbCache.delete(current());ctx.clearRect(0,0,W,H);drawPixels(ctx,composite());drawOverlay();renderFrames();renderLayers();$('frameDuration').value=Math.round(current().duration);syncFrameMetadata();scheduleAutoSave()}
function drawOverlay(){octx.clearRect(0,0,W,H);if(onion&&frames.length>1){const im=octx.createImageData(W,H);const add=(frame,r,g,b,a)=>{const raw=composite(frame);for(let i=0;i<raw.length;i+=4){const sa=raw[i+3]/255*a;if(!sa)continue;const da=im.data[i+3]/255,oa=sa+da*(1-sa);im.data[i]=r;im.data[i+1]=g;im.data[i+2]=b;im.data[i+3]=oa*255}};for(let d=onionRange;d>=1;d--){const fade=onionOpacity/Math.pow(d,1.35);if(frameIndex-d>=0)add(frames[frameIndex-d],255,75,105,fade);if(frameIndex+d<frames.length)add(frames[frameIndex+d],70,190,255,fade)}octx.putImageData(im,0,0)}if(grid&&zoom>=5){octx.strokeStyle='rgba(90,100,120,.25)';octx.lineWidth=1/zoom;octx.beginPath();for(let x=0;x<=W;x++){octx.moveTo(x,0);octx.lineTo(x,H)}for(let y=0;y<=H;y++){octx.moveTo(0,y);octx.lineTo(W,y)}octx.stroke()}if(current()?.pivot){octx.save();octx.strokeStyle='rgba(255,210,90,.95)';octx.lineWidth=1/zoom;octx.beginPath();octx.moveTo(current().pivot.x-3/zoom,current().pivot.y);octx.lineTo(current().pivot.x+3/zoom,current().pivot.y);octx.moveTo(current().pivot.x,current().pivot.y-3/zoom);octx.lineTo(current().pivot.x,current().pivot.y+3/zoom);octx.stroke();octx.restore()}if(selection){octx.save();octx.strokeStyle='#fff';octx.lineWidth=1/zoom;octx.setLineDash([2/zoom,2/zoom]);octx.strokeRect(selection.x+.5/zoom,selection.y+.5/zoom,selection.w,selection.h);octx.strokeStyle='#222';octx.lineDashOffset=2/zoom;octx.strokeRect(selection.x+.5/zoom,selection.y+.5/zoom,selection.w,selection.h);octx.restore();$('selectionInfo').textContent=`${selection.w} × ${selection.h}`}else if($('selectionInfo'))$('selectionInfo').textContent='No selection'}
function renderAll(){resizeCanvases();render();$('frameCount').textContent=activeClip().name+' · '+frames.length+' frames';renderClips()}
function renderLayers(){let list=$('layersList');list.innerHTML='';layerDefs.forEach((def,i)=>{let el=document.createElement('div');el.className='layer'+(i===layerIndex?' selected':'');el.innerHTML=`<span class="eye" title="Toggle visibility">${def.visible?'◉':'○'}</span><input value="${escapeHtml(def.name)}" aria-label="Shared layer name"><span class="layer-lock" title="${def.locked?'Unlock layer':'Lock layer'}">${def.locked?'▣':'◇'}</span>`;el.onclick=()=>{layerIndex=i;renderLayers()};el.querySelector('.eye').onclick=e=>{e.stopPropagation();snapshot();def.visible=!def.visible;thumbCache=new WeakMap();render()};el.querySelector('input').onchange=e=>{snapshot();def.name=e.target.value;renderLayers()};el.querySelector('.layer-lock').onclick=e=>{e.stopPropagation();snapshot();def.locked=!def.locked;renderLayers()};list.appendChild(el)});const def=layerDefs[layerIndex];$('layerOpacity').value=Math.round((def?.opacity??1)*100);$('layerOpacityValue').textContent=Math.round((def?.opacity??1)*100)+'%';$('layerScopeHint').textContent='Shared structure · frame-specific pixels'}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function renderFrames(){
  const labels=$('trackLabels');if(labels){labels.innerHTML='<div class="track-heading">LAYERS</div>';layerDefs.forEach(l=>{const row=document.createElement('div');row.className='track-label';row.textContent=l.name;row.title=l.name;labels.append(row)})}
  const list=$('frames');if(!list)return;const cardWidth=105,virtual=frames.length>80;let scroll=list.scrollLeft||0;let start=virtual?Math.max(0,Math.floor(scroll/cardWidth)-5):0;
  if(virtual&&(frameIndex<start||frameIndex>=start+60)){scroll=Math.max(0,frameIndex*cardWidth-5*cardWidth);list.scrollLeft=scroll;start=Math.max(0,Math.floor(scroll/cardWidth)-5)}
  const end=virtual?Math.min(frames.length,start+60):frames.length;list.innerHTML='';
  if(start){const spacer=document.createElement('div');spacer.className='timeline-spacer';spacer.style.width=(start*cardWidth)+'px';list.append(spacer)}
  for(let i=start;i<end;i++){const f=frames[i],el=document.createElement('div');el.className='frame'+(i===frameIndex?' selected':'')+(selectedFrames.has(i)?' multi-selected':'');el.draggable=true;el.dataset.index=i;const c=document.createElement('canvas');c.width=W;c.height=H;const cc=c.getContext('2d');let cached=thumbCache.get(f);if(!cached){cached=composite(f);thumbCache.set(f,cached)}const im=cc.createImageData(W,H);im.data.set(cached);cc.putImageData(im,0,0);el.append(c);const label=document.createElement('span');label.textContent='Frame '+(i+1)+' · '+Math.round(f.duration)+'ms'+(f.event?' · '+f.event:'');el.append(label);const tracks=document.createElement('div');tracks.className='frame-tracks';layerDefs.forEach((l,li)=>{const t=document.createElement('div');t.className='frame-track'+(f.layers[li]?.pixels.some(v=>v!==0)?' has-pixels':'');t.title=l.name;t.textContent=l.name;tracks.append(t)});el.append(tracks);
    el.onclick=e=>{if(e.ctrlKey||e.metaKey){selectedFrames.has(i)?selectedFrames.delete(i):selectedFrames.add(i)}else if(e.shiftKey){const a=Math.min(frameIndex,i),b=Math.max(frameIndex,i);selectedFrames=new Set(Array.from({length:b-a+1},(_,k)=>a+k))}else selectedFrames=new Set([i]);frameIndex=i;layerIndex=0;render()};
    el.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',String(i));e.dataTransfer.effectAllowed='move'});el.addEventListener('dragover',e=>{e.preventDefault();el.classList.add('drop-target')});el.addEventListener('dragleave',()=>el.classList.remove('drop-target'));el.addEventListener('drop',e=>{e.preventDefault();el.classList.remove('drop-target');const from=Number(e.dataTransfer.getData('text/plain')),to=i;if(!Number.isInteger(from)||from===to||from<0||from>=frames.length)return;snapshot();const moved=frames.splice(from,1)[0];frames.splice(to,0,moved);frameIndex=to;selectedFrames=new Set([to]);renderAll()});list.append(el)
  }
  if(end<frames.length){const spacer=document.createElement('div');spacer.className='timeline-spacer';spacer.style.width=((frames.length-end)*cardWidth)+'px';list.append(spacer)}
  if(!list._virtualScrollBound){list.addEventListener('scroll',()=>{if(frames.length>80){const next=Math.max(0,Math.floor(list.scrollLeft/cardWidth)-5);if(next!==list._windowStart)renderFrames()}});list._virtualScrollBound=true}
  list._windowStart=start;list.scrollLeft=scroll;
}
function renderClips(){const sel=$('clipSelect');if(!sel)return;sel.innerHTML='';clips.forEach(c=>{let o=document.createElement('option');o.value=c.id;o.textContent=c.name;sel.append(o)});sel.value=activeClipId;$('fpsInput').value=activeClip().fps;$('clipLoop').checked=activeClip().loop;$('clipDelete').disabled=clips.length<=1;syncFrameMetadata()}
function switchClip(id){if(playing){playing=false;clearTimeout(playTimer);$('playBtn').textContent='▶ Play'}syncClip();activeClipId=id;frames=activeClip().frames;frameIndex=0;layerIndex=0;selectedFrames=new Set([0]);renderAll()}
function syncFrameMetadata(){if(!$('pivotX'))return;const p=current().pivot||{x:Math.floor(W/2),y:Math.floor(H*.875)};$('pivotX').value=p.x;$('pivotY').value=p.y;$('frameEvent').value=current().event||'';$('selectionCount').textContent=selectedFrames.size+' frame(s) selected'}
function scheduleAutoSave(){try{if(autoSaveTimer)clearTimeout(autoSaveTimer);autoSaveTimer=setTimeout(()=>{try{localStorage.setItem('pixelforge-autosave',JSON.stringify(serialize()));$('saveStatus').textContent='Auto-saved'}catch(e){$('saveStatus').textContent='Auto-save unavailable'}} ,900)}catch(e){}}
function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000)}
function downloadJson(data,name){downloadBlob(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),name)}
function addCharacterPart(){const part=prompt('Название части персонажа (например, Голова, Тело, Левая рука, Оружие):','Голова');if(!part||!part.trim())return;snapshot();const def={id:`layer-${nextLayerId++}`,name:'Часть: '+part.trim(),visible:true,opacity:1,locked:false};layerDefs.push(def);thumbCache=new WeakMap();clips.forEach(c=>c.frames.forEach(f=>f.layers.push(makeCel())));syncClip();layerIndex=layerDefs.length-1;renderAll()}
function replaceColorEverywhere(from,to){const a=hexRgb(from),b=hexRgb(to);let changed=0;snapshot();clips.forEach(c=>c.frames.forEach(f=>f.layers.forEach(l=>{const p=l.pixels;for(let i=0;i<p.length;i+=4)if(p[i+3]&&p[i]===a[0]&&p[i+1]===a[1]&&p[i+2]===a[2]){p[i]=b[0];p[i+1]=b[1];p[i+2]=b[2];changed++}})));thumbCache=new WeakMap();renderAll();$('saveStatus').textContent=`Replaced ${changed} pixels`}
function analyzeClip(){const issues=[],opaque=[];frames.forEach((f,i)=>{let minX=W,minY=H,maxX=-1,maxY=-1;f.layers.forEach(l=>{for(let p=3;p<l.pixels.length;p+=4)if(l.pixels[p]){const n=(p-3)/4,x=n%W,y=Math.floor(n/W);minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}});if(maxX<0){issues.push(`Кадр ${i+1}: полностью пустой`);return}if(minX===0||minY===0||maxX===W-1||maxY===H-1)issues.push(`Кадр ${i+1}: спрайт касается края холста`);const p=f.pivot||{};if(p.x<0||p.y<0||p.x>=W||p.y>=H)issues.push(`Кадр ${i+1}: pivot за пределами холста`);opaque.push({x:(minX+maxX)/2,y:(minY+maxY)/2})});for(let i=1;i<opaque.length;i++){const d=Math.hypot(opaque[i].x-opaque[i-1].x,opaque[i].y-opaque[i-1].y);if(d>Math.max(W,H)*.22)issues.push(`Кадр ${i+1}: резкий скачок центра спрайта (${d.toFixed(1)} px)`)}if(activeClip().loop&&opaque.length>1){const d=Math.hypot(opaque[0].x-opaque.at(-1).x,opaque[0].y-opaque.at(-1).y);if(d>Math.max(W,H)*.22)issues.push('Возможен рывок на стыке зацикливания')}const box=$('analysisResults');box.innerHTML=issues.length?issues.map(x=>`<div class="analysis-warning">⚠ ${escapeHtml(x)}</div>`).join(''):'<div class="analysis-ok">✓ Очевидных проблем не найдено</div>';box.innerHTML+='<small>Эвристическая проверка геометрии; не заменяет визуальную оценку.</small>'}
function exportGameData(){const preset=$('enginePreset')?.value||'generic';downloadJson({format:'PixelForgeGameAnimation',version:1,engine:preset,width:W,height:H,layers:layerDefs.map((l,i)=>({index:i,name:l.name,visible:l.visible,opacity:l.opacity})),clips:clips.map(c=>({name:c.name,fps:c.fps,loop:c.loop,frames:c.frames.map((f,i)=>({index:i,duration:f.duration,pivot:f.pivot,event:f.event,layers:f.layers.map((cel,li)=>({layer:layerDefs[li].name,pixels:Array.from(cel.pixels)}))}))}))},'pixelforge-animation-data.json')}
async function exportAllClips(){const payload=clips.map(c=>({name:c.name,fps:c.fps,loop:c.loop,frames:c.frames.map(f=>({duration:f.duration,pivot:f.pivot,event:f.event,pixels:Array.from(composite(f)),layers:f.layers.map((cel,li)=>({name:layerDefs[li].name,pixels:Array.from(cel.pixels)}))}))}));downloadJson({format:'PixelForgeClipBundle',width:W,height:H,clips:payload},'pixelforge-all-clips.json');if(typeof GIF!=='undefined'){for(const clip of clips){await new Promise(resolve=>{const scale=Math.max(1,Math.min(8,+$('gifScale').value||2));const gif=new GIF({workers:2,quality:Math.max(1,+$('gifQuality').value||20),width:W*scale,height:H*scale,repeat:clip.loop?0:-1,workerScript:new URL('../node_modules/gif.js/dist/gif.worker.js',window.location.href).href});clip.frames.forEach(f=>{const temp=document.createElement('canvas');temp.width=W;temp.height=H;const t=temp.getContext('2d'),im=t.createImageData(W,H);im.data.set(composite(f));t.putImageData(im,0,0);const out=document.createElement('canvas');out.width=W*scale;out.height=H*scale;const o=out.getContext('2d');o.imageSmoothingEnabled=false;o.drawImage(temp,0,0,W*scale,H*scale);gif.addFrame(out,{copy:true,delay:Math.max(20,Math.round(f.duration||1000/8))})});gif.on('finished',blob=>{downloadBlob(blob,`pixelforge-${clip.name.replace(/[^a-z0-9_-]/gi,'_')}.gif`);resolve()});gif.on('abort',resolve);gif.render()})}}$('saveStatus').textContent='All clips exported'}
function setTool(t){tool=t;document.querySelectorAll('.tool').forEach(b=>b.classList.toggle('active',b.dataset.tool===t));$('toolInfo').textContent=t[0].toUpperCase()+t.slice(1)+' tool'}
document.querySelectorAll('.tool').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));
function point(e){let r=art.getBoundingClientRect();return {x:Math.floor((e.clientX-r.left)/zoom),y:Math.floor((e.clientY-r.top)/zoom)}}
function put(x,y,col=color){if(x<0||y<0||x>=W||y>=H||layerDefs[layerIndex]?.locked)return;let p=active().pixels,i=idx(x,y);if(col==='erase'){p[i]=p[i+1]=p[i+2]=p[i+3]=0}else{let [r,g,b]=hexRgb(col);p[i]=r;p[i+1]=g;p[i+2]=b;p[i+3]=255}}
function stampBrush(cx,cy,col=color){
  const size=tool==='eraser'?brushSize:brushSize,lo=-Math.floor((size-1)/2),hi=lo+size-1;
  const centers=[[cx,cy]];if(mirrorX)centers.push([W-1-cx,cy]);if(mirrorY)centers.push([cx,H-1-cy]);if(mirrorX&&mirrorY)centers.push([W-1-cx,H-1-cy]);
  const seen=new Set();for(const [mx,my] of centers)for(let oy=lo;oy<=hi;oy++)for(let ox=lo;ox<=hi;ox++){
    if(brushShape==='circle'&&((ox+(size-1)/2)**2+(oy+(size-1)/2)**2)>((size/2)**2))continue;
    const x=mx+ox,y=my+oy,key=y*W+x;if(seen.has(key))continue;seen.add(key);put(x,y,col);
  }
}
function paintStroke(x0,y0,x1,y1,col=color){line(x0,y0,x1,y1,(x,y)=>stampBrush(x,y,col))}
function previewStamp(cx,cy){const size=brushSize,lo=-Math.floor((size-1)/2),hi=lo+size-1,centers=[[cx,cy]];if(mirrorX)centers.push([W-1-cx,cy]);if(mirrorY)centers.push([cx,H-1-cy]);if(mirrorX&&mirrorY)centers.push([W-1-cx,H-1-cy]);const seen=new Set();ctx.fillStyle=color;for(const [mx,my] of centers)for(let oy=lo;oy<=hi;oy++)for(let ox=lo;ox<=hi;ox++){if(brushShape==='circle'&&((ox+(size-1)/2)**2+(oy+(size-1)/2)**2)>((size/2)**2))continue;const x=mx+ox,y=my+oy,key=y*W+x;if(x<0||y<0||x>=W||y>=H||seen.has(key))continue;seen.add(key);ctx.fillRect(x,y,1,1)}}
function sampleColor(x,y){const d=composite(),i=idx(x,y);if(d[i+3]){color=rgbHex(d[i],d[i+1],d[i+2]);$('colorPicker').value=color;$('hexValue').textContent=color.toUpperCase()}}
function line(x0,y0,x1,y1,cb){let dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1,err=dx+dy;while(true){cb(x0,y0);if(x0===x1&&y0===y1)break;let e2=2*err;if(e2>=dy){err+=dy;x0+=sx}if(e2<=dx){err+=dx;y0+=sy}}}
function flood(x,y){if(x<0||y<0||x>=W||y>=H||layerDefs[layerIndex]?.locked)return;let p=active().pixels,start=idx(x,y),target=[...p.slice(start,start+4)],fill=[...hexRgb(color),255];if(target.every((v,i)=>v===fill[i]))return;let stack=[[x,y]],seen=new Uint8Array(W*H);while(stack.length){let [a,b]=stack.pop(),n=b*W+a;if(a<0||b<0||a>=W||b>=H||seen[n])continue;let k=n*4;if(p[k]!==target[0]||p[k+1]!==target[1]||p[k+2]!==target[2]||p[k+3]!==target[3])continue;seen[n]=1;p.set(fill,k);stack.push([a+1,b],[a-1,b],[a,b+1],[a,b-1])}}
let drawing=false,start=null,last=null,preview=null;
let spaceHeld=false, panState=null, spacePanUsed=false;
function shape(x0,y0,x1,y1,mode,cb){if(mode==='line')return line(x0,y0,x1,y1,cb);if(mode==='rect'){for(let x=Math.min(x0,x1);x<=Math.max(x0,x1);x++){cb(x,y0);cb(x,y1)}for(let y=Math.min(y0,y1);y<=Math.max(y0,y1);y++){cb(x0,y);cb(x1,y)}return}let rx=Math.abs(x1-x0)/2,ry=Math.abs(y1-y0)/2,cx=(x0+x1)/2,cy=(y0+y1)/2;for(let a=0;a<360;a+=1){let rad=a*Math.PI/180;cb(Math.round(cx+rx*Math.cos(rad)),Math.round(cy+ry*Math.sin(rad)))}}
function beginPan(e){
  const stage=$('stage');
  panState={pointerId:e.pointerId,x:e.clientX,y:e.clientY,left:stage.scrollLeft,top:stage.scrollTop};if(spaceHeld)spacePanUsed=true;
  stage.classList.add('panning');
  try{stage.setPointerCapture(e.pointerId)}catch(_){}
  e.preventDefault();
}
function updatePan(e){if(!panState||e.pointerId!==panState.pointerId)return;const stage=$('stage');stage.scrollLeft=panState.left-(e.clientX-panState.x);stage.scrollTop=panState.top-(e.clientY-panState.y)}
function endPan(e){if(!panState||e.pointerId!==panState.pointerId)return;panState=null;$('stage').classList.remove('panning')}
$('stage').addEventListener('pointermove',updatePan);
$('stage').addEventListener('pointerup',endPan);
$('stage').addEventListener('pointercancel',endPan);
$('stage').addEventListener('contextmenu',e=>{if(panState||e.button===1)e.preventDefault()});
art.addEventListener('pointerdown',e=>{if(e.button===1||spaceHeld){beginPan(e);return}let p=point(e);if(p.x<0||p.y<0||p.x>=W||p.y>=H)return;art.setPointerCapture(e.pointerId);if(e.altKey||art.dataset.altPicker==='1'||tool==='eyedropper'){sampleColor(p.x,p.y);return}if(tool==='bucket'){snapshot();flood(p.x,p.y);render();return}if(tool==='select'){selectionStart=p;selection={x:p.x,y:p.y,w:1,h:1};drawing=true;render();return}if(tool==='move'&&selection){if(layerDefs[layerIndex]?.locked)return;snapshot();drawing=true;start=last=p;return}if(layerDefs[layerIndex]?.locked)return;snapshot();drawing=true;start=last=p;if(tool==='pencil'||tool==='eraser'){stampBrush(p.x,p.y,tool==='eraser'?'erase':color);render()}});
art.addEventListener('pointermove',e=>{let p=point(e);$('cursorInfo').textContent=`X: ${p.x}  Y: ${p.y}`;if(!drawing)return;if(tool==='select'){selection={x:Math.min(selectionStart.x,p.x),y:Math.min(selectionStart.y,p.y),w:Math.abs(selectionStart.x-p.x)+1,h:Math.abs(selectionStart.y-p.y)+1};drawOverlay();return}if(tool==='move'&&selection){if(layerDefs[layerIndex]?.locked)return;let dx=p.x-last.x,dy=p.y-last.y;if(dx||dy){let l=active(),tmp=new Uint8ClampedArray(selection.w*selection.h*4);for(let yy=0;yy<selection.h;yy++)for(let xx=0;xx<selection.w;xx++){let sx=selection.x+xx,sy=selection.y+yy;if(sx>=0&&sy>=0&&sx<W&&sy<H){let si=idx(sx,sy);tmp.set(l.pixels.slice(si,si+4),(yy*selection.w+xx)*4);l.pixels.fill(0,si,si+4)}}selection.x+=dx;selection.y+=dy;for(let yy=0;yy<selection.h;yy++)for(let xx=0;xx<selection.w;xx++){let tx=selection.x+xx,ty=selection.y+yy;if(tx>=0&&ty>=0&&tx<W&&ty<H)l.pixels.set(tmp.slice((yy*selection.w+xx)*4,(yy*selection.w+xx)*4+4),idx(tx,ty))}last=p;render()}return}if(tool==='pencil'||tool==='eraser'){paintStroke(last.x,last.y,p.x,p.y,tool==='eraser'?'erase':color);last=p;render()}else{render();shape(start.x,start.y,p.x,p.y,tool,previewStamp)}});
art.addEventListener('pointerup',e=>{if(!drawing)return;let p=point(e);if(tool==='select')selection={x:Math.min(selectionStart.x,p.x),y:Math.min(selectionStart.y,p.y),w:Math.abs(selectionStart.x-p.x)+1,h:Math.abs(selectionStart.y-p.y)+1};else if(['line','rect','ellipse'].includes(tool))shape(start.x,start.y,p.x,p.y,tool,(x,y)=>stampBrush(x,y,color));drawing=false;render()});
$('brushSize').oninput=e=>{brushSize=Number(e.target.value);$('brushSizeValue').textContent=brushSize;$('brushSizeLabel').textContent=brushSize+' px'};
document.querySelectorAll('[data-brush-shape]').forEach(b=>b.onclick=()=>{brushShape=b.dataset.brushShape;document.querySelectorAll('[data-brush-shape]').forEach(x=>x.classList.toggle('active',x===b))});
$('mirrorX').onchange=e=>mirrorX=e.target.checked;$('mirrorY').onchange=e=>mirrorY=e.target.checked;
$('colorPicker').oninput=e=>{color=e.target.value;$('hexValue').textContent=color.toUpperCase()};
function refreshSwatches(){let el=$('swatches');el.innerHTML='';swatches.forEach(c=>{let s=document.createElement('div');s.className='swatch';s.style.background=c;s.title=c;s.onclick=()=>{$('colorPicker').value=color=c;$('hexValue').textContent=c.toUpperCase()};el.append(s)})}refreshSwatches();
$('addSwatch').onclick=()=>{if(!swatches.includes(color)){swatches.push(color);refreshSwatches()}};
$('swapColor').onclick=()=>{color='#ffffff';$('colorPicker').value=color;$('hexValue').textContent=color.toUpperCase()};
$('addLayer').onclick=()=>{snapshot();const def={id:`layer-${nextLayerId++}`,name:'Layer '+(layerDefs.length+1),visible:true,opacity:1,locked:false};layerDefs.push(def);thumbCache=new WeakMap();clips.forEach(c=>c.frames.forEach(f=>f.layers.push(makeCel())));syncClip();layerIndex=layerDefs.length-1;render()};
$('deleteLayer').onclick=()=>{if(layerDefs.length>1){snapshot();layerDefs.splice(layerIndex,1);thumbCache=new WeakMap();clips.forEach(c=>c.frames.forEach(f=>f.layers.splice(layerIndex,1)));syncClip();layerIndex=Math.max(0,layerIndex-1);render()}};
$('moveLayerUp').onclick=()=>moveLayer(1);$('moveLayerDown').onclick=()=>moveLayer(-1);
function moveLayer(delta){const to=layerIndex+delta;if(to<0||to>=layerDefs.length)return;snapshot();[layerDefs[layerIndex],layerDefs[to]]=[layerDefs[to],layerDefs[layerIndex]];thumbCache=new WeakMap();clips.forEach(c=>c.frames.forEach(f=>{[f.layers[layerIndex],f.layers[to]]=[f.layers[to],f.layers[layerIndex]]}));syncClip();layerIndex=to;render()}
let opacityEditStarted=false;
$('layerOpacity').onpointerdown=()=>{if(!opacityEditStarted){snapshot();opacityEditStarted=true}};
$('layerOpacity').onkeydown=()=>{if(!opacityEditStarted){snapshot();opacityEditStarted=true}};
$('layerOpacity').oninput=()=>{const def=layerDefs[layerIndex];if(!def)return;def.opacity=Number($('layerOpacity').value)/100;thumbCache=new WeakMap();$('layerOpacityValue').textContent=$('layerOpacity').value+'%';render()};
$('layerOpacity').onchange=()=>{opacityEditStarted=false};
$('addFrame').onclick=()=>{snapshot();let f=makeFrame();f.duration=current().duration;frames.splice(frameIndex+1,0,f);frameIndex++;selectedFrames=new Set([frameIndex]);layerIndex=0;syncClip();renderAll()};
$('duplicateFrame').onclick=()=>{snapshot();let f={duration:current().duration,pivot:{...(current().pivot||{x:Math.floor(W/2),y:Math.floor(H*.875)})},event:current().event||'',layers:current().layers.map(l=>({pixels:new Uint8ClampedArray(l.pixels)}))};frames.splice(frameIndex+1,0,f);frameIndex++;selectedFrames=new Set([frameIndex]);layerIndex=0;syncClip();renderAll()};
function copyCelFromNeighbor(direction){const sourceIndex=frameIndex+direction;if(sourceIndex<0||sourceIndex>=frames.length||layerDefs[layerIndex]?.locked)return;snapshot();current().layers[layerIndex].pixels=new Uint8ClampedArray(frames[sourceIndex].layers[layerIndex].pixels);thumbCache=new WeakMap();syncClip();renderAll();$('saveStatus').textContent='Слой скопирован из кадра '+(sourceIndex+1)}
$('copyLayerPrev').onclick=()=>copyCelFromNeighbor(-1);
$('copyLayerNext').onclick=()=>copyCelFromNeighbor(1);
function createInbetweens(count){if(frameIndex>=frames.length-1)return alert('После текущего кадра нет следующего кадра для интерполяции.');count=Math.max(1,Math.min(8,Math.floor(count)||1));const a=current(),b=frames[frameIndex+1],made=[];snapshot();for(let step=1;step<=count;step++){const t=step/(count+1),f=makeFrame();f.duration=Math.round(a.duration*(1-t)+b.duration*t);f.pivot={x:Math.round(a.pivot.x+(b.pivot.x-a.pivot.x)*t),y:Math.round(a.pivot.y+(b.pivot.y-a.pivot.y)*t)};f.event='';f.layers=layerDefs.map((_,li)=>{const ap=a.layers[li].pixels,bp=b.layers[li].pixels,out=new Uint8ClampedArray(ap.length);for(let k=0;k<out.length;k+=4){const aa=ap[k+3]/255,ba=bp[k+3]/255,alpha=aa*(1-t)+ba*t;if(alpha<=0)continue;for(let c=0;c<3;c++)out[k+c]=Math.round((ap[k+c]*aa*(1-t)+bp[k+c]*ba*t)/alpha);out[k+3]=Math.round(alpha*255)}return {pixels:out}});made.push(f)}frames.splice(frameIndex+1,0,...made);frameIndex++;selectedFrames=new Set([frameIndex]);thumbCache=new WeakMap();syncClip();renderAll();$('saveStatus').textContent='Добавлено промежуточных кадров: '+count}
$('inbetweenBtn').onclick=()=>{const n=prompt('Сколько промежуточных кадров создать? (1–8)','2');if(n===null)return;const count=Number(n);if(!Number.isFinite(count)||count<1||count>8)return alert('Укажи число от 1 до 8.');createInbetweens(count)};

$('deleteFrame').onclick=()=>{if(frames.length>1){snapshot();frames.splice(frameIndex,1);frameIndex=Math.max(0,frameIndex-1);selectedFrames=new Set([frameIndex]);layerIndex=0;syncClip();renderAll()}};
$('fpsInput').onchange=()=>{snapshot();activeClip().fps=Math.max(1,Math.min(60,+$('fpsInput').value||8));$('fpsInput').value=activeClip().fps;scheduleAutoSave()};
$('clipSelect').onchange=e=>switchClip(e.target.value);
$('clipAdd').onclick=()=>{const name=prompt('Название нового клипа (например, Шаг, Бег, Прыжок):','Шаг');if(!name||!name.trim())return;if(clips.some(c=>c.name.toLowerCase()===name.trim().toLowerCase()))return alert('Клип с таким названием уже существует.');snapshot();const id='clip-'+Date.now();clips.push({id,name:name.trim(),fps:8,loop:true,frames:[makeFrame()]});switchClip(id)};
$('clipDelete').onclick=()=>{if(clips.length<=1)return;if(!confirm('Удалить клип «'+activeClip().name+'» и все его кадры?'))return;snapshot();clips=clips.filter(c=>c.id!==activeClipId);activeClipId=clips[0].id;frames=activeClip().frames;frameIndex=0;renderAll()};
$('clipLoop').onchange=()=>{snapshot();activeClip().loop=$('clipLoop').checked;scheduleAutoSave()};
$('applyFpsBtn').onclick=()=>{const ms=1000/Math.max(1,Math.min(60,+$('fpsInput').value||8));snapshot();frames.forEach(f=>f.duration=ms);activeClip().fps=+$('fpsInput').value;syncClip();renderAll();$('saveStatus').textContent='Частота кадров применена к текущему клипу'};
$('frameDuration').onchange=()=>{const ms=Math.max(20,Math.min(10000,+$('frameDuration').value||125));snapshot();current().duration=ms;$('frameDuration').value=ms;render();};
$('playBtn').onclick=()=>{playing=!playing;$('playBtn').textContent=playing?'■ Stop':'▶ Play';if(playing){let tick=()=>{if(!playing)return;if(frameIndex>=frames.length-1){if(activeClip().loop)frameIndex=0;else{playing=false;$('playBtn').textContent='▶ Play';return}}else frameIndex++;render();playTimer=setTimeout(tick,current().duration)};tick()}else clearTimeout(playTimer)};
$('gridBtn').onclick=()=>{grid=!grid;$('gridBtn').classList.toggle('active',grid);render()};
$('onionBtn').onclick=()=>{onion=!onion;$('onionBtn').classList.toggle('active',onion);render()};
$('onionRange').oninput=e=>{onionRange=Number(e.target.value);$('onionRangeValue').textContent=onionRange+' кадр.';render()};
$('onionOpacity').oninput=e=>{onionOpacity=Number(e.target.value)/100;$('onionOpacityValue').textContent=e.target.value+'%';render()};
function setZoom(z,anchor=null){
  const stage=$('stage'),oldRect=art.getBoundingClientRect();
  const px=anchor?.x??(oldRect.left+oldRect.width/2),py=anchor?.y??(oldRect.top+oldRect.height/2);
  zoom=Math.max(2,Math.min(48,z));art.style.width=overlay.style.width=(W*zoom)+'px';art.style.height=overlay.style.height=(H*zoom)+'px';$('zoomLabel').textContent=Math.round(zoom*100)+'%';drawOverlay();
  if(anchor){const newRect=art.getBoundingClientRect(),rx=(px-oldRect.left)/oldRect.width,ry=(py-oldRect.top)/oldRect.height;stage.scrollLeft+=newRect.left-(px-rx*newRect.width);stage.scrollTop+=newRect.top-(py-ry*newRect.height);}
}
$('stage').addEventListener('wheel',e=>{e.preventDefault();setZoom(zoom*(e.deltaY<0?1.2:1/1.2),{x:e.clientX,y:e.clientY})},{passive:false});
$('zoomIn').onclick=()=>setZoom(zoom+2);$('zoomOut').onclick=()=>setZoom(zoom-2);
$('resizeBtn').onclick=()=>{let nw=Math.max(1,Math.min(512,+$('docWidth').value)),nh=Math.max(1,Math.min(512,+$('docHeight').value));snapshot();clips.forEach(c=>c.frames.forEach(f=>f.layers.forEach(l=>{let np=new Uint8ClampedArray(nw*nh*4);for(let y=0;y<Math.min(H,nh);y++)for(let x=0;x<Math.min(W,nw);x++)np.set(l.pixels.slice(idx(x,y),idx(x,y)+4),(y*nw+x)*4);l.pixels=np})));syncClip();W=nw;H=nh;$('docSize').textContent=`${W} × ${H}`;renderAll()};
$('newBtn').onclick=()=>{if(!confirm('Создать новый документ 64 × 64? Несохранённые изменения будут потеряны.'))return;undoStack=[];redoStack=[];updateHistoryButtons();W=H=64;layerDefs=[{id:'layer-1',name:'Layer 1',visible:true,opacity:1,locked:false}];nextLayerId=2;clips=[{id:'clip-1',name:'Покой',fps:8,loop:true,frames:[makeFrame()]}];activeClipId='clip-1';frames=clips[0].frames;frameIndex=layerIndex=0;selectedFrames=new Set([0]);$('docWidth').value=$('docHeight').value=64;$('docName').textContent='Untitled sprite';$('docSize').textContent='64 × 64';renderAll()};
$('saveBtn').onclick=async()=>{if(!window.pf)return alert('Запустите программу командой npm start, чтобы включить окна открытия и сохранения проектов.');let r=await window.pf.saveProject(serialize());if(!r.canceled){$('saveStatus').textContent='Saved';$('docName').textContent=r.filePath.split(/[\\/]/).pop()}};
$('openBtn').onclick=async()=>{if(!window.pf)return alert('Запустите программу командой npm start, чтобы включить окна открытия и сохранения проектов.');let r=await window.pf.openProject();if(!r.canceled){loadProject(r.data);undoStack=[];redoStack=[];updateHistoryButtons();$('docName').textContent=r.filePath.split(/[\\/]/).pop();$('saveStatus').textContent='Opened'}};
function dataUrlBytes(url){return Uint8Array.from(atob(url.split(',')[1]),c=>c.charCodeAt(0))}
async function exportCanvas(canvas,name){let url=canvas.toDataURL('image/png');if(window.pf)await window.pf.exportFile({name,data:dataUrlBytes(url),filters:[{name:'PNG Image',extensions:['png']}]});else{let a=document.createElement('a');a.href=url;a.download=name;a.click()}}
$('exportPngBtn').onclick=()=>{let c=document.createElement('canvas');c.width=W;c.height=H;drawPixels(c.getContext('2d'),composite());exportCanvas(c,'sprite.png')};
$('exportSheetBtn').onclick=()=>{let cols=Math.ceil(Math.sqrt(frames.length)),rows=Math.ceil(frames.length/cols),c=document.createElement('canvas');c.width=cols*W;c.height=rows*H;let cc=c.getContext('2d');frames.forEach((f,i)=>{let im=cc.createImageData(W,H);im.data.set(composite(f));cc.putImageData(im,(i%cols)*W,Math.floor(i/cols)*H)});exportCanvas(c,'sprite-sheet.png')};


function selectionData(){if(!selection)return null;let out=new Uint8ClampedArray(selection.w*selection.h*4),p=active().pixels;for(let y=0;y<selection.h;y++)for(let x=0;x<selection.w;x++){let sx=selection.x+x,sy=selection.y+y;if(sx>=0&&sy>=0&&sx<W&&sy<H){let i=idx(sx,sy);out.set(p.slice(i,i+4),(y*selection.w+x)*4)}}return {width:selection.w,height:selection.h,pixels:out}}
function pasteSelection(){if(!clipboard||layerDefs[layerIndex]?.locked)return;snapshot();let w=Math.min(W,clipboard.width),h=Math.min(H,clipboard.height);selection={x:Math.floor((W-w)/2),y:Math.floor((H-h)/2),w,h};for(let y=0;y<h;y++)for(let x=0;x<w;x++)active().pixels.set(clipboard.pixels.slice((y*clipboard.width+x)*4,(y*clipboard.width+x)*4+4),idx(selection.x+x,selection.y+y));render()}
$('copySelection').onclick=()=>clipboard=selectionData();
$('cutSelection').onclick=()=>{if(!selection||layerDefs[layerIndex]?.locked)return;clipboard=selectionData();snapshot();for(let y=0;y<selection.h;y++)for(let x=0;x<selection.w;x++){let xx=selection.x+x,yy=selection.y+y;if(xx>=0&&yy>=0&&xx<W&&yy<H)active().pixels.fill(0,idx(xx,yy),idx(xx,yy)+4)}render()};
$('pasteSelection').onclick=pasteSelection;$('clearSelection').onclick=()=>{selection=null;render()};
function transformSelection(type){if(!selection||layerDefs[layerIndex]?.locked)return;let d=selectionData();snapshot();let w=d.width,h=d.height,nw=type==='r'?h:w,nh=type==='r'?w:h,out=new Uint8ClampedArray(nw*nh*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){let tx=type==='h'?w-1-x:type==='r'?h-1-y:x,ty=type==='v'?h-1-y:type==='r'?x:y;out.set(d.pixels.slice((y*w+x)*4,(y*w+x)*4+4),(ty*nw+tx)*4)}for(let y=0;y<h;y++)for(let x=0;x<w;x++){let xx=selection.x+x,yy=selection.y+y;if(xx>=0&&yy>=0&&xx<W&&yy<H)active().pixels.fill(0,idx(xx,yy),idx(xx,yy)+4)}selection.w=nw;selection.h=nh;for(let y=0;y<nh;y++)for(let x=0;x<nw;x++){let xx=selection.x+x,yy=selection.y+y;if(xx>=0&&yy>=0&&xx<W&&yy<H)active().pixels.set(out.slice((y*nw+x)*4,(y*nw+x)*4+4),idx(xx,yy))}render()}
$('flipH').onclick=()=>transformSelection('h');$('flipV').onclick=()=>transformSelection('v');$('rotateSelection').onclick=()=>transformSelection('r');


async function exportGif(){
  if(typeof GIF==='undefined'){alert('Не найден кодировщик GIF. Выполните npm install и перезапустите программу.');return;}
  if(playing){playing=false;clearTimeout(playTimer);$('playBtn').textContent='▶ Play';}
  const scale=Math.max(1,Math.min(8,+$('gifScale').value||2));
  const quality=Math.max(1,+$('gifQuality').value||20);
  const gif=new GIF({
    workers:2, quality, width:W*scale, height:H*scale,
    repeat:activeClip().loop?0:-1,
    workerScript:new URL('../node_modules/gif.js/dist/gif.worker.js',window.location.href).href
  });
  frames.forEach(frame=>{
    const raw=composite(frame);
    const temp=document.createElement('canvas');temp.width=W;temp.height=H;
    const tctx=temp.getContext('2d'),im=tctx.createImageData(W,H);im.data.set(raw);tctx.putImageData(im,0,0);
    const c=document.createElement('canvas');c.width=W*scale;c.height=H*scale;
    const cc=c.getContext('2d');cc.imageSmoothingEnabled=false;cc.drawImage(temp,0,0,W*scale,H*scale);
    gif.addFrame(c,{copy:true,delay:Math.max(20,Math.round(frame.duration||1000/8))});
  });
  $('exportGifBtn').disabled=true;$('exportGifBtn').textContent='Rendering…';
  gif.on('progress',p=>$('saveStatus').textContent='GIF '+Math.round(p*100)+'%');
  gif.on('finished',blob=>{
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='pixel-art-animation.gif';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
    $('exportGifBtn').disabled=false;$('exportGifBtn').textContent='Export GIF';$('saveStatus').textContent='GIF exported';
  });
  gif.on('abort',()=>{$('exportGifBtn').disabled=false;$('exportGifBtn').textContent='Export GIF';$('saveStatus').textContent='GIF export stopped';});
  gif.render();
}
$('exportGifBtn').onclick=exportGif;

window.addEventListener('keydown',e=>{if(e.key==='Alt'&&!e.repeat)art.dataset.altPicker='1'});
window.addEventListener('keyup',e=>{if(e.key==='Alt')delete art.dataset.altPicker});
window.addEventListener('keydown',e=>{
  const mod=e.ctrlKey||e.metaKey;
  if(mod&&e.key.toLowerCase()==='z'){e.preventDefault();if(e.shiftKey)redo();else undo();return}
  if(mod&&e.key.toLowerCase()==='y'){e.preventDefault();redo();return}if(mod&&e.key.toLowerCase()==='c'){if(selection){clipboard=selectionData();e.preventDefault()}return}if(mod&&e.key.toLowerCase()==='x'){if(selection){$('cutSelection').click();e.preventDefault()}return}if(mod&&e.key.toLowerCase()==='v'){if(clipboard){pasteSelection();e.preventDefault()}else setTool('move');return}if(mod&&e.key.toLowerCase()==='a'){selection={x:0,y:0,w:W,h:H};render();e.preventDefault();return}if(e.key==='Escape'){toggleHelp(false);selection=null;render();return}
  if(mod&&e.key.toLowerCase()==='s'){e.preventDefault();$('saveBtn').click();return}
  if(e.key==='?'||e.key==='/'){toggleHelp(true);return}
  if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.tagName==='SELECT')return;
  if(e.key.toLowerCase()==='f'){fitCanvas();return}
  if(e.key==='ArrowLeft'){frameIndex=Math.max(0,frameIndex-1);selectedFrames=new Set([frameIndex]);render();e.preventDefault();return}if(e.key==='ArrowRight'){frameIndex=Math.min(frames.length-1,frameIndex+1);selectedFrames=new Set([frameIndex]);render();e.preventDefault();return}
  if(e.key==='+'||e.key==='='){setZoom(zoom+2);e.preventDefault();return}
  if(e.key==='-'||e.key==='_'){setZoom(zoom-2);e.preventDefault();return}
  let keys={b:'pencil',e:'eraser',g:'bucket',i:'eyedropper',l:'line',u:'rect',o:'ellipse',v:'move',m:'select'};
  if(keys[e.key.toLowerCase()])setTool(keys[e.key.toLowerCase()]);
  if(e.code==='Space'&&!spaceHeld){e.preventDefault();spaceHeld=true;spacePanUsed=false}
});
window.addEventListener('keyup',e=>{if(e.code==='Space'){e.preventDefault();spaceHeld=false;if(!spacePanUsed&&!e.repeat&&!['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))$('playBtn').click()}});

$('pivotX').onchange=()=>{snapshot();current().pivot=current().pivot||{};current().pivot.x=Math.max(0,Math.min(W-1,+$('pivotX').value||0));render()};
$('pivotY').onchange=()=>{snapshot();current().pivot=current().pivot||{};current().pivot.y=Math.max(0,Math.min(H-1,+$('pivotY').value||0));render()};
$('frameEvent').onchange=()=>{snapshot();current().event=$('frameEvent').value.trim();render()};
$('applyPivotAll').onclick=()=>{snapshot();const p=current().pivot||{x:Math.floor(W/2),y:Math.floor(H*.875)};frames.forEach(f=>f.pivot={...p});renderAll()};
$('addPart').onclick=addCharacterPart;
$('replaceColorBtn').onclick=()=>replaceColorEverywhere($('replaceFrom').value,$('replaceTo').value);
$('analyzeBtn').onclick=analyzeClip;
$('referenceBtn').onclick=()=>$('referenceFile').click();
$('previewBackground').onchange=()=>{const v=$('previewBackground').value,el=$('artCanvas');el.classList.remove('bg-dark','bg-light');if(v!=='checker')el.classList.add('bg-'+v)};
$('referenceFile').onchange=e=>{const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{referenceDataUrl=reader.result;$('referencePreview').src=referenceDataUrl;$('referencePreview').hidden=false};reader.readAsDataURL(file)};
$('duplicateSelected').onclick=()=>{if(!selectedFrames.size)return;snapshot();const indices=[...selectedFrames].sort((a,b)=>a-b),copies=indices.map(i=>({duration:frames[i].duration,pivot:{...(frames[i].pivot||{})},event:frames[i].event||'',layers:frames[i].layers.map(l=>({pixels:new Uint8ClampedArray(l.pixels)}))}));let at=indices.at(-1)+1;frames.splice(at,0,...copies);frameIndex=at;selectedFrames=new Set(copies.map((_,i)=>at+i));syncClip();renderAll()};
$('deleteSelected').onclick=()=>{if(frames.length<=selectedFrames.size)return alert('В клипе должен остаться хотя бы один кадр.');snapshot();const gone=[...selectedFrames].sort((a,b)=>b-a);gone.forEach(i=>frames.splice(i,1));frameIndex=Math.min(frames.length-1,Math.min(...gone));selectedFrames=new Set([frameIndex]);syncClip();renderAll()};
$('setSelectedDuration').onclick=()=>{const ms=Math.max(20,Math.min(10000,Number(prompt('Длительность выбранных кадров в миллисекундах:',String(Math.round(current().duration))))||current().duration));snapshot();selectedFrames.forEach(i=>frames[i].duration=ms);renderAll()};
$('exportJsonBtn').onclick=exportGameData;$('exportAllBtn').onclick=exportAllClips;

$('undoBtn').onclick=undo;
$('redoBtn').onclick=redo;

// v1.0: focused workspaces. The full interface remains available at any time.
function setWorkspace(mode, persist=true){
  const valid=['draw','animation','export','all']; if(!valid.includes(mode))mode='draw';
  document.body.dataset.workspace=mode;
  document.querySelectorAll('.workspace-tab').forEach(btn=>btn.classList.toggle('active',btn.dataset.workspace===mode));
  document.querySelectorAll('[data-workspace-panel]').forEach(panel=>{
    const category=panel.dataset.workspacePanel;
    panel.hidden=mode!=='all' && category!==mode && !(mode==='animation' && category==='draw' && panel.classList.contains('layers-panel'));
  });
  document.querySelectorAll('[data-workspace-action]').forEach(el=>{el.classList.toggle('workspace-action-muted',mode!=='export' && mode!=='all')});
  try{if(persist)localStorage.setItem('pf-workspace',mode)}catch(e){}
  if(mode==='animation') requestAnimationFrame(()=>{const list=$('frames');if(list)list.scrollLeft=Math.max(0,frameIndex*105-210)});
}
if(document.body && document.querySelectorAll){
  document.querySelectorAll('.workspace-tab').forEach(btn=>btn.addEventListener('click',()=>setWorkspace(btn.dataset.workspace)));
  try{setWorkspace(localStorage.getItem('pf-workspace')||'draw',false)}catch(e){setWorkspace('draw',false)}
}

// v0.9: quick clip presets, fit-to-window, collapsible panels and shortcut guide.
function createPresetClip(name){
  const defaults={Idle:8,Walk:10,Run:12,Jump:10,Attack:12,Death:8};
  let finalName=name||'Walk';
  if(clips.some(c=>c.name.toLowerCase()===finalName.toLowerCase())){
    let n=2;while(clips.some(c=>c.name.toLowerCase()===(finalName+' '+n).toLowerCase()))n++;
    finalName+=' '+n;
  }
  snapshot();const fps=defaults[name]||8;const id='clip-'+Date.now()+'-'+Math.floor(Math.random()*10000);
  clips.push({id,name:finalName,fps,loop:name!=='Death',frames:[makeFrame()]});
  activeClipId=id;frames=activeClip().frames;frameIndex=0;layerIndex=0;selectedFrames=new Set([0]);
  renderAll();$('saveStatus').textContent='Создан клип «'+finalName+'»';
}
$('clipTemplate').onchange=()=>{};
$('clipAdd').onclick=()=>createPresetClip($('clipTemplate').value);
function fitCanvas(){const stage=$('stage');if(!stage)return;const pad=64;const z=Math.floor(Math.min((stage.clientWidth-pad)/W,(stage.clientHeight-pad)/H));setZoom(Math.max(2,Math.min(24,z)));}
$('zoomFit').onclick=fitCanvas;
function toggleHelp(show){$('shortcutDialog').hidden=!show;}
$('helpBtn').onclick=()=>toggleHelp(true);$('closeHelp').onclick=()=>toggleHelp(false);
$('shortcutDialog').addEventListener('click',e=>{if(e.target===$('shortcutDialog'))toggleHelp(false)});
// Collapse each inspector section without hiding its heading; remember preferences locally.
document.querySelectorAll('.inspector .panel').forEach((panel,i)=>{
  const head=panel.querySelector('.panel-head');if(!head)return;
  const content=document.createElement('div');content.className='panel-content';
  while(head.nextSibling)content.append(head.nextSibling);panel.append(content);
  const key='pf-panel-collapsed-'+i;try{if(localStorage.getItem(key)==='1')panel.classList.add('collapsed')}catch(e){}
  head.addEventListener('click',e=>{if(e.target.closest('button,input,select'))return;panel.classList.toggle('collapsed');try{localStorage.setItem(key,panel.classList.contains('collapsed')?'1':'0')}catch(err){}});
});
try{const recovery=localStorage.getItem('pixelforge-autosave');if(recovery){const d=JSON.parse(recovery);if(d&&d.version>=4)loadProject(d)}}catch(e){}
renderAll();
updateHistoryButtons();
})();
