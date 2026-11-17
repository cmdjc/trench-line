// Targeted checks for the Wide open plain map (double "super" trenches, hedgehogs)
// and Russia's line-up (Vezdekhod tank, Mendeleev heavy, Tsar Tank superweapon).
// Usage: node tests/merge.js [screenshot.png]   Exit code 1 on failure.
const {load}=require('./harness');const fs=require('fs');
let fails=0;const ok=(c,msg)=>{console.log((c?'PASS ':'FAIL ')+msg);if(!c)fails++};
const dom=load(),w=dom.window,d=w.document;let err=0;w.addEventListener('error',()=>err++);
const start=(me,foe,map)=>{d.querySelector('#natList [data-nation='+me+']').click();d.querySelector('#natList [data-nation='+foe+']').click();d.querySelector('#natList [data-map='+map+']').click()};
setTimeout(()=>{
  const T=w.__trench;
  // ---- Russia
  start('ru','de','plain');
  ok(T.tkList('ru').join(',')==='tank,tkH','Russia fields Vezdekhod then Mendeleev: '+T.tkList('ru').map(k=>T.ut(0,k).name).join(', '));
  ok(!T.S().unlocked.tank,'Russian tank needs its card');
  ok(T.NAT().ru.tanks===10&&T.SW().ru&&T.SW().ru.kind==='tsar','armour limit 10 and Tsar Tank is the superweapon');
  const sb=d.getElementById('swBtn');T.S().supplies=5000;T.step(0.1);
  ok(!sb.hidden&&!sb.disabled&&/Tsar Tank/.test(sb.textContent),'superweapon button offers the Tsar Tank');
  sb.click();T.step(0.1);sb.click();T.step(0.1);
  ok(T.units().filter(u=>u.type==='tsar').length===1,'one Tsar Tank at a time');
  ok(T.tanks(0)===0,'Tsar Tank does not use the armour limit');
  // ---- plain layout and double trenches
  const LX=T.LX(),own=T.owner();
  ok(T.NT()===17&&LX.length===19,'plain has 17 trenches');
  // ---- hedgehogs: enemy holds trench 14
  for(const u of T.units())if(u.type==='tsar')u.hp=0;T.step(0.1);
  T.ai().money=0;const hold=T.spawn(1,'rifle',14);hold.hp=hold.max=1e7;own[14]=1;
  const tk=T.spawn(0,'tank',13);tk.hp=tk.max=1e7;tk.line=15;
  const ts=T.spawn(0,'tsar',13);ts.hp=ts.max=1e7;ts.line=15;
  const run=n=>{for(let i=0;i<n;i++){T.ai().money=0;T.S().pending=0;d.getElementById('cardOv').hidden=true;T.bases()[0].hp=T.bases()[0].max;T.step(1)}};
  run(45);
  ok(tk.x<LX[14]-94&&tk.x>LX[13],'Vezdekhod halts short of the hedgehogs (x '+Math.round(tk.x)+', trench at '+LX[14]+')');
  ok(ts.x>LX[14],'Tsar Tank rolls over the hedgehogs (x '+Math.round(ts.x)+')');
  if(process.argv[2]){T.setCam(LX[13]-120);T.draw();fs.writeFileSync(process.argv[2],Buffer.from(d.getElementById('field').toDataURL().split(',')[1],'base64'))}
  // ---- infantry take it: tank passes
  hold.hp=0;T.step(0.1);const mine=T.spawn(0,'rifle',14);mine.hp=mine.max=1e7;own[14]=0;run(45);
  ok(tk.x>LX[14],'Vezdekhod passes once the trench is yours (x '+Math.round(tk.x)+')');
  // ---- five emplacement slots and income
  T.S().supplies=5000;d.querySelector('#map [data-line="14"]').click();T.step(0.1);
  const nb=d.getElementById('nestBtn');let built=0;for(let i=0;i<7;i++){T.step(0.1);if(!nb.disabled){nb.click();built++}}
  ok(built===5,'a super trench takes 5 emplacements (built '+built+')');
  ok(/\+4\.0 a second/.test(d.getElementById('rate').textContent),'holding one super trench adds 1 supply a second: '+d.getElementById('rate').textContent);
  ok(err===0,'no page errors');
  console.log(fails?fails+' FAILED':'ALL PASSED');process.exit(fails?1:0);
},300);
