// Headless test harness: loads trench-line.html in jsdom with a real canvas and exposes internals.
// Usage: node tests/smoke.js   (needs: npm install jsdom @napi-rs/canvas)
const {JSDOM}=require('jsdom');const fs=require('fs'),path=require('path');
function load(file){
  file=file||path.join(__dirname,'..','trench-line.html');
  let html=fs.readFileSync(file,'utf8');
  html=html.replace('window.__trench={','window.__trench={NAT:()=>NAT,STATS:()=>STATS,SPECIAL:()=>SPECIAL,SW:()=>SW,TECH:()=>TECH,MAPS:()=>MAPS,LX:()=>LX,NT:()=>NT,HQI:()=>HQI,SUPER:()=>SUPER,owner:()=>owner,S:()=>S,ai:()=>ai,bases:()=>bases,META:()=>META,spawn:(s,t,L)=>spawn(s,t,L,true),setCam:x=>{cam=camT=x},ut:(s,k)=>ut(s,k),tkList:n=>tkList(n),tanks:s=>tanks(s),full:(s,k)=>full(s,k),buildBuy:()=>buildBuy(),offer:()=>offerCards(),');
  return new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){
    w.HTMLCanvasElement.prototype.getBoundingClientRect=function(){return {width:900,height:300,left:0,top:0,right:900,bottom:300}};
    w.addEventListener('error',e=>console.log('PAGE ERROR',e.message));
  }});
}
module.exports={load};
