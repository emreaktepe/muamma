// Bot oyunlarıyla denge ölçümü:  npm run sim -- 300
import { createGame, tilsimCount } from '../src/game/engine.js';
import { playToEnd } from '../src/game/autoplay.js';

const N = Number(process.argv[2] || 200);
const rows = [];
for (const count of [4, 5, 6, 7, 8]) {
  const r = { oyuncu: count, muhafiz: 0, golge: 0, sebep: {}, cozulen: 0, tilsim: 0, olum: 0, erken: 0 };
  for (let i = 0; i < N; i++) {
    const s = createGame({ seed: 1000 * count + i, players: Array.from({ length: count }, (_, k) => ({ name: `Bot ${k + 1}`, isBot: true })) });
    playToEnd(s);
    r[s.winner] += 1;
    const key = s.winReason.split(/[.:]/)[0];
    r.sebep[key] = (r.sebep[key] || 0) + 1;
    r.cozulen += s.solvedCases;
    r.tilsim += tilsimCount(s);
    r.olum += s.bodies.length;
    if (s.eraIndex < 3) r.erken += 1;
  }
  rows.push({
    oyuncu: count,
    'Muhafız %': Math.round((100 * r.muhafiz) / N),
    'Gölge %': Math.round((100 * r.golge) / N),
    'ort. çözülen vaka': (r.cozulen / N).toFixed(2),
    'ort. kalan tılsım': (r.tilsim / N).toFixed(2),
    'ort. cinayet': (r.olum / N).toFixed(2),
    'IV. perdeden önce biten %': Math.round((100 * r.erken) / N),
  });
  console.log(`\n${count} oyuncu — bitiş sebepleri:`, r.sebep);
}
console.table(rows);
