// Bütün koltuklar bot olduğunda oyunu bir adım ilerletir (simülasyon ve testler için).
import { act, startGame, era } from './engine.js';
import { botTurn } from './ai.js';

export function stepAuto(s) {
  switch (s.phase) {
    case 'roles': startGame(s); return true;
    case 'prolog': act(s, { type: 'begin' }); return true;
    case 'era-intro': act(s, { type: 'start-days' }); return true;
    case 'morning': act(s, { type: 'morning-done' }); return true;
    case 'divan': {
      const d = s.divan;
      if (d.step === 'suclama-sonuc' || d.step === 'sonuc') { act(s, { type: 'divan-next' }); return true; }
      break;
    }
    default: break;
  }
  const a = botTurn(s);
  if (!a) return false;
  act(s, a);
  return true;
}

export function playToEnd(s, maxSteps = 5000) {
  let n = 0;
  while (!s.winner && n < maxSteps) {
    if (!stepAuto(s)) throw new Error(`Takıldı: faz=${s.phase} adım=${s.divan?.step} çağ=${era(s)?.year}`);
    n++;
  }
  if (!s.winner) throw new Error('Adım sınırı aşıldı');
  return n;
}
