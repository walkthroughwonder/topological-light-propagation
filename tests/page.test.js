// Browser test of index.html. Needs Playwright (npm i -D playwright; npx playwright install chromium).
//   node tests/page.test.js [screenshot-dir]
// Serves the repo on a local port, loads the page, and drives it through its own hooks.
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const shots = process.argv[2] || null;
const types = { '.html': 'text/html', '.js': 'text/javascript' };
const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  if (!file.startsWith(root) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

let fails = 0;
const check = (name, ok, detail = '') => { if (!ok) fails++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  ' + detail : ''}`); };

(async () => {
  await new Promise((r) => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push(m.text()); });

  await page.goto(url);
  await page.waitForFunction(() => window._currentSystem && window._currentSystem() && window._currentSystem().nodes.length > 1, null, { timeout: 60000 });
  const preset = async (key) => {
    await page.evaluate((k) => document.querySelector(`.preset-chip[data-key="${k}"]`).click(), key);
    await page.waitForFunction((k) => { const s = window._currentSystem(); return s && document.querySelector(`.preset-chip[data-key="${k}"]`).classList.contains('active') && s.nodes.length > 1; }, key);
    await page.waitForTimeout(1200);
  };
  const text = (sel) => page.evaluate((s) => document.querySelector(s).innerText, sel);

  // ── every preset, view and tool runs without an error
  const keys = await page.evaluate(() => [...document.querySelectorAll('.preset-chip[data-key]')].map((c) => c.dataset.key));
  for (const k of keys) await preset(k);
  check(`all ${keys.length} presets run`, errors.length === 0, errors.slice(0, 2).join(' | '));
  for (const v of await page.evaluate(() => [...document.querySelectorAll('.view-tab[data-view]')].map((c) => c.dataset.view))) {
    await page.evaluate((v) => document.querySelector(`.view-tab[data-view="${v}"]`).click(), v);
    await page.waitForTimeout(900);
  }
  check('all views open', errors.length === 0, errors.slice(0, 2).join(' | '));

  // ── the distribution chart and summary on the two-walker preset
  await page.evaluate(() => document.querySelector('.view-tab[data-view="multiway"]').click());
  await preset('double-wide');
  const pat = await page.evaluate(() => { const p = window._currentSystem().getIntensityPattern(); return { mode: p.mode, n: p.weights.length, sym: JSON.stringify(p.weights) === JSON.stringify([...p.weights].reverse()) }; });
  check('chart shows one bar per cell of the string', pat.mode === 'occupancy' && pat.n === 21 && pat.sym, JSON.stringify(pat));
  const panel = await text('#right-panel');
  check('no Fresnel overlay or interference wording in the panel', !/Fresnel|Analytical|DESTRUCTIVE|CONSTRUCTIVE|\|ψ\|/i.test(panel));
  check('summary states that nothing can cancel', /nothing can cancel/.test(await text('#completion-log')));
  check('conjecture is labelled as a conjecture', /conjecture/.test(await text('#quantum-observer-panel')));

  // ── invariance gauge reports measured pairs, with horizon pairs untested
  const gauge = await page.evaluate(() => ({ label: document.getElementById('ci-gauge-label').textContent, title: document.getElementById('ci-gauge-label').title }));
  check('invariance gauge shows the measured score', gauge.label === '100%' && /untested/.test(gauge.title), JSON.stringify(gauge));

  // ── select a state: observer tools
  const nodeId = await page.evaluate(() => { const s = window._currentSystem(); const ids = s.stepStates[7]; return ids[Math.floor(ids.length / 2)]; });
  await page.evaluate((id) => window._selectCausalHistory(id), nodeId);
  await page.waitForTimeout(600);
  for (const id of ['toggle-heatmap', 'toggle-energy', 'btn-verify-ci', 'btn-highlight-ci', 'btn-measure-asymmetry', 'btn-show-subjective', 'toggle-branchial3d', 'toggle-fubini-study', 'toggle-embedded-observer', 'toggle-ricci']) {
    await page.evaluate((id) => document.getElementById(id).click(), id);
    await page.waitForTimeout(700);
  }
  check('tools run with a state selected', errors.length === 0, errors.slice(0, 3).join(' | '));
  const ci = await text('#ci-result');
  check('critical pair test reports rejoin / do not / untested', /rejoin: \d+/.test(ci) && /do not: 0/.test(ci) && /test: \d+/.test(ci), ci.replace(/\s+/g, ' ').slice(0, 120));
  const ricci = await text('#ricci-result');
  check('curvature result has no spacetime claims', ricci.length > 10 && !/spacetime|De Sitter|gravit/i.test(ricci), ricci.replace(/\s+/g, ' ').slice(0, 110));
  const gone = await page.evaluate(() => ['toggle-zeno', 'btn-detect-tunneling', 'btn-measure-holographic', 'btn-measure-persistence', 'btn-measure-speed', 'btn-geodesic-deviation', 'btn-detect-tangles'].filter((id) => document.getElementById(id)));
  check('tools with predetermined output are gone', gone.length === 0, gone.join(','));
  for (const id of ['toggle-ricci', 'toggle-embedded-observer', 'toggle-fubini-study', 'toggle-branchial3d', 'btn-show-subjective', 'btn-highlight-ci', 'toggle-energy', 'toggle-heatmap']) await page.evaluate((id) => document.getElementById(id).click(), id);
  await page.evaluate(() => window._clearObserver());

  // ── causal view: cones from the complete relation; long-range causes present
  await page.evaluate(() => document.querySelector('.view-tab[data-view="causal"]').click());
  await page.waitForTimeout(1000);
  const causal = await page.evaluate(() => {
    const s = window._currentSystem();
    // an event in the middle of the run with at least one cause two or more steps back
    let pick = -1, longRange = 0;
    for (let e = 0; e < s.causalEvents.length; e++) {
      for (let k = s.causalCauseStart[e]; k < s.causalCauseStart[e + 1]; k++) {
        if (s.causalEvents[e].step - s.causalEvents[s.causalCauseList[k]].step > 1) { longRange++; if (pick < 0 && s.causalEvents[e].step === 7) pick = e; }
      }
    }
    const cone = s.traceCausalEventCone(pick);
    window._selectCausalEvent(pick);
    return { events: s.causalEvents.length, direct: s.causalDirectCount, drawn: s.causalEdges.length, longRange, pick, past: cone.pastCone.size, future: cone.futureCone.size, complete: s.causalCompleteThroughStep };
  });
  await page.waitForTimeout(800);
  check('causal relation is complete and includes long-range causes', causal.direct === 65308 && causal.longRange > 0 && causal.complete === 14, JSON.stringify(causal));
  const ev = await text('#observer-analysis');
  check('event panel reports chain length, direct links and the pair test', /Longest causal chain/.test(ev) && /Direct causal links\s*65308/.test(ev.replace(/\n/g, ' ')) && /rejoin/.test(ev), ev.replace(/\s+/g, ' ').slice(0, 90));
  if (shots) await page.screenshot({ path: path.join(shots, 'tlp-causal.png') });
  await page.evaluate(() => window._clearObserver());

  // ── export carries the complete relation
  await page.evaluate(() => document.querySelector('.view-tab[data-view="multiway"]').click());
  await page.waitForTimeout(600);
  if (shots) await page.screenshot({ path: path.join(shots, 'tlp-multiway.png') });

  // ── B-Evolution distance histogram on a preset with thousands of states per step
  await preset('fibonacci');
  await page.evaluate(() => document.querySelector('.view-tab[data-view="bevolution"], .view-tab[data-view="b-evolution"], .view-tab[data-view="bev"]')?.click());
  await page.waitForTimeout(2500);
  check('distance histogram does not crash on a large step', errors.length === 0, errors.slice(0, 2).join(' | '));

  check('no page errors overall', errors.length === 0, errors.slice(0, 3).join(' | '));
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} FAILED` : '\nall passed');
  process.exit(fails ? 1 : 0);
})();
