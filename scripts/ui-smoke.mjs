// Tarayıcıda uçtan uca deneme: tek insan + botlar, oyun bitene kadar tıklar, ekran görüntüsü alır.
// Kullanım: npx vite preview --port 4173 &  sonra  node scripts/ui-smoke.mjs [çıktı-klasörü] [seed] [rol]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import fs from 'node:fs';

const out = process.argv[2] || 'shots';
const seed = process.argv[3] || '4242';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto('http://localhost:4173/');
await page.waitForSelector('[data-act="start"]');
await page.fill('[data-in="seed"]', seed);
await page.dispatchEvent('[data-in="seed"]', 'change');
await page.selectOption('[data-in="speed"]', 'hizli');
await page.screenshot({ path: `${out}/01_kurulum.png` });
await page.click('[data-act="start"]');

const shot = async (name) => page.screenshot({ path: `${out}/${name}.png` });
const taken = new Set();
const once = async (name) => { if (!taken.has(name)) { taken.add(name); await shot(name); } };
const click = async (sel) => { try { const el = await page.$(sel); if (el && await el.isEnabled()) { await el.click({ timeout: 2000 }); return true; } } catch { /* yeniden çizildi, sonraki turda dene */ } return false; };

let steps = 0;
while (steps++ < 900) {
  await page.waitForTimeout(120);
  if (await page.$('.over')) {
    await shot('99_son');
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }).catch(() => null), click('[data-act="report-md"]')]);
    if (dl) { await dl.saveAs(`${out}/rapor.md`); } else errors.push('rapor indirilemedi');
    break;
  }
  if (await page.$('[data-act="role-show"]')) { await click('[data-act="role-show"]'); await once('02_rol'); continue; }
  if (await click('[data-act="role-hide"]')) continue;
  if (await click('[data-act="roles-done"]')) continue;
  if (await page.$('[data-act="begin"]')) { await once('03_prolog'); await click('[data-act="begin"]'); continue; }
  if (await page.$('[data-act="start-days"]')) {
    const yr = await page.textContent('.story-text h2');
    await once('04_cag_' + yr.slice(0, 12).replace(/\W+/g, '_'));
    await click('[data-act="start-days"]'); continue;
  }
  if (await page.$('[data-act="claim"]')) { await once('06_gizli_inceleme'); await click('[data-act="claim"][data-claim="dogru"]'); continue; }
  if (await page.$('[data-act="morning"]')) { await once('08_sabah'); await click('[data-act="morning"]'); continue; }
  if (await page.$('.bekci')) { await once('07_gece'); continue; }
  if (await page.$('.nopt')) { // insan Gölge ise
    await once('07_gece_golge');
    if (!(await click('[data-act="n-steal"]'))) await click('[data-act="n-pas"]');
    continue;
  }
  if (await click('[data-act="night-next"]')) continue;
  if (await page.$('.ruh-panel')) {
    await once('05c_ruh_perili');
    const n = await page.$('.node.reach');
    if (n) await n.click(); else await click('[data-act="end-turn"]');
    continue;
  }
  if (await page.$('[data-act="ruh"]')) { await click('[data-act="ruh"]:not([disabled])'); continue; }
  if (await page.$('form[data-form="accuse"]')) { await once('09_divan_suclama'); await click('form[data-form="accuse"] button'); continue; }
  if (await page.$('[data-act="vote"]')) { await once('10_oylama'); await click('[data-act="vote"][data-target=""]') || await click('[data-act="vote"]'); continue; }
  if (await page.$('[data-act="divan-next"]')) { await once('09b_divan_sonuc'); await click('[data-act="divan-next"]'); continue; }
  if (await page.$('[data-act="gizli"]')) {
    await once('05_gun_insan');
    // basit insan politikası: bulmaca varsa dene, yoksa gizli incele, sonra yürü
    if (await page.$('[data-act="coz"]:not([disabled])')) {
      await click('[data-act="coz"]'); await once('05b_bulmaca');
      await page.fill('input[name="answer"]', '342'); await page.click('form[data-form="solve"] .btn.gold'); continue;
    }
    const acts = await page.textContent('.acts');
    if (acts.includes('2')) { await click('[data-act="gizli"]'); continue; }
    const node = await page.$('.node.reach');
    if (node) { await node.click(); continue; }
    await click('[data-act="end-turn"]'); continue;
  }
}
const state = await page.evaluate(() => ({ phase: window.MUAMMA.state?.phase, winner: window.MUAMMA.state?.winner, reason: window.MUAMMA.state?.winReason, era: window.MUAMMA.state?.eraIndex }));
console.log(JSON.stringify({ steps, state, errors }, null, 2));
await browser.close();
