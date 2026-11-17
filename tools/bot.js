const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');
const vc=new VirtualConsole();let errs=0;vc.on('jsdomError',e=>{errs++;console.log('ERR',e.detail?e.detail.stack||e.detail:e.message)});
let nc;try{nc=require('canvas').createCanvas(900,600)}catch(e){nc=null}
const stub=new Proxy({},{get:(t,k)=>k==='createLinearGradient'?()=>({addColorStop(){}}):(t[k]!==undefined?t[k]:()=>{}),set:(t,k,v)=>{t[k]=v;return true}});
const dom=new JSDOM(fs.readFileSync(require('path').join(__dirname,'..','trench-line.html'),'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.HTMLCanvasElement.prototype.getContext=()=>nc?nc.getContext('2d'):stub;
  w.HTMLCanvasElement.prototype.getBoundingClientRect=()=>({width:900,height:600,left:0,top:0});w.matchMedia=()=>({matches:false});}});
const w=dom.window,d=w.document,G=w.__trench;
const [me,ratioS,foe,map,shotAt]=process.argv.slice(2);const ratio=+ratioS||2.5;
d.querySelector('[data-nation="'+me+'"]').click();d.querySelector('[data-nation="'+foe+'"]').click();d.querySelector('[data-map="'+(map||'open')+'"]').click();
let want=null,sw=0;const pref=['tank','mortar','sniper','mg','raider','rifle'];
for(let sec=0;sec<+(process.env.MAXS||1800);sec++){
  G.step(1);
  if(!d.getElementById('cardOv').hidden){const cs=[...d.querySelectorAll('#cardList button')];(cs.find(c=>c.dataset.card.startsWith('u_'))||cs[0]).click()}
  const i=G.info();if(!i.running)break;
  want=want||(Math.random()<0.45?'rifle':pref[Math.floor(Math.random()*pref.length)]);
  {const b=d.querySelector('[data-buy="'+want+'"]');if(!b||b.querySelector('p').textContent.startsWith('Needs')||(b.disabled&&i.sup>300))want=null;else if(!b.disabled){b.click();want=null}}
  {const x=d.getElementById('swBtn');if(!x.hidden&&!x.disabled&&Math.random()<0.1){x.click();sw++}}
  for(const id of ['fortBtn','nestBtn','defBtn']){const x=d.getElementById(id);if(!x.hidden&&!x.disabled&&Math.random()<0.015)x.click()}
  if(i.sel<i.hq&&i.settled(i.sel)){
    const m=i.pw(i.sel)[0],f=i.pw(i.sel+1)[1]+(i.sel===i.hq-1?200:0);
    if((f===0&&m>=100)||(f>0&&m>f*ratio)){d.getElementById('gatherBtn').click();d.getElementById('advBtn').click()}
  }
  if(shotAt&&sec===+shotAt&&nc){d.querySelector('[data-line="'+(process.env.LINE||4)+'"]').click();G.step(0.05);G.draw();fs.writeFileSync(require('path').join(__dirname,'shot.png'),nc.toBuffer('image/png'))}
  if(process.env.LOG&&sec%120===0)console.log((sec/60)+'m sel',i.sel,'sup',Math.round(i.sup),i.lines);
}
const i=G.info();console.log(me,'vs',foe,map,'END',d.getElementById('endTitle').textContent||'(unfinished)',(i.t/60).toFixed(1)+'m sel',i.sel,'kills',i.kills,'losses',i.losses,'cards',i.cards,'sw',sw,'forts',G.fort().join(''),'errs',errs);
process.exit(0);
