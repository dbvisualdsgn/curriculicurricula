import { useEffect, useMemo, useRef, useState } from 'react';
import { useReveal } from '../../app/hooks/useReveal';
import { useI18n } from '../../app/i18n';
import { PRESS, PRESS_SVG } from './pressFigure';
import './press.css';

/** Example CVs at every level, printed one after another with the same layout. */
const PEOPLE = [
  ['Amara Okafor', 'Registered Nurse'],
  ['Karim Benali', 'Delivery Rider'],
  ['Nadia Rahman', 'Chief Technology Officer'],
  ['Jean Moreau', 'Bus Driver'],
  ['Chloé Martin', 'Barista & Student'],
  ['Paolo Greco', 'Head Chef'],
  ['Paweł Nowak', 'Warehouse Operative'],
  ['Giulia Romano', 'Primary School Teacher'],
] as const;
const FIRST_COUNT = 1247;
const CYCLE = 8000; // ms per sheet

type V3 = readonly [number, number, number];
const P = PRESS;
/** World → SVG, and a world offset → SVG offset (the same camera as the build). */
const at = ([x, y, z]: V3) => [P.O[0] + x * P.EX[0] + y * P.EY[0] + z * P.EZ[0], P.O[1] + x * P.EX[1] + y * P.EY[1] + z * P.EZ[1]];
const off = (dx: number, dy: number, dz: number) => `translate(${(dx * P.EX[0] + dy * P.EY[0] + dz * P.EZ[0]).toFixed(2)} ${(dx * P.EX[1] + dy * P.EY[1] + dz * P.EZ[1]).toFixed(2)})`;
const f = (n: number) => n.toFixed(2);
const pathOf = (pts: number[][], close = false) => `M${pts.map((p) => `${f(p[0])} ${f(p[1])}`).join('L')}${close ? 'Z' : ''}`;

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
/** 0 → 1 between a and b (eased), as a share of the cycle. */
const span = (u: number, a: number, b: number) => ease(clamp01((u - a) / (b - a)));
/** Goes 0 → 1 over [a, b], holds, then 1 → 0 over [c, d]. */
const pulse = (u: number, a: number, b: number, c: number, d: number) => span(u, a, b) * (1 - span(u, c, d));

// The cycle, as shares of 8 s. Feed → press → belt → arm picks → carriage over → arm places → lid closes → home.
const K = {
  feed: [0.02, 0.12], press: [0.15, 0.2, 0.23, 0.29], print: 0.205, belt: [0.31, 0.47],
  pickDown: [0.47, 0.52], pickUp: [0.54, 0.59], travel: [0.59, 0.7], placeDown: [0.7, 0.76], release: 0.77,
  placeUp: [0.78, 0.83], lidOpen: [0.5, 0.62], lidClose: [0.82, 0.9], back: [0.84, 0.96],
};
const PICK_DROP = P.HB_REST - (P.Z + P.T); // cups down onto the sheet on the belt
const PLACE_DROP = P.HB_REST - (P.PILE_TOP + P.T); // cups down onto the pile

function lidSvg(deg: number) {
  const a = (deg * Math.PI) / 180;
  const [c, s] = [Math.cos(a), Math.sin(a)];
  const L = P.LID;
  const pt = (x: number, s2: number, h: number): V3 => [x, L.hy + s2 * c - h * s, L.hz + s2 * s + h * c];
  const faces: [string, V3, V3[]][] = [
    ['top', [0, -s, c], [pt(L.x0, 0, L.t), pt(L.x1, 0, L.t), pt(L.x1, L.D, L.t), pt(L.x0, L.D, L.t)]],
    ['under', [0, s, -c], [pt(L.x0, 0, 0), pt(L.x1, 0, 0), pt(L.x1, L.D, 0), pt(L.x0, L.D, 0)]],
    ['edge', [0, c, s], [pt(L.x0, L.D, 0), pt(L.x1, L.D, 0), pt(L.x1, L.D, L.t), pt(L.x0, L.D, L.t)]],
    ['edge', [0, -c, -s], [pt(L.x0, 0, 0), pt(L.x1, 0, 0), pt(L.x1, 0, L.t), pt(L.x0, 0, L.t)]],
    ['side', [1, 0, 0], [pt(L.x1, 0, 0), pt(L.x1, L.D, 0), pt(L.x1, L.D, L.t), pt(L.x1, 0, L.t)]],
  ];
  const V = P.VIEW;
  const out = faces
    .filter(([, n]) => n[0] * V[0] + n[1] * V[1] + n[2] * V[2] > 0.0001)
    .map(([kind, , q]) => `<path class="press-lid-${kind}" d="${pathOf(q.map(at), true)}"/>`);
  // The label on the lid's top, in the lid's plane, while the top faces the viewer.
  if (-s * V[1] + c * V[2] > 0.2) {
    const o = at(pt((L.x0 + L.x1) / 2 - 10, L.D - 16, L.t));
    const u = [P.EX[0], P.EX[1]];
    const v = [P.EY[0] * c + P.EZ[0] * s, P.EY[1] * c + P.EZ[1] * s];
    out.push(`<g transform="matrix(${f(u[0])} ${f(u[1])} ${f(v[0])} ${f(v[1])} ${f(o[0])} ${f(o[1])})"><rect class="press-label" x="0" y="0" width="20" height="9" rx="0.6"/><rect class="press-lid-label-edge" x="0" y="0" width="20" height="9" rx="0.6"/><text class="press-letters" x="10" y="6.2" font-size="4.6" text-anchor="middle">M–N</text></g>`);
  }
  const A: V3 = [L.x1 + 1.6, L.hy + 22 * c, L.hz + 22 * s];
  const B: V3 = [L.x1 + 1.6, L.hy + 18, L.hz - 5];
  const M: V3 = [B[0], B[1] + (A[1] - B[1]) * 0.55, B[2] + (A[2] - B[2]) * 0.55];
  out.push(`<path class="press-strut" d="${pathOf([at(B), at(M)])}"/><path class="press-strut-rod" d="${pathOf([at(M), at(A)])}"/>`);
  return out.join('');
}

function governorSvg(phi: number) {
  const G = P.GOV;
  const r = G.ball * P.SCALE;
  const top: V3 = [G.x, G.y, G.z0 + G.h];
  return [0, Math.PI]
    .map((o) => {
      const a = phi + o;
      const ball: V3 = [G.x + G.R * Math.cos(a), G.y + G.R * Math.sin(a), top[2] - G.drop];
      const mid: V3 = [(top[0] + ball[0]) / 2, (top[1] + ball[1]) / 2, (top[2] + ball[2]) / 2];
      const collar: V3 = [G.x + 1.2 * Math.cos(a), G.y + 1.2 * Math.sin(a), G.z0 + 12];
      const [b, t, m, cl] = [ball, top, mid, collar].map(at);
      return `<path class="press-gov-arm" d="${pathOf([t, b])}"/><path class="press-gov-link" d="${pathOf([cl, m])}"/><circle class="press-ball" cx="${f(b[0])}" cy="${f(b[1])}" r="${f(r)}"/><circle class="press-ball-hi" cx="${f(b[0] - r * 0.35)}" cy="${f(b[1] - r * 0.35)}" r="${f(r * 0.3)}"/>`;
    })
    .join('');
}

/**
 * The homepage press. One sheet every 8 s: out of the feed tray, stamped under the head, along the belt, picked
 * up by the gantry arm's suction cups and laid in the catalogue, whose lid opens on its strut and closes again.
 * The page runs the timeline (it reads the camera and sizes from the build); gears and belts turn in CSS.
 * A click (or Enter/Space) pauses it and starts it again. With reduced motion it is the still picture.
 */
export function Press() {
  const { m } = useI18n();
  const ref = useReveal<HTMLDivElement>(0.2);
  const still = useMemo(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const root = ref.current;
    const svg = root?.querySelector('svg');
    if (!root || !svg || still) return;
    const q = (part: string) => svg.querySelector(`[data-part="${part}"]`);
    const all = (part: string) => Array.from(svg.querySelectorAll(`[data-part="${part}"]`));
    const el = {
      sheet: q('sheet'), print: q('print'), head: q('head'), springs: all('spring'), lamp: q('lamp'), carriage: q('carriage'),
      arm: q('arm'), pinion: q('gpinion'), vac: q('vac'), lidBack: q('lid-back'), lidFront: q('lid-front'), gov: q('gov'),
      name: q('name'), role: q('role'), pileName: q('pile-name'), pileRole: q('pile-role'), count: q('count'),
    };
    const n = PEOPLE.length;
    const write = (turn: number, filed: boolean) => {
      const [nm, rl] = PEOPLE[turn % n];
      const [pn, pr] = PEOPLE[(turn + (filed ? 0 : n - 1)) % n];
      if (el.name) el.name.textContent = nm;
      if (el.role) el.role.textContent = rl;
      if (el.pileName) el.pileName.textContent = pn;
      if (el.pileRole) el.pileRole.textContent = pr;
      if (el.count) el.count.textContent = String(FIRST_COUNT + turn + (filed ? 1 : 0)).padStart(5, '0');
    };

    let clock = 0;
    let last = performance.now();
    let lastLid = '';
    let raf = 0;
    let shown = '';
    const frame = (now: number) => {
      const running = !pausedRef.current && root.classList.contains('is-in') && document.visibilityState === 'visible';
      const dt = Math.min(64, now - last);
      last = now;
      if (running) clock += dt;
      const turn = Math.floor(clock / CYCLE);
      const u = (clock % CYCLE) / CYCLE;
      const filed = u >= K.release;
      const key = `${turn}:${filed}`;
      if (key !== shown) {
        write(turn, filed);
        shown = key;
      }

      // Carriage x and arm drop (the cups' bottom below rest).
      const toFile = span(u, K.travel[0], K.travel[1]) * (1 - span(u, K.back[0], K.back[1]));
      const cx = P.CARRIAGE_HOME + (P.FILE_X - P.CARRIAGE_HOME) * toFile;
      const drop = PICK_DROP * pulse(u, K.pickDown[0], K.pickDown[1], K.pickUp[0], K.pickUp[1]) + PLACE_DROP * pulse(u, K.placeDown[0], K.placeDown[1], K.placeUp[0], K.placeUp[1]);
      el.carriage?.setAttribute('transform', off(cx - P.FILE_X, 0, 0));
      el.arm?.setAttribute('transform', off(0, 0, -drop));
      // The pinion rolls along the rack: angle = distance / radius (in the face's plane, where y points down).
      el.pinion?.setAttribute('transform', `rotate(${f(((cx - P.CARRIAGE_HOME) / P.PINION_R) * (180 / Math.PI))})`);
      const holding = u >= K.pickDown[1] && u < K.release;
      el.vac?.classList.toggle('is-on', holding);

      // The sheet: feed → press → belt end, then in the cups, then filed (hidden; the pile shows it).
      let sx: number;
      let sz: number;
      if (u < K.pickDown[1]) {
        const toPress = span(u, K.feed[0], K.feed[1]);
        const toEnd = span(u, K.belt[0], K.belt[1]);
        sx = P.FEED_X + (P.PRESS_X - P.FEED_X) * toPress + (P.BELT_END_X - P.PRESS_X) * toEnd;
        sz = P.Z - P.T * (1 - toPress);
      } else {
        sx = cx;
        sz = P.HB_REST - drop - P.T;
      }
      el.sheet?.setAttribute('transform', off(sx - P.FILE_X, 0, sz - P.PILE_TOP));
      el.sheet?.setAttribute('opacity', u < K.release ? String(clamp01(u / 0.02)) : '0');
      el.print?.setAttribute('opacity', u >= K.print ? '1' : '0');

      // Press head and its springs; the lamp while it prints.
      const down = P.STROKE * pulse(u, K.press[0], K.press[1], K.press[2], K.press[3]);
      el.head?.setAttribute('transform', off(0, 0, -down));
      const sc = 1 + down / P.SPRING;
      for (const s of el.springs) s.setAttribute('transform', `translate(0 ${f(P.SPRING_TOP * (1 - sc))}) scale(1 ${f(sc)})`);
      el.lamp?.classList.toggle('is-on', u > K.press[0] - 0.02 && u < K.press[3]);

      // The lid: open behind the pile, closed in front of it.
      const deg = P.LID_STILL * pulse(u, K.lidOpen[0], K.lidOpen[1], K.lidClose[0], K.lidClose[1]);
      const lidKey = f(deg);
      if (lidKey !== lastLid) {
        const svgLid = lidSvg(deg);
        if (el.lidBack) el.lidBack.innerHTML = deg > 50 ? svgLid : '';
        if (el.lidFront) el.lidFront.innerHTML = deg > 50 ? '' : svgLid;
        lastLid = lidKey;
      }
      // The governor spins with the machine.
      if (el.gov && running) el.gov.innerHTML = governorSvg((clock / 900) % (Math.PI * 2));
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [ref, still]);

  const toggle = () => !still && setPaused((p) => !p);
  return (
    <div
      ref={ref}
      data-paused={paused || undefined}
      className={`press press-art iso iso-site mx-auto w-full max-w-[58rem] ${still ? '' : 'cursor-pointer'} focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus)]`}
      data-theme="light"
      role={still ? 'img' : 'button'}
      tabIndex={still ? undefined : 0}
      aria-pressed={still ? undefined : paused}
      aria-label={`${m.homeX.pressLabel}${still ? '' : ` ${paused ? m.homeX.heroPlay : m.homeX.heroPause}`}`}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      }}
      dangerouslySetInnerHTML={{ __html: PRESS_SVG }}
    />
  );
}
