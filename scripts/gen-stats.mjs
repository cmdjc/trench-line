// Regenerates the stat tables in docs/STATS.md straight from the game's own
// data. Port of legacy/tests/gen-stats.js, driving the ES modules directly.
//   npm run stats
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { NAT } from '../src/data/nations.js';
import { SW } from '../src/data/superweapons.js';
import { TECH } from '../src/data/tech.js';
import { MAPS } from '../src/data/maps.js';
import { STATS, SPECIAL, tkList } from '../src/data/units.js';

const f = x => Math.round(x * 100) / 100;
const DEF = { wire: 'Wire', pit: 'Gun pit', mines: 'Mines', depot: 'Supply depot', bunker: 'Bunker', workshop: 'Repair workshop' };

let o = '# Trench Line: stat tables\n\nGenerated from the game data by `npm run stats` (`scripts/gen-stats.mjs`). Numbers are first-pass and need playtesting.\n\n## Nations\n\n| Nation | Infantry cap | Armour cap | Trench defence | Superweapon |\n|---|---|---|---|---|\n';
for (const n of Object.keys(NAT)) {
  const d = NAT[n].def;
  o += '| ' + NAT[n].name + ' | ' + NAT[n].inf + ' | ' + NAT[n].tanks + ' | ' +
    (d ? DEF[d.kind] + ' (' + d.cost + ')' : (NAT[n].nest === 'pillbox' ? 'Pillbox instead of MG nest' : 'none')) + ' | ' +
    (SW[n] ? SW[n].name + ' (' + SW[n].cost + ', ' + SW[n].cd + ' s cooldown)' : 'none; the Tsar Tank is its tank') + ' |\n';
}
o += '\n## Infantry\n\n';
for (const n of Object.keys(NAT)) {
  o += '**' + NAT[n].name + '**\n\n| Unit | Cost | Health | Damage | Range | Notes |\n|---|---|---|---|---|---|\n';
  for (const k of ['rifle', 'mg', 'raider', 'sniper', 'mortar']) { const u = STATS[n][k]; o += '| ' + u.name + ' | ' + f(u.cost) + ' | ' + f(u.hp) + ' | ' + f(u.dmg) + ' | ' + u.range + ' | ' + (u.role || '') + ' |\n'; }
  o += '\n';
}
o += '## Armour\n\nLimit use is how much of the nation\'s armour limit one vehicle takes.\n\n';
for (const n of Object.keys(NAT)) {
  o += '**' + NAT[n].name + '** (armour limit ' + NAT[n].tanks + ')\n\n| Vehicle | Cost | Health | Damage | Range | Speed | Limit use | Notes |\n|---|---|---|---|---|---|---|---|\n';
  for (const k of tkList(n)) { const u = STATS[n][k]; o += '| ' + u.name + ' | ' + f(u.cost) + ' | ' + f(u.hp) + ' | ' + f(u.dmg) + ' | ' + u.range + ' | ' + u.speed + ' | ' + (u.w || 1) + ' | ' + (u.role || '') + ' |\n'; }
  o += '\n';
}
o += '## Emplacements and special units\n\n| Unit | Cost | Health |\n|---|---|---|\n';
for (const k of ['nest', 'pillbox', 'pit75', 'pit65', 'depot', 'bunker', 'char2c', 'tsar', 'colossus', 'workshop', 'ruebezahl']) { const u = SPECIAL[k]; o += '| ' + u.name + ' | ' + u.cost + ' | ' + u.hp + ' |\n'; }
o += '\n## Research tree\n\n';
for (const b of TECH) { o += '**' + b.branch + '**\n\n'; b.nodes.forEach((n, i) => o += (i + 1) + '. ' + n.name + ' (' + n.cost + ' points): ' + n.text + '\n'); o += '\n'; }
o += '## Superweapons\n\n| Nation | Name | Cost | Cooldown | Effect |\n|---|---|---|---|---|\n';
for (const n of Object.keys(SW)) if (SW[n]) o += '| ' + NAT[n].name + ' | ' + SW[n].name + ' | ' + SW[n].cost + ' | ' + SW[n].cd + ' s | ' + SW[n].text + ' |\n';
o += '\n## Maps\n\n| Map | Description |\n|---|---|\n';
for (const k of Object.keys(MAPS)) o += '| ' + MAPS[k].name + ' | ' + MAPS[k].blurb + ' |\n';

const dir = fileURLToPath(new URL('..', import.meta.url));
mkdirSync(dir + 'docs', { recursive: true });
writeFileSync(dir + 'docs/STATS.md', o);
console.log('wrote docs/STATS.md (' + o.length + ' chars)');
process.exit(0);
