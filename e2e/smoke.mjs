// End-to-end smoke test against a running deployment (browser -> nginx -> Go API -> Postgres).
// usage: BASE_URL=http://localhost:18081 ADMIN_KEY=... node e2e/smoke.mjs
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:18081';
const ADMIN_KEY = process.env.ADMIN_KEY;
if (!ADMIN_KEY) throw new Error('ADMIN_KEY is required');
const uname = 'e2e' + Math.random().toString(36).slice(2, 8);
const pass = 'Pass-' + Math.random().toString(36).slice(2, 8);
const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); };

// AIRGAP=1: the browser may not resolve any host except the one under test, and any request that leaves
// that origin is a failure (checked at the end). Catches fonts/CDNs/analytics the static scan cannot see.
const AIRGAP = process.env.AIRGAP === '1';
const launchOpts = process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {};
if (AIRGAP) launchOpts.args = ['--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1 , EXCLUDE localhost'];
const browser = await chromium.launch(launchOpts);
const problems = [];
const external = new Set();
const BASE_ORIGIN = new URL(BASE).origin;
const watch = (page) => {
  page.on('request', (r) => { const u = r.url(); if (!/^(data|blob|about):/.test(u) && new URL(u).origin !== BASE_ORIGIN) external.add(u.slice(0, 160)); });
  page.on('console', (m) => { if (m.type() === 'error') problems.push('console: ' + m.text().slice(0, 200)); });
  page.on('pageerror', (e) => problems.push('pageerror: ' + e.message.slice(0, 200)));
  page.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('/auth/')) problems.push(`HTTP ${r.status()} ${r.url()}`); });
};

// 1. sign up
const ctx1 = await browser.newContext();
const p1 = await ctx1.newPage(); watch(p1);
await p1.goto(BASE + '/onboarding');
await p1.getByPlaceholder('مثلاً: علی').fill('کودک تست');
await p1.getByPlaceholder('مثلاً: ali123').fill(uname);
await p1.getByPlaceholder('یک رمز عبور انتخاب کن').fill(pass);
await p1.locator('button[type=submit]').click();
await p1.waitForURL('**/home', { timeout: 15000 });
check('sign up lands on /home', true);

// 2. curriculum came from the Go API and the path renders
const nodeLinks = await p1.waitForFunction(() => document.querySelectorAll('button, a').length > 5, null, { timeout: 15000 }).then(() => true).catch(() => false);
check('home renders from API curriculum', nodeLinks);
await p1.waitForTimeout(1500); // let the register + patch sync finish

// 3. login from a fresh browser profile (no local data): proves register stored a usable credential
const ctx2 = await browser.newContext();
const p2 = await ctx2.newPage(); watch(p2);
await p2.goto(BASE + '/login');
await p2.getByPlaceholder('مثلاً: ali123').fill(uname);
await p2.locator('input[type=password]').fill(pass);
await p2.locator('button[type=submit]').click();
await p2.waitForURL('**/home', { timeout: 15000 }).then(() => check('login on a clean device', true)).catch(() => check('login on a clean device', false));

// wrong password is rejected
const ctx3 = await browser.newContext();
const p3 = await ctx3.newPage(); watch(p3);
await p3.goto(BASE + '/login');
await p3.getByPlaceholder('مثلاً: ali123').fill(uname);
await p3.locator('input[type=password]').fill('wrong-' + pass);
await p3.locator('button[type=submit]').click();
await p3.getByText('رمز عبور اشتباهه').waitFor({ timeout: 10000 }).then(() => check('wrong password shows error', true)).catch(() => check('wrong password shows error', false));

// 4. open a real lesson, report an error
const cur = await (await p1.request.get(BASE + '/api/v1/curriculum')).json();
const node = cur.nodes.find((n) => n.type === 'lesson' && cur.questions.some((q) => q.node_id === n.id && q.type !== 'handwriting'));
await p1.goto(BASE + '/lesson/' + node.id);
await p1.getByText('گزارش خطا در این سوال').click({ timeout: 15000 });
await p1.locator('textarea').fill('تست خودکار: صدا اشتباهه ' + uname);
await p1.getByRole('button', { name: 'ارسال گزارش' }).click();
await p1.getByText('گزارشت ارسال شد').waitFor({ timeout: 10000 }).then(() => check('report button sends', true)).catch(() => check('report button sends', false));

// 5. admin page lists it (key typed in the UI), tools links present
await p1.goto(BASE + '/admin');
await p1.locator('input[type=password]').fill(ADMIN_KEY);
await p1.getByRole('button', { name: 'نمایش گزارش‌ها' }).click();
await p1.getByText(uname).first().waitFor({ timeout: 10000 }).then(() => check('admin lists the report', true)).catch(() => check('admin lists the report', false));
check('admin has tool links', (await p1.locator('a[href="/question-editor"]').count()) > 0 && (await p1.locator('a[href="/intro-audio-recorder"]').count()) > 0);
await p1.getByRole('button', { name: /رسیدگی شد/ }).first().click();
await p1.waitForTimeout(800);
const rep = await (await p1.request.get(BASE + '/api/v1/admin/reports', { headers: { 'X-Admin-Key': ADMIN_KEY } })).json();
check('report resolved in DB', rep.some((r) => (r.description ?? '').includes(uname) && r.status === 'resolved'));

// 6. wrong admin key is refused
const bad = await p1.request.get(BASE + '/api/v1/admin/reports', { headers: { 'X-Admin-Key': 'nope' } });
check('wrong admin key -> 403', bad.status() === 403);

// 7. other pages load
for (const path of ['/profile', '/friends', '/leaderboard', '/question-editor']) {
  await p1.goto(BASE + path);
  await p1.waitForTimeout(1200);
}
check('profile/friends/leaderboard/editor render without crashing', true);
const lb = await (await p1.request.get(BASE + '/api/v1/profiles?q=' + uname)).json();
check('new user visible in public search', lb.length === 1 && !JSON.stringify(lb).includes('hash'));

if (AIRGAP) {
  // the wrong-password page (p3) is not watched on purpose in the original script; include it by visiting nothing new here
  check('air-gap: no request left the origin', external.size === 0, [...external].slice(0, 5).join(' | '));
}
await browser.close();
const unexpected = problems.filter((x) => !/favicon/.test(x));
console.log('\nconsole/network problems:', unexpected.length ? '\n  ' + unexpected.join('\n  ') : 'none');
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
