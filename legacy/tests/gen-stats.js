// Regenerates the stat tables in docs/STATS.md straight from the game's own data.
const {load}=require('./harness');const fs=require('fs'),path=require('path');
const dom=load(),w=dom.window;
setTimeout(()=>{
  const T=w.__trench,N=T.NAT(),ST=T.STATS(),SW=T.SW(),SP=T.SPECIAL(),f=x=>Math.round(x*100)/100;
  const DEF={wire:'Wire',pit:'Gun pit',mines:'Mines',depot:'Supply depot',bunker:'Bunker'};
  let o='# Trench Line: stat tables\n\nGenerated from the game data by `tests/gen-stats.js`. Numbers are first-pass and need playtesting.\n\n## Nations\n\n| Nation | Infantry cap | Armour cap | Trench defence | Superweapon |\n|---|---|---|---|---|\n';
  for(const n in N){const d=N[n].def;o+='| '+N[n].name+' | '+N[n].inf+' | '+N[n].tanks+' | '+(d?DEF[d.kind]+' ('+d.cost+')':(N[n].nest==='pillbox'?'Pillbox instead of MG nest':'none'))+' | '+(SW[n]?SW[n].name+' ('+SW[n].cost+', '+SW[n].cd+' s cooldown)':'none; the Tsar Tank is its tank')+' |\n'}
  o+='\n## Infantry\n\n';
  for(const n in N){o+='**'+N[n].name+'**\n\n| Unit | Cost | Health | Damage | Range | Notes |\n|---|---|---|---|---|---|\n';
    for(const k of ['rifle','mg','raider','sniper','mortar']){const u=ST[n][k];o+='| '+u.name+' | '+f(u.cost)+' | '+f(u.hp)+' | '+f(u.dmg)+' | '+u.range+' | '+(u.role||'')+' |\n'}o+='\n'}
  o+='## Armour\n\nLimit use is how much of the nation\'s armour limit one vehicle takes.\n\n';
  for(const n in N){o+='**'+N[n].name+'** (armour limit '+N[n].tanks+')\n\n| Vehicle | Cost | Health | Damage | Range | Speed | Limit use | Notes |\n|---|---|---|---|---|---|---|---|\n';
    for(const k of T.tkList(n)){const u=ST[n][k];o+='| '+u.name+' | '+f(u.cost)+' | '+f(u.hp)+' | '+f(u.dmg)+' | '+u.range+' | '+u.speed+' | '+(u.w||1)+' | '+(u.role||'')+' |\n'}o+='\n'}
  o+='## Emplacements and special units\n\n| Unit | Cost | Health |\n|---|---|---|\n';
  for(const k of ['nest','pillbox','pit75','pit65','depot','bunker','char2c','tsar','colossus']){const u=SP[k];o+='| '+u.name+' | '+u.cost+' | '+u.hp+' |\n'}
  o+='\n## Research tree\n\n';
  for(const b of T.TECH()){o+='**'+b.branch+'**\n\n';b.nodes.forEach((n,i)=>o+=(i+1)+'. '+n.name+' ('+n.cost+' points): '+n.text+'\n');o+='\n'}
  o+='## Superweapons\n\n| Nation | Name | Cost | Cooldown | Effect |\n|---|---|---|---|---|\n';
  for(const n in SW)if(SW[n])o+='| '+N[n].name+' | '+SW[n].name+' | '+SW[n].cost+' | '+SW[n].cd+' s | '+SW[n].text+' |\n';
  o+='\n## Maps\n\n| Map | Description |\n|---|---|\n';
  for(const k in T.MAPS())o+='| '+T.MAPS()[k].name+' | '+T.MAPS()[k].blurb+' |\n';
  fs.mkdirSync(path.join(__dirname,'..','docs'),{recursive:true});
  fs.writeFileSync(path.join(__dirname,'..','docs','STATS.md'),o);console.log('wrote docs/STATS.md ('+o.length+' chars)');process.exit(0);
},300);
