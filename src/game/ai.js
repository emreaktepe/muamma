// Basit bot zekâsı: hem tek kişilik denemelerde boş koltukları doldurur hem de simülasyonla oyun dengesini ölçer.
import {
  caseOf, era, player, activePlayers, charOf, reachable, distances, availableActions, paragraphAt,
  puzzleAt, bodyAt, nightOptions, publicEvidence, consistentWith, isActive, rand, pick, golgeler, abilityUsable,
} from './engine.js';
import { CASES } from './data/cases.js';
import { IZ_CATEGORIES } from './data/characters.js';
import { TILSIMLAR } from './data/locations.js';

// Bu çağın vakasında ipucu olan mekânlar
function clueLocs(s) {
  const c = caseOf(s);
  return c.dynamic ? Object.keys(c.clueLocations) : Object.keys(c.clues);
}

function publiclyRevealed(s, loc) {
  return s.defter.some((e) => e.type === 'acik' && e.loc === loc && e.era === era(s).year);
}

function goals(s, p) {
  const known = s.knowledge[p.id];
  const out = new Set();
  for (const l of clueLocs(s)) if (!known[l] && !publiclyRevealed(s, l)) out.add(l);
  for (const l of Object.keys(caseOf(s).puzzles || {})) if (!s.puzzlesSolved[`${s.eraIndex}:${l}`]) out.add(l);
  for (const b of s.bodies) if (!b.examined) out.add(b.loc);
  return [...out];
}

function stepToward(s, p, targets) {
  const reach = reachable(s, p);
  if (!targets.length) return null;
  let best = null;
  for (const loc of Object.keys(reach)) {
    const d = distances(s, loc);
    const score = Math.min(...targets.map((t) => (d[t] ?? 99))) + rand(s) * 0.3;
    if (!best || score < best.score) best = { loc, score };
  }
  return best?.loc ?? null;
}

// ---------- gündüz ----------
export function botDayAction(s, p) {
  const pd = s.pending;
  if (pd?.type === 'claim' && pd.playerId === p.id) return { type: 'claim', playerId: p.id, claim: botClaim(s, p) };
  const av = availableActions(s, p);
  const here = p.loc;
  const known = s.knowledge[p.id];
  const golge = p.role === 'golge';

  // Yetenekler
  if (av.yetenek) {
    const ab = charOf(p).ability;
    const others = activePlayers(s).filter((o) => o.id !== p.id && o.loc === here);
    if (ab === 'otopsi' || ab === 'katman') return { type: 'ability', playerId: p.id };
    if (ab === 'arsiv' && !golge) return { type: 'ability', playerId: p.id };
    if (ab === 'pozlama' && s.tilsim[here] && p.actionsLeft === 1) return { type: 'ability', playerId: p.id };
    if (ab === 'takip' && others.length && p.actionsLeft === 1 && !golge) {
      const sus = suspicion(s, p.id);
      const t = others.sort((a, b) => (sus[b.id] || 0) - (sus[a.id] || 0))[0];
      return { type: 'ability', playerId: p.id, target: t.id };
    }
  }
  // Ceset varsa incele
  if (bodyAt(s, here)) return { type: 'investigate', playerId: p.id, mode: 'gizli' };
  // Bulmaca
  if (av.coz) {
    const puz = puzzleAt(s, here);
    const chance = p.charId === 'zeynep' ? 0.95 : 0.7;
    return { type: 'solve', playerId: p.id, answer: rand(s) < chance ? puz.answers[0] : 'bilmiyorum' };
  }
  // İpucu
  const para = paragraphAt(s, here);
  const suspiciousClaim = s.claims.find((c) => c.loc === here && !c.checked && c.by !== p.id && c.era === s.eraIndex);
  if (!golge && suspiciousClaim && av.acik && !known[here]) return { type: 'investigate', playerId: p.id, mode: 'acik' };
  if ((para && !known[here] && !publiclyRevealed(s, here)) || s.fakeClues[here]) {
    if (!golge && av.acik && av.acikCost === 1) return { type: 'investigate', playerId: p.id, mode: 'acik' };
    return { type: 'investigate', playerId: p.id, mode: 'gizli' };
  }
  // Son eylemde tılsıma nöbet
  if (!golge && av.koru && p.actionsLeft === 1 && !s.protectedTilsim[here]) return { type: 'guard', playerId: p.id };
  // Hedefe yürü
  if (av.move) {
    let targets = goals(s, p);
    if (golge) {
      // Gölge: yalnız kalan bir Muhafız'a ya da korunmasız bir tılsıma yakın dur
      const lonely = activePlayers(s).filter((o) => o.role !== 'golge' && activePlayers(s).filter((x) => x.loc === o.loc).length === 1);
      const exposed = Object.keys(s.tilsim).filter((l) => s.tilsim[l] && !s.protectedTilsim[l]);
      targets = rand(s) < 0.5 && targets.length ? targets : [...lonely.map((o) => o.loc), ...exposed];
    } else if (!targets.length) {
      targets = Object.keys(s.tilsim).filter((l) => s.tilsim[l] && !activePlayers(s).some((o) => o.loc === l));
    }
    const to = stepToward(s, p, targets);
    if (to) return { type: 'move', playerId: p.id, to };
  }
  if (av.koru && !golge) return { type: 'guard', playerId: p.id };
  return { type: 'end-turn', playerId: p.id };
}

function botClaim(s, p) {
  if (p.role !== 'golge') return 'dogru';
  const pd = s.pending;
  const c = caseOf(s);
  const pointsToCulprit = !c.dynamic && pd.truth.points?.[c.solution.suspect];
  // Başka biri aynı mekânı açıkça inceleyebilecek yakınlıktaysa yalan risklidir.
  const watchers = activePlayers(s).filter((o) => o.id !== p.id && o.role !== 'golge' && distances(s, o.loc)[pd.loc] <= 1).length;
  const lieChance = watchers ? 0.15 : 0.45;
  if (c.dynamic) return rand(s) < lieChance ? 'sahte' : 'dogru';
  if (pointsToCulprit) return rand(s) < lieChance ? 'sahte' : 'dogru';
  return 'dogru';
}

// ---------- gece ----------
const THREAT = { riza: 3, eleni: 3, nevres: 2, deniz: 1, agop: 1 };

export function botNight(s) {
  const o = nightOptions(s);
  const lastDay = s.day >= era(s).days;
  // Yalnız izini paylaşan masum biri masadaysa öldür: aksi hâlde iz doğrudan onu gösterir.
  const safeKills = o.kills.filter((k) => hasTwinCover(s, k.by, k.target));
  if (safeKills.length && (lastDay ? rand(s) < 0.75 : rand(s) < 0.15)) {
    const best = safeKills.map((k) => ({ ...k, w: (THREAT[player(s, k.target).charId] || 0) + rand(s) * 2 }))
      .sort((a, b) => b.w - a.w)[0];
    return { type: 'night', action: 'kill', target: best.target, cat: botIzChoice(s, best.by, best.target) };
  }
  if (o.steals.length && rand(s) < 0.8) return { type: 'night', action: 'steal', loc: pick(s, o.steals).loc };
  if (o.fakes.length && rand(s) < 0.6) {
    const c = caseOf(s);
    const prefer = o.fakes.filter((l) => c.clues?.[l]);
    return { type: 'night', action: 'fake', loc: pick(s, prefer.length ? prefer : o.fakes) };
  }
  return { type: 'night', action: 'pas' };
}

// Gölge izini, aynı değeri taşıyan masum bir oyuncuya şüphe düşürecek şekilde seçer.
function hasTwinCover(s, golgeId, victimId) {
  const iz = charOf(player(s, golgeId)).iz;
  return Object.keys(iz).some((cat) => activePlayers(s).some((o) => o.id !== golgeId && o.id !== victimId && o.role !== 'golge' && charOf(o).iz[cat] === iz[cat]));
}

export function botIzChoice(s, golgeId, victimId) {
  const g = player(s, golgeId);
  const iz = charOf(g).iz;
  const cats = Object.keys(iz).map((cat) => {
    const twin = activePlayers(s).find((o) => o.id !== g.id && o.id !== victimId && o.role !== 'golge' && charOf(o).iz[cat] === iz[cat]);
    return { cat, w: (twin ? 2 : 0) + rand(s) };
  });
  return cats.sort((a, b) => b.w - a.w)[0].cat;
}

// ---------- Divan ----------
export function botRuhCard(s) {
  const cards = s.divan.cards;
  const valid = cards.map((c, i) => ({ c, i })).filter((x) => x.c.valid);
  return pick(s, valid).i;
}

export function caseScores(s, viewerId) {
  const c = caseOf(s);
  const score = Object.fromEntries(c.suspects.map((x) => [x.id, 0]));
  const alibi = new Set();
  const methods = {};
  const add = (info, w) => {
    for (const [k, v] of Object.entries(info.points || {})) score[k] = (score[k] || 0) + v * w;
    for (const a of info.alibi || []) alibi.add(a);
    if (info.method) methods[info.method] = (methods[info.method] || 0) + w;
  };
  const known = viewerId !== undefined ? s.knowledge[viewerId] : {};
  for (const [loc, cl] of Object.entries(c.clues)) {
    if (known[loc] || publiclyRevealed(s, loc)) add(cl, 1);
  }
  for (const e of s.defter) if (e.puzzleClue && e.era === era(s).year) add(e.puzzleClue, 1);
  for (const e of s.defter) if (e.fake && e.type === 'acik' && e.era === era(s).year) add({ points: {} }, 0);
  for (const cl of s.claims) {
    if (cl.era !== s.eraIndex || cl.by === viewerId || known[cl.loc]) continue;
    const liar = player(s, cl.by).liesCaught > 0 || (cl.checked && cl.lie);
    if (!liar) add(cl.info, 0.6);
  }
  return { score, alibi, methods };
}

export function botAccuse(s, viewerId) {
  const c = caseOf(s);
  const { score, alibi, methods } = caseScores(s, viewerId);
  const cands = c.suspects.filter((x) => !alibi.has(x.id));
  const pool = cands.length ? cands : c.suspects;
  const max = Math.max(...pool.map((x) => score[x.id]));
  const top = pool.filter((x) => score[x.id] === max);
  const suspect = pick(s, top).id;
  const mEntries = Object.entries(methods).sort((a, b) => b[1] - a[1]);
  const method = mEntries.length ? mEntries[0][0] : pick(s, c.methods).id;
  return { suspect, method };
}

// Oyuncuların Gölge olma şüphesi (bakan oyuncunun gözünden)
export function suspicion(s, viewerId) {
  const ev = publicEvidence(s);
  for (const d of s.privateDelil[viewerId] || []) ev.push({ kind: 'must', cat: d.cat, val: d.val });
  const out = {};
  for (const c of activePlayers(s)) {
    if (c.id === viewerId) continue;
    let sc = 0;
    if (ev.length) sc += consistentWith(c, ev) ? 1 + ev.length * 0.7 : -6;
    sc += c.liesCaught * 3;
    if (s.trackingReveal?.target === c.id) sc += 12;
    for (const cl of s.claims) if (cl.by === c.id && cl.lie && cl.archivedBy === viewerId) sc += 4;
    // Ceset gecesi yakınında olanlar
    for (const b of s.bodies) {
      const np = s.nightPositions.find((n) => n.era === b.era && n.pos[b.victimId] === b.loc);
      if (np && np.pos[c.id] && (np.pos[c.id] === b.loc)) sc += 0.5;
    }
    out[c.id] = sc + rand(s) * 0.4;
  }
  return out;
}

export function botVote(s, p) {
  const final = s.divan.step === 'final-oy';
  if (p.role === 'golge') {
    const sus = suspicion(s, -1);
    const innocents = activePlayers(s).filter((o) => o.role !== 'golge');
    const t = innocents.sort((a, b) => (sus[b.id] || 0) - (sus[a.id] || 0))[0];
    if (!t) return null;
    return final || (sus[t.id] || 0) >= 2 ? t.id : null;
  }
  const sus = suspicion(s, p.id);
  const ranked = Object.entries(sus).sort((a, b) => b[1] - a[1]);
  if (!ranked.length) return null;
  const [id, sc] = ranked[0];
  if (final) return Number(id);
  return sc >= 4 ? Number(id) : null;
}

export function botTurn(s) {
  // Bekleyen kararı olan bot varsa ona; yoksa sıradaki bot oyuncuya bir adım oynatır. Hamle yoksa null.
  const pd = s.pending;
  if (s.phase === 'day') {
    const cur = player(s, s.turnOrder[s.turnPos]);
    if (cur?.isBot) return botDayAction(s, cur);
    return null;
  }
  if (s.phase === 'night' && pd?.type === 'night') {
    const g = golgeler(s).filter(isActive);
    if (g.every((x) => x.isBot)) return botNight(s);
    return null;
  }
  if (s.phase === 'night' && pd?.type === 'iz-choice' && player(s, pd.golgeId).isBot) {
    return { type: 'iz-choice', cat: botIzChoice(s, pd.golgeId, pd.target) };
  }
  if (s.phase === 'divan' && s.divan) {
    const d = s.divan;
    if (d.step === 'ruh') {
      const r = player(s, d.ruhQueue[0]);
      if (r.isBot) return { type: 'ruh-hint', playerId: r.id, card: botRuhCard(s) };
    }
    if (d.step === 'surgun' || d.step === 'final-oy') {
      const next = activePlayers(s).find((q) => q.isBot && !(q.id in d.votes));
      if (next) return { type: 'vote', playerId: next.id, target: botVote(s, next) };
    }
  }
  return null;
}

export { TILSIMLAR, IZ_CATEGORIES, CASES };
