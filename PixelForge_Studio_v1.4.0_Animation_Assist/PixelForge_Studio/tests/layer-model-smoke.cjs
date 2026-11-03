const fs=require('fs'),vm=require('vm'),assert=require('assert');
class El {
 constructor(id=''){this.id=id;this.value=id==='fpsInput'?'8':id==='frameDuration'?'125':id==='docWidth'||id==='docHeight'?'64':id==='layerOpacity'?'100':'';this.textContent='';this.innerHTML='';this.style={};this.dataset={};this.disabled=false;this.checked=true;this.children=[];this.handlers={};this.classList={add(){},remove(){},toggle(){}};}
 addEventListener(n,fn){this.handlers[n]=fn} append(...xs){this.children.push(...xs)} appendChild(x){this.children.push(x)} setPointerCapture(){} getBoundingClientRect(){return {left:0,top:0}} getContext(){return ctx}
 querySelector(sel){if(!this._q)this._q={};return this._q[sel]||(this._q[sel]=new El(sel))}
}
const ctx={clearRect(){},createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)}},putImageData(){},strokeRect(){},save(){},restore(){},setLineDash(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},getImageData(){return {data:new Uint8ClampedArray(4)}}};
const ids={};const document={getElementById(id){return ids[id]||(ids[id]=new El(id))},querySelectorAll(){return []},createElement(tag){return new El(tag)}};
const window={addEventListener(){},pf:{async saveProject(data){window.saved=data;return {canceled:false,filePath:'test.pfs'}},async openProject(){return {canceled:true}}}};
const sandbox={document,window,console,Uint8ClampedArray,Uint8Array,Array,Math,JSON,Number,String,parseInt,confirm:()=>true,alert(){},setTimeout:()=>1,clearTimeout(){},URL,atob:()=>'',Blob:function(){}};
vm.runInNewContext(fs.readFileSync(require('path').join(__dirname,'..','src','app.js'),'utf8'),sandbox);
(async()=>{
 ids.addLayer.onclick(); // shared layer 2, cels added to all frames
 ids.addFrame.onclick(); // second frame has both cels
 ids.layersList.children?.[0]?.onclick?.();
 ids.layerOpacity.onpointerdown(); ids.layerOpacity.value='65'; ids.layerOpacity.oninput(); ids.layerOpacity.onchange();
 await ids.saveBtn.onclick();
 const d=window.saved;
 assert.equal(d.version,5);assert.equal(d.layers.length,2);assert.equal(d.frames.length,2);
 assert(d.frames.every(f=>f.layers.length===2));assert.equal(d.layers[0].opacity,.65);
 ids.moveLayerUp.onclick();
 await ids.saveBtn.onclick();
 assert.equal(window.saved.layers.length,2);
 // Verify that a v2 project with frame-local layer metadata migrates into v3 shared layers + cels.
 window.pf.openProject=async()=>({canceled:false,filePath:'legacy.pfs',data:{version:2,width:2,height:2,frameIndex:1,layerIndex:0,fps:10,frames:[{duration:100,layers:[{name:'Sketch',visible:true,opacity:1,pixels:Array(16).fill(0)}]},{duration:80,layers:[{name:'Sketch',visible:false,opacity:.5,pixels:Array(16).fill(1)}]}]}});
 await ids.openBtn.onclick(); await ids.saveBtn.onclick();
 assert.equal(window.saved.version,5);assert.equal(window.saved.layers.length,1);assert.equal(window.saved.layers[0].name,'Sketch');
 assert.equal(window.saved.frames.length,2);assert.equal(window.saved.frames[1].layers[0].pixels[0],1);assert.equal(window.saved.frames[1].duration,80);assert.equal(window.saved.clips.length,1);assert.equal(window.saved.clips[0].name,'Idle');
 console.log('Smoke test passed: shared layer metadata, per-frame cels, frame creation, opacity, serialization and v2→v5 migration.');
})().catch(e=>{console.error(e);process.exit(1)});
