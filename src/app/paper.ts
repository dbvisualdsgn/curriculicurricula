// Appearance: the page is always light, never a dark theme. Three looks:
// - Classic: white paper, black ink, photos in colour.
// - Paper: Kobo-style "light". Warmth moves the paper from cool white to warm sepia; brightness dims it. Photos in grey.
// - Color: a light, tinted paper (its tone changes, never its brightness) and a dark, tinted ink. Photos as a
//   duotone of the two, and the highlight becomes a saturated tint of the ink.
// Every text colour keeps at least 7:1 contrast (WCAG AAA) with the paper, in every look.
import { useEffect, useSyncExternalStore } from 'react';

export type AppearanceMode = 'classic' | 'paper' | 'color';
export type PhotoEffect = 'color' | 'gray' | 'duotone';

export interface PaperSettings {
  mode: AppearanceMode;
  warmth: number; // 0 (cool) – 100 (warm), Paper only
  brightness: number; // 0 (soft) – 100 (bright), Paper only
  bg: string; // Color only: background tone (clamped to the light band)
  ink: string; // Color only: text tone (clamped to ≥ 7:1)
}

export const defaultPaper: PaperSettings = { mode: 'paper', warmth: 40, brightness: 100, bg: '#e9e2f6', ink: '#3b2a8f' };

const STORAGE_KEY = 'curricula.paper';
const VARS_KEY = 'curricula.paper.vars';
const PHOTO_KEY = 'curricula.photo';

type RGB = [number, number, number];
const INK: RGB = [17, 17, 17];
const WHITE: RGB = [255, 255, 255];
const COOL: RGB = [245, 246, 243];
const NEUTRAL: RGB = [236, 234, 229];
const WARM: RGB = [236, 221, 191];
const YELLOW = '#e6f05a';
/** How much lighter the CV sheet is than the page (toward white, same tone). */
export const SHEET_LIFT = 0.4;
/** Minimum contrast for every text colour on the paper (AAA). */
const AAA = 7;
/** Coloured ink sits above that, so secondary text (a lighter mix of the ink) can still reach AAA. */
const INK_RATIO = 9;
/** Ink on the highlight: the marker sits behind titles and short labels, so AA for large text and more is enough
 *  to let the highlight carry real colour. */
const ACCENT_RATIO = 4.5;

export const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * t) as RGB;
export const hex = (c: RGB) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
export const parseHex = (s: string): RGB | null => {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(s.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
};

function luminance([r, g, b]: RGB) {
  const ch = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}
export const contrast = (a: RGB, b: RGB) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

/** Darkest mix of paper → ink that still reaches `ratio` against the paper. */
function textOn(paper: RGB, ratio: number, start: number, ink: RGB = INK) {
  for (let t = start; t <= 1; t += 0.01) {
    const c = mix(paper, ink, t);
    if (contrast(c, paper) >= ratio) return c;
  }
  return ink;
}

// ---- OKLCH, so "same brightness, another tone" holds for the eye ----
const toLin = (v: number) => {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const fromLin = (v: number) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

export function toOklch([r8, g8, b8]: RGB) {
  const [r, g, b] = [toLin(r8), toLin(g8), toLin(b8)];
  const l = Math.cbrt(0.4122214708 * r + 0.5363288310 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720453 * s;
  const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  const C = Math.hypot(A, B);
  const H = ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
  return { L, C, H };
}

/** Linear sRGB for an OKLCH colour (may fall outside 0–1 when out of gamut). */
function oklchLinear(L: number, C: number, H: number) {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}

/** OKLCH → sRGB, lowering the chroma until the colour fits the screen's gamut. */
export function fromOklch(L: number, C: number, H: number): RGB {
  for (let c = C; c >= 0; c -= 0.002) {
    const lin = oklchLinear(L, c, H);
    if (lin.every((v) => v >= -0.0005 && v <= 1.0005)) return lin.map(fromLin) as RGB;
  }
  return oklchLinear(L, 0, H).map(fromLin) as RGB;
}

/** The tone of a colour, in degrees (0–360). */
export const hueOf = (s: string, fallback = 290) => {
  const rgb = parseHex(s);
  if (!rgb) return fallback;
  const { C, H } = toOklch(rgb);
  return C < 0.01 ? fallback : H;
};

/** Background: any tone, always the same light level. */
export const BG_L = 0.94;
export const BG_C = 0.045;
export const bgFromHue = (h: number) => fromOklch(BG_L, BG_C, h);
export const clampBg = (s: string) => hex(bgFromHue(hueOf(s)));

/** Text: any tone, strong colour, dark enough for ≥ 9:1 on the background. Light zones are cut off. */
export function inkFromHue(h: number, bg: RGB): RGB {
  for (let L = 0.62; L >= 0.05; L -= 0.005) {
    const c = fromOklch(L, 0.16, h);
    if (contrast(c, bg) >= INK_RATIO) return c;
  }
  return INK;
}
export const clampInk = (s: string, bg: string) => hex(inkFromHue(hueOf(s), parseHex(bg) ?? WHITE));

/** Highlight: the ink's tone, as saturated as possible, light enough that the ink on top keeps ≥ 4.5:1. */
export function accentFor(ink: RGB): RGB {
  const h = toOklch(ink).H;
  let best: RGB = parseHex(YELLOW)!;
  let bestC = -1;
  for (let L = 0.98; L >= 0.75; L -= 0.005) {
    const c = fromOklch(L, 0.3, h);
    if (contrast(ink, c) < ACCENT_RATIO) break;
    const chroma = toOklch(c).C;
    if (chroma > bestC) {
      bestC = chroma;
      best = c;
    }
  }
  return best;
}

/** Colour pairs from real-world CVs, clamped by the same rules. */
export const colorPresets = [
  { id: 'sand', bg: '#f1e6d8', ink: '#3a2e9c' },
  { id: 'blush', bg: '#f6dfe6', ink: '#c0123c' },
  { id: 'sky', bg: '#dce8f6', ink: '#c2410c' },
  { id: 'lilac', bg: '#ebe2f7', ink: '#4c1d95' },
  { id: 'mint', bg: '#dff1e6', ink: '#14532d' },
  { id: 'peach', bg: '#f8e4d8', ink: '#6b1d5c' },
] as const;

function base(settings: PaperSettings): { paper: RGB; ink: RGB; highlight: string; photo: PhotoEffect } {
  if (settings.mode === 'classic') return { paper: WHITE, ink: INK, highlight: YELLOW, photo: 'color' };
  if (settings.mode === 'color') {
    const paper = bgFromHue(hueOf(settings.bg));
    const ink = inkFromHue(hueOf(settings.ink), paper);
    return { paper, ink, highlight: hex(accentFor(ink)), photo: 'duotone' };
  }
  const w = Math.max(0, Math.min(100, settings.warmth));
  const tone = w <= 40 ? mix(COOL, NEUTRAL, w / 40) : mix(NEUTRAL, WARM, (w - 40) / 60);
  // Brightness 0 dims the paper to 80% (still ≥ 8:1 with the ink at the warmest setting).
  const k = 0.8 + 0.2 * (Math.max(0, Math.min(100, settings.brightness)) / 100);
  return { paper: tone.map((v) => v * k) as RGB, ink: INK, highlight: YELLOW, photo: 'gray' };
}

export function paperColors(settings: PaperSettings) {
  const { paper, ink, highlight, photo } = base(settings);
  const inkSoft = textOn(paper, AAA + 0.2, 0.55, ink);
  const sheet = mix(paper, WHITE, SHEET_LIFT);
  const vars: Record<string, string> = {
    '--paper': hex(paper),
    '--ink': hex(ink),
    '--focus': hex(ink),
    '--highlight': highlight,
    '--ink-soft': hex(inkSoft),
    '--rule': hex(mix(paper, ink, 0.16)),
    '--panel': hex(mix(paper, WHITE, 0.55)),
    // The CV sheet: the same tone as the page, 40% closer to white, so the CV always reads as the lightest thing on it.
    '--sheet': hex(sheet),
    '--color-zinc-50': hex(mix(paper, ink, 0.035)),
    '--color-zinc-100': hex(mix(paper, ink, 0.07)),
    '--color-zinc-200': hex(mix(paper, ink, 0.16)),
    '--color-zinc-300': hex(mix(paper, ink, 0.22)),
    '--color-zinc-400': hex(mix(paper, ink, 0.38)),
    '--color-zinc-500': hex(textOn(paper, 4.6, 0.4, ink)),
    '--color-zinc-600': hex(inkSoft),
    '--color-zinc-700': hex(textOn(paper, 9, 0.7, ink)),
    '--color-zinc-950': hex(ink),
  };
  return { vars, photo, paper: hex(paper), sheet: hex(sheet), ink: hex(ink), inkRatio: contrast(ink, paper), softRatio: contrast(inkSoft, paper) };
}

/** An SVG filter that maps a photo's shadows to the ink and its lights to the CV sheet. Kept in the page body. */
function updateDuotone(ink: string, paper: string) {
  const [a, b] = [parseHex(ink)!, parseHex(paper)!];
  const NS = 'http://www.w3.org/2000/svg';
  let svg = document.getElementById('cc-filters') as Element | null;
  if (!svg) {
    svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('id', 'cc-filters');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden');
    document.body.appendChild(svg);
  }
  const t = (i: number) => `${(a[i] / 255).toFixed(4)} ${(b[i] / 255).toFixed(4)}`;
  svg.innerHTML =
    '<filter id="cc-duotone" color-interpolation-filters="sRGB">' +
    // Luminance, with a little more contrast so the face still reads in two colours.
    '<feColorMatrix type="matrix" values="0.2658 0.8940 0.0902 0 -0.1250 0.2658 0.8940 0.0902 0 -0.1250 0.2658 0.8940 0.0902 0 -0.1250 0 0 0 1 0"/>' +
    `<feComponentTransfer><feFuncR type="table" tableValues="${t(0)}"/><feFuncG type="table" tableValues="${t(1)}"/><feFuncB type="table" tableValues="${t(2)}"/></feComponentTransfer>` +
    '</filter>';
}

export function applyPaper(settings: PaperSettings) {
  const { vars, paper, sheet, ink, photo } = paperColors(settings);
  const root = document.documentElement;
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  root.dataset.photo = photo;
  updateDuotone(ink, sheet);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', paper);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    // Pre-computed values let the inline script in each page paint the right colours before React loads.
    localStorage.setItem(VARS_KEY, JSON.stringify(vars));
    localStorage.setItem(PHOTO_KEY, photo);
  } catch {
    // Not critical.
  }
}

/** Reads saved settings; older saves (warmth and brightness only) open as Paper. */
export function readPaper(raw: unknown): PaperSettings {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Partial<PaperSettings>;
  const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : d);
  const col = (v: unknown, d: string) => (typeof v === 'string' && parseHex(v) ? v : d);
  return {
    mode: s.mode === 'classic' || s.mode === 'color' ? s.mode : 'paper',
    warmth: num(s.warmth, defaultPaper.warmth),
    brightness: num(s.brightness, defaultPaper.brightness),
    bg: col(s.bg, defaultPaper.bg),
    ink: col(s.ink, defaultPaper.ink),
  };
}

function initial(): PaperSettings {
  try {
    return readPaper(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null'));
  } catch {
    return defaultPaper;
  }
}

// One shared setting for every control on the page, so a CV can bring its own look when it opens.
let state: PaperSettings | null = null;
const listeners = new Set<() => void>();
const get = () => (state ??= initial());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Change the appearance (a value, or a function of the current one) and apply it to the page. */
export function setPaper(next: PaperSettings | ((s: PaperSettings) => PaperSettings)) {
  const value = readPaper(typeof next === 'function' ? next(get()) : next);
  if (JSON.stringify(value) === JSON.stringify(get())) return;
  state = value;
  applyPaper(value);
  listeners.forEach((l) => l());
}

export function usePaper() {
  const settings = useSyncExternalStore(subscribe, get);
  useEffect(() => applyPaper(settings), [settings]);
  return [settings, setPaper] as const;
}

/** Current colours as resolved on the page (for the designed PDF). */
export function currentPaper() {
  const s = getComputedStyle(document.documentElement);
  const get = (name: string, fallback: string) => s.getPropertyValue(name).trim() || fallback;
  const photo = (document.documentElement.dataset.photo as PhotoEffect | undefined) ?? 'gray';
  // The PDF is the CV sheet, so its page takes the sheet colour.
  return { paper: get('--sheet', '#F4F2EF'), ink: get('--ink', '#111111'), soft: get('--ink-soft', '#45433F'), rule: get('--rule', '#CFCCC5'), photo };
}
