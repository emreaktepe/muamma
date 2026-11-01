import '@fontsource/cinzel/400.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/700.css';
import '@fontsource/courier-prime/400.css';
import './styles.css';

import {
  createGame, startGame, act, era, caseOf, player, activePlayers, charOf, reachable, availableActions,
  currentPlayer, nightOptions, locName, tilsimCount, puzzleAt, golgeler, isActive, RULES, publicEvidence,
  consistentWith, voteTally, bodyAt, abilityUsable, paragraphAt, eraDays, hauntOptions, isEvil, isDetained,
  missionProgress,
} from './game/engine.js';
import { botTurn } from './game/ai.js';
import { stepAuto } from './game/autoplay.js';
import { CHARACTERS, CHAR_BY_ID, IZ_CATEGORIES } from './game/data/characters.js';
import { TILSIMLAR, LOCATIONS } from './game/data/locations.js';
import { CASES } from './game/data/cases.js';
import { boardSVG } from './ui/board.js';

const app = document.getElementById('app');
const SAVE_KEY = 'muamma-save-v1';
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DELAYS = { yavas: 1300, normal: 650, hizli: 140 };

let S = null;
const ui = {
  setup: defaultSetup(),
  speed: 'normal',
  tab: 'defter',
  modal: null,
  gate: {},          // gizli ekranlar için "yalnız X baksın" onayları
  roleQueue: null,
  roleShown: false,
  night: null,       // { queue:[ids], pos, shown, decision }
  error: null,
};

function defaultSetup() {
  return {
    count: 5, mode: 'dedektif', seed: Math.floor(Math.random() * 1e6),
    rows: Array.from({ length: 8 }, (_, i) => ({ name: i === 0 ? 'Sen' : `Bot ${i}`, isBot: i !== 0, charId: '' })),
  };
}

// ---------- kayıt ----------
function save() {
  try { if (S) localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch { /* tarayıcı izin vermiyorsa geç */ }
}
function loadSaved() {
  try { const t = localStorage.getItem(SAVE_KEY); return t ? JSON.parse(t) : null; } catch { return null; }
}
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch { /* */ } }

// ---------- yardımcılar ----------
const humans = () => (S ? S.players.filter((p) => !p.isBot) : []);
const multiHuman = () => humans().length > 1;
const spectator = () => S && humans().length === 0;
const avatar = (p, cls = '') => `<img class="av ${cls}" src="assets/avatar_${p.charId}.webp" alt="">`;
// v2 görselleri: src/assets/v2 içinde ne varsa (yoksa null döner, yedek görsel kullanılır)
const V2 = import.meta.glob('./assets/v2/*.{webp,png,jpg}', { eager: true, query: '?url', import: 'default' });
const v2 = (name) => {
  const k = Object.keys(V2).find((f) => f.split('/').pop().replace(/\.(webp|png|jpg)$/, '') === name);
  return k ? V2[k] : null;
};
const v2img = (name, cls = '', fallback = null) => {
  const src = v2(name) || fallback;
  return src ? `<img class="${cls}" src="${src}" alt="">` : '';
};
const izIcon = (cat, val) => {
  const i = IZ_CATEGORIES[cat].values.indexOf(val);
  return v2img(`iz_${cat}_${i}`, 'izi');
};
const ROLE_NAME = { golge: 'GÖLGE', ortak: 'SUÇ ORTAĞI', muhafiz: 'Muhafız' };
const tilsimIcons = () => Object.keys(TILSIMLAR).map((l) => `<span class="ts ${S.tilsim[l] ? 'on' : 'off'}" title="${esc(TILSIMLAR[l])}">✦</span>`).join('');

function dispatch(a) {
  try {
    act(S, a);
    ui.error = null;
  } catch (e) {
    ui.error = e.message;
  }
  save();
  render();
}

function gateNeeded(key) {
  return multiHuman() && !ui.gate[key];
}
function gateView(key, p, what) {
  return `<div class="gate">
    <div class="gate-card">${avatar(p, 'lg')}
      <h3>Yalnız ${esc(p.name)} baksın</h3>
      <p>${esc(what)} Cihazı ${esc(p.name)}'e ver; diğerleri başka yere baksın.</p>
      <button class="btn gold" data-act="gate-open" data-key="${esc(key)}">Göster</button>
    </div></div>`;
}

// ---------- ekranlar ----------
function setupView() {
  const st = ui.setup;
  const saved = loadSaved();
  const rows = st.rows.slice(0, st.count).map((r, i) => `
    <div class="prow">
      <span class="num">${i + 1}</span>
      <input data-in="name" data-i="${i}" value="${esc(r.name)}" maxlength="18" aria-label="Oyuncu adı">
      <select data-in="bot" data-i="${i}" aria-label="İnsan ya da bot">
        <option value="0" ${!r.isBot ? 'selected' : ''}>İnsan</option>
        <option value="1" ${r.isBot ? 'selected' : ''}>Bot</option>
      </select>
      <select data-in="char" data-i="${i}" aria-label="Karakter">
        <option value="">Rastgele karakter</option>
        ${CHARACTERS.map((c) => `<option value="${c.id}" ${r.charId === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
      </select>
    </div>`).join('');
  return `<div class="setup">
    <div class="hero"><img src="assets/logo_a.webp" alt="MUAMMA logosu"><div>
      <h1>İstanbul'un Yedi Tılsımı</h1><p class="sub">Dijital prototip v0.2</p>
      <p>Dört çağ, dört cinayet ve aranızda gizlenen bir Gölge. Bu prototip kuralları denemek, dengeyi ölçmek ve oyunu birlikte anlamak için.</p>
    </div></div>
    <div class="panel-card">
      <h2>Masa</h2>
      <div class="row2">
        <label>Oyuncu sayısı <select data-in="count">${[4, 5, 6, 7, 8].map((n) => `<option ${n === st.count ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label>Mod <select data-in="mode">
          <option value="dedektif" ${st.mode === 'dedektif' ? 'selected' : ''}>Dedektif (Gölge var)</option>
          <option value="cirak" ${st.mode === 'cirak' ? 'selected' : ''}>Çırak (Gölge yok, işbirlikçi)</option>
        </select></label>
        <label>Tohum <input data-in="seed" value="${st.seed}" inputmode="numeric" aria-label="Rastgelelik tohumu"></label>
        <label>Bot hızı <select data-in="speed">${Object.keys(DELAYS).map((k) => `<option value="${k}" ${ui.speed === k ? 'selected' : ''}>${{ yavas: 'Yavaş', normal: 'Normal', hizli: 'Hızlı' }[k]}</option>`).join('')}</select></label>
      </div>
      <p class="hint">Aynı cihazda birden çok insan oynuyorsa gizli ekranlar "Yalnız X baksın" onayıyla açılır. Herkesi bot yaparsan oyunu seyirci olarak izlersin.</p>
      ${rows}
      <div class="btns">
        <button class="btn gold" data-act="start">Oyunu başlat</button>
        ${saved && !saved.winner ? '<button class="btn" data-act="resume">Kayıtlı oyuna devam et</button>' : ''}
        <button class="btn ghost" data-act="help">Kurallar</button>
        ${window.MUAMMA_canInstall?.() ? '<button class="btn" data-act="install">Uygulamayı yükle</button>' : ''}
      </div>
    </div>
    <div class="showcase">
      <figure><img src="assets/kutu_3d.webp" alt="MUAMMA kutusu"><figcaption>Kutu</figcaption></figure>
      <figure><img src="assets/oynanis.webp" alt="Masada MUAMMA oynanışı"><figcaption>Masada oynanış</figcaption></figure>
    </div>
    <img class="lineup" src="assets/dizilis.webp" alt="Sekiz karakterin dizilişi">
  </div>`;
}

function roleView() {
  if (!ui.roleQueue) ui.roleQueue = humans().map((p) => p.id);
  if (!ui.roleQueue.length) {
    return `<div class="story"><img src="assets/kart_arkasi.webp" alt=""><div class="story-text">
      <h2>Roller dağıtıldı</h2><p>${spectator() ? 'Bütün koltuklar bot. Oyunu seyirci olarak izleyeceksin; botların rolleri oyun sonunda açılacak.' : 'Herkes rolünü gördü. Şimdi Yerebatan Sarnıcı\'na iniyoruz.'}</p>
      <button class="btn gold" data-act="roles-done">Prologa geç</button></div></div>`;
  }
  const p = player(S, ui.roleQueue[0]);
  if (!ui.roleShown) {
    return `<div class="gate"><div class="gate-card">${avatar(p, 'lg')}<h3>${esc(p.name)}, rolüne bak</h3>
      <p>Cihazı ${esc(p.name)}'e ver. Rol kartını yalnız o görsün.</p>
      <button class="btn gold" data-act="role-show">Rolümü göster</button></div></div>`;
  }
  const team = S.players.filter((q) => q.id !== p.id && isEvil(q) && isEvil(p));
  const roleImg = p.role === 'golge' ? 'assets/rol_golge.webp' : p.role === 'ortak' ? (v2('rol_ortak') || 'assets/rol_golge.webp') : 'assets/rol_muhafiz.webp';
  const texts = {
    golge: 'Amacın: Büyük Divan\'dan sıyrılmak ya da gizli görevini tamamlamak. Gece yakınındaki bir Muhafız\'ı öldürebilir, tılsım çalabilir ya da sahte iz bırakabilirsin. Gizli İncele\'den sonra yalan söyleyebilirsin.',
    ortak: 'Gölge\'nin Suç Ortağısın. Gece hamlen yok ama Gölge\'yi tanıyorsun: yalan söyle, şüpheyi başkalarına çevir, Divan\'da Gölge\'yi koru. Gölge kazanırsa sen de kazanırsın.',
    muhafiz: 'Amacın: dört vakayı çözmek, tılsımları korumak ve Büyük Divan\'da Gölge\'yi bulmak. Açık İnceleme yalanları çürütür; iz kartları katili daraltır.',
  };
  const titles = { golge: 'Sen GÖLGE\'sin', ortak: 'Sen SUÇ ORTAĞI\'sın', muhafiz: 'Sen bir MUHAFIZ\'sın' };
  return `<div class="reveal">
    <img class="card-img" src="${roleImg}" alt="">
    <div class="reveal-text">
      <h2>${titles[p.role]}</h2>
      <p>${texts[p.role]}</p>
      ${team.length ? `<p class="warn">${p.role === 'golge' ? 'Suç Ortağın' : 'Gölge'}: <b>${team.map((x) => esc(x.name)).join(', ')}</b></p>` : ''}
      ${p.role === 'golge' && S.mission ? missionCard() : ''}
      ${charCard(p)}
      <button class="btn gold" data-act="role-hide">Gördüm, gizle</button>
    </div></div>`;
}

function izChips(iz) {
  return Object.entries(iz).map(([cat, v]) => `<span class="chip">${IZ_CATEGORIES[cat].label}: <b>${esc(v)}</b></span>`).join('');
}

function charCard(p) {
  const c = charOf(p);
  return `<div class="charcard"><img src="assets/karakter_${c.id}.webp" alt=""><div>
    <h3>${esc(c.name)}</h3><p class="era-tag">${esc(c.era)}</p>
    <p><b>${esc(c.abilityName)}:</b> ${esc(c.abilityText)}</p>
    <div class="chips">${izChips(c.iz)}</div></div></div>`;
}

function missionCard() {
  const m = S.mission;
  const mp = missionProgress(S);
  return `<div class="mission">${v2img('gorev_' + m.id, 'mission-img')}<div><h4>Gizli görev: ${esc(m.title)}</h4><p>${esc(m.text)}</p>
    <p class="hint">Görev Büyük Divan başında açılır; tamamsa oylama yapılmadan kazanırsın.${mp ? ` Şu an: ${mp.have}/${mp.need}.` : ''}</p></div></div>`;
}

const PROLOG = 'Bugün. Yerebatan Sarnıcı\'nda, ters duran Medusa başının dibinde bir restorasyon uzmanı ölü bulundu. Elinde kırık bir pirinç usturlap, taşın üzerinde eski harflerle yazılmış bir muamma var. Siz, yüzyıllardır İstanbul\'un Yedi Tılsımı\'nı koruyan gizli Muvakkithane Cemiyeti\'nin üyelerisiniz. Usturlabı çevirdiğinizde şehir çağlar arasında kayacak. Ama katil dışarıda değil: aranızdaki Gölge.';

function storyView(img, title, text, btn, actName, extra = '') {
  return `<div class="story"><img src="${img}" alt=""><div class="story-text">
    <h2>${title}</h2><p>${text}</p>${extra}
    <button class="btn gold" data-act="${actName}">${btn}</button></div></div>`;
}

function eraIntroView() {
  const c = caseOf(S);
  const e = era(S);
  const sus = c.dynamic
    ? '<p class="hint">Bu perdenin şüphelileri masadaki oyunculardır. Kazı alanları (Yenikapı, Yerebatan, Galata, Kız Kulesi) Gölge\'nin izlerini "ya şu ya bu" diye bulanık gösterir.</p>'
    : `<div class="suspects">${c.suspects.map((x) => `<div><b>${esc(x.name)}</b><span>${esc(x.desc)}</span></div>`).join('')}</div>`;
  return storyView(`assets/${e.image.split('/').pop()}`, `${esc(e.perde)} · ${esc(e.year)} · ${esc(c.title)}`, esc(c.intro),
    'Günü başlat', 'start-days', `${sus}<p class="hint">Bu çağda ulaşım: ${esc(e.transport)}. ${eraDays(S)} gün ve ${eraDays(S)} gece, ardından ${c.dynamic ? 'Büyük Divan' : 'Divan'}.</p>`);
}

function headerView() {
  const e = era(S);
  return `<header class="topbar" style="--era:${e.color}">
    <div class="brand"><img src="icons/icon-32.png" alt="">MUAMMA</div>
    <div class="era"><b>${esc(e.perde)}</b> · ${esc(e.year)} · ${esc(caseOf(S).title)}</div>
    <div class="day">${S.phase === 'divan' ? 'Divan' : S.phase === 'night' ? `Gece ${S.day}` : `Gün ${S.day}/${eraDays(S)}`}</div>
    <div class="tils" title="Tılsımlar: ${tilsimCount(S)}/7 (2'ye düşerse Gölge kazanır)">${tilsimIcons()}</div>
    <div class="meta">Çözülen vaka: <b>${S.solvedCases}</b> · ${RULES.EXILE_MODE === 'gozalti' ? 'Gözaltı' : 'Sürgün'} hakkı: <b>${Math.max(0, RULES.EXILES_BEFORE_FINAL - S.exilesUsed)}</b></div>
    <div class="tools">
      <select data-in="speed" aria-label="Bot hızı">${Object.keys(DELAYS).map((k) => `<option value="${k}" ${ui.speed === k ? 'selected' : ''}>${{ yavas: 'Yavaş', normal: 'Normal', hizli: 'Hızlı' }[k]}</option>`).join('')}</select>
      <button class="btn small ghost" data-act="help">Kurallar</button>
      <button class="btn small ghost" data-act="quit">Menü</button>
    </div>
  </header>`;
}

function playerList() {
  const cur = currentPlayer(S);
  return `<div class="plist">${S.players.map((p) => {
    const st = p.status === 'ruh' ? (p.exiled ? 'Ruh (sürgün)' : 'Ruh') : p.status === 'surgun' ? `Sürgün: ${ROLE_NAME[p.role]}` : p.status === 'ifsa' ? 'İfşa: Gölge'
      : isDetained(S, p) ? 'Gözaltında' : `${p.actionsLeft > 0 && S.phase === 'day' ? p.actionsLeft + ' eylem' : ''}`;
    return `<div class="pl ${cur?.id === p.id ? 'cur' : ''} ${isActive(p) ? '' : 'out'}">${avatar(p)}<div><b>${esc(p.name)}</b>${p.isBot ? ' <i>bot</i>' : ''}<br><span>${esc(charOf(p).name)} · ${esc(locName(S, p.loc))}</span></div><em>${esc(st)}</em></div>`;
  }).join('')}</div>`;
}

function actionPanel() {
  const p = currentPlayer(S);
  if (S.phase !== 'day' || !p) return '';
  if (p.isBot) return `<div class="actions"><p class="thinking">${avatar(p)} ${esc(p.name)}${p.status === 'ruh' ? ' (Ruh)' : ''} düşünüyor…</p></div>`;
  if (p.status === 'ruh') {
    return `<div class="actions ruh-panel"><div class="who">${avatar(p, 'md')}<div><h3>${esc(p.name)} · Ruh</h3>
      <p>Haritada <b>perili</b> yapacağın mekâna tıkla. O gece orada suikast, tılsım hırsızlığı ve sahte iz olmaz.</p></div></div>
      <div class="abtns"><button class="btn ghost" data-act="end-turn">Pas geç</button></div></div>`;
  }
  const av = availableActions(S, p);
  const c = charOf(p);
  const reach = Object.keys(reachable(S, p)).length;
  const puz = puzzleAt(S, p.loc);
  const body = bodyAt(S, p.loc);
  return `<div class="actions">
    <div class="who">${avatar(p, 'md')}<div><h3>${esc(p.name)}</h3><p>${esc(c.name)} · <b>${esc(locName(S, p.loc))}</b></p><p class="acts">Kalan eylem: <b>${p.actionsLeft}</b></p></div></div>
    ${body ? '<p class="warn">Burada incelenmemiş bir ceset var. İncele eylemi izini ortaya çıkarır.</p>' : ''}
    <p class="hint">${reach ? 'Yürümek için haritada parlayan bir mekâna tıkla.' : 'Buradan gidilecek yer yok.'}</p>
    <div class="abtns">
      <button class="btn" data-act="gizli" ${av.gizli ? '' : 'disabled'} title="1 eylem. Paragrafı yalnız sen okursun, masaya istediğini söylersin.">Gizli İncele <small>1</small></button>
      <button class="btn" data-act="acik" ${av.acik ? '' : 'disabled'} title="Paragrafı herkese açık okur; yalan imkânsız.">Açık İncele <small>${p.charId === 'selma' ? 1 : 2}</small></button>
      <button class="btn" data-act="sorgula" title="Tanık ve tarih notu">Sorgula <small>1</small></button>
      <button class="btn" data-act="coz" ${av.coz ? '' : 'disabled'} title="${puz ? esc(puz.title) : 'Burada bulmaca yok'}">Bulmaca${puz && av.coz ? ': ' + esc(puz.title) : ''} <small>1</small></button>
      <button class="btn" data-act="koru" ${av.koru ? '' : 'disabled'} title="Bu gece buradaki tılsım çalınamaz">Tılsımı Koru <small>1</small></button>
      <button class="btn" data-act="yetenek" ${av.yetenek ? '' : 'disabled'} title="${esc(c.abilityText)}">${esc(c.abilityName)}${c.passive ? ' (sürekli)' : ''} <small>1</small></button>
      <button class="btn ghost" data-act="notes">Gizli notlarım</button>
      <button class="btn ghost" data-act="end-turn">Sırayı bitir</button>
    </div>
  </div>`;
}

const TYPE_LABEL = { acik: 'Açık', iddia: 'İddia', tanik: 'Tanık', bulmaca: 'Bulmaca', iz: 'İz', olay: 'Olay', ruh: 'Ruh', perili: 'Perili', divan: 'Divan', curutuldu: 'Çürütüldü', yetenek: 'Yetenek', koru: 'Nöbet', hareket: 'Hareket', son: 'Son' };

function defterView() {
  const filter = ui.tab;
  const keep = {
    defter: (e) => e.type !== 'hareket',
    ipucu: (e) => ['acik', 'iddia', 'bulmaca', 'iz', 'ruh', 'curutuldu', 'perili'].includes(e.type),
    hepsi: () => true,
  }[filter] || (() => true);
  const items = S.defter.filter(keep).slice(-120).reverse();
  return `<div class="defter">${items.map((e) => `<div class="entry t-${e.type}"><span class="tag">${TYPE_LABEL[e.type] || e.type}</span><span class="when">${esc(e.era)}${e.day ? ' · G' + e.day : ''}</span><p>${esc(e.text)}</p></div>`).join('') || '<p class="hint">Defter boş.</p>'}</div>`;
}

function caseView() {
  const c = caseOf(S);
  if (c.dynamic) return suspectTable();
  const yr = era(S).year;
  const alibi = new Set();
  const points = {};
  for (const e of S.defter) {
    if (e.era !== yr) continue;
    let info = null;
    if (e.type === 'acik' && e.clue) info = c.clues[e.clue];
    if (e.puzzleClue) info = e.puzzleClue;
    if (!info) continue;
    (info.alibi || []).forEach((a) => alibi.add(a));
    for (const [k, v] of Object.entries(info.points || {})) points[k] = (points[k] || 0) + v;
  }
  return `<div class="case">
    <p class="hint">Yalnız <b>doğrulanmış</b> bilgiler (Açık İnceleme ve bulmaca) sayılır. İddialar defterde.</p>
    ${c.suspects.map((x) => `<div class="sus ${alibi.has(x.id) ? 'alibi' : ''}">${v2img('supheli_' + x.id, 'sus-av')}<b>${esc(x.name)}</b> ${alibi.has(x.id) ? '<span class="chip">Aklandı</span>' : ''}${points[x.id] ? `<span class="chip warn">${points[x.id]} işaret</span>` : ''}<p>${esc(x.desc)}</p></div>`).join('')}
    <p class="hint">Yöntem seçenekleri: ${c.methods.map((m) => esc(m.label)).join(' · ')}</p>
  </div>`;
}

function suspectTable() {
  const ev = publicEvidence(S);
  const cats = Object.keys(IZ_CATEGORIES);
  const SRC = { iz: 'Ceset', ruh: 'Rüya', delil: 'Delil', kazi: 'Kazı' };
  const evText = ev.map((e) => `<span class="chip"><i>${SRC[e.src] || ''}</i> ${e.kind === 'must'
    ? `${izIcon(e.cat, e.val)}${esc(IZ_CATEGORIES[e.cat].label)} = ${esc(e.val)}`
    : e.items.map((x) => `${izIcon(x.cat, x.val)}${esc(IZ_CATEGORIES[x.cat].label)} ${esc(x.val)}`).join(' ya da ')}</span>`).join('');
  return `<div class="case">
    <p class="hint">Katilin izleri (kamuya açık): ${evText || 'henüz yok'}</p>
    <table class="iz"><thead><tr><th>Oyuncu</th>${cats.map((c) => `<th>${IZ_CATEGORIES[c].label}</th>`).join('')}<th>Uyum</th></tr></thead><tbody>
    ${S.players.map((p) => {
      const iz = charOf(p).iz;
      const ok = ev.length ? consistentWith(p, ev) : null;
      return `<tr class="${isActive(p) ? '' : 'out'}"><td>${esc(p.name)}</td>${cats.map((c) => `<td>${esc(iz[c])}</td>`).join('')}<td>${ok === null ? '–' : ok ? '<b class="ok">uyuyor</b>' : '<span class="no">elendi</span>'}</td></tr>`;
    }).join('')}</tbody></table>
  </div>`;
}

function sidePanel() {
  return `<aside class="side">
    ${actionPanel()}
    <div class="tabs">
      ${[['defter', 'Defter'], ['ipucu', 'İpuçları'], ['vaka', caseOf(S).dynamic ? 'İz Tablosu' : 'Vaka'], ['iz', 'İz Tablosu'], ['oyuncular', 'Oyuncular']]
        .filter(([k], i, arr) => !(k === 'iz' && caseOf(S).dynamic))
        .map(([k, l]) => `<button class="tab ${ui.tab === k ? 'on' : ''}" data-act="tab" data-tab="${k}">${l}</button>`).join('')}
    </div>
    <div class="tabbody">${ui.tab === 'vaka' ? caseView() : ui.tab === 'iz' ? suspectTable() : ui.tab === 'oyuncular' ? playerList() : defterView()}</div>
  </aside>`;
}

function gameView() {
  const p = currentPlayer(S);
  const human = p && !p.isBot && S.phase === 'day' && !S.pending;
  const reach = !human ? {} : p.status === 'ruh' ? Object.fromEntries(hauntOptions(S).map((l) => [l, 1])) : reachable(S, p);
  return `${headerView()}
    <main class="game">
      <section class="boardwrap">${boardSVG(S, { reach, currentId: p?.id, tahta: v2('tahta'), perili: v2('perili') })}
        <div class="legend"><span><i class="lg-star"></i>Tılsım</span><span><i class="lg-x"></i>Ceset</span><span><i class="lg-sea"></i>Deniz yolu (Yürü'nün tamamı)</span><span><i class="lg-perili"></i>Perili</span>${era(S).id === 'bugun' ? '<span><i class="lg-rail"></i>Marmaray</span>' : ''}</div>
        ${ui.error ? `<p class="error">${esc(ui.error)}</p>` : ''}
      </section>
      ${sidePanel()}
    </main>
    ${overlay()}`;
}

// ---------- katmanlar (modal) ----------
function overlay() {
  if (S.phase === 'over') return modal(overView(), 'wide');
  if (S.pending?.type === 'claim') {
    const p = player(S, S.pending.playerId);
    if (!p.isBot) return modal(claimView(p));
  }
  if (S.phase === 'night') return nightView();
  if (S.phase === 'morning') return modal(morningView());
  if (S.phase === 'divan') return modal(divanView(), 'wide');
  if (ui.modal) return modal(ui.modal());
  return '';
}

function modal(inner, cls = '') {
  return `<div class="overlay"><div class="modal ${cls}">${inner}</div></div>`;
}

function claimView(p) {
  const key = `claim:${S.defter.length}:${p.id}`;
  if (gateNeeded(key)) return gateView(key, p, 'Gizli İnceleme sonucu.');
  const pd = S.pending;
  return `<h2>Gizli İnceleme · ${esc(locName(S, pd.loc))}</h2>
    ${v2img('mekan_' + pd.loc, 'loc-img', pd.loc === 'galata' ? 'assets/mekan_galata.webp' : null)}
    <div class="paper">${esc(pd.text)}</div>
    <p class="hint">Masaya ne söyleyeceksin? Defterde "iddia" olarak görünür. Biri burayı Açık İnceleme ile okursa yalanın ortaya çıkar.</p>
    <div class="claims">
      <button class="btn gold" data-act="claim" data-claim="dogru">Doğruyu söyle<br><small>${esc(pd.trueSummary)}</small></button>
      ${pd.isFake ? '' : `<button class="btn coral" data-act="claim" data-claim="sahte">Yalan söyle<br><small>${esc(pd.decoy)}</small></button>`}
      <button class="btn ghost" data-act="claim" data-claim="sus">Hiçbir şey söyleme</button>
    </div>`;
}

function puzzleModal() {
  const p = currentPlayer(S);
  const puz = puzzleAt(S, p.loc);
  return `<h2>Bulmaca · ${esc(puz.title)}</h2>
    ${v2img(`bulmaca_${era(S).year === 'Bugün' ? 'bugun' : era(S).year}_${p.loc}`, 'loc-img')}
    <div class="paper">${esc(puz.text)}</div>
    ${p.charId === 'zeynep' ? `<p class="hint">Hat Bilgisi ipucu: ${esc(puz.hint)}</p>` : ''}
    <form data-form="solve" class="solve"><input name="answer" autocomplete="off" placeholder="Cevabın" aria-label="Cevap" autofocus>
    <button class="btn gold">Cevapla</button><button type="button" class="btn ghost" data-act="close">Vazgeç</button></form>
    <p class="hint">Yanlış cevap ${p.charId === 'zeynep' ? 'sana ceza getirmez' : 'yarın 1 eylem kaybettirir'}.</p>`;
}

function takipModal() {
  const p = currentPlayer(S);
  const others = activePlayers(S).filter((o) => o.id !== p.id && o.loc === p.loc);
  return `<h2>Takip</h2><p>Aynı mekândaki kimi takip edeceksin? O gece suikast yaparsa sabah herkes öğrenir.</p>
    <div class="claims">${others.map((o) => `<button class="btn" data-act="takip" data-target="${o.id}">${avatar(o)} ${esc(o.name)}</button>`).join('')}</div>
    <button class="btn ghost" data-act="close">Vazgeç</button>`;
}

function notesModal() {
  const p = currentPlayer(S);
  const key = `notes:${S.defter.length}:${p.id}`;
  if (gateNeeded(key)) return gateView(key, p, 'Gizli notların.');
  const notes = S.private[p.id] || [];
  return `<h2>${esc(p.name)} · gizli notlar</h2>
    <p>Rolün: <b>${ROLE_NAME[p.role]}</b>${isEvil(p) ? ' · ' + (p.role === 'golge' ? 'Suç Ortağın' : 'Gölge') + ': ' + (S.players.filter((q) => q.id !== p.id && isEvil(q)).map((g) => esc(g.name)).join(', ') || 'yok') : ''}</p>
    ${p.role === 'golge' && S.mission ? missionCard() : ''}
    ${charCard(p)}
    <div class="defter">${notes.map((n) => `<div class="entry"><span class="when">${esc(n.era)} · G${n.day}</span><p>${esc(n.text)}</p></div>`).join('') || '<p class="hint">Henüz gizli not yok.</p>'}</div>
    <button class="btn gold" data-act="close">Kapat</button>`;
}

function helpModal() {
  const ex = RULES.EXILE_MODE === 'gozalti';
  return `<h2>Kısa kurallar · v0.2</h2>
  <div class="rules">
  <p><b>Amaç.</b> Muhafızlar dört vakayı çözmeye, tılsımları korumaya ve Büyük Divan'da Gölge'yi bulmaya çalışır. Gölge yakalanmadan oyunu bitirmeye ya da gizli görevini tamamlamaya çalışır. Tılsımlar ${RULES.TILSIM_LOSE_AT}'ye düşerse Gölge hemen kazanır. 7–8 kişide Gölge'nin bir Suç Ortağı vardır.</p>
  <p><b>Gün.</b> Sırası gelen oyuncu ${RULES.ACTIONS_PER_DAY} eylem yapar: Yürü (2 adım; deniz geçişi yürüyüşün tamamı), Gizli İncele (1, masaya istediğini söylersin), Açık İncele (2, herkes okur, yalanları çürütür), Sorgula (tanık + tarih notu), Bulmaca, Tılsımı Koru, Yetenek. 7–8 kişide her perde bir gün kısadır.</p>
  <p><b>Ruh.</b> Ölen oyuncu oyundan çıkmaz: her gün bir mekânı <b>perili</b> yapar; o gece orada suikast, tılsım hırsızlığı ve sahte iz olmaz. Öldükten sonraki ilk Divan'da katiline en az bir simgesi uyan bir rüya gösterir.</p>
  <p><b>Gece (Bekçi Vuruşu).</b> Gölge tek hamle yapar: kendine yakın (aynı ya da komşu mekân) bir Muhafız'ı öldürür, yakındaki korumasız bir tılsımı çalar ya da sahte iz bırakır (Perde IV'te kazı alanlarına da). Perde başına en fazla ${RULES.KILLS_PER_ERA} suikast; ${RULES.MIN_MUHAFIZ_ALIVE} Muhafız kaldığında suikast yapılamaz.</p>
  <p><b>İz.</b> Ceset, katilin bir özelliğini "ya şu ya bu" diye bulanık gösterir; her özellik iki karakterde vardır.</p>
  <p><b>Divan.</b> Her perde sonunda herkes katil ve yöntem için oy verir. Katil doğruysa vaka çözülür; yöntem de doğruysa kayıp bir tılsım geri gelir. Yanlış suçlama bir tılsıma mal olur. ${ex ? `Perde II ve III'te bir kişiyi <b>gözaltına</b> alabilirsiniz: o oyuncu bir sonraki perde eylem yapamaz (Gölge'yse gece hamlesi de yapamaz), rolü gizli kalır.` : 'Sürgün oylamasıyla bir kişi oyundan çıkarılabilir.'}</p>
  <p><b>Büyük Divan.</b> Gölge'nin gizli görevi açılır; tamamsa Gölge kazanır. Değilse her ${RULES.DELIL_PER_CASES} çözülen vaka için Delil Kutusu'ndan bir pul ("ya şu ya bu") açılır ve herkes Gölge'yi oylar.</p>
  </div><button class="btn gold" data-act="close">Kapat</button>`;
}

function nightView() {
  const pd = S.pending;
  const gHumans = golgeler(S).filter((g) => isActive(g) && !g.isBot);
  if (!gHumans.length || pd?.type !== 'night' && pd?.type !== 'iz-choice') {
    return `<div class="overlay night" ${v2('gece') ? `style="background-image:linear-gradient(rgba(2,5,12,.55),rgba(2,5,12,.75)),url(${v2('gece')})"` : ''}><div class="bekci"><h2>Gece · Bekçi Vuruşu</h2><p>Herkes gözlerini kapatsın ve masaya vursun…</p><div class="knock"><span></span><span></span><span></span></div></div></div>`;
  }
  // İnsan Gölge varsa: bütün insan oyunculara sırayla gizli ekran (kim karar veriyor anlaşılmasın)
  if (!ui.night) ui.night = { queue: activePlayers(S).filter((p) => !p.isBot).map((p) => p.id), pos: 0, shown: false, decision: null };
  const N = ui.night;
  const p = player(S, N.queue[N.pos]);
  if (!N.shown && multiHuman()) {
    return `<div class="overlay night"><div class="gate-card dark">${avatar(p, 'lg')}<h3>Gece · sıra ${esc(p.name)}'de</h3>
      <p>Cihazı ${esc(p.name)}'e ver. Diğerleri gözlerini kapatıp masaya vursun.</p>
      <button class="btn gold" data-act="night-show">Göster</button></div></div>`;
  }
  const decider = gHumans[0];
  let body;
  if (p.role === 'ortak') {
    body = `<h3>Suç Ortağı</h3><p>Gölge bu gecenin hamlesine karar veriyor. Sen bekle; yarın şüpheyi başkalarına çevir.</p><button class="btn" data-act="night-next">Devam</button>`;
  } else if (p.role !== 'golge') {
    body = `<h3>Sen bir Muhafız'sın.</h3><p>Gözlerin kapalı; bekçinin sopası kaldırımlarda yankılanıyor. Hiçbir şey yapma.</p><button class="btn" data-act="night-next">Uyumaya devam et</button>`;
  } else if (p.id !== decider.id || N.decision) {
    body = `<h3>Gölge</h3><p>${N.decision ? 'Hamle seçildi.' : 'Ortağın bu gecenin hamlesine karar veriyor.'}</p><button class="btn" data-act="night-next">Devam</button>`;
  } else {
    const o = nightOptions(S);
    const me = charOf(p).iz;
    body = `<h3>Gölge, bu gece ne yapacaksın?</h3>
      <div class="nopt"><h4>Suikast ${o.kills.length ? '' : '<small>(şu an mümkün değil)</small>'}</h4>
        ${o.kills.map((k) => { const v = player(S, k.target); return `<div class="krow">${avatar(v)} <b>${esc(v.name)}</b> · ${esc(locName(S, v.loc))}
          <span>Bırakacağın iz:</span>${Object.entries(me).map(([cat, val]) => `<button class="btn small coral" data-act="n-kill" data-target="${v.id}" data-cat="${cat}">${IZ_CATEGORIES[cat].label}: ${esc(val)}</button>`).join('')}</div>`; }).join('')}
      </div>
      <div class="nopt"><h4>Tılsım çal ${o.steals.length ? '' : '<small>(yakında korumasız tılsım yok)</small>'}</h4>
        ${o.steals.map((x) => `<button class="btn small" data-act="n-steal" data-loc="${x.loc}">${esc(TILSIMLAR[x.loc])} · ${esc(locName(S, x.loc))}</button>`).join('')}</div>
      ${o.fakes.length ? `<div class="nopt"><h4>Sahte iz bırak</h4><select data-in="fakeLoc">${o.fakes.map((l) => `<option value="${l}">${esc(locName(S, l))}</option>`).join('')}</select> <button class="btn small" data-act="n-fake">Bırak</button></div>` : ''}
      <button class="btn ghost" data-act="n-pas">Bu gece hiçbir şey yapma</button>`;
  }
  return `<div class="overlay night"><div class="modal dark">${body}</div></div>`;
}

function morningView() {
  return `${v2img('sabah', 'scene-img')}<h2>Sabah</h2>${(S.morning || []).map((t) => `<p class="paper">${esc(t)}</p>`).join('')}
    <button class="btn gold" data-act="morning">${S.day >= eraDays(S) ? (caseOf(S).dynamic ? 'Büyük Divan\'a geç' : 'Divan\'a geç') : 'Yeni güne başla'}</button>`;
}

function divanView() {
  const d = S.divan;
  const c = caseOf(S);
  const title = `${v2img(d.final ? 'buyuk_divan' : 'divan', 'scene-img')}${d.final ? 'Büyük Divan' : `Divan · ${esc(era(S).perde)}`}`;
  if (d.step === 'ruh') {
    const r = player(S, d.ruhQueue[0]);
    if (r.isBot) return `<h2>${title}</h2><p>${esc(r.name)}'in Ruhu bir rüya seçiyor…</p>`;
    const key = `ruh:${S.eraIndex}:${r.id}`;
    if (gateNeeded(key)) return gateView(key, r, 'Ruhun rüya kartları.');
    const killer = player(S, r.killedBy);
    return `<h2>${title} · Ruh</h2><img class="ruh-img" src="assets/rol_ruh.webp" alt="">
      <p>${esc(r.name)}, seni <b>${esc(killer.name)}</b> öldürdü. Konuşamazsın; masaya bir rüya göster. Yalnız katiline en az bir simgesi uyan rüyaları seçebilirsin.</p>
      <div class="claims">${d.cards.map((card, i) => `<button class="btn ${card.valid ? 'gold' : ''}" data-act="ruh" data-card="${i}" ${card.valid ? '' : 'disabled'}>${card.symbols.map((x) => `${IZ_CATEGORIES[x.cat].label}: <b>${esc(x.val)}</b>`).join('<br>')}</button>`).join('')}</div>`;
  }
  if (d.step === 'suclama') {
    const voters = activePlayers(S);
    const next = voters.find((v) => !v.isBot && !(v.id in d.accuseVotes));
    const rows = voters.map((v) => {
      const vote = d.accuseVotes[v.id];
      const txt = vote ? `${esc(c.suspects.find((x) => x.id === vote.suspect).name)} · ${esc(c.methods.find((m) => m.id === vote.method).label)}` : v.isBot ? '<i>düşünüyor…</i>' : '<i>bekliyor</i>';
      return `<div class="vrow">${avatar(v)} <b>${esc(v.name)}</b> <span class="chip">${txt}</span></div>`;
    }).join('');
    return `<h2>${title} · Vaka suçlaması</h2>
      <p><b>${esc(c.victim)}</b>'i kim öldürdü, nasıl? Önce masada tartışın, sonra herkes kendi oyunu versin. En çok oy alan şüpheli ve yöntem Divan'ın kararıdır.</p>
      <div class="votes">${rows}</div>
      ${next ? `<form data-form="accuse" class="accuse"><input type="hidden" name="voter" value="${next.id}">
        <h3>${avatar(next)} ${esc(next.name)}'in oyu</h3>
        <fieldset><legend>Katil</legend>${c.suspects.map((x, i) => `<label class="sus-opt">${v2img('supheli_' + x.id, 'sus-av')}<input type="radio" name="suspect" value="${x.id}" ${i === 0 ? 'checked' : ''}> <b>${esc(x.name)}</b> <span>${esc(x.desc)}</span></label>`).join('')}</fieldset>
        <fieldset><legend>Yöntem</legend>${c.methods.map((m, i) => `<label><input type="radio" name="method" value="${m.id}" ${i === 0 ? 'checked' : ''}> ${esc(m.label)}</label>`).join('')}</fieldset>
        <button class="btn gold">Oyumu ver</button>
      </form>` : '<p class="hint">Botlar oy veriyor…</p>'}`;
  }
  if (d.step === 'suclama-sonuc') {
    const r = d.result;
    return `<h2>${title} · Çözüm</h2><p class="big ${r.ok ? 'ok' : 'no'}">${r.ok ? 'Doğru!' : 'Yanlış!'} ${r.ok ? '' : ''}</p>
      <div class="paper">${esc(r.solution)}</div>
      <p>${r.ok ? `Vaka çözüldü. ${r.methodOk ? 'Yöntem de doğru' : 'Yöntem yanlış'}${d.restored ? ': kayıp bir tılsım geri döndü.' : '.'} Her ${RULES.DELIL_PER_CASES} çözülen vaka Büyük Divan'da bir Delil pulu açar.` : 'Bir tılsım kayboldu.'}</p>
      <button class="btn gold" data-act="divan-next">${S.eraIndex < RULES.EXILE_FROM_ERA || S.exilesUsed >= RULES.EXILES_BEFORE_FINAL || !golgeler(S).length ? 'Devam' : (RULES.EXILE_MODE === 'gozalti' ? 'Gözaltı oylamasına geç' : 'Sürgün oylamasına geç')}</button>`;
  }
  if (d.step === 'surgun' || d.step === 'final-oy') return voteView(title, d.step === 'final-oy');
  if (d.step === 'sonuc') {
    const last = [...S.defter].reverse().find((e) => e.type === 'divan');
    const skip = d.skipExile === 'erken' ? `${RULES.EXILE_MODE === 'gozalti' ? 'Gözaltı' : 'Sürgün'} oylaması Perde ${['I', 'II', 'III', 'IV'][RULES.EXILE_FROM_ERA]}'den itibaren yapılır.` : 'Oylama hakkı kalmadı.';
    return `<h2>${title}</h2>${d.skipExile ? `<p class="hint">${skip}</p>` : `<p class="paper">${esc(last?.text || '')}</p>`}
      <button class="btn gold" data-act="divan-next">Usturlabı çevir: sonraki perde</button>`;
  }
  return `<h2>${title}</h2><p>…</p>`;
}

function voteView(title, final) {
  const d = S.divan;
  const voters = activePlayers(S);
  const cands = activePlayers(S);
  const tally = voteTally(S);
  const gz = RULES.EXILE_MODE === 'gozalti';
  return `<h2>${title} · ${final ? 'Gölge kim?' : gz ? 'Gözaltı oylaması' : 'Sürgün oylaması'}</h2>
    ${final ? `<p>${S.mission ? `Gölge'nin görevi "${esc(S.mission.title)}" tutmadı. ` : ''}Delil Kutusu açıldı: ${S.delilRevealed.length ? S.delilRevealed.map((x) => `<span class="chip">${IZ_CATEGORIES[x.cat].label}: ${x.shown ? `ya ${esc(x.shown[0])} ya ${esc(x.shown[1])}` : esc(x.val)}</span>`).join(' ') : 'hiç pul açılmadı.'}</p>`
      : gz ? `<p>Şüphelendiğiniz biri var mı? Çoğunluk (${Math.floor(voters.length / 2) + 1} oy) bir kişiyi gözaltına alırsa o oyuncu bir sonraki perde hiçbir eylem yapamaz; Gölge'yse gece hamlesi de yapamaz. Rol kartı kapalı kalır. "Pas" da geçerli bir oydur.</p>`
      : `<p>Biri Gölge mi? Çoğunluk (${Math.floor(voters.length / 2) + 1} oy) bir kişiyi sürerse rol kartı açılır. Masum biri sürülürse bir tılsım kaybolur.</p>`}
    ${suspectTable()}
    <div class="votes">${voters.map((v) => {
      const has = v.id in d.votes;
      const val = d.votes[v.id];
      return `<div class="vrow">${avatar(v)} <b>${esc(v.name)}</b> ${has ? `<span class="chip">${val === null ? 'Pas' : esc(player(S, val).name)}</span>` : v.isBot ? '<i>düşünüyor…</i>' : `
        <span class="vbtns">${cands.filter((c) => c.id !== v.id).map((c) => `<button class="btn small" data-act="vote" data-voter="${v.id}" data-target="${c.id}">${esc(c.name)}</button>`).join('')}
        ${final ? '' : `<button class="btn small ghost" data-act="vote" data-voter="${v.id}" data-target="">Pas</button>`}</span>`}</div>`;
    }).join('')}</div>
    <p class="hint">Oylar: ${Object.entries(tally).map(([id, n]) => `${esc(player(S, Number(id)).name)} ${n}`).join(' · ') || 'henüz yok'}</p>`;
}

function overView() {
  const win = S.winner === 'muhafiz';
  const img = v2(win ? 'zafer_muhafiz' : 'zafer_golge') || `assets/${win ? 'rol_muhafiz' : 'rol_golge'}.webp`;
  const mp = missionProgress(S);
  return `<div class="over ${win ? 'win' : 'lose'}">
    <img src="${img}" alt="">
    <div><h2>${win ? 'Muhafızlar kazandı' : 'Gölge kazandı'}</h2><p class="paper">${esc(S.winReason)}</p>
    ${S.mission ? `<p class="hint">Gölge'nin gizli görevi: <b>${esc(S.mission.title)}</b> · ${esc(S.mission.text)} ${mp ? `(${mp.have}/${mp.need})` : ''}</p>` : ''}
    <h3>Roller</h3><div class="plist">${S.players.map((p) => `<div class="pl">${avatar(p)}<div><b>${esc(p.name)}</b><br><span>${esc(charOf(p).name)}</span></div><em class="${p.role}">${ROLE_NAME[p.role]}</em></div>`).join('')}</div>
    <p>Perde: <b>${S.eraIndex + 1}/4</b> · Çözülen vaka: <b>${S.solvedCases}</b> · Kalan tılsım: <b>${tilsimCount(S)}</b> · Cinayet: <b>${S.bodies.length}</b> · Tohum: <b>${S.seed}</b></p>
    <div class="btns">
      <button class="btn gold" data-act="replay">Rövanş: aynı masa, yeni roller</button>
      <button class="btn" data-act="report-md">Test raporunu indir</button>
      <button class="btn ghost" data-act="report-json">Ham veri (JSON)</button>
      <button class="btn ghost" data-act="quit">Ana menü</button>
    </div>
    <p class="hint">Rövanş aynı koltuklarla yeni bir tohumla başlar: Gölge, Suç Ortağı ve gizli görev yeniden dağıtılır.</p></div></div>`;
}

function reportData() {
  return {
    oyun: 'MUAMMA', surum: '0.2', tarih: new Date().toISOString(), tohum: S.seed, mod: S.mode,
    kazanan: S.winner, sebep: S.winReason, ulasilanPerde: S.eraIndex + 1, gorev: S.mission, gorevIlerleme: missionProgress(S),
    kalanTilsim: tilsimCount(S), cozulenVaka: S.solvedCases, vakalar: S.caseResults,
    oyuncular: S.players.map((p) => ({ ad: p.name, bot: p.isBot, karakter: charOf(p).name, rol: ROLE_NAME[p.role], durum: { alive: 'Hayatta', ruh: p.exiled ? 'Ruh (sürgün)' : 'Ruh', ifsa: 'İfşa edildi', surgun: 'Sürgün' }[p.status] || p.status, yakalananYalan: p.liesCaught })),
    cinayetler: S.bodies.map((b) => ({ perde: b.era + 1, kurban: player(S, b.victimId).name, mekan: b.loc, iz: b.iz })),
    kurallar: RULES,
    defter: S.defter.map((e) => ({ perde: e.era, gun: e.day, tur: e.type, metin: e.text })),
  };
}

function reportMarkdown() {
  const r = reportData();
  const lines = [
    `# MUAMMA test raporu`, '', `${new Date().toLocaleString('tr-TR')} · tohum ${r.tohum} · sürüm ${r.surum}`, '',
    `**Sonuç:** ${r.kazanan === 'muhafiz' ? 'Muhafızlar' : 'Gölge'} kazandı. ${r.sebep}`, '',
    '| Ölçü | Değer |', '| --- | --- |',
    `| Ulaşılan perde | ${r.ulasilanPerde}/4 |`, `| Çözülen vaka | ${r.cozulenVaka} |`, `| Kalan tılsım | ${r.kalanTilsim}/7 |`,
    `| Cinayet | ${r.cinayetler.length} |`, `| Gölge görevi | ${r.gorev ? `${r.gorev.title} (${r.gorevIlerleme?.have}/${r.gorevIlerleme?.need})` : '-'} |`, '',
    '## Oyuncular', '', '| Ad | Karakter | Rol | Durum | Yakalanan yalan |', '| --- | --- | --- | --- | --- |',
    ...r.oyuncular.map((p) => `| ${p.ad}${p.bot ? ' (bot)' : ''} | ${p.karakter} | ${p.rol} | ${p.durum} | ${p.yakalananYalan} |`), '',
    '## Divan kararları', '', ...r.vakalar.map((v) => `- Perde ${v.era + 1}: ${v.ok ? 'doğru' : 'yanlış'} suçlama${v.ok ? (v.methodOk ? ', yöntem doğru' : ', yöntem yanlış') : ''}`), '',
    '## Test notları', '', '- En sıkıldığımız an:', '- "Aha!" anı:', '- Anlaşılmayan kural:', '- Süre:', '',
    '## Defter', '', ...r.defter.filter((e) => e.tur !== 'hareket').map((e) => `- ${e.perde} G${e.gun} [${TYPE_LABEL[e.tur] || e.tur}] ${e.metin}`),
  ];
  return lines.join('\n');
}

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- ana çizim ----------
function render() {
  let html;
  if (!S) html = setupView() + (ui.modal ? modal(ui.modal()) : '');
  else if (S.phase === 'roles') html = roleView();
  else if (S.phase === 'prolog') html = storyView('assets/prolog.webp', 'Prolog · Bugün, Yerebatan', esc(PROLOG), 'Usturlabı çevir', 'begin');
  else if (S.phase === 'era-intro') html = eraIntroView();
  else html = gameView();
  app.innerHTML = html;
  const f = app.querySelector('[autofocus]');
  if (f) f.focus();
  pump();
}

// ---------- botlar ----------
let timer = null;
function pump() {
  clearTimeout(timer);
  if (!S || S.winner) return;
  const delay = DELAYS[ui.speed];
  if (spectator()) {
    timer = setTimeout(() => { try { stepAuto(S); } catch (e) { ui.error = e.message; } save(); render(); }, S.phase === 'night' ? Math.max(delay, 900) : delay);
    return;
  }
  if (['roles', 'prolog', 'era-intro', 'morning'].includes(S.phase)) return;
  if (S.phase === 'divan' && ['suclama-sonuc', 'sonuc'].includes(S.divan.step)) return;
  const a = botTurn(S);
  if (!a) return;
  const wait = S.phase === 'night' ? Math.max(1400, delay) : delay;
  timer = setTimeout(() => dispatch(a), wait);
}

// ---------- olaylar ----------
app.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const a = el.dataset.act;
  const cur = S && currentPlayer(S);
  switch (a) {
    case 'start': return startNew();
    case 'resume': S = loadSaved(); ui.roleQueue = []; return render();
    case 'help': ui.modal = helpModal; return render();
    case 'close': ui.modal = null; return render();
    case 'quit': S = null; ui.modal = null; ui.night = null; clearTimeout(timer); return render();
    case 'replay': clearSave(); ui.setup.seed = Math.floor(Math.random() * 1e6); ui.gameNo = (ui.gameNo || 1) + 1; return startNew();
    case 'report-md': return download(`muamma_rapor_${S.seed}.md`, reportMarkdown(), 'text/markdown');
    case 'report-json': return download(`muamma_rapor_${S.seed}.json`, JSON.stringify(reportData(), null, 2), 'application/json');
    case 'gate-open': ui.gate[el.dataset.key] = true; return render();
    case 'role-show': ui.roleShown = true; return render();
    case 'role-hide': ui.roleQueue.shift(); ui.roleShown = false; return render();
    case 'roles-done': startGame(S); save(); return render();
    case 'begin': return dispatch({ type: 'begin' });
    case 'start-days': return dispatch({ type: 'start-days' });
    case 'node': {
      if (!cur || cur.isBot || S.pending) return;
      if (cur.status === 'ruh') return hauntOptions(S).includes(el.dataset.loc) ? dispatch({ type: 'haunt', playerId: cur.id, loc: el.dataset.loc }) : undefined;
      if (el.dataset.loc in reachable(S, cur)) return dispatch({ type: 'move', playerId: cur.id, to: el.dataset.loc });
      return;
    }
    case 'gizli': return dispatch({ type: 'investigate', playerId: cur.id, mode: 'gizli' });
    case 'acik': return dispatch({ type: 'investigate', playerId: cur.id, mode: 'acik' });
    case 'sorgula': return dispatch({ type: 'question', playerId: cur.id });
    case 'koru': return dispatch({ type: 'guard', playerId: cur.id });
    case 'coz': ui.modal = puzzleModal; return render();
    case 'notes': ui.modal = notesModal; return render();
    case 'yetenek':
      if (charOf(cur).ability === 'takip') { ui.modal = takipModal; return render(); }
      return dispatch({ type: 'ability', playerId: cur.id });
    case 'takip': ui.modal = null; return dispatch({ type: 'ability', playerId: cur.id, target: Number(el.dataset.target) });
    case 'end-turn': return dispatch({ type: 'end-turn', playerId: cur.id });
    case 'claim': return dispatch({ type: 'claim', playerId: S.pending.playerId, claim: el.dataset.claim });
    case 'tab': ui.tab = el.dataset.tab; return render();
    case 'morning': ui.night = null; return dispatch({ type: 'morning-done' });
    case 'night-show': ui.night.shown = true; return render();
    case 'night-next': return nightNext();
    case 'n-kill': ui.night.decision = { type: 'night', action: 'kill', target: Number(el.dataset.target), cat: el.dataset.cat }; return nightNext();
    case 'n-steal': ui.night.decision = { type: 'night', action: 'steal', loc: el.dataset.loc }; return nightNext();
    case 'n-fake': ui.night.decision = { type: 'night', action: 'fake', loc: app.querySelector('[data-in="fakeLoc"]').value }; return nightNext();
    case 'n-pas': ui.night.decision = { type: 'night', action: 'pas' }; return nightNext();
    case 'ruh': return dispatch({ type: 'ruh-hint', playerId: S.divan.ruhQueue[0], card: Number(el.dataset.card) });
    case 'divan-next': return dispatch({ type: 'divan-next' });
    case 'vote': return dispatch({ type: 'vote', playerId: Number(el.dataset.voter), target: el.dataset.target === '' ? null : Number(el.dataset.target) });
    default: return undefined;
  }
});

function nightNext() {
  const N = ui.night;
  N.pos += 1;
  N.shown = false;
  if (N.pos >= N.queue.length) {
    const decision = N.decision || { type: 'night', action: 'pas' };
    ui.night = null;
    return dispatch(decision);
  }
  return render();
}

app.addEventListener('submit', (ev) => {
  ev.preventDefault();
  const f = ev.target;
  const fd = new FormData(f);
  if (f.dataset.form === 'solve') {
    ui.modal = null;
    return dispatch({ type: 'solve', playerId: currentPlayer(S).id, answer: fd.get('answer') || '' });
  }
  if (f.dataset.form === 'accuse') return dispatch({ type: 'accuse-vote', playerId: Number(fd.get('voter')), suspect: fd.get('suspect'), method: fd.get('method') });
  return undefined;
});

app.addEventListener('change', (ev) => {
  const el = ev.target;
  const k = el.dataset.in;
  if (!k) return;
  const st = ui.setup;
  const i = Number(el.dataset.i);
  if (k === 'count') st.count = Number(el.value);
  else if (k === 'mode') st.mode = el.value;
  else if (k === 'seed') st.seed = Number(el.value) || 1;
  else if (k === 'speed') ui.speed = el.value;
  else if (k === 'name') st.rows[i].name = el.value;
  else if (k === 'bot') st.rows[i].isBot = el.value === '1';
  else if (k === 'char') st.rows[i].charId = el.value;
  else return;
  if (k !== 'name' && k !== 'seed') render();
});

function startNew() {
  const st = ui.setup;
  const rows = st.rows.slice(0, st.count);
  const chars = rows.map((r) => r.charId).filter(Boolean);
  if (new Set(chars).size !== chars.length) { ui.error = 'Aynı karakter iki oyuncuya verilemez.'; alertSetup(); return; }
  S = createGame({ seed: st.seed, mode: st.mode, players: rows.map((r) => ({ name: r.name.trim() || 'Oyuncu', isBot: r.isBot, charId: r.charId || undefined })) });
  ui.roleQueue = null; ui.roleShown = false; ui.gate = {}; ui.night = null; ui.modal = null; ui.tab = 'defter'; ui.error = null;
  save();
  render();
}
function alertSetup() {
  render();
  const p = document.createElement('p');
  p.className = 'error';
  p.textContent = ui.error;
  app.querySelector('.panel-card')?.prepend(p);
}

// Uygulama olarak yüklenebilsin diye service worker (yalnız yayınlanan sürümde)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
// Tarayıcı izin verirse kurulum ekranında "Uygulamayı yükle" düğmesi
let installPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; if (!S) render(); });
window.addEventListener('appinstalled', () => { installPrompt = null; if (!S) render(); });
app.addEventListener('click', async (ev) => {
  if (!ev.target.closest('[data-act="install"]') || !installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice.catch(() => null);
  installPrompt = null;
  render();
});
window.MUAMMA_canInstall = () => !!installPrompt;

// Test ve hata ayıklama için konsoldan erişim
window.MUAMMA = { get state() { return S; }, CASES, LOCATIONS, CHAR_BY_ID, paragraphAt, abilityUsable };

render();
