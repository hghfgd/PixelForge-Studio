const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
class El{constructor(id=''){this.id=id;this.value=id==='fpsInput'?'8':id==='frameDuration'?'125':id==='docWidth'||id==='docHeight'?'64':id==='layerOpacity'?'100':'';this.textContent='';this.innerHTML='';this.style={};this.dataset={};this.disabled=false;this.checked=true;this.children=[];this.handlers={};this.options=[];this.classList={add(){},remove(){},toggle(){}}}addEventListener(n,f){this.handlers[n]=f}append(...a){this.children.push(...a);if(this.tagName==='option')this.options.push(...a)}appendChild(x){this.children.push(x)}setPointerCapture(){}getBoundingClientRect(){return{left:0,top:0}}getContext(){return ctx}querySelector(s){return this._q||(this._q={})[s]||(this._q[s]=new El(s))}}
const ctx={clearRect(){},createImageData(w,h){return{data:new Uint8ClampedArray(w*h*4)}},putImageData(){},strokeRect(){},save(){},restore(){},setLineDash(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},getImageData(){return{data:new Uint8ClampedArray(4)}}};
const ids={},document={getElementById(id){return ids[id]||(ids[id]=new El(id))},querySelectorAll(){return[]},createElement(tag){const e=new El(tag);e.tagName=tag;return e}};
let requestedName='Walk';const window={addEventListener(){},pf:{async saveProject(data){window.saved=data;return{canceled:false,filePath:'clip-test.pfs'}},async openProject(){return{canceled:true}}}};
const sandbox={document,window,console,Uint8ClampedArray,Uint8Array,Array,Math,JSON,Number,String,parseInt,confirm:()=>true,alert(){},prompt:()=>requestedName,setTimeout:()=>1,clearTimeout(){},URL,atob:()=>'',Blob:function(){}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','src','app.js'),'utf8'),sandbox);
(async()=>{
  ids.addFrame.onclick(); // Idle now has two frames
  ids.clipAdd.onclick(); // independent Walk clip
  await ids.saveBtn.onclick();
  let data=window.saved;
  assert.equal(data.version,5);assert.equal(data.clips.length,2);assert(data.frames[0].pivot);assert.equal(data.frames[0].event,'');
  const idle=data.clips.find(c=>c.name==='Idle'),walk=data.clips.find(c=>c.name==='Walk');
  assert.equal(idle.frames.length,2);assert.equal(walk.frames.length,1);
  ids.fpsInput.value='12';ids.fpsInput.onchange();ids.applyFpsBtn.onclick();
  ids.clipLoop.checked=false;ids.clipLoop.onchange();
  await ids.saveBtn.onclick();data=window.saved;
  const savedWalk=data.clips.find(c=>c.name==='Walk');
  assert.equal(savedWalk.fps,12);assert.equal(savedWalk.loop,false);assert(savedWalk.frames.every(f=>Math.round(f.duration)===83));
  // Per-frame pivot and event metadata persist in the project format.
  ids.pivotX.value='7';ids.pivotX.onchange();ids.frameEvent.value='footstep';ids.frameEvent.onchange();await ids.saveBtn.onclick();
  const meta=window.saved.clips.find(c=>c.name==='Walk').frames[0];assert.equal(meta.pivot.x,7);assert.equal(meta.event,'footstep');
  // Reorder the two Idle frames through the actual drop handler.
  ids.clipSelect.value=idle.id;ids.clipSelect.onchange({target:ids.clipSelect});
  const cards=ids.frames.children.filter(x=>x.dataset&&x.dataset.index!==undefined);
  let prevented=false;cards[0].handlers.dragstart({dataTransfer:{setData(k,v){this.value=v},effectAllowed:''}});
  const dt={getData(){return '0'}};cards[1].handlers.drop({preventDefault(){prevented=true},dataTransfer:dt});
  assert(prevented);
  await ids.saveBtn.onclick();assert.equal(window.saved.clips.find(c=>c.name==='Idle').frames.length,2);
  // Generate two in-between frames using the UI action; current frame is moved to first.
  cards[0].onclick({});
  requestedName='2';ids.inbetweenBtn.onclick();
  await ids.saveBtn.onclick();
  assert.equal(window.saved.clips.find(c=>c.name==='Idle').frames.length,4);
  // Onion-skin controls update their values without affecting project serialization.
  ids.onionRange.oninput({target:{value:'3'}});ids.onionOpacity.oninput({target:{value:'40'}});
  assert.equal(ids.onionRangeValue.textContent,'3 кадр.');assert.equal(ids.onionOpacityValue.textContent,'40%');
  console.log('Clip smoke test passed: independent clips, per-clip FPS/loop, persistence, drag reorder, in-betweens, and onion-skin controls.');
})().catch(e=>{console.error(e);process.exit(1)});
