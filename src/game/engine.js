// MUAMMA kural motoru. DOM'a dokunmaz; tarayıcıda da Node'da da çalışır.
// Durum (state) düz bir JS nesnesidir; act() onu yerinde değiştirir.
import { LOCATIONS, LOCATION_IDS, LAND_EDGES, SEA_EDGES, RAIL_EDGES, TILSIMLAR } from './data/locations.js';
import { ERAS } from './data/eras.js';
import { CHARACTERS, CHAR_BY_ID, IZ_CATEGORIES } from './data/characters.js';
import { CASES, FAKE_CLUE_TEMPLATES } from './data/cases.js';

export const RULES = {
  ACTIONS_PER_DAY: 2,
  TILSIM_START: 7,
  TILSIM_LOSE_AT: 2,
  KILLS_PER_ERA: 1,
  // Büyük Divan'dan önce kullanılabilecek sürgün hakkı (playtest değişkeni)
  EXILES_BEFORE_FINAL: 1,
  // true: yaşayan Muhafız sayısı Gölge'ye eşitlenince Gölge kazanır (Vampir Köylü kuralı).
  // false: Ruh'lar takımda sayılır; Gölge yalnız bütün Muhafızlar ölürse bu yoldan kazanır.
  PARITY_RULE: false,
  // Suikast, ayakta kalan Muhafız sayısını bu sayının altına indiremez.
  MIN_MUHAFIZ_ALIVE: 2,
  // Büyük Divan'da Muhafızların kazanması için ifşa edilmesi gereken Gölge sayısı (en az 1, en fazla Gölge sayısı).
  FINAL_HITS_NEEDED: 1,
};

// ---------- rastgelelik (tohumlu, tekrar üretilebilir) ----------
export function rand(state) {
  let t = (state.rng = (state.rng + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const pick = (state, arr) => arr[Math.floor(rand(state) * arr.length)];
export function shuffle(state, arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand(state) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- yardımcılar ----------
export const era = (s) => ERAS[s.eraIndex];
export const caseOf = (s) => CASES[era(s).id];
export const player = (s, id) => s.players.find((p) => p.id === id);
export const isActive = (p) => p.status === 'alive';
export const activePlayers = (s) => s.players.filter(isActive);
export const golgeler = (s) => s.players.filter((p) => p.role === 'golge');
export const charOf = (p) => CHAR_BY_ID[p.charId];
export const locName = (s, loc) => LOCATIONS[loc].names[era(s).id] || LOCATIONS[loc].names.bugun;
export const isOpen = (s, loc) => !!LOCATIONS[loc].names[era(s).id];
const norm = (t) => String(t).trim().toLocaleLowerCase('tr').replace(/\s+/g, ' ');

export function edges(s) {
  const list = [
    ...LAND_EDGES.map(([a, b]) => ({ a, b, kind: 'land' })),
    ...SEA_EDGES.map(([a, b]) => ({ a, b, kind: 'sea' })),
  ];
  if (era(s).id === 'bugun') list.push(...RAIL_EDGES.map(([a, b]) => ({ a, b, kind: 'rail' })));
  return list.filter((e) => isOpen(s, e.a) && isOpen(s, e.b));
}

export function neighbors(s, loc) {
  const out = [];
  for (const e of edges(s)) {
    if (e.a === loc) out.push({ to: e.b, kind: e.kind });
    else if (e.b === loc) out.push({ to: e.a, kind: e.kind });
  }
  return out;
}

export const isNear = (s, a, b) => a === b || neighbors(s, a).some((n) => n.to === b);

// Yürü eylemiyle gidilebilecek mekânlar. Kara adımı 1, deniz 2 (tüm hareket), Marmaray 1.
// Kayıkçı Yorgo: deniz 1 adım, toplam 3 adım.
export function reachable(s, p) {
  const kurek = p.charId === 'yorgo';
  const budget = kurek ? 3 : 2;
  const best = { [p.loc]: 0 };
  const queue = [p.loc];
  while (queue.length) {
    const cur = queue.shift();
    for (const n of neighbors(s, cur)) {
      const cost = n.kind === 'sea' && !kurek ? 2 : 1;
      const d = best[cur] + cost;
      if (d <= budget && (best[n.to] === undefined || d < best[n.to])) {
        best[n.to] = d;
        queue.push(n.to);
      }
    }
  }
  delete best[p.loc];
  return best;
}

export function distances(s, from) {
  const dist = { [from]: 0 };
  const q = [from];
  while (q.length) {
    const c = q.shift();
    for (const n of neighbors(s, c)) {
      if (dist[n.to] === undefined) { dist[n.to] = dist[c] + 1; q.push(n.to); }
    }
  }
  return dist;
}

function log(s, entry) {
  s.defter.push({ era: era(s)?.year ?? '', day: s.day, ...entry, n: s.defter.length });
}
function note(s, pid, text) {
  (s.private[pid] ||= []).push({ era: era(s).year, day: s.day, text });
}

// ---------- kurulum ----------
export function createGame({ players, seed = Date.now() % 1e9, mode = 'dedektif' }) {
  if (players.length < 4 || players.length > 8) throw new Error('4–8 oyuncu gerekir');
  const s = {
    version: 1, seed, rng: seed >>> 0, mode,
    phase: 'roles', eraIndex: 0, day: 0, turnOrder: [], turnPos: 0,
    players: [], tilsim: {}, defter: [], private: {}, events: [],
    bodies: [], fakeClues: {}, guards: {}, photos: {}, tracking: null, protectedTilsim: {},
    killsThisEra: 0, solvedCases: 0, caseResults: [], delilKutusu: [], delilRevealed: [],
    claims: [], privateDelil: {}, lastSecret: null, puzzlesSolved: {}, knowledge: {}, nightPositions: [],
    pending: null, divan: null, winner: null, winReason: '', bonusActions: {}, exilesUsed: 0,
  };
  const free = shuffle(s, CHARACTERS.map((c) => c.id).filter((id) => !players.some((p) => p.charId === id)));
  s.players = players.map((p, i) => ({
    id: i, name: p.name || `Oyuncu ${i + 1}`, isBot: !!p.isBot,
    charId: p.charId || free.pop(), role: 'muhafiz', status: 'alive', loc: 'yerebatan',
    actionsLeft: 0, penalty: 0, abilityUsedEra: -1, killedBy: null, ruhHintEra: -1, liesCaught: 0,
  }));
  const golgeCount = mode === 'cirak' ? 0 : players.length >= 7 ? 2 : 1;
  for (const p of shuffle(s, s.players).slice(0, golgeCount)) p.role = 'golge';
  for (const loc of Object.keys(TILSIMLAR)) s.tilsim[loc] = true;
  for (const p of s.players) s.knowledge[p.id] = {};

  // Delil Kutusu: Gölge(ler)in gerçek iz pulları, karışık sırada mühürlü.
  for (const g of golgeler(s)) {
    for (const [cat, val] of Object.entries(charOf(g).iz)) s.delilKutusu.push({ golgeId: g.id, cat, val });
  }
  s.delilKutusu = shuffle(s, s.delilKutusu);

  // Perde IV'ün ipuçları: ilk Gölge'nin izinden doğru değer + aynı kategoriden bir yanıltıcı değer.
  s.finalClues = {};
  const g0 = golgeler(s)[0];
  for (const [loc, def] of Object.entries(CASES.bugun.clueLocations)) {
    if (!g0) { s.finalClues[loc] = { cat: def.cat, text: 'Burada iz yok: Çırak modunda Gölge yoktur.', vals: [] }; continue; }
    const truth = charOf(g0).iz[def.cat];
    const decoy = pick(s, IZ_CATEGORIES[def.cat].values.filter((v) => v !== truth));
    const [a, b] = shuffle(s, [truth, decoy]);
    s.finalClues[loc] = { cat: def.cat, vals: [a, b], text: def.text.replace('{a}', a).replace('{b}', b) };
  }
  return s;
}

export function startGame(s) {
  s.phase = 'prolog';
}

export function startEra(s, index) {
  s.eraIndex = index;
  s.day = 0;
  s.killsThisEra = 0;
  s.protectedTilsim = {};
  s.lastSecret = null;
  s.claims = [];
  s.fakeClues = {};
  for (const p of s.players) if (!isOpen(s, p.loc)) p.loc = 'yerebatan';
  s.phase = 'era-intro';
  log(s, { type: 'olay', text: `${era(s).perde} başladı: ${era(s).year}, ${caseOf(s).title}.` });
}

export function startDay(s) {
  s.day += 1;
  s.phase = 'day';
  const act = activePlayers(s);
  const n = act.length;
  const offset = (s.day - 1 + s.eraIndex) % Math.max(n, 1);
  s.turnOrder = [...act.slice(offset), ...act.slice(0, offset)].map((p) => p.id);
  s.turnPos = 0;
  for (const p of act) {
    p.actionsLeft = Math.max(0, RULES.ACTIONS_PER_DAY - p.penalty + (s.bonusActions[p.id] || 0));
    p.penalty = 0;
  }
  s.bonusActions = {};
  skipEmptyTurns(s);
}

export const currentPlayer = (s) => (s.phase === 'day' ? player(s, s.turnOrder[s.turnPos]) : null);

function skipEmptyTurns(s) {
  while (s.turnPos < s.turnOrder.length) {
    const p = player(s, s.turnOrder[s.turnPos]);
    if (isActive(p) && p.actionsLeft > 0) return;
    s.turnPos += 1;
  }
  beginNight(s);
}

function spend(s, p, n) {
  if (p.actionsLeft < n) throw new Error('Yeterli eylem yok');
  p.actionsLeft -= n;
}

// ---------- gün eylemleri ----------
export function paragraphAt(s, loc) {
  const c = caseOf(s);
  if (c.dynamic) {
    const fc = s.finalClues[loc];
    return fc ? { text: fc.text, summary: fc.text, final: fc } : null;
  }
  return c.clues[loc] || null;
}

export function bodyAt(s, loc) {
  return s.bodies.find((b) => b.loc === loc && !b.examined);
}

export function availableActions(s, p) {
  if (s.phase !== 'day' || currentPlayer(s)?.id !== p.id || s.pending) return {};
  const c = caseOf(s);
  const puz = c.puzzles?.[p.loc];
  const acikCost = p.charId === 'selma' ? 1 : 2;
  const abilityReady = !charOf(p).passive && p.abilityUsedEra !== s.eraIndex;
  return {
    move: Object.keys(reachable(s, p)).length > 0,
    gizli: true,
    acik: p.actionsLeft >= acikCost,
    sorgula: true,
    coz: !!puz && !s.puzzlesSolved[`${s.eraIndex}:${p.loc}`],
    koru: !!s.tilsim[p.loc] && !s.guards[p.loc],
    yetenek: abilityReady && abilityUsable(s, p),
    acikCost,
  };
}

export function abilityUsable(s, p) {
  switch (charOf(p).ability) {
    case 'arsiv': return !!s.lastSecret && s.lastSecret.by !== p.id;
    case 'takip': return activePlayers(s).some((o) => o.id !== p.id && o.loc === p.loc);
    case 'katman': return !!paragraphAt(s, p.loc)?.deep;
    case 'otopsi': return s.bodies.some((b) => b.loc === p.loc) && s.delilKutusu.length > 0;
    case 'pozlama': return !s.photos[p.loc];
    default: return false;
  }
}

export function act(s, a) {
  if (s.winner) throw new Error('Oyun bitti');
  const p = a.playerId !== undefined ? player(s, a.playerId) : null;
  switch (a.type) {
    case 'begin': startEra(s, 0); return;
    case 'start-days': startDay(s); return;
    case 'move': return doMove(s, p, a.to);
    case 'investigate': return doInvestigate(s, p, a.mode);
    case 'claim': return doClaim(s, p, a.claim);
    case 'question': return doQuestion(s, p);
    case 'solve': return doSolve(s, p, a.answer);
    case 'guard': return doGuard(s, p);
    case 'ability': return doAbility(s, p, a.target);
    case 'end-turn': return endTurn(s, p);
    case 'night': return doNight(s, a);
    case 'iz-choice': return doIzChoice(s, a.cat);
    case 'morning-done': return afterMorning(s);
    case 'ruh-hint': return doRuhHint(s, p, a.card);
    case 'accuse': return doAccuse(s, a.suspect, a.method);
    case 'vote': return doVote(s, p, a.target);
    case 'divan-next': return divanNext(s);
    default: throw new Error('Bilinmeyen eylem: ' + a.type);
  }
}

function assertTurn(s, p) {
  if (s.phase !== 'day' || currentPlayer(s)?.id !== p.id) throw new Error('Sıra bu oyuncuda değil');
  if (s.pending) throw new Error('Önce bekleyen kararı ver');
}

function doMove(s, p, to) {
  assertTurn(s, p);
  if (!(to in reachable(s, p))) throw new Error('Oraya gidilemez');
  spend(s, p, 1);
  p.loc = to;
  log(s, { type: 'hareket', by: p.id, text: `${p.name} → ${locName(s, to)}` });
  afterAction(s, p);
}

function revealBody(s, p) {
  const b = bodyAt(s, p.loc);
  if (!b) return null;
  b.examined = true;
  const label = IZ_CATEGORIES[b.iz.cat].label;
  log(s, { type: 'iz', by: p.id, text: `${p.name}, ${player(s, b.victimId).name} cesedini inceledi. Katilin izi: ${label} = ${b.iz.val}.`, iz: b.iz });
  return b;
}

function doInvestigate(s, p, mode) {
  assertTurn(s, p);
  const cost = mode === 'acik' ? (p.charId === 'selma' ? 1 : 2) : 1;
  spend(s, p, cost);
  revealBody(s, p);
  const fake = s.fakeClues[p.loc];
  let para = paragraphAt(s, p.loc);
  let isFake = false;
  if (fake) {
    isFake = true;
    para = { text: fake.text, summary: fake.text, points: { [fake.suspect]: 1 }, fake: true };
    delete s.fakeClues[p.loc];
  }
  const text = para ? para.text : `${locName(s, p.loc)}: burada bu vakayla ilgili bir şey bulamadın.`;
  const summary = para ? para.summary : `${locName(s, p.loc)}: vakayla ilgili bir şey yok.`;
  if (para && !isFake) s.knowledge[p.id][p.loc] = true;
  if (mode === 'acik') {
    log(s, { type: 'acik', by: p.id, loc: p.loc, text: `${p.name} (Açık İnceleme, ${locName(s, p.loc)}): ${text}`, clue: para && !isFake ? p.loc : null, fake: isFake, verified: true });
    if (para && !isFake) for (const q of s.players) s.knowledge[q.id][p.loc] = true;
    // Daha önce bu mekân için yapılan iddiaları sına
    for (const c of s.claims.filter((c) => c.loc === p.loc && !c.checked && !c.fakeSource)) {
      c.checked = true;
      if (c.lie) {
        player(s, c.by).liesCaught += 1;
        log(s, { type: 'curutuldu', by: c.by, text: `Açık İnceleme ${player(s, c.by).name}'in ${locName(s, p.loc)} iddiasını çürüttü!` });
      }
    }
    afterAction(s, p);
  } else {
    s.lastSecret = { by: p.id, loc: p.loc, text };
    const dec = decoySummary(s, p.loc);
    s.pending = {
      type: 'claim', playerId: p.id, loc: p.loc, text, trueSummary: summary, decoy: dec.text, isFake,
      truth: para ? { points: para.points || {}, alibi: para.alibi || [], method: para.method || null } : { points: {}, alibi: [] },
      lieInfo: { points: dec.suspect ? { [dec.suspect]: 2 } : {}, alibi: [], method: null },
    };
  }
}

function decoySummary(s, loc) {
  const c = caseOf(s);
  if (c.dynamic) {
    const fc = s.finalClues[loc];
    if (!fc || !fc.vals.length) return { text: `${locName(s, loc)}: vakayla ilgili bir şey yok.` };
    const vals = IZ_CATEGORIES[fc.cat].values.filter((v) => !fc.vals.includes(v));
    return { text: `${locName(s, loc)}: iz bulanık ama ${IZ_CATEGORIES[fc.cat].label.toLowerCase()} ya ${vals[0]} ya ${vals[1]}.`, vals: vals.map((v) => ({ cat: fc.cat, val: v })) };
  }
  const wrong = c.suspects.filter((x) => x.id !== c.solution.suspect);
  const sus = pick(s, wrong);
  return { text: `${locName(s, loc)}: her şey ${sus.name}'i gösteriyor.`, suspect: sus.id };
}

function doClaim(s, p, claim) {
  const pd = s.pending;
  if (!pd || pd.type !== 'claim' || pd.playerId !== p.id) throw new Error('Bekleyen iddia yok');
  s.pending = null;
  if (claim === 'sus') {
    log(s, { type: 'iddia', by: p.id, loc: pd.loc, text: `${p.name} ${locName(s, pd.loc)}'yı gizlice inceledi ve bir şey söylemedi.` });
  } else {
    const lie = claim === 'sahte';
    const text = lie ? pd.decoy : pd.trueSummary;
    s.claims.push({ by: p.id, loc: pd.loc, lie, checked: false, fakeSource: pd.isFake, era: s.eraIndex, info: lie ? pd.lieInfo : pd.truth });
    log(s, { type: 'iddia', by: p.id, loc: pd.loc, text: `${p.name} (Gizli İnceleme iddiası): ${text}`, lie, fake: pd.isFake });
  }
  afterAction(s, p);
}

function doQuestion(s, p) {
  assertTurn(s, p);
  spend(s, p, 1);
  const w = caseOf(s).witnesses?.[p.loc];
  const nt = LOCATIONS[p.loc].notes[era(s).id] || LOCATIONS[p.loc].notes.bugun;
  log(s, { type: 'tanik', by: p.id, loc: p.loc, text: `${p.name} ${locName(s, p.loc)}'da sorguladı. ${w ? w + ' ' : ''}Tarih notu: ${nt}` });
  afterAction(s, p);
}

export function puzzleAt(s, loc) {
  return caseOf(s).puzzles?.[loc] || null;
}

function doSolve(s, p, answer) {
  assertTurn(s, p);
  const puz = puzzleAt(s, p.loc);
  const key = `${s.eraIndex}:${p.loc}`;
  if (!puz || s.puzzlesSolved[key]) throw new Error('Burada çözülecek bulmaca yok');
  spend(s, p, 1);
  const ok = puz.answers.map(norm).includes(norm(answer));
  if (!ok) {
    if (p.charId !== 'zeynep') p.penalty += 1;
    log(s, { type: 'bulmaca', by: p.id, text: `${p.name} "${puz.title}" bulmacasını çözemedi.${p.charId !== 'zeynep' ? ' Yarın 1 eylem eksik.' : ' (Hat Bilgisi: ceza yok)'}` });
    afterAction(s, p);
    return false;
  }
  s.puzzlesSolved[key] = true;
  const r = puz.reward;
  let extra = '';
  if (r.type === 'clue') {
    for (const q of s.players) s.knowledge[q.id]['puz:' + key] = true;
  } else if (r.type === 'tilsim') {
    s.protectedTilsim[p.loc] = true;
  } else if (r.type === 'action') {
    p.actionsLeft += 1;
  } else if (r.type === 'delil') {
    extra = ' ' + revealDelil(s);
  }
  log(s, { type: 'bulmaca', by: p.id, text: `${p.name} "${puz.title}" bulmacasını çözdü! ${r.text}${extra}`, puzzleClue: r.type === 'clue' ? r : null });
  afterAction(s, p);
  return true;
}

function revealDelil(s) {
  const left = s.delilKutusu.filter((d) => !s.delilRevealed.includes(d));
  if (!left.length) return 'Delil Kutusu boş.';
  const d = left[0];
  s.delilRevealed.push(d);
  return `Delil pulu: ${IZ_CATEGORIES[d.cat].label} = ${d.val}.`;
}

function doGuard(s, p) {
  assertTurn(s, p);
  if (!s.tilsim[p.loc]) throw new Error('Burada tılsım yok');
  spend(s, p, 1);
  s.guards[p.loc] = p.id;
  log(s, { type: 'koru', by: p.id, text: `${p.name}, ${TILSIMLAR[p.loc]} tılsımına bu gece nöbet tutuyor.` });
  afterAction(s, p);
}

function doAbility(s, p, target) {
  assertTurn(s, p);
  if (charOf(p).passive || p.abilityUsedEra === s.eraIndex || !abilityUsable(s, p)) throw new Error('Yetenek kullanılamaz');
  spend(s, p, 1);
  p.abilityUsedEra = s.eraIndex;
  const ab = charOf(p).ability;
  if (ab === 'arsiv') {
    const ls = s.lastSecret;
    note(s, p.id, `Arşiv: ${player(s, ls.by).name}'in okuduğu paragraf (${locName(s, ls.loc)}): ${ls.text}`);
    const claim = [...s.claims].reverse().find((c) => c.by === ls.by && c.loc === ls.loc);
    s.knowledge[p.id][ls.loc] = true;
    if (claim) claim.archivedBy = p.id;
    log(s, { type: 'yetenek', by: p.id, text: `${p.name} Arşiv yeteneğiyle ${player(s, ls.by).name}'in gizli okuduğu paragrafı okudu.` });
  } else if (ab === 'takip') {
    const t = player(s, target);
    if (!t || t.loc !== p.loc || !isActive(t) || t.id === p.id) throw new Error('Takip için aynı mekânda bir oyuncu seç');
    s.tracking = { by: p.id, target: t.id };
    log(s, { type: 'yetenek', by: p.id, text: `${p.name}, ${t.name}'i bu gece takip edecek.` });
  } else if (ab === 'katman') {
    const para = paragraphAt(s, p.loc);
    log(s, { type: 'acik', by: p.id, loc: p.loc, text: `${p.name} (Katman, ${locName(s, p.loc)}): ${para.deep}`, verified: true });
  } else if (ab === 'otopsi') {
    const d = pick(s, s.delilKutusu);
    (s.privateDelil[p.id] ||= []).push({ cat: d.cat, val: d.val });
    note(s, p.id, `Otopsi: Delil Kutusu'ndaki bir pul ${IZ_CATEGORIES[d.cat].label} = ${d.val}.`);
    log(s, { type: 'yetenek', by: p.id, text: `${p.name} otopsi yaptı ve Delil Kutusu'ndan bir pulu gizlice gördü.` });
  } else if (ab === 'pozlama') {
    s.photos[p.loc] = p.id;
    log(s, { type: 'yetenek', by: p.id, text: `${p.name}, ${locName(s, p.loc)}'a Fotoğraf koydu: bu gece burası güvende.` });
  }
  afterAction(s, p);
}

function afterAction(s, p) {
  if (s.winner) return;
  if (p.actionsLeft <= 0) endTurn(s, p);
}

function endTurn(s, p) {
  if (s.phase !== 'day' || currentPlayer(s)?.id !== p.id) return;
  if (s.pending) throw new Error('Önce bekleyen kararı ver');
  p.actionsLeft = 0;
  s.turnPos += 1;
  skipEmptyTurns(s);
}

// ---------- gece ----------
function beginNight(s) {
  s.phase = 'night';
  s.nightPositions.push({ era: s.eraIndex, day: s.day, pos: Object.fromEntries(activePlayers(s).map((p) => [p.id, p.loc])) });
  const g = golgeler(s).filter(isActive);
  s.pending = g.length ? { type: 'night', golgeIds: g.map((x) => x.id) } : null;
  if (!g.length) resolveNight(s, { action: 'pas' });
}

export function nightOptions(s) {
  const g = golgeler(s).filter(isActive);
  const kills = [];
  const aliveM = activePlayers(s).filter((p) => p.role !== 'golge').length;
  if (s.killsThisEra < RULES.KILLS_PER_ERA && aliveM > RULES.MIN_MUHAFIZ_ALIVE) {
    for (const v of activePlayers(s)) {
      if (v.role === 'golge' || s.photos[v.loc]) continue;
      const by = g.find((x) => isNear(s, x.loc, v.loc));
      if (by) kills.push({ target: v.id, by: by.id });
    }
  }
  const steals = [];
  for (const loc of Object.keys(s.tilsim)) {
    if (!s.tilsim[loc] || s.guards[loc] || s.photos[loc] || s.protectedTilsim[loc]) continue;
    if (activePlayers(s).some((q) => q.role !== 'golge' && q.loc === loc)) continue;
    const by = g.find((x) => isNear(s, x.loc, loc));
    if (by) steals.push({ loc, by: by.id });
  }
  const fakes = LOCATION_IDS.filter((l) => isOpen(s, l) && !s.fakeClues[l] && !caseOf(s).dynamic);
  return { kills, steals, fakes };
}

function doNight(s, a) {
  if (s.phase !== 'night' || s.pending?.type !== 'night') throw new Error('Gece değil');
  const opts = nightOptions(s);
  if (a.action === 'kill') {
    const k = opts.kills.find((x) => x.target === a.target);
    if (!k) throw new Error('Bu oyuncuya ulaşamazsın');
    s.pending = { type: 'iz-choice', golgeId: k.by, target: k.target };
    s.nightChoice = { action: 'kill', target: k.target, by: k.by };
    if (a.cat) doIzChoice(s, a.cat);
    return;
  }
  if (a.action === 'steal' && !opts.steals.some((x) => x.loc === a.loc)) throw new Error('Bu tılsıma ulaşamazsın');
  if (a.action === 'fake' && !opts.fakes.includes(a.loc)) throw new Error('Buraya sahte iz konamaz');
  resolveNight(s, a);
}

function doIzChoice(s, cat) {
  if (s.pending?.type !== 'iz-choice') throw new Error('İz seçimi beklenmiyor');
  const g = player(s, s.pending.golgeId);
  if (!charOf(g).iz[cat]) throw new Error('Geçersiz iz');
  resolveNight(s, { ...s.nightChoice, cat });
}

function resolveNight(s, a) {
  s.pending = null;
  const events = [];
  if (a.action === 'kill') {
    const v = player(s, a.target);
    const g = player(s, a.by);
    v.status = 'ruh';
    v.killedBy = g.id;
    v.diedEra = s.eraIndex;
    s.killsThisEra += 1;
    s.bodies.push({ loc: v.loc, victimId: v.id, era: s.eraIndex, iz: { cat: a.cat, val: charOf(g).iz[a.cat] } });
    events.push(`${v.name} gece ${locName(s, v.loc)}'da öldürüldü. Artık bir Ruh: konuşamaz ama katilini rüyalarla gösterecek.`);
    if (s.tracking && s.tracking.target === g.id) {
      events.push(`Takip! ${player(s, s.tracking.by).name}, ${g.name}'in cinayet mahalline gittiğini gördü.`);
      s.trackingReveal = { by: s.tracking.by, target: g.id };
    }
  } else if (a.action === 'steal') {
    s.tilsim[a.loc] = false;
    events.push(`Sabah ${TILSIMLAR[a.loc]} tılsımı (${locName(s, a.loc)}) yerinde yok!`);
  } else if (a.action === 'fake') {
    s.fakeClues[a.loc] = { suspect: null, text: '' };
    const c = caseOf(s);
    const wrong = c.suspects.filter((x) => x.id !== c.solution.suspect);
    const sus = pick(s, wrong);
    s.fakeClues[a.loc] = { suspect: sus.id, text: pick(s, FAKE_CLUE_TEMPLATES).replace('{s}', sus.name) };
  }
  if (!events.length) events.push('Gece sessiz geçti. Bekçinin sopası sabaha kadar kaldırımlarda yankılandı.');
  for (const e of events) log(s, { type: 'olay', text: e });
  s.morning = events;
  s.guards = {};
  s.photos = {};
  s.tracking = null;
  s.nightChoice = null;
  s.phase = 'morning';
  checkWin(s);
}

function afterMorning(s) {
  if (s.winner) return;
  if (s.day >= era(s).days) openDivan(s);
  else startDay(s);
}

// ---------- Divan ----------
export function tilsimCount(s) {
  return Object.values(s.tilsim).filter(Boolean).length;
}

function openDivan(s) {
  const final = caseOf(s).dynamic;
  if (final && !golgeler(s).length) {
    return setWinner(s, s.solvedCases >= 2 ? 'muhafiz' : 'golge',
      `Çırak modu bitti: ${s.solvedCases}/3 vaka çözüldü. ${s.solvedCases >= 2 ? 'İstanbul turunu başarıyla tamamladınız.' : 'Bir dahaki sefere daha çok ipucu toplayın.'}`);
  }
  s.phase = 'divan';
  const ruhs = s.players.filter((p) => p.status === 'ruh' && p.killedBy !== null && p.ruhHintEra !== s.eraIndex);
  s.divan = { step: ruhs.length ? 'ruh' : final ? 'final-delil' : 'suclama', ruhQueue: ruhs.map((p) => p.id), votes: {}, final };
  if (ruhs.length) s.divan.cards = dealRuhCards(s, ruhs[0]);
  if (!ruhs.length && final) finalDelil(s);
}

export function dealRuhCards(s, ruh) {
  const killer = charOf(player(s, ruh.killedBy)).iz;
  const cats = Object.keys(IZ_CATEGORIES);
  const randomCard = () => {
    const [c1, c2] = shuffle(s, cats).slice(0, 2);
    return [{ cat: c1, val: pick(s, IZ_CATEGORIES[c1].values) }, { cat: c2, val: pick(s, IZ_CATEGORIES[c2].values) }];
  };
  const [k1, k2] = shuffle(s, cats).slice(0, 2);
  const valid = [{ cat: k1, val: killer[k1] }, { cat: k2, val: pick(s, IZ_CATEGORIES[k2].values) }];
  return shuffle(s, [shuffle(s, valid), randomCard(), randomCard()]).map((card) => ({
    symbols: card, valid: card.some((x) => killer[x.cat] === x.val),
  }));
}

function doRuhHint(s, p, cardIndex) {
  const d = s.divan;
  if (s.phase !== 'divan' || d.step !== 'ruh' || d.ruhQueue[0] !== p.id) throw new Error('Ruh sırası değil');
  const card = d.cards[cardIndex];
  if (!card?.valid) throw new Error('Ruh yalnız katiline uyan bir rüya gösterebilir');
  p.ruhHintEra = s.eraIndex;
  const txt = card.symbols.map((x) => `${IZ_CATEGORIES[x.cat].label}: ${x.val}`).join(' + ');
  log(s, { type: 'ruh', by: p.id, text: `${p.name}'in Ruhu bir rüya gösterdi: ${txt}. (En az biri katile ait.)`, card: card.symbols });
  d.ruhQueue.shift();
  if (d.ruhQueue.length) d.cards = dealRuhCards(s, player(s, d.ruhQueue[0]));
  else {
    d.cards = null;
    d.step = d.final ? 'final-delil' : 'suclama';
    if (d.final) finalDelil(s);
  }
}

function doAccuse(s, suspect, method) {
  const d = s.divan;
  if (s.phase !== 'divan' || d.step !== 'suclama') throw new Error('Suçlama zamanı değil');
  const c = caseOf(s);
  const ok = suspect === c.solution.suspect;
  const methodOk = method === c.solution.method;
  const susName = c.suspects.find((x) => x.id === suspect)?.name || '?';
  const before = tilsimCount(s);
  if (ok) {
    s.solvedCases += 1;
    const lost = Object.keys(s.tilsim).find((l) => !s.tilsim[l]);
    if (lost) s.tilsim[lost] = true;
  } else {
    const have = Object.keys(s.tilsim).filter((l) => s.tilsim[l]);
    if (have.length) s.tilsim[pick(s, have)] = false;
  }
  s.caseResults.push({ era: s.eraIndex, suspect, method, ok, methodOk });
  d.result = { ok, methodOk, suspect: susName, solution: c.solution.text };
  log(s, {
    type: 'divan',
    text: ok
      ? `Divan ${susName}'i suçladı: DOĞRU! ${methodOk ? 'Yöntem de doğru. ' : ''}Bir tılsım geri döndü${before === RULES.TILSIM_START ? ' (hepsi zaten yerindeydi)' : ''}, finalde 1 Delil hakkı kazanıldı.`
      : `Divan ${susName}'i suçladı: YANLIŞ. Bir tılsım kayboldu.`,
  });
  d.step = 'suclama-sonuc';
  checkWin(s);
}

function finalDelil(s) {
  const n = s.solvedCases;
  const msgs = [];
  for (let i = 0; i < n; i++) msgs.push(revealDelil(s));
  log(s, { type: 'divan', text: `Büyük Divan: çözülen ${n} vaka için Delil Kutusu açılıyor. ${msgs.join(' ')}` });
  s.divan.step = 'final-oy';
  s.divan.finalRound = 0;
  s.divan.identified = [];
}

function doVote(s, p, target) {
  const d = s.divan;
  if (s.phase !== 'divan' || !['surgun', 'final-oy'].includes(d.step)) throw new Error('Oylama zamanı değil');
  if (!isActive(p)) throw new Error('Yalnız yaşayan oyuncular oy verir');
  d.votes[p.id] = target ?? null;
  const voters = activePlayers(s);
  if (voters.every((v) => v.id in d.votes)) tallyVotes(s);
}

export function voteTally(s) {
  const counts = {};
  for (const t of Object.values(s.divan.votes)) if (t !== null) counts[t] = (counts[t] || 0) + 1;
  return counts;
}

function tallyVotes(s) {
  const d = s.divan;
  const counts = voteTally(s);
  const voters = activePlayers(s).length;
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const final = d.step === 'final-oy';
  const majority = top && (final ? top[1] > voters / 2 || isUniqueTop(counts) : top[1] > voters / 2);
  d.votes = {};
  if (!majority) {
    log(s, { type: 'divan', text: final ? 'Büyük Divan kimsede uzlaşamadı.' : 'Sürgün için çoğunluk sağlanamadı; kimse sürülmedi.' });
    if (final) return endFinal(s, false);
    d.step = 'sonuc';
    return;
  }
  const t = player(s, Number(top[0]));
  if (!final) s.exilesUsed += 1;
  if (final) {
    const hit = t.role === 'golge';
    log(s, { type: 'divan', text: `Büyük Divan ${t.name}'i gösterdi. Rol kartı açılıyor: ${hit ? 'GÖLGE!' : 'Muhafız.'}` });
    if (!hit) return endFinal(s, false);
    d.identified.push(t.id);
    t.status = 'ifsa';
    const remaining = golgeler(s).filter((g) => isActive(g));
    if (!remaining.length || d.identified.length >= RULES.FINAL_HITS_NEEDED) return endFinal(s, true);
    d.finalRound += 1;
    return;
  }
  if (t.role === 'golge') {
    t.status = 'surgun';
    log(s, { type: 'divan', text: `${t.name} sürgün edildi. Rol kartı: GÖLGE!` });
  } else {
    t.status = 'ruh';
    t.exiled = true;
    const have = Object.keys(s.tilsim).filter((l) => s.tilsim[l]);
    if (have.length) s.tilsim[pick(s, have)] = false;
    log(s, { type: 'divan', text: `${t.name} sürgün edildi. Rol kartı: Muhafız. Masum birini sürdünüz, bir tılsım kayboldu. ${t.name} artık Ruh olarak bir Muhafız'a fısıldayacak.` });
    const alive = activePlayers(s).filter((q) => q.role !== 'golge');
    if (alive.length) {
      const lucky = pick(s, alive);
      s.bonusActions[lucky.id] = (s.bonusActions[lucky.id] || 0) + 1;
      log(s, { type: 'olay', text: `${t.name}'in fısıltısı: ${lucky.name} yarın 1 eylem fazla yapacak.` });
    }
  }
  d.step = 'sonuc';
  checkWin(s);
}

function isUniqueTop(counts) {
  const v = Object.values(counts).sort((a, b) => b - a);
  return v.length > 0 && (v.length === 1 || v[0] > v[1]);
}

function divanNext(s) {
  const d = s.divan;
  if (d.step === 'suclama-sonuc') {
    if (s.exilesUsed >= RULES.EXILES_BEFORE_FINAL || !golgeler(s).length) { d.step = 'sonuc'; d.skipExile = true; return; }
    d.step = 'surgun'; d.votes = {}; return;
  }
  if (d.step === 'surgun') { d.step = 'sonuc'; return; }
  if (d.step === 'sonuc') {
    if (s.winner) return;
    s.divan = null;
    startEra(s, s.eraIndex + 1);
  }
}

function endFinal(s, muhafizWin) {
  setWinner(s, muhafizWin ? 'muhafiz' : 'golge', muhafizWin
    ? 'Büyük Divan Gölge\'yi ifşa etti. Usturlap tamamlandı, şehrin hafızası korundu.'
    : 'Gölge Büyük Divan\'dan sıyrıldı. Şehrin hafızası artık onun elinde.');
}

function setWinner(s, who, reason) {
  if (s.winner) return;
  s.winner = who;
  s.winReason = reason;
  s.phase = 'over';
  s.pending = null;
  log(s, { type: 'son', text: reason });
}

export function checkWin(s) {
  if (s.winner) return;
  if (tilsimCount(s) <= RULES.TILSIM_LOSE_AT) {
    return setWinner(s, 'golge', `Tılsımlar ${tilsimCount(s)}'ye düştü. Gölge şehrin hafızasını sildi.`);
  }
  const g = golgeler(s);
  if (g.length && g.every((x) => !isActive(x))) {
    return setWinner(s, 'muhafiz', 'Bütün Gölgeler sürüldü. Muvakkithane Cemiyeti kazandı.');
  }
  const aliveG = g.filter(isActive).length;
  const aliveM = activePlayers(s).filter((p) => p.role !== 'golge').length;
  if (aliveG && (aliveM === 0 || (RULES.PARITY_RULE && aliveM <= aliveG))) {
    return setWinner(s, 'golge', aliveM === 0
      ? 'Ayakta tek Muhafız kalmadı. Gölge şehri ele geçirdi.'
      : 'Muhafızların sayısı Gölge\'ye denk düştü; artık kimse onu durduramaz.');
  }
}

// ---------- kamu delilleri (botlar ve "Dedektif Defteri" ekranı için) ----------
export function publicEvidence(s) {
  const ev = [];
  for (const b of s.bodies) if (b.examined) ev.push({ kind: 'must', cat: b.iz.cat, val: b.iz.val, src: 'iz' });
  for (const e of s.defter) if (e.type === 'ruh') ev.push({ kind: 'any', items: e.card, src: 'ruh' });
  for (const d of s.delilRevealed) ev.push({ kind: 'must', cat: d.cat, val: d.val, src: 'delil' });
  if (s.eraIndex === 3) {
    for (const e of s.defter) {
      if (e.type === 'acik' && e.loc && s.finalClues[e.loc] && e.era === 'Bugün') {
        const fc = s.finalClues[e.loc];
        ev.push({ kind: 'any', items: fc.vals.map((v) => ({ cat: fc.cat, val: v })), src: 'kazi' });
      }
    }
  }
  return ev;
}

export function consistentWith(p, ev) {
  const iz = charOf(p).iz;
  return ev.every((e) => (e.kind === 'must' ? iz[e.cat] === e.val : e.items.some((x) => iz[x.cat] === x.val)));
}
