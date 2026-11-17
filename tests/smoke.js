// Plays every nation against every other for a few simulated minutes and checks for errors,
// NaN values, and armour-limit violations. Exit code 1 on failure.
const {load}=require('./harness');
const nats=['gb','de','fr','ru','us','ah','it','aq'];let fails=0;
function run(me,foe,map){return new Promise(res=>{
  const dom=load(),w=dom.window,d=w.document;let err=0;w.addEventListener('error',()=>err++);
  setTimeout(()=>{
    const T=w.__trench;
    d.querySelector('#natList [data-nation='+me+']').click();d.querySelector('#natList [data-nation='+foe+']').click();d.querySelector('#natList [data-map='+map+']').click();
    const S=T.S(),b=T.bases(),NAT=T.NAT();let bad=0,over=0;
    for(let t=0;t<240;t+=4){
      S.supplies=Math.max(S.supplies,500);T.ai().money=Math.max(T.ai().money,500);S.pending=0;d.getElementById('cardOv').hidden=true;
      b[0].hp=b[0].max;b[1].hp=b[1].max;T.step(4);
      for(const u of T.units())if(!isFinite(u.x)||!isFinite(u.y)||!isFinite(u.hp))bad++;
      if(T.tanks(0)>NAT[me].tanks+1e-6||T.tanks(1)>NAT[foe].tanks+1e-6)over++;
    }
    const ok=!err&&!bad&&!over;if(!ok)fails++;
    console.log((ok?'PASS ':'FAIL ')+me+' vs '+foe+' on '+map+(ok?'':' errors='+err+' nan='+bad+' overCap='+over));
    dom.window.close();res();
  },200);
});}
(async()=>{
  for(const me of nats)await run(me,me==='de'?'gb':'de','open');
  for(const f of nats)if(f!=='de')await run('de',f,'open');
  await run('aq','it','river');await run('ru','fr','plain');await run('fr','ru','plain');await run('gb','aq','march');await run('de','it','march');
  console.log(fails?fails+' FAILED':'ALL PASSED');process.exit(fails?1:0);
})();
