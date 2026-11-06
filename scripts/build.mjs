// Draws the profile README art into assets/, each image in a dark and a light version:
//   hero           name, tagline and a lens that sweeps a noisy career chart to find the trend
//   results        four headline results
//   contributions  the last 12 months of GitHub contributions, with a weekly trend line
//   career         every role on one time axis
//   arcade         the contribution calendar as a looping arcade level
//
// Usage:
//   GITHUB_TOKEN=... node scripts/build.mjs     fetches the contribution calendar from the GraphQL API
//   node scripts/build.mjs calendar.json        uses a saved GraphQL response instead
//
// No dependencies. The fonts in scripts/fonts are subsets of the portfolio's fonts plus a pixel font
// (all SIL OFL 1.1), embedded so the images look the same on GitHub, which blocks external fonts in
// README images.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets');
const LOGIN = process.env.GH_LOGIN || 'sariyarizwan';
const NOW = process.env.NOW_DATE ? new Date(process.env.NOW_DATE) : new Date();

// ---------------------------------------------------------------- theme

const THEMES = {
  dark: {
    bg: '#100F0D', panel2: '#1F1C18', ink: '#EEE7D9', ink2: '#B3AB9B', ink3: '#938C7F',
    sig: '#FF5A36', bar: '#6E675B', bar2: '#A59D8E',
    hair: 'rgba(238,231,217,.13)', hair2: 'rgba(238,231,217,.26)',
    lvl: ['#1F1C18', '#76331E', '#A54024', '#D44A27', '#FF5A36'],
  },
  light: {
    bg: '#F1ECE2', panel2: '#E9E3D7', ink: '#16140F', ink2: '#4A443A', ink3: '#6A6356',
    sig: '#B9311A', bar: '#8C8475', bar2: '#5E574B',
    hair: 'rgba(22,20,15,.12)', hair2: 'rgba(22,20,15,.26)',
    lvl: ['#E3DCCF', '#E09379', '#D97355', '#CE5135', '#B9311A'],
  },
};
// Contribution levels: empty days stay neutral, then one orange hue with lightness stepping evenly
// (about 0.09 in OKLCH) up to the brand vermilion. The faintest step clears the background at 2:1.

const font = (f) => fs.readFileSync(path.join(ROOT, 'scripts', 'fonts', f)).toString('base64');
const FACES = {
  serif: () => `@font-face{font-family:IS;font-style:normal;src:url(data:font/woff2;base64,${font('instrument-serif.woff2')}) format("woff2")}`,
  serifI: () => `@font-face{font-family:IS;font-style:italic;src:url(data:font/woff2;base64,${font('instrument-serif-italic.woff2')}) format("woff2")}`,
  sans: () => `@font-face{font-family:ISans;font-weight:400 700;src:url(data:font/woff2;base64,${font('instrument-sans.woff2')}) format("woff2")}`,
  mono: () => `@font-face{font-family:JBM;font-weight:400 800;src:url(data:font/woff2;base64,${font('jetbrains-mono.woff2')}) format("woff2")}`,
  arcade: () => `@font-face{font-family:SRA;src:url(data:font/woff2;base64,${font('sr-arcade.woff2')}) format("woff2")}`,
};
const F = {
  serif: `IS,'Instrument Serif',Georgia,serif`,
  sans: `ISans,'Instrument Sans',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif`,
  mono: `JBM,'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`,
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const r1 = (n) => Math.round(n * 10) / 10;

const EASE_OUT = 'cubic-bezier(.16,1,.3,1)';
const EASE_IN_OUT = 'cubic-bezier(.65,0,.35,1)';

// Every animation starts from a hidden state through fill-mode "both", so the natural CSS state is the
// finished image: with reduced motion, or anywhere animations do not run, the full picture shows.
const BASE_CSS = (t) => `
.k{font:500 14px ${F.mono};letter-spacing:.08em;fill:${t.ink3}}
@keyframes rise{from{opacity:0;transform:translateY(14px)}}
@keyframes fade{from{opacity:0}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}`;

function svg({ w, h, title, desc, faces, css, body, t }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="t d">
<title id="t">${esc(title)}</title>
<desc id="d">${esc(desc)}</desc>
<style>${faces.map((f) => FACES[f]()).join('')}${BASE_CSS(t)}${css}</style>
<rect width="${w}" height="${h}" rx="10" fill="${t.bg}"/>
${body}
</svg>
`;
}

function kicker(t, left, right, w, y = 46, dot = true) {
  return `<g class="k" style="animation:fade .8s ${EASE_OUT} .05s both">
${dot ? `<rect x="56" y="${y - 10}" width="9" height="9" fill="${t.sig}"/>` : ''}
<text x="${dot ? 76 : 56}" y="${y}">${esc(left)}</text>
${right ? `<text x="${w - 56}" y="${y}" text-anchor="end">${esc(right)}</text>` : ''}
</g>`;
}

// ---------------------------------------------------------------- hero

function seeded(seed) {
  let s = seed;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const g = () => {
    let u = 0, v = 0;
    while (!u) u = r();
    while (!v) v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  return { r, g };
}

// Same curve as the portfolio hero: one step for each role change, plus a slow climb.
const L = (t, c, k) => 1 / (1 + Math.exp(-(t - c) * k));
const sig = (t) => 0.1 + 0.19 * L(t, 2021.6, 6) + 0.2 * L(t, 2023.6, 6) + 0.27 * L(t, 2025.5, 7) + 0.12 * L(t, 2026.5, 8) + 0.04 * (t - 2021) / 6;

function hero(t) {
  const W = 1200, H = 496;
  const X = (yr) => 56 + (yr - 2021) / 6 * 1088;
  const Y = (v) => 286 + (1 - v) * 168;
  const { r, g } = seeded(11);

  let dots = '';
  for (let i = 0; i < 1150; i++) {
    const yr = 2021.05 + r() * 5.85, v = sig(yr);
    let n = v + g() * 0.19;
    while (n < 0.03 || n > 0.97) n = v + g() * 0.19;
    dots += `M${r1(X(yr) - 0.9)} ${r1(Y(n) - 0.9)}h1.8v1.8h-1.8z`;
  }

  const curve = (a, b, step = 0.02) => {
    let d = '';
    for (let yr = a; yr <= b + 1e-9; yr += step) d += `${d ? 'L' : 'M'}${r1(X(yr))} ${r1(Y(sig(yr)))}`;
    return d;
  };
  const len = (a, b, step = 0.02) => {
    let l = 0;
    for (let yr = a + step; yr <= b + 1e-9; yr += step) l += Math.hypot(X(yr) - X(yr - step), Y(sig(yr)) - Y(sig(yr - step)));
    return Math.ceil(l);
  };

  // The lens eases from early 2021 to mid-2025 once, then stays put (SMIL, one run of about 4 s).
  const A = 2021.35, B = 2025.6, N = 60, R = 60;
  const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const xs = [], ys = [];
  for (let i = 0; i <= N; i++) {
    const yr = A + (B - A) * ease(i / N);
    xs.push(r1(X(yr)));
    ys.push(r1(Y(sig(yr))));
  }
  const move = `<animate attributeName="cx" values="${xs.join(';')}" dur="4.2s" begin="0.9s" fill="freeze"/><animate attributeName="cy" values="${ys.join(';')}" dur="4.2s" begin="0.9s" fill="freeze"/>`;
  // Before the sweep starts the lens rests at A; afterwards SMIL freezes it at B.
  const at = `cx="${xs[0]}" cy="${ys[0]}" r="${R}"`;
  const trailLen = len(A, B);

  const years = [2021, 2022, 2023, 2024, 2025, 2026, 2027]
    .map((yr) => `<text x="${r1(X(yr))}" y="${H - 18}" text-anchor="${yr === 2021 ? 'start' : yr === 2027 ? 'end' : 'middle'}">${yr}</text>`).join('');

  const css = `
.name{font:400 140px ${F.serif};letter-spacing:-.035em;fill:${t.ink}}
.tag{font:500 17px ${F.mono};letter-spacing:.08em;fill:${t.sig}}
.url{font:italic 400 26px ${F.serif};fill:${t.ink2}}
.yr{font:500 11px ${F.mono};letter-spacing:.06em;fill:${t.ink3}}
.trail{stroke-dasharray:${trailLen};animation:draw 4.2s ${EASE_IN_OUT} .9s both}
@keyframes draw{from{stroke-dashoffset:${trailLen}}}`;

  const body = `${kicker(t, 'BI ENGINEER · NEW YORK', 'FIG. 01 · CAREER SIGNAL 2021–2026', W)}
<text class="name" x="50" y="192" style="animation:rise 1s ${EASE_OUT} .1s both">Sariya <tspan font-style="italic">Rizwan</tspan><tspan fill="${t.sig}">.</tspan></text>
<g style="animation:fade .9s ${EASE_OUT} .45s both">
<path d="M56 241h30" stroke="${t.sig}" stroke-width="1.5"/>
<text class="tag" x="100" y="247">FINDS THE SIGNAL IN MESSY DATA</text>
<text class="url" x="${W - 56}" y="252" text-anchor="end">sariyarizwan.com</text>
</g>
<g style="animation:fade 1.2s ${EASE_OUT} .3s both">
<path d="${dots}" fill="${t.ink2}" opacity=".4"/>
<g class="yr">${years}</g>
</g>
<path class="trail" d="${curve(A, B)}" fill="none" stroke="${t.sig}" stroke-width="1.5" stroke-opacity=".55"/>
<clipPath id="lens"><circle ${at}>${move}</circle></clipPath>
<circle ${at} fill="${t.bg}" fill-opacity=".9">${move}</circle>
<g clip-path="url(#lens)" fill="none" stroke="${t.sig}">
<path d="${curve(2021, 2027)}" stroke-width="7" stroke-opacity=".3"/>
<path d="${curve(2021, 2027)}" stroke-width="2"/>
</g>
<circle ${at} fill="none" stroke="${t.ink}" stroke-opacity=".85" stroke-width="1.2">${move}</circle>`;

  return svg({
    w: W, h: H, t, css, body, faces: ['serif', 'serifI', 'mono'],
    title: 'Sariya Rizwan, BI Engineer in New York',
    desc: 'A noisy scatter of points runs from 2021 to 2026. A lens sweeps across it and shows the rising trend underneath: one step for each role change.',
  });
}

// ---------------------------------------------------------------- results

const RESULTS = [
  ['$120K', 'SAVED A YEAR · PSEG'],
  ['6 h → 5 min', 'PLANNING RUN · PSEG'],
  ['$200K+', 'CLIENT VALUE · ASH‑TECH'],
  ['30%', 'FASTER ONBOARDING · WEBSCAPE'],
];

// Column starts, sized to the widest value or label in each column ("6 h → 5 min" needs the most room).
const RESULT_X = [56, 290, 610, 862];

function results(t) {
  const W = 1200, H = 214;
  const css = `
.v{font:400 60px ${F.serif};letter-spacing:-.02em;fill:${t.ink}}
.l{font:500 12.5px ${F.mono};letter-spacing:.06em;fill:${t.ink3}}
.rule{stroke-dasharray:${W - 112};animation:draw 1.4s ${EASE_OUT} .15s both}
@keyframes draw{from{stroke-dashoffset:${W - 112}}}`;
  const cols = RESULTS.map(([v, l], i) => {
    const x = RESULT_X[i];
    return `<g style="animation:rise .9s ${EASE_OUT} ${(0.3 + i * 0.14).toFixed(2)}s both">
${i ? `<path d="M${x - 20} 90v88" stroke="${t.hair}"/>` : ''}
<text class="v" x="${x}" y="146"${i === 0 ? ` fill="${t.sig}"` : ''}>${esc(v)}</text>
<text class="l" x="${x}" y="178">${esc(l)}</text>
</g>`;
  }).join('\n');
  const body = `${kicker(t, 'FIG. 02 · RESULTS', 'NUMBERS FROM THE ROLES THEY CAME FROM', W)}
<path d="M56 72H${W - 56}" stroke="${t.hair2}"/>
<path class="rule" d="M56 72H${W - 56}" stroke="${t.sig}" stroke-width="1.5"/>
${cols}`;
  return svg({
    w: W, h: H, t, css, body, faces: ['serif', 'mono'],
    title: 'Selected results',
    desc: '$120K saved a year at PSEG. A planning run cut from 6 hours to 5 minutes at PSEG. $200K+ in client value at ASH-TECH Solutions. 30% faster client onboarding at WebScape.',
  });
}

// ---------------------------------------------------------------- contributions

async function loadCalendar(file) {
  let json;
  if (file) {
    json = JSON.parse(fs.readFileSync(file, 'utf8'));
  } else {
    const token = process.env.GITHUB_TOKEN;
    if (!token) throw new Error('Set GITHUB_TOKEN, or pass a saved calendar JSON file.');
    const query = `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount contributionLevel}}}}}}`;
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { authorization: `bearer ${token}`, 'content-type': 'application/json', 'user-agent': `${LOGIN}-profile-art` },
      body: JSON.stringify({ query, variables: { login: LOGIN } }),
    });
    if (!res.ok) throw new Error(`GraphQL request failed: ${res.status} ${await res.text()}`);
    json = await res.json();
  }
  if (json.errors) throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  const cal = json?.data?.user?.contributionsCollection?.contributionCalendar;
  if (!cal?.weeks?.length) throw new Error('No contribution calendar in the response.');
  return cal;
}

const LEVEL = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function calendarStats(cal) {
  const days = cal.weeks.flatMap((w) => w.contributionDays);
  const active = days.filter((d) => d.contributionCount > 0).length;
  let longest = 0, run = 0;
  for (const d of days) {
    run = d.contributionCount > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  // The current streak may end yesterday: today is not over yet.
  let i = days.length - 1;
  if (i >= 0 && days[i].contributionCount === 0) i--;
  let current = 0;
  for (; i >= 0 && days[i].contributionCount > 0; i--) current++;
  const busiest = Math.max(...days.map((d) => d.contributionCount));
  return { total: cal.totalContributions, active, longest, current, busiest };
}

function contributions(t, cal) {
  const W = 1200, H = 420;
  const s = calendarStats(cal);
  const weeks = cal.weeks;
  const gx = 100, gy = 222, pitch = (W - 56 - gx) / weeks.length, cell = Math.min(15, pitch - 4);

  // Weekly totals, smoothed over three weeks, drawn as the trend above the grid.
  const totals = weeks.map((w) => w.contributionDays.reduce((a, d) => a + d.contributionCount, 0));
  const smooth = totals.map((_, i) => {
    const win = totals.slice(Math.max(0, i - 1), i + 2);
    return win.reduce((a, b) => a + b, 0) / win.length;
  });
  const peak = Math.max(1, ...smooth);
  const ty = (v) => 192 - (v / peak) * 50;
  const tx = (i) => gx + i * pitch + cell / 2;
  const line = smooth.map((v, i) => `${i ? 'L' : 'M'}${r1(tx(i))} ${r1(ty(v))}`).join('');
  let lineLen = 0;
  for (let i = 1; i < smooth.length; i++) lineLen += Math.hypot(tx(i) - tx(i - 1), ty(smooth[i]) - ty(smooth[i - 1]));
  lineLen = Math.ceil(lineLen);
  const area = `${line}L${r1(tx(smooth.length - 1))} 192L${r1(tx(0))} 192Z`;

  // Month labels sit over the first week that starts in that month.
  let months = '', lastMonth = -1;
  weeks.forEach((w, i) => {
    const m = new Date(`${w.contributionDays[0].date}T00:00:00Z`).getUTCMonth();
    if (m !== lastMonth && i < weeks.length - 2) {
      if (lastMonth !== -1 || w.contributionDays[0].date.slice(8) <= '07') {
        months += `<text x="${r1(gx + i * pitch)}" y="${gy - 10}">${MONTHS[m]}</text>`;
      }
      lastMonth = m;
    }
  });

  const cols = weeks.map((w, i) => {
    const rects = w.contributionDays.map((d) => {
      const dow = new Date(`${d.date}T00:00:00Z`).getUTCDay();
      const lv = LEVEL[d.contributionLevel] ?? 0;
      const hot = lv === 4 ? ` class="hot" style="animation-delay:${(1.5 + i * 0.012).toFixed(3)}s"` : '';
      return `<rect x="${r1(gx + i * pitch)}" y="${r1(gy + dow * pitch)}" width="${r1(cell)}" height="${r1(cell)}" rx="3" fill="${t.lvl[lv]}"${hot}/>`;
    }).join('');
    return `<g style="animation:pop .5s ${EASE_OUT} ${(0.25 + i * 0.02).toFixed(2)}s both">${rects}</g>`;
  }).join('\n');

  const legendX = W - 56 - 5 * 19 - 42;
  const legend = `<g class="sm">
<text x="56" y="${H - 26}">EACH SQUARE IS A DAY · THE LINE IS THE WEEKLY TREND</text>
<text x="${legendX - 10}" y="${H - 26}" text-anchor="end">LESS</text>
${t.lvl.map((c, i) => `<rect x="${legendX + i * 19}" y="${H - 37}" width="14" height="14" rx="3" fill="${c}"/>`).join('')}
<text x="${W - 56}" y="${H - 26}" text-anchor="end">MORE</text>
</g>`;

  const updated = `UPDATED ${NOW.getUTCDate()} ${MONTHS[NOW.getUTCMonth()]} ${NOW.getUTCFullYear()}`;
  const css = `
.big{font:400 50px ${F.serif};letter-spacing:-.02em;fill:${t.ink}}
.st{font:500 12.5px ${F.mono};letter-spacing:.06em;fill:${t.ink3}}
.sm{font:500 11px ${F.mono};letter-spacing:.06em;fill:${t.ink3}}
.mo{font:500 11px ${F.mono};letter-spacing:.06em;fill:${t.ink3}}
.hot{animation:heat .7s ease-out both}
.trend{stroke-dasharray:${lineLen};animation:draw 1.8s ${EASE_IN_OUT} 1.1s both}
@keyframes pop{from{opacity:0;transform:translateY(6px)}}
@keyframes heat{from{fill:${t.lvl[3]}}}
@keyframes draw{from{stroke-dashoffset:${lineLen}}}`;

  const body = `${kicker(t, 'FIG. 03 · CONTRIBUTIONS, LAST 12 MONTHS', updated, W)}
<g style="animation:rise .9s ${EASE_OUT} .1s both">
<text class="big" x="54" y="112"><tspan fill="${t.sig}">${s.total.toLocaleString('en-US')}</tspan> contributions</text>
<text class="st" x="${W - 56}" y="106" text-anchor="end"><tspan font-weight="700" fill="${t.ink}">${s.active}</tspan> ACTIVE DAYS · LONGEST STREAK <tspan font-weight="700" fill="${t.ink}">${s.longest}</tspan> DAYS · BUSIEST DAY <tspan font-weight="700" fill="${t.ink}">${s.busiest}</tspan></text>
</g>
<path d="M${gx} 192H${W - 56}" stroke="${t.hair}"/>
<path d="${area}" fill="${t.sig}" fill-opacity=".08" style="animation:fade 1s ease-out 2.4s both"/>
<path class="trend" d="${line}" fill="none" stroke="${t.sig}" stroke-width="1.6" stroke-linejoin="round"/>
<text class="sm" x="56" y="${ty(peak) + 4}">WEEK</text>
<g class="mo" style="animation:fade .8s ease-out .2s both">${months}</g>
<g class="sm" style="animation:fade .8s ease-out .2s both">
<text x="56" y="${r1(gy + 1 * pitch + cell - 3)}">MON</text>
<text x="56" y="${r1(gy + 3 * pitch + cell - 3)}">WED</text>
<text x="56" y="${r1(gy + 5 * pitch + cell - 3)}">FRI</text>
</g>
${cols}
${legend}`;

  return svg({
    w: W, h: H, t, css, body, faces: ['serif', 'mono'],
    title: `${s.total} GitHub contributions in the last 12 months`,
    desc: `${s.total} contributions over ${s.active} active days in the last 12 months. Longest streak: ${s.longest} days. Busiest day: ${s.busiest} contributions. A trend line shows the weekly totals.`,
  });
}

// ---------------------------------------------------------------- career

// Titles and dates match sariyarizwan.com. end: null means current.
const ROLES = [
  { org: 'Natera', title: 'Business Intelligence Analyst', start: [2026, 6], end: null, lane: 'industry' },
  { org: 'PSEG', title: 'Business Support Specialist', start: [2026, 10], end: null, lane: 'industry' },
  { org: 'PSEG', title: 'Technical Intern, Continuous Improvement', start: [2025, 6], end: [2026, 5], lane: 'industry' },
  { org: 'OSIRIS Lab, NYU Center for Cybersecurity', title: 'Cybersecurity Researcher / CTF Lead / Systems Builder', start: [2025, 1], end: null, lane: 'research' },
  { org: 'Pace University', title: 'Research Assistant & Principal Investigator', start: [2025, 1], end: [2026, 5], lane: 'research' },
  { org: 'ASH‑TECH Solutions', title: 'Business Intelligence / Data Engineer', start: [2023, 7], end: [2024, 8], lane: 'industry' },
  { org: 'WebScape', title: 'Business Intelligence Analyst / Data Engineer', start: [2021, 7], end: [2023, 6], lane: 'industry' },
  { org: 'SARV International', title: 'Business Intelligence Intern', start: [2021, 5], end: [2021, 6], lane: 'industry' },
];
const MBA = { org: 'Pace University, Lubin School of Business', title: 'MBA, Business Analytics (STEM)', at: [2026, 5] };

function career(t) {
  const W = 1200, rowH = 44, top = 104, rows = ROLES.length + 1;
  const H = top + rows * rowH + 56;
  const t0 = 2021 + 3 / 12, t1 = 2027;
  const px0 = 520, px1 = W - 56;
  const X = (yr) => px0 + (yr - t0) / (t1 - t0) * (px1 - px0);
  const ym = ([y, m], endOfMonth = false) => y + (m - 1 + (endOfMonth ? 1 : 0)) / 12;
  const now = NOW.getUTCFullYear() + (NOW.getUTCMonth() + NOW.getUTCDate() / 31) / 12;
  const axisY = top + rows * rowH + 6;

  const grid = [2022, 2023, 2024, 2025, 2026, 2027].map((yr) => `<path d="M${r1(X(yr))} ${top - 14}V${axisY}" stroke="${t.hair}"/>
<text x="${r1(X(yr))}" y="${axisY + 22}" text-anchor="middle">${yr}</text>`).join('');

  const rowsSvg = ROLES.map((role, i) => {
    const y = top + i * rowH;
    const a = ym(role.start), b = role.end ? ym(role.end, true) : now;
    const x = X(a), w = Math.max(6, X(b) - x);
    const current = !role.end;
    const research = role.lane === 'research';
    const fill = research ? `url(#hatch-${current ? 'sig' : 'ink'})` : current ? t.sig : t.bar2;
    const stroke = research ? (current ? t.sig : t.bar2) : 'none';
    const delay = (0.35 + (a - t0) * 0.32).toFixed(2);
    return `<g style="animation:rise .8s ${EASE_OUT} ${(0.2 + i * 0.06).toFixed(2)}s both">
<text class="org" x="56" y="${y + 4}">${esc(role.org)}</text>
<text class="ttl" x="56" y="${y + 22}">${esc(role.title.toUpperCase())}</text>
</g>
<rect class="bar" x="${r1(x)}" y="${y - 6}" width="${r1(w)}" height="12" rx="2" fill="${fill}" stroke="${stroke}" style="animation-delay:${delay}s"/>
${current ? `<circle cx="${r1(x + w)}" cy="${y}" r="4" fill="${t.sig}" style="animation:fade .4s ease-out ${(+delay + 0.9).toFixed(2)}s both"/>` : ''}`;
  }).join('\n');

  const my = top + ROLES.length * rowH;
  const mx = X(ym(MBA.at, true));
  const mba = `<g style="animation:rise .8s ${EASE_OUT} ${(0.2 + ROLES.length * 0.06).toFixed(2)}s both">
<text class="org" x="56" y="${my + 4}">${esc(MBA.org)}</text>
<text class="ttl" x="56" y="${my + 22}">${esc(MBA.title.toUpperCase())}</text>
</g>
<g style="animation:fade .5s ease-out 2.2s both">
<path d="M${r1(mx)} ${my - 8}l8 8-8 8-8-8z" fill="${t.bg}" stroke="${t.sig}" stroke-width="1.5"/>
<text class="ttl" x="${r1(mx - 16)}" y="${my + 4}" text-anchor="end">GRADUATED MAY 2026</text>
</g>`;

  const nx = X(now);
  const nowLine = `<g style="animation:fade .6s ease-out 2.4s both">
<path d="M${r1(nx)} ${top - 22}V${axisY}" stroke="${t.sig}" stroke-dasharray="3 4"/>
<text class="now" x="${r1(nx)}" y="${top - 28}" text-anchor="middle">NOW</text>
</g>`;

  // Legend, right-aligned in the kicker row: swatch, gap, label.
  const items = [['industry', 'INDUSTRY'], ['research', 'RESEARCH'], ['current', 'CURRENT']];
  const charW = 14 * 0.6 + 14 * 0.08;
  let lx = W - 56;
  const legendParts = [];
  for (let i = items.length - 1; i >= 0; i--) {
    const [kind, label] = items[i];
    const tw = label.length * charW;
    lx -= tw;
    const sw = lx - 18;
    const swatch = kind === 'industry' ? `<rect x="${r1(sw)}" y="36" width="12" height="10" rx="2" fill="${t.bar2}"/>`
      : kind === 'research' ? `<rect x="${r1(sw)}" y="36" width="12" height="10" rx="2" fill="url(#hatch-ink)" stroke="${t.bar2}"/>`
        : `<rect x="${r1(sw)}" y="36" width="12" height="10" rx="2" fill="${t.sig}"/>`;
    legendParts.unshift(`${swatch}<text x="${r1(lx)}" y="46">${label}</text>`);
    lx = sw - 26;
  }

  const css = `
.org{font:600 17px ${F.sans};fill:${t.ink}}
.ttl{font:500 10.5px ${F.mono};letter-spacing:.05em;fill:${t.ink3}}
.ax{font:500 11px ${F.mono};letter-spacing:.06em;fill:${t.ink3}}
.now{font:600 10.5px ${F.mono};letter-spacing:.08em;fill:${t.sig}}
.bar{transform-box:fill-box;transform-origin:0 50%;animation:grow .9s ${EASE_OUT} both}
@keyframes grow{from{transform:scaleX(0)}}`;

  const body = `<defs>
<pattern id="hatch-ink" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="${t.bg}"/><path d="M0 0V6" stroke="${t.bar2}" stroke-width="2.4"/></pattern>
<pattern id="hatch-sig" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="${t.bg}"/><path d="M0 0V6" stroke="${t.sig}" stroke-width="2.4"/></pattern>
</defs>
${kicker(t, 'FIG. 04 · CAREER, 2021–2026', '', W)}
<g class="k">${legendParts.join('')}</g>
<g class="ax" style="animation:fade .8s ease-out .2s both">${grid}<path d="M${px0} ${axisY}H${px1}" stroke="${t.hair2}"/></g>
${nowLine}
${rowsSvg}
${mba}`;

  return svg({
    w: W, h: H, t, css, body, faces: ['sans', 'mono'],
    title: 'Career timeline, 2021 to 2026',
    desc: ROLES.map((r) => `${r.title}, ${r.org}, ${r.start.join('-')} to ${r.end ? r.end.join('-') : 'present'}`).join('. ') + `. ${MBA.title}, ${MBA.org}, May 2026.`,
  });
}

// ---------------------------------------------------------------- arcade

// The contribution calendar as an arcade level. A pixel lens clears the grid row by row, filters out three
// "noise" sprites and counts the score up to the year's total, then the stage clears and the game loops.
// The screen is dark in both themes; only the frame around it follows the page.
const SCREEN = { bg: '#0C0B09', ink: '#EEE7D9', ink2: '#B3AB9B', ink3: '#938C7F', sig: '#FF5A36', pellet: '#332E27', lvl: ['', '#544C41', '#8A8170', '#CBC2B1', '#FF5A36'] };
const LOOP = 20; // seconds per game
const PLAY = { start: 1.4, end: 16.6, clear: 17.0, reset: 19.6 };
const r3 = (n) => Math.round(n * 1000) / 1000;
const pct = (s) => `${r3(Math.min(100, (s / LOOP) * 100))}%`;
const at = (x, y) => `translate(${r1(x)}px,${r1(y)}px)`;

// Pixel sprites: one character per pixel, one path per colour.
function sprite(rows, colours) {
  const by = {};
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (colours[ch]) (by[ch] ??= []).push(`M${x} ${y}h1v1h-1z`); }));
  return Object.entries(by).map(([ch, d]) => `<path d="${d.join('')}" fill="${colours[ch]}"/>`).join('');
}

const LENS = [
  '...ooooo......',
  '..ooooooo.....',
  '.ooiiiiioo....',
  'ooigiiiiioo...',
  'oogiiiiiioo...',
  'ooiiiiiiioo...',
  'ooiiiiiiioo...',
  'ooiiiiiiioo...',
  '.ooiiiiioo....',
  '..oooooooHH...',
  '...ooooo.HHH..',
  '..........HHH.',
  '...........HH.',
];

// A blob of static with two eyes and a dark outline, in two frames that flicker. 10 x 9 pixels.
function noiseFrames(seed) {
  const { r } = seeded(seed);
  const body = (x, y) => x >= 1 && x <= 8 && y >= 1 && y <= 7 && ((x - 4.5) / 4) ** 2 + ((y - 4.2) / 3.6) ** 2 <= 1;
  const frame = () => Array.from({ length: 9 }, (_, y) => Array.from({ length: 10 }, (_, x) => {
    if (!body(x, y)) return body(x - 1, y) || body(x + 1, y) || body(x, y - 1) || body(x, y + 1) ? 'k' : '.';
    if (y === 3 && (x === 3 || x === 6)) return 'e';
    const v = r();
    return v < 0.3 ? 'c' : v < 0.62 ? 'a' : v < 0.88 ? 'b' : 'w';
  }).join(''));
  return [frame(), frame()];
}
const NOISE_COLOURS = { a: '#6E675B', b: '#A59D8E', c: '#4A453D', w: '#D8D0C0', k: '#050404', e: SCREEN.sig };

function arcade(t, cal) {
  const W = 1200, H = 392, M = 14;
  const s = calendarStats(cal);
  const weeks = cal.weeks, n = weeks.length;
  const cell = 12, pitch = Math.min(20, 1040 / (n - 1));
  const span = (n - 1) * pitch + cell;
  const gx = (W - span) / 2, gy = 116;
  const cx = (i) => gx + i * pitch + cell / 2;
  const cy = (row) => gy + row * pitch + cell / 2;
  const kf = [];

  // The lens's route: in from the left, along each row in turn (alternating direction), out at the right,
  // at one steady speed.
  const steps = 1.5 + 7 * (n - 1) + 6 + 1.5;
  const v = (pitch * steps) / (PLAY.end - PLAY.start);
  const route = [{ x: cx(0) - 1.5 * pitch, y: cy(0), t: PLAY.start }];
  const go = (x, y) => {
    const p = route[route.length - 1];
    route.push({ x, y, t: p.t + Math.hypot(x - p.x, y - p.y) / v });
  };
  const rows = [];
  for (let row = 0; row < 7; row++) {
    const dir = row % 2 ? -1 : 1;
    const [xs, xe] = dir > 0 ? [cx(0), cx(n - 1)] : [cx(n - 1), cx(0)];
    go(xs, cy(row));
    rows.push({ row, xs, dir, a: route[route.length - 1].t });
    go(xe, cy(row));
  }
  go(cx(n - 1) + 1.5 * pitch, cy(6));
  const home = route[0], exit = route[route.length - 1];
  const tEat = (row, i) => rows[row].a + Math.abs(cx(i) - rows[row].xs) / v;

  // The level: lit days as squares in the calendar's colours, empty days as small pellets.
  const eats = [];
  const paths = ['', '', '', '', ''];
  weeks.forEach((w, i) => w.contributionDays.forEach((d) => {
    const row = new Date(`${d.date}T00:00:00Z`).getUTCDay();
    const lv = LEVEL[d.contributionLevel] ?? 0;
    if (d.contributionCount > 0) eats.push({ t: tEat(row, i), n: d.contributionCount, lv, x: cx(i), y: cy(row) });
    paths[lv] += lv ? `M${r1(cx(i) - cell / 2)} ${r1(cy(row) - cell / 2)}h${cell}v${cell}h-${cell}z` : `M${r1(cx(i) - 2)} ${r1(cy(row) - 2)}h4v4h-4z`;
  }));
  const grid = paths.map((d, lv) => d && `<path d="${d}" fill="${lv ? SCREEN.lvl[lv] : SCREEN.pellet}"/>`).join('');

  // Behind the lens each row is wiped clean, leaving a faint trace of its path. The wipe's edge is kept
  // exactly under the lens by starting and ending it where the lens would cross the band's edges.
  const L = gx - 5, R = gx + span + 5;
  const wipes = rows.map(({ row, xs, dir, a }) => {
    const t0 = a - (dir > 0 ? xs - L : R - xs) / v;
    const t1 = a + (dir > 0 ? R - xs : xs - L) / v;
    kf.push(`@keyframes w${row}{0%,${pct(t0)}{transform:scaleX(0)}${pct(t1)},${pct(PLAY.reset + 0.1)}{transform:scaleX(1)}${pct(PLAY.reset + 0.12)},100%{transform:scaleX(0)}}`);
    return `<g class="L wipe" style="transform-origin:${dir > 0 ? 'left' : 'right'} center;animation-name:w${row}"><rect x="${r1(L)}" y="${r1(cy(row) - pitch / 2)}" width="${r1(R - L)}" height="${r1(pitch)}" fill="${SCREEN.bg}"/><rect x="${r1(L)}" y="${r1(cy(row) - 1)}" width="${r1(R - L)}" height="2" fill="${SCREEN.sig}" fill-opacity=".3"/></g>`;
  }).join('');

  // The lens.
  const lensKf = [`0%{transform:${at(home.x, home.y)}}`, ...route.map((p) => `${pct(p.t)}{transform:${at(p.x, p.y)}}`),
    `${pct(PLAY.reset + 0.1)}{transform:${at(exit.x, exit.y)}}`, `${pct(PLAY.reset + 0.12)},100%{transform:${at(home.x, home.y)}}`];
  kf.push(`@keyframes lens{${lensKf.join('')}}`);
  kf.push(`@keyframes lensOn{0%{opacity:1}${pct(PLAY.reset)}{opacity:0}${pct(PLAY.reset + 0.3)}{opacity:1}100%{opacity:1}}`);
  const lens = `<g class="L" style="transform:${at(home.x, home.y)};animation-name:lens"><g class="L S" style="animation-name:lensOn"><g class="bob"><g transform="translate(-11 -11) scale(2)">${sprite(LENS, { o: SCREEN.sig, i: 'rgba(255,90,54,.16)', g: SCREEN.ink, H: SCREEN.ink2 })}</g></g></g></g>`;

  // Three noise sprites drift toward the lens and vanish when it reaches them.
  const caught = [];
  const noise = [{ row: 1, at: 0.62 }, { row: 4, at: 0.35 }, { row: 6, at: 0.7 }].map((e, k) => {
    const i = Math.round(e.at * (n - 1));
    const tc = tEat(e.row, i), xc = cx(i), y = cy(e.row);
    const x0 = xc + rows[e.row].dir * 10 * tc; // 10 px a second, toward the lens
    caught.push({ t: tc, x: xc, y });
    kf.push(`@keyframes n${k}{0%{transform:${at(x0, y)};opacity:1}${pct(tc)}{transform:${at(xc, y)};opacity:1}${pct(tc + 0.02)},${pct(PLAY.reset + 0.1)}{transform:${at(xc, y)};opacity:0}${pct(PLAY.reset + 0.12)}{transform:${at(x0, y)};opacity:0}${pct(PLAY.reset + 0.3)},100%{transform:${at(x0, y)};opacity:1}}`);
    const [f1, f2] = noiseFrames(101 + k * 37);
    return `<g class="L" style="transform:${at(x0, y)};animation-name:n${k}"><g class="bob" style="animation-delay:-${k * 0.2}s"><g transform="translate(-12.5 -11.3) scale(2.5)"><g class="f1">${sprite(f1, NOISE_COLOURS)}</g><g class="f2">${sprite(f2, NOISE_COLOURS)}</g></g></g></g>`;
  }).join('');

  // Score pops for the busier days, sparks on the busiest, and a pop for each noise sprite caught.
  const delay = (time) => `animation-delay:${r3(time - LOOP)}s`;
  const SPARK = [[1, -1], [-1, -1], [1, 1], [-1, 1]];
  SPARK.forEach(([dx, dy], k) => kf.push(`@keyframes sp${k}{0%{opacity:1;transform:translate(0,0)}${pct(0.45)}{opacity:0;transform:translate(${dx * 16}px,${dy * 16}px)}100%{opacity:0;transform:translate(${dx * 16}px,${dy * 16}px)}}`));
  const sparks = (x, y, fill, time) => SPARK.map((_, k) => `<rect class="L spark" x="${r1(x - 2)}" y="${r1(y - 2)}" width="4" height="4" fill="${fill}" style="animation-name:sp${k};${delay(time)}"/>`).join('');
  const pops = [
    ...eats.filter((e) => e.lv >= 2).map((e) => `<text class="L pop" x="${r1(e.x)}" y="${r1(e.y - 12)}" fill="${e.lv === 4 ? SCREEN.sig : SCREEN.ink}" style="${delay(e.t)}">+${e.n}</text>${e.lv === 4 ? sparks(e.x, e.y, SCREEN.sig, e.t) : ''}`),
    ...caught.map((c) => `<text class="L pop" x="${r1(c.x)}" y="${r1(c.y - 14)}" fill="${SCREEN.ink2}" style="${delay(c.t)}">FILTERED</text>${sparks(c.x, c.y, SCREEN.ink2, c.t)}`),
  ].join('');

  // The score, as one frame for every quarter second of play.
  const DT = 0.25;
  const pad = (x) => String(x).padStart(6, '0');
  const scoreAt = (time) => eats.reduce((sum, e) => sum + (e.t <= time ? e.n : 0), 0);
  const frames = [];
  let tk = PLAY.start;
  for (let k = 1; tk < PLAY.end + 0.25; k++) {
    frames.push(`<text class="L S sf" style="${delay(tk)}">${pad(scoreAt(tk))}</text>`);
    tk = r3(PLAY.start + k * DT); // whole milliseconds, so each frame ends exactly where the next begins
  }
  kf.push(`@keyframes sf{0%{opacity:1}${pct(DT)},100%{opacity:0}}`);
  kf.push(`@keyframes s0{0%{opacity:1}${pct(PLAY.start)},100%{opacity:0}}`);
  kf.push(`@keyframes sN{0%{opacity:0}${pct(tk)},100%{opacity:1}}`);
  const score = `<g class="val" transform="translate(48 88)">
<text class="still">${pad(s.total)}</text>
<text class="L S hide" style="animation-name:s0">${pad(0)}</text>
${frames.join('\n')}
<text class="L S hide" style="animation-name:sN">${pad(s.total)}</text>
</g>`;

  // Messages: the stage name before play, the tagline during it, STAGE CLEAR after.
  kf.push(`@keyframes m0{0%{opacity:1}${pct(PLAY.start)}{opacity:0}${pct(PLAY.reset)},100%{opacity:1}}`);
  kf.push(`@keyframes m1{0%{opacity:0}${pct(PLAY.start)}{opacity:1}${pct(PLAY.clear)},100%{opacity:0}}`);
  kf.push(`@keyframes clear{0%{opacity:0}${pct(PLAY.clear)}{opacity:1}${pct(PLAY.reset)},100%{opacity:0}}`);
  // The pixel font is monospaced at 1em, so the two halves can be placed by character count. SVG drops
  // a leading space, so the gap between them is counted here instead.
  const cta1 = '▶ PRESS START', cta2 = '· 3 DATA GAMES AT SARIYARIZWAN.COM';
  const ctaX = W / 2 - ((cta1.length + 1 + cta2.length) * 14) / 2;

  const css = `
.px{font-family:SRA,monospace}
.lab{font:12px SRA,monospace;fill:${SCREEN.ink3}}
.val{font:20px SRA,monospace;fill:${SCREEN.ink}}
.msg{font:16px SRA,monospace;fill:${SCREEN.ink}}
.L{animation-duration:${LOOP}s;animation-iteration-count:infinite;animation-timing-function:linear}
.S{animation-timing-function:step-end}
.pop{font:10px SRA,monospace;text-anchor:middle;opacity:0;animation-name:pop;animation-timing-function:cubic-bezier(.2,.7,.3,1)}
.wipe{transform-box:fill-box;transform:scaleX(0)}
.spark{opacity:0}
.sf,.hide{opacity:0}
.val text{stroke:${SCREEN.bg};stroke-width:10px;paint-order:stroke}
.sf{animation-name:sf}
.still{animation:hide 1s infinite}
.bob{animation:bob .6s step-end infinite}
.f1{animation:f1 .36s step-end infinite}
.f2{opacity:0;animation:f2 .36s step-end infinite}
.blink{animation:blink 1.2s step-end infinite}
@keyframes pop{0%{opacity:1;transform:translateY(0)}${pct(0.9)}{opacity:0;transform:translateY(-16px)}100%{opacity:0;transform:translateY(-16px)}}
@keyframes hide{0%,100%{opacity:0}}
@keyframes bob{0%{transform:translateY(0)}50%{transform:translateY(-2px)}}
@keyframes f1{0%{opacity:1}50%{opacity:0}}
@keyframes f2{0%{opacity:0}50%{opacity:1}}
@keyframes blink{0%{opacity:1}60%{opacity:0}}
${kf.join('\n')}`;

  const body = `<defs>
<pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="2" fill="#000"/></pattern>
<radialGradient id="vig" cx="50%" cy="50%" r="70%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>
</defs>
<rect x="${M}" y="${M}" width="${W - 2 * M}" height="${H - 2 * M}" rx="12" fill="${SCREEN.bg}" stroke="${t.hair2}"/>
<g class="lab">
<text class="blink" x="48" y="58" fill="${SCREEN.sig}">1UP</text>
<text x="${W / 2}" y="58" text-anchor="middle">BEST DAY</text>
<text x="${W - 48}" y="58" text-anchor="end">LONGEST STREAK</text>
</g>
${score}
<g class="val"><text x="${W / 2}" y="88" text-anchor="middle">${s.busiest}</text><text x="${W - 48}" y="88" text-anchor="end">${s.longest} DAYS</text></g>
<g shape-rendering="crispEdges">
${grid}
${wipes}
${noise}
${lens}
${pops}
</g>
<text class="msg L S hide" x="${W / 2}" y="296" text-anchor="middle" fill="${SCREEN.ink2}" style="animation-name:m0">STAGE 01 · THE LAST 12 MONTHS</text>
<text class="msg L S" x="${W / 2}" y="296" text-anchor="middle" style="animation-name:m1">FIND THE SIGNAL IN THE NOISE</text>
<g class="L S hide" style="animation-name:clear">
<text class="px blink" x="${W / 2}" y="190" font-size="32" text-anchor="middle" fill="${SCREEN.sig}">STAGE CLEAR</text>
<text class="px" x="${W / 2}" y="228" font-size="13" text-anchor="middle" fill="${SCREEN.ink}">SIGNAL FOUND · ${s.total.toLocaleString('en-US')} CONTRIBUTIONS</text>
</g>
<g class="px" font-size="14">
<text class="blink" x="${r1(ctaX)}" y="346" fill="${SCREEN.sig}">${cta1}</text>
<text x="${r1(ctaX + (cta1.length + 1) * 14)}" y="346" fill="${SCREEN.ink2}">${cta2}</text>
</g>
<rect x="${M}" y="${M}" width="${W - 2 * M}" height="${H - 2 * M}" rx="12" fill="url(#scan)" opacity=".22"/>
<rect x="${M}" y="${M}" width="${W - 2 * M}" height="${H - 2 * M}" rx="12" fill="url(#vig)"/>`;

  return svg({
    w: W, h: H, t, css, body, faces: ['arcade'],
    title: 'Arcade: the last 12 months of contributions as a game level',
    desc: `A pixel-art arcade screen. The level is Sariya's real contribution calendar: a pixel lens clears it day by day, filters out three noise sprites and counts the score up to ${s.total} contributions. Best day: ${s.busiest}. Longest streak: ${s.longest} days. Press start for three data games on sariyarizwan.com.`,
  });
}

// ---------------------------------------------------------------- main

const cal = await loadCalendar(process.argv[2]);
fs.mkdirSync(OUT, { recursive: true });
const written = [];
for (const [mode, t] of Object.entries(THEMES)) {
  for (const [name, draw] of [['hero', hero], ['results', results], ['contributions', (th) => contributions(th, cal)], ['career', career], ['arcade', (th) => arcade(th, cal)]]) {
    const file = path.join(OUT, `${name}-${mode}.svg`);
    fs.writeFileSync(file, draw(t));
    written.push(`${path.relative(ROOT, file)} ${(fs.statSync(file).size / 1024).toFixed(1)} KB`);
  }
}
console.log(written.join('\n'));
