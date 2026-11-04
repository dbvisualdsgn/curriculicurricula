// Builds the Why-page press: an isometric bench machine, drawn with the Anatomy kit (MIT, ./iso-kit.mjs) in the
// style of the documents above it. A blank sheet leaves the feed tray, the press head comes down and prints the
// same standard CV, the belt carries it to the end, and it drops into the open catalogue on its lift. Behind it
// stand the finished catalogues. Writes src/why/pressFigure.ts: the static SVG.
// The motion is CSS (src/why/press.css): the sheet is drawn where it ends (on the catalogue pile), which is what
// reduced motion shows, and the CSS moves it in from offsets written here as custom properties.
// Run: node scripts/desk-hero/press.mjs [--page=<file>]
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "./iso-kit.mjs";
import * as G from "./lathe.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "../../src/why/pressFigure.ts");

const WIDTH = 760;

// ---- World (x along the line, left to right; y toward the viewer; z up) ----
const BASE = { x: -176, y: -50, w: 346, d: 100, r: 8 };
const BASE_H = 8;
const Z = 34; // working height: the top of the feed stack, the bed and the belt
const SHEET = { w: 40, d: 54 }; // a CV page, read along x
const T = 0.8; // sheet thickness

// Stations, by the centre x of a sheet standing in them.
const FEED_X = -136;
const PRESS_X = -50;
const BELT_END_X = 82;
const FILE_X = 134;

// Pile in the catalogue: the moving sheet ends on top of it.
const TRAY = { x: FILE_X - 24, y: -32, w: 48, d: 64, r: 1.2 };
const TRAY_Z = Z - 16; // floor of the open catalogue
const PILE = 8;
const PILE_TOP = TRAY_Z + 1.2 + PILE * T;
const DROP = Z - PILE_TOP; // how far the sheet falls off the belt

const FIT = [...k.boxCorners(BASE, -BASE_H - 4, 0), ...k.boxCorners({ x: -84, y: -32, w: 68, d: 64 }, 0, Z + 70), ...k.boxCorners({ x: -30, y: -96, w: 238, d: 42 }, -12, 56)];
// The frame's height follows the drawing, so the figure has no empty bands above or below it.
const AZ = 48;
const unit = k.fitProjection(FIT, WIDTH, 10000, { pad: 8, azimuth: AZ });
const spanY = (Q) => { const ys = FIT.map((pt) => k.iso(pt, Q)[1]); return Math.max(...ys) - Math.min(...ys); };
const HEIGHT = Math.ceil(spanY(unit) + 16);
const P = k.fitProjection(FIT, WIDTH, HEIGHT, { pad: 8, azimuth: AZ });

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const box = (plan, z, h, style = {}, steps = 4, bevel = 0) => S(k.slabOf(plan, z, h, P, steps, bevel), style);
const halo = (plan, z, h) => `<path class="iso-halo" d="${k.haloOf(plan, z, h, P)}"/>`;
const fine = (v) => Math.round(v * 100) / 100;
const vec = (by) => k.axisVector(P, by).map(fine);
const px = ([x, y]) => `${x}px ${y}px`;
const line = (from, to, z, tone = "lo", free = false) => L(k.lineOnTop(from, to, z, P), { tone, free });
const screws = (points) => L(points.map(([x, y, z]) => k.ring(x, y, 1.3, z, P, 12)).join(""), { tone: "lo" }) + D(points.map(at), { size: 0.42 });

/** Text lying on a top face, reading along x. */
const topText = (x, y, z, text, { size = 3, cls = "", tone = "hi", anchor = "start", weight = "", part = "" } = {}) =>
  `<text class="iso-face-text ${cls}" data-tone="${tone}"${part ? ` data-part="${part}"` : ""} transform="${k.topMatrix([x, y], z, P)}" font-size="${size}" text-anchor="${anchor}"${weight ? ` font-weight="${weight}"` : ""}>${text}</text>`;
/** A flat shape on a top face. */
const topRect = (x, y, z, w, d, cls, r = 0.4) => `<g transform="${k.topMatrix([x, y], z, P)}"><path class="${cls}" d="${k.pathOf(k.roundedPlan({ x: 0, y: 0, w, d, r }, 3), true)}"/></g>`;

/** Drawing in the plane of a face: "front" is constant y (toward the lower left), "side" constant x (lower right).
 *  Local coordinates: u along the face (x for front, -y for side), v = -z. */
const onFront = (y, body) => `<g transform="${k.sideMatrix([0, y], 0, P, "left")}">${body}</g>`;
const onSide = (x, body) => `<g transform="${k.sideMatrix([x, 0], 0, P, "right")}">${body}</g>`;
const flat = (d, cls) => `<path class="${cls}" d="${d}"/>`;
const stroke = (d, tone = "hi") => `<path class="iso-line" data-tone="${tone}" d="${d}"/>`;
const circle = (cx, cy, r, steps = 32) => k.pathOf(Array.from({ length: steps }, (_, i) => [cx + r * Math.cos((i / steps) * Math.PI * 2), cy + r * Math.sin((i / steps) * Math.PI * 2)]), true);
const rectPath = (x, y, w, h, r = 0.4) => k.pathOf(k.roundedPlan({ x, y, w, d: h, r }, 3), true);

// ---------------------------------------------------------------------------------------------------------------
// Base: a plate on six feet, an inset groove, corner screws, a ruler strip along the front and a label plate.
function base() {
  const out = [halo(BASE, -BASE_H - 4, BASE_H + 4)];
  const feet = [...k.corners(BASE, 18), [BASE.x + BASE.w / 2, BASE.y + 18], [BASE.x + BASE.w / 2, BASE.y + BASE.d - 18]].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
  for (const [x, y] of feet) out.push(S(k.cylinder(x, y, 6, -BASE_H - 4, 4, P, 24), { tone: "mid" }));
  out.push(S(k.slabOf(BASE, -BASE_H, BASE_H, P, 8, 1.4), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(BASE, 4.5), 0, P), { tone: "faint" }));
  out.push(screws(k.corners(BASE, 9).map(([x, y]) => [x, y, 0])));
  // Ruler strip on the front edge, ticks every 5, a long one every 25.
  const strip = { x: -150, y: BASE.y + BASE.d - 9, w: 300, d: 4, r: 0.4 };
  out.push(L(k.planOutline(strip, 0, P, 2), { tone: "lo" }));
  const ticks = [];
  for (let x = strip.x + 5; x < strip.x + strip.w; x += 5) {
    const long = Math.round(x - strip.x) % 25 === 0;
    ticks.push(k.lineOnTop([x, strip.y], [x, strip.y + (long ? 3 : 1.6)], 0, P));
  }
  out.push(L(ticks.join(""), { tone: "lo" }));
  // Label plate on the front face of the base, three rule lines for its print.
  const fy = BASE.y + BASE.d;
  out.push(onFront(fy, flat(rectPath(-24, 1.6, 48, 4.8, 0.6), "press-plate") + stroke(rectPath(-24, 1.6, 48, 4.8, 0.6), "lo") + stroke(`M-20 3.2H6M-20 4.8H-2`, "faint") + `<circle class="press-dot" cx="-22.2" cy="4" r="0.45"/><circle class="press-dot" cx="22.2" cy="4" r="0.45"/>`));
  return out.join("");
}

// ---------------------------------------------------------------------------------------------------------------
// The CV template: the same layout on every sheet. `name` adds the live name (the moving sheet only).
function template(cx, cy, z, { name = false } = {}) {
  const x0 = cx - SHEET.w / 2 + 3.5;
  const y0 = cy - SHEET.d / 2;
  const x1 = cx + SHEET.w / 2 - 3.5;
  const out = [];
  out.push(topRect(x0, y0 + 4, z, 8, 8, "press-ink", 0.3));
  if (name) {
    out.push(topText(x0 + 10.5, y0 + 8.4, z, "Amara Okafor", { size: 3.3, cls: "press-name", weight: "600", part: "name" }));
    out.push(topText(x0 + 10.5, y0 + 11.6, z, "Registered Nurse", { size: 1.9, tone: "mid", part: "role" }));
  } else {
    out.push(line([x0 + 10.5, y0 + 7.4], [x0 + 28, y0 + 7.4], z, "hi", true));
    out.push(line([x0 + 10.5, y0 + 10.8], [x0 + 22, y0 + 10.8], z, "lo", true));
  }
  out.push(line([x0, y0 + 15.5], [x1, y0 + 15.5], z, "hi"));
  // Experience: a label, a bold role, three lines; a highlighted result on the moving sheet.
  out.push(line([x0, y0 + 19], [x0 + 9, y0 + 19], z, "lo", true));
  out.push(line([x0, y0 + 22.4], [x0 + 22, y0 + 22.4], z, "hi", true));
  if (name) out.push(topRect(x0 - 0.4, y0 + 24.2, z, 25, 2.4, "press-hl", 0.2));
  for (const [v, w] of [[25.4, 24], [28.4, 30], [31.4, 18]]) out.push(line([x0, y0 + v], [x0 + w, y0 + v], z, "lo", true));
  out.push(line([x0, y0 + 35.5], [x1, y0 + 35.5], z, "hi"));
  out.push(line([x0, y0 + 39], [x0 + 7, y0 + 39], z, "lo", true));
  // Skills as pills.
  [[0, 9], [10.5, 12], [24, 8]].forEach(([u, w]) => out.push(L(k.planOutline({ x: x0 + u, y: y0 + 41.5, w, d: 3.4, r: 1.7 }, z, P, 4), { tone: "lo" })));
  out.push(line([x0, y0 + 48.5], [x0 + 16, y0 + 48.5], z, "lo", true));
  return out.join("");
}

const sheetPlan = (cx, cy) => ({ x: cx - SHEET.w / 2, y: cy - SHEET.d / 2, w: SHEET.w, d: SHEET.d, r: 0.5 });
const blank = (cx, cy, z) => S(k.slabOf(sheetPlan(cx, cy), z, T, P, 2), { tone: "hi", crease: "none", className: "press-paper" });

// ---------------------------------------------------------------------------------------------------------------
// 1. Feed: a pedestal with a tray of blank sheets, side guides on a slotted scale, and a pick-up roller.
const FEED = { x: FEED_X - 28, y: -34, w: 56, d: 68, r: 3 };
const FEED_STACK = 7;
const FEED_FLOOR = Z - FEED_STACK * T - 1.4;
function feedBack() {
  const out = [halo(FEED, 0, 6)];
  out.push(box(FEED, 0, FEED_FLOOR - 1.4, { tone: "hi" }, 6, 1));
  // Seam and vents on the pedestal's front face.
  out.push(onFront(FEED.y + FEED.d, stroke(`M${FEED.x + 3} ${-(FEED_FLOOR - 6)}H${FEED.x + FEED.w - 3}`, "faint") + [0, 1, 2, 3, 4].map((i) => stroke(rectPath(FEED.x + 8 + i * 5, -12, 2, 6, 1), "lo")).join("")));
  out.push(onSide(FEED.x + FEED.w, stroke(`M${-(FEED.y + FEED.d) + 3} ${-(FEED_FLOOR - 6)}H${-FEED.y - 3}`, "faint")));
  // Tray floor and its back wall.
  const tray = { x: FEED.x + 2, y: FEED.y + 2, w: FEED.w - 4, d: FEED.d - 4, r: 2 };
  out.push(box(tray, FEED_FLOOR - 1.4, 1.4, { tone: "hi" }, 4));
  out.push(box({ x: tray.x, y: tray.y, w: tray.w, d: 2.4, r: 0.6 }, FEED_FLOOR, 7, { tone: "hi" }));
  // Left stop.
  out.push(box({ x: tray.x, y: tray.y + 2.4, w: 2.4, d: tray.d - 4.8, r: 0.6 }, FEED_FLOOR, 7, { tone: "hi" }));
  // The stack of blanks, a little off each other.
  for (let i = 0; i < FEED_STACK; i++) out.push(blank(FEED_X + ((i * 7) % 3) * 0.3 - 0.3, ((i * 5) % 3) * 0.3 - 0.3, FEED_FLOOR + i * T));
  return out.join("");
}
function feedFront() {
  const out = [];
  const tray = { x: FEED.x + 2, y: FEED.y + 2, w: FEED.w - 4, d: FEED.d - 4 };
  // Front wall, low so the stack shows, with a finger notch.
  out.push(box({ x: tray.x, y: tray.y + tray.d - 2.4, w: tray.w, d: 2.4, r: 0.6 }, FEED_FLOOR, 4.6, { tone: "hi" }));
  out.push(onFront(tray.y + tray.d, stroke(`M${FEED_X - 6} ${-(FEED_FLOOR + 4.6)}Q${FEED_X} ${-(FEED_FLOOR + 1.6)} ${FEED_X + 6} ${-(FEED_FLOOR + 4.6)}`, "lo")));
  // Pick-up roller over the right end of the stack, on two brackets.
  const rx = FEED_X + 15;
  const rz = Z + 3.6;
  for (const y of [tray.y + 1, tray.y + tray.d - 4]) {
    if (y > 0) continue;
    out.push(box({ x: rx - 3, y, w: 6, d: 3, r: 0.6 }, FEED_FLOOR, rz - FEED_FLOOR + 3, { tone: "hi" }));
  }
  out.push(S(G.solidOf([[0, 1.2], [tray.d, 1.2]], G.frameAlong([rx, tray.y, rz], [0, 1, 0]), P), { tone: "hi" }));
  out.push(S(G.solidOf([[0, 3.6], [24, 3.6]], G.frameAlong([rx, -12, rz], [0, 1, 0]), P), { tone: "hi", className: "press-rubber" }));
  out.push(box({ x: rx - 3, y: tray.y + tray.d - 4, w: 6, d: 3, r: 0.6 }, FEED_FLOOR, rz - FEED_FLOOR + 3, { tone: "hi" }));
  out.push(screws([[rx, tray.y + tray.d - 2.5, rz + 3]]));
  return out.join("");
}

/** Guide bridge from the feed tray to the bed: a plate on two brackets, with side guides. */
function bridge() {
  const x0 = FEED.x + FEED.w - 4;
  const x1 = BED.x + 2;
  const out = [];
  for (const y of [-26, 26]) out.push(box({ x: x0 + 3, y: y - 1.5, w: 3, d: 3, r: 0.4 }, FEED_FLOOR, Z - 1.2 - FEED_FLOOR, { tone: "hi" }));
  out.push(box({ x: x0, y: -30, w: x1 - x0, d: 60, r: 0.6 }, Z - 1.2, 1.2, { tone: "hi" }, 2));
  out.push(box({ x: x0, y: -32, w: x1 - x0, d: 2, r: 0.4 }, Z - 1.2, 3.2, { tone: "hi" }, 2));
  return out.join("");
}
function bridgeFront() {
  const x0 = FEED.x + FEED.w - 4;
  const x1 = BED.x + 2;
  return box({ x: x0, y: 30, w: x1 - x0, d: 2, r: 0.4 }, Z - 1.2, 3.2, { tone: "hi" }, 2) + screws([[x0 + 2, 31, Z + 2], [x1 - 2, 31, Z + 2]]);
}

// ---------------------------------------------------------------------------------------------------------------
// 2. Press: a bed with the drive on its front face, four posts, a crossbeam with the counter, and a head on two
//    guide rods with return springs. The head comes down once per sheet.
const BED = { x: -96, y: -34, w: 92, d: 68, r: 3 };
const POSTS = [[-80, -27], [-20, -27], [-80, 27], [-20, 27]];
const BEAM = { x: -86, y: -33, w: 72, d: 66, r: 3 };
const BEAM_Z = Z + 52;
const HEAD = { x: PRESS_X - 18, y: -22, w: 36, d: 44, r: 2 };
const HEAD_Z = Z + 16; // bottom of the platen at rest
const HEAD_H = 12;
const STROKE = HEAD_Z - Z - T - 0.2; // down to the sheet
const RODS = [[PRESS_X, -26], [PRESS_X, 26]];

// Gear train on the bed's front face: a handwheel with a crank drives an idler, which drives the main gear
// (24 → 12 → 26 teeth, so each turns at its own speed and the teeth stay meshed). Centres on one line.
const FRONT_Y = BED.y + BED.d;
const GV = -16.5;
const WHEEL = { u: -80, v: GV, r: 13, teeth: 24 };
const PINION = { u: WHEEL.u + 13 + 6.4 - 1.6, v: GV, r: 6.4, teeth: 12 };
const MAIN = { u: PINION.u + 6.4 + 14 - 1.6, v: GV, r: 14, teeth: 26 };
const CYCLE = 6; // seconds per sheet: the handwheel turns once per sheet
/** Start angle so that a tooth (phase 0.25) or a gap (phase 0.75) faces the given direction. */
const phaseAt = (teeth, angle, phase) => -((phase - angle / (360 / teeth)) * (360 / teeth));

function gearPath(r, teeth, depth = 1.6) {
  const pts = [];
  const n = teeth * 4;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = i % 4 < 2 ? r : r - depth;
    pts.push([rr * Math.cos(a), rr * Math.sin(a)]);
  }
  return k.pathOf(pts, true);
}
/** A part that turns in the front face: a back copy (its thickness) and the face, both turning. */
function spinner({ u, v }, body, back, { turn, dir, start = 0, t = 2 }) {
  const [bx, by] = vec([0, -t, 0]);
  const g = (inner) => onFront(FRONT_Y + 0.01, `<g transform="translate(${fine(u)} ${v}) rotate(${fine(start)})"><g class="press-spin" style="--turn:${fine(turn)}s;--dir:${dir}">${inner}</g></g>`);
  return `<g transform="translate(${fine(bx)} ${fine(by)})">${g(back)}</g>${g(body)}`;
}
function gear({ r, teeth }, holes) {
  const outline = gearPath(r, teeth);
  const face = flat(outline, "press-gear") + stroke(outline, "hi") + stroke(circle(0, 0, r - 3.4, 40), "faint");
  const lightening = holes ? Array.from({ length: holes }, (_, i) => {
    const a = (i / holes) * Math.PI * 2 + 0.3;
    return stroke(circle(Math.cos(a) * r * 0.52, Math.sin(a) * r * 0.52, r * 0.16, 16), "lo");
  }).join("") : "";
  const hub = flat(circle(0, 0, 2.6, 20), "press-gear") + stroke(circle(0, 0, 2.6, 20), "hi") + `<circle class="press-dot" cx="0" cy="0" r="0.7"/>` + stroke(`M0 -2.6V-1.2`, "lo");
  return { body: face + lightening + hub, back: flat(outline, "press-gear-back") + stroke(outline, "lo") };
}
function handwheel() {
  const { r, teeth } = WHEEL;
  const outline = gearPath(r, teeth);
  const rim = flat(outline, "press-gear") + stroke(outline, "hi") + flat(circle(0, 0, r - 3.4, 48), "press-gear-in") + stroke(circle(0, 0, r - 3.4, 48), "lo");
  const spokes = [0, 1, 2, 3, 4].map((i) => {
    const a = (i / 5) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const w = 1.1;
    const quad = [[c * 2.6 - s * w, s * 2.6 + c * w], [c * (r - 3.4) - s * w, s * (r - 3.4) + c * w], [c * (r - 3.4) + s * w, s * (r - 3.4) - c * w], [c * 2.6 + s * w, s * 2.6 - c * w]];
    return flat(k.pathOf(quad, true), "press-gear") + stroke(k.pathOf(quad.slice(0, 2)), "lo") + stroke(k.pathOf(quad.slice(2)), "lo");
  }).join("");
  const hub = flat(circle(0, 0, 3.2, 24), "press-gear") + stroke(circle(0, 0, 3.2, 24), "hi") + `<circle class="press-dot" cx="0" cy="0" r="0.8"/>`;
  // Crank handle between two spokes: seen end-on, a knob with a ring.
  const ca = Math.PI / 5;
  const [kx, ky] = [Math.cos(ca) * (r - 6.4), Math.sin(ca) * (r - 6.4)];
  const crank = flat(circle(kx, ky, 2.4, 20), "press-gear") + stroke(circle(kx, ky, 2.4, 20), "hi") + stroke(circle(kx, ky, 1.1, 14), "lo");
  return { body: rim + spokes + hub + crank, back: flat(outline, "press-gear-back") + stroke(outline, "lo") };
}

function pressBack() {
  const out = [halo(BED, 0, 8)];
  out.push(box(BED, 0, Z, { tone: "hi" }, 6, 1.2));
  // Bed top: a ground plate with two register pins and a scale along the back.
  const plate = { x: BED.x + 6, y: -30, w: BED.w - 12, d: 60, r: 1 };
  out.push(L(k.planOutline(plate, Z, P, 2), { tone: "lo" }));
  out.push(L([PRESS_X - SHEET.w / 2 - 1.5, PRESS_X + SHEET.w / 2 + 1.5].map((x) => k.lineOnTop([x, -SHEET.d / 2], [x, -SHEET.d / 2 + 5], Z, P) + k.lineOnTop([x, SHEET.d / 2 - 5], [x, SHEET.d / 2], Z, P)).join(""), { tone: "lo" }));
  const ticks = [];
  for (let x = plate.x + 4; x < plate.x + plate.w; x += 4) ticks.push(k.lineOnTop([x, plate.y], [x, plate.y + (Math.round(x - plate.x) % 20 === 0 ? 2.6 : 1.4)], Z, P));
  out.push(L(ticks.join(""), { tone: "lo" }));
  // Front face: a panel line, the drive, and the counter window to the right.
  out.push(onFront(FRONT_Y, stroke(rectPath(BED.x + 3, -(Z - 3), BED.w - 6, Z - 6, 1.6), "faint")));
  for (const g of [WHEEL, PINION, MAIN]) out.push(onFront(FRONT_Y, stroke(circle(g.u, g.v, 1.6, 16), "lo")));
  const wheel = handwheel();
  const pin = gear(PINION, 0);
  const main = gear(MAIN, 4);
  const per = (n) => (CYCLE * n) / WHEEL.teeth;
  out.push(spinner(WHEEL, wheel.body, wheel.back, { turn: CYCLE, dir: 1, start: phaseAt(WHEEL.teeth, 0, 0.25), t: 2.4 }));
  out.push(spinner(PINION, pin.body, pin.back, { turn: per(PINION.teeth), dir: -1, start: phaseAt(PINION.teeth, 180, 0.75) }));
  out.push(spinner(MAIN, main.body, main.back, { turn: per(MAIN.teeth), dir: 1, start: phaseAt(MAIN.teeth, 180, 0.25) }));
  // Counter: a window with five digits, changed by the page (data-part="count").
  const cw = { u: -26, v: -26, w: 19.6, h: 7 };
  out.push(onFront(FRONT_Y, flat(rectPath(cw.u - 1.4, cw.v - 1.4, cw.w + 2.8, cw.h + 2.8, 1), "press-gear") + stroke(rectPath(cw.u - 1.4, cw.v - 1.4, cw.w + 2.8, cw.h + 2.8, 1), "hi") + flat(rectPath(cw.u, cw.v, cw.w, cw.h, 0.4), "press-ink") + [1, 2, 3, 4].map((i) => `<path class="press-on-ink-line" d="M${cw.u + (cw.w / 5) * i} ${cw.v + 0.8}V${cw.v + cw.h - 0.8}"/>`).join("") + `<text class="press-count" data-part="count" x="${cw.u + cw.w / 2}" y="${cw.v + cw.h - 1.6}" font-size="4.6" text-anchor="middle">01247</text>` + `<circle class="press-dot" cx="${cw.u - 0.2}" cy="${cw.v + cw.h + 3.4}" r="0.45"/><circle class="press-dot" cx="${cw.u + cw.w + 0.2}" cy="${cw.v + cw.h + 3.4}" r="0.45"/>` + stroke(`M${cw.u + 1.8} ${cw.v + cw.h + 3.4}H${cw.u + cw.w - 1.8}`, "faint")));
  // Back posts.
  for (const [x, y] of POSTS.filter(([, y]) => y < 0)) out.push(post(x, y));
  // Guide rods (the head slides on them) and their foot collars.
  for (const [x, y] of RODS) out.push(spring(x, y, "back"));
  for (const [x, y] of RODS) {
    out.push(S(k.cylinder(x, y, 3.2, Z, 2, P, 20), { tone: "hi" }));
    out.push(S(k.cylinder(x, y, 1.5, Z + 2, BEAM_Z - Z - 2, P, 16), { tone: "hi" }));
  }
  return out.join("");
}
function post(x, y) {
  return S(k.cylinder(x, y, 5.6, Z, 3, P, 24, 0.6), { tone: "hi" }) + S(k.cylinder(x, y, 3.6, Z + 3, BEAM_Z - Z - 3, P, 24), { tone: "hi" });
}
/** A return spring around a rod, from the head's top boss to the beam: back half behind the rod, front half in front. */
function spring(x, y, half) {
  const z0 = HEAD_Z + 5 + HEAD_H;
  const turns = 7;
  const n = turns * 20;
  const [vx, vy] = k.towardViewer(P);
  const runs = [];
  let run = [];
  let near = null;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * turns * Math.PI * 2;
    const facing = Math.cos(a) * vx + Math.sin(a) * vy > 0;
    const pt = at([x + 3.4 * Math.cos(a), y + 3.4 * Math.sin(a), z0 + ((BEAM_Z - z0) * i) / n]);
    if (near !== null && facing !== near) {
      run.push(pt);
      runs.push([near, run]);
      run = [];
    }
    near = facing;
    run.push(pt);
  }
  runs.push([near, run]);
  const want = half === "front";
  const d = runs.filter(([f]) => f === want).map(([, r]) => k.pathOf(r)).join("");
  return `<g class="press-spring">${L(d, { tone: want ? "hi" : "lo" })}</g>`;
}
function head() {
  const out = [];
  // Return springs between the head and the beam, around the rods: they stretch as the head comes down.
  for (const [x, y] of RODS) out.push(spring(x, y, "front"));
  const parts = [];
  // Platen (the type), a grey block, the head body with ears on the rods and a top boss.
  parts.push(box({ x: HEAD.x + 2, y: HEAD.y + 2, w: HEAD.w - 4, d: HEAD.d - 4, r: 1 }, HEAD_Z, 2, { tone: "hi", className: "press-platen" }));
  parts.push(box(HEAD, HEAD_Z + 2, HEAD_H, { tone: "hi" }, 4, 1));
  for (const [x, y] of RODS) parts.push(S(k.cylinder(x, y, 4.4, HEAD_Z + 2 + HEAD_H, 3, P, 24, 0.5), { tone: "hi" }));
  parts.push(onFront(HEAD.y + HEAD.d, stroke(`M${HEAD.x + 2} ${-(HEAD_Z + 6)}H${HEAD.x + HEAD.w - 2}`, "faint") + `<circle class="press-dot" cx="${HEAD.x + 3.4}" cy="${-(HEAD_Z + 10)}" r="0.45"/><circle class="press-dot" cx="${HEAD.x + HEAD.w - 3.4}" cy="${-(HEAD_Z + 10)}" r="0.45"/>`));
  // Push rod up to the eccentric in the beam.
  parts.push(S(k.cylinder(PRESS_X, 0, 2.6, HEAD_Z + 2 + HEAD_H, BEAM_Z - (HEAD_Z + 2 + HEAD_H), P, 20), { tone: "hi" }));
  out.push(`<g class="press-head" style="--down:${px(vec([0, 0, -STROKE]))}">${parts.join("")}</g>`);
  return out.join("");
}
/** The drive: a belt in front of the bed from a pulley on the main gear's shaft up to a pulley on the eccentric's
 *  shaft above the beam. Its marks run while the press turns. */
const DRIVE_Y = FRONT_Y + 3;
const TOP_PULLEY = { u: PRESS_X, v: -(BEAM_Z + 16), r: 5 };
const LOW_PULLEY = { u: MAIN.u, v: MAIN.v, r: 5 };
function drive() {
  const out = [];
  // Shaft from the drum's front end out to the belt plane, and a stub from the main gear.
  out.push(S(G.solidOf([[0, 1.6], [DRIVE_Y - 20, 1.6]], G.frameAlong([PRESS_X, 20, BEAM_Z + 16], [0, 1, 0]), P), { tone: "hi" }));
  // Belt: the two straight runs between the pulleys (outer tangents), as a band.
  const [a, b] = [LOW_PULLEY, TOP_PULLEY];
  const dx = b.u - a.u;
  const dy = b.v - a.v;
  const len = Math.hypot(dx, dy);
  const [nx, ny] = [-dy / len, dx / len];
  const r = 5.6;
  const run = (side) => [[a.u + nx * r * side, a.v + ny * r * side], [b.u + nx * r * side, b.v + ny * r * side]];
  const band = (side) => {
    const [p0, p1] = run(side);
    const [q0, q1] = run(side * 0.82);
    return flat(k.pathOf([p0, p1, q1, q0], true), "press-strap") + stroke(k.pathOf([p0, p1]), "hi") + stroke(k.pathOf([q0, q1]), "lo");
  };
  const marks = (side) => `<path class="press-strap-marks" d="${k.pathOf(run(side * 0.91))}"/>`;
  const pulley = ({ u, v, r: pr }, dir, turn) =>
    `<g transform="translate(${fine(u)} ${fine(v)})"><g class="press-spin" style="--turn:${turn}s;--dir:${dir}">${flat(circle(0, 0, pr + 0.8, 32), "press-strap")}${stroke(circle(0, 0, pr + 0.8, 32), "hi")}${flat(circle(0, 0, pr - 0.6, 32), "press-gear")}${stroke(circle(0, 0, pr - 0.6, 32), "lo")}${stroke("M0 -1.4V" + fine(-(pr - 1.4)), "lo")}<circle class="press-dot" cx="0" cy="0" r="0.7"/></g></g>`;
  const turn = fine((CYCLE * MAIN.teeth) / WHEEL.teeth);
  out.push(onFront(DRIVE_Y, band(1) + band(-1) + marks(1) + marks(-1) + pulley(LOW_PULLEY, 1, turn) + pulley(TOP_PULLEY, 1, turn)));
  return out.join("");
}
function pressFront() {
  const out = [];
  for (const [x, y] of POSTS.filter(([, y]) => y > 0)) out.push(post(x, y));
  // Crossbeam with the eccentric housing and a lamp that lights while printing.
  out.push(box(BEAM, BEAM_Z, 9, { tone: "hi" }, 4, 1));
  out.push(screws(POSTS.map(([x, y]) => [x, y, BEAM_Z + 9])));
  out.push(onFront(BEAM.y + BEAM.d, stroke(`M${BEAM.x + 3} ${-(BEAM_Z + 4.5)}H${BEAM.x + BEAM.w - 3}`, "faint")));
  // Eccentric housing: a drum along y on top of the beam, with a bolt circle on its front.
  const drum = G.frameAlong([PRESS_X, -16, BEAM_Z + 9 + 7], [0, 1, 0]);
  out.push(box({ x: PRESS_X - 10, y: -18, w: 20, d: 36, r: 1 }, BEAM_Z + 9, 3, { tone: "hi" }));
  out.push(S(G.solidOf([[0, 8], [32, 8]], drum, P), { tone: "hi" }));
  out.push(S(G.solidOf([[32, 3.4], [36, 3.4]], drum, P), { tone: "hi" }));
  out.push(D(Array.from({ length: 6 }, (_, i) => at(G.pointOf(drum, 32, 5.6, (i / 6) * Math.PI * 2 + 0.3))), { size: 0.4 }));
  // Lamp on its stalk.
  const lamp = [BEAM.x + BEAM.w - 8, BEAM.y + BEAM.d - 8];
  out.push(S(k.cylinder(lamp[0], lamp[1], 1.2, BEAM_Z + 9, 5, P, 12), { tone: "hi" }));
  out.push(`<g class="press-lamp">${S(k.cylinder(lamp[0], lamp[1], 3.4, BEAM_Z + 14, 3.6, P, 24, 0.6), { tone: "hi" })}</g>`);
  return out.join("");
}

// ---------------------------------------------------------------------------------------------------------------
// 3. Belt: two rollers, a belt with moving marks on its edge, rails with a scale, four legs.
const BELT = { x: -2, y: -30, w: 96, d: 60 };
const RAIL_Z0 = Z - 12;
const RAIL_Z1 = Z + 2;
function beltBack() {
  const out = [halo({ x: BELT.x, y: -36, w: BELT.w + 4, d: 72, r: 2 }, 0, 4)];
  for (const x of [BELT.x + 10, BELT.x + BELT.w - 8]) out.push(S(k.cylinder(x, -34, 2.6, 0, RAIL_Z0, P, 16), { tone: "hi" }));
  out.push(box({ x: BELT.x - 2, y: -36, w: BELT.w + 4, d: 3, r: 0.6 }, RAIL_Z0, RAIL_Z1 - RAIL_Z0, { tone: "hi" }));
  for (const x of [BELT.x + 5, BELT.x + BELT.w - 5]) out.push(S(G.solidOf([[0, 5], [BELT.d, 5]], G.frameAlong([x, BELT.y, Z - 5], [0, 1, 0]), P), { tone: "hi" }));
  out.push(box({ x: BELT.x + 5, y: BELT.y + 1, w: BELT.w - 10, d: BELT.d - 2, r: 0.4 }, Z - 1.2, 1.2, { tone: "hi", className: "press-belt" }, 2));
  // Belt marks on the front edge of the belt run toward the catalogue.
  out.push(`<g class="press-belt-marks">${L(k.pathOf([at([BELT.x + 5, BELT.y + BELT.d - 1, Z - 0.6]), at([BELT.x + BELT.w - 5, BELT.y + BELT.d - 1, Z - 0.6])]), { tone: "lo", dashed: true, free: true })}</g>`);
  return out.join("");
}
function beltFront() {
  const out = [];
  for (const x of [BELT.x + 10, BELT.x + BELT.w - 8]) out.push(S(k.cylinder(x, 34, 2.6, 0, RAIL_Z0, P, 16), { tone: "hi" }));
  const rail = { x: BELT.x - 2, y: 33, w: BELT.w + 4, d: 3, r: 0.6 };
  out.push(box(rail, RAIL_Z0, RAIL_Z1 - RAIL_Z0, { tone: "hi" }));
  // Scale on the rail's top, axle ends and screws on its face.
  const ticks = [];
  for (let x = rail.x + 4; x < rail.x + rail.w - 2; x += 4) ticks.push(k.lineOnTop([x, rail.y + 0.6], [x, rail.y + (Math.round(x - rail.x) % 20 === 0 ? 2.6 : 1.6)], RAIL_Z1, P));
  out.push(L(ticks.join(""), { tone: "lo" }));
  out.push(onFront(rail.y + rail.d, [BELT.x + 5, BELT.x + BELT.w - 5].map((u) => flat(circle(u, -(Z - 5), 2.4, 20), "press-gear") + stroke(circle(u, -(Z - 5), 2.4, 20), "hi") + `<circle class="press-dot" cx="${u}" cy="${-(Z - 5)}" r="0.6"/>`).join("") + stroke(`M${rail.x + 12} ${-(RAIL_Z0 + 3)}H${rail.x + rail.w - 12}`, "faint")));
  return out.join("");
}

// ---------------------------------------------------------------------------------------------------------------
// 4. Catalogue: an open box file on a lift (a lead screw and two guides), the pile of filed CVs inside.
const LIFT = { x: FILE_X - 28, y: -36, w: 56, d: 72, r: 2 };
const FILE = { x: TRAY.x - 2, y: TRAY.y - 2, w: TRAY.w + 4, d: TRAY.d + 4, r: 1.6 };
function fileBack() {
  const out = [halo(LIFT, 0, 6)];
  out.push(box(LIFT, 0, 4, { tone: "hi" }, 4, 0.8));
  out.push(screws(k.corners(LIFT, 4).map(([x, y]) => [x, y, 4])));
  // Lead screw (threads as rings) and two guides under the platform.
  out.push(S(k.cylinder(FILE_X, 0, 4.2, 4, 3, P, 24), { tone: "hi" }));
  out.push(S(k.cylinder(FILE_X, 0, 2.2, 7, TRAY_Z - 4 - 7, P, 20), { tone: "hi" }));
  out.push(L(Array.from({ length: 4 }, (_, i) => k.sideArc(FILE_X, 0, 2.2, 9 + i * 2, P, 16)).join(""), { tone: "lo" }));
  for (const y of [-22, 22]) out.push(S(k.cylinder(FILE_X, y, 1.6, 4, TRAY_Z - 4 - 4, P, 16), { tone: "hi" }));
  // Platform.
  out.push(box({ x: LIFT.x + 2, y: LIFT.y + 2, w: LIFT.w - 4, d: LIFT.d - 4, r: 1.6 }, TRAY_Z - 4, 4, { tone: "hi" }, 4, 0.8));
  // The box file: floor, back and left walls, then the pile.
  out.push(box(FILE, TRAY_Z, 1.2, { tone: "hi", className: "press-file" }, 4));
  out.push(box({ x: FILE.x, y: FILE.y, w: FILE.w, d: 2, r: 0.6 }, TRAY_Z + 1.2, 9, { tone: "hi", className: "press-file" }));
  out.push(box({ x: FILE.x, y: FILE.y + 2, w: 2, d: FILE.d - 4, r: 0.6 }, TRAY_Z + 1.2, 9, { tone: "hi", className: "press-file" }));
  for (let i = 0; i < PILE; i++) out.push(blank(FILE_X + ((i * 5) % 3) * 0.35 - 0.35, ((i * 7) % 3) * 0.35 - 0.35, TRAY_Z + 1.2 + i * T));
  out.push(template(FILE_X - 0.35, 0.35, PILE_TOP));
  return out.join("");
}
function fileFront() {
  const out = [];
  out.push(box({ x: FILE.x + FILE.w - 2, y: FILE.y + 2, w: 2, d: FILE.d - 4, r: 0.6 }, TRAY_Z + 1.2, 9, { tone: "hi", className: "press-file" }));
  out.push(box({ x: FILE.x, y: FILE.y + FILE.d - 2, w: FILE.w, d: 2, r: 0.6 }, TRAY_Z + 1.2, 9, { tone: "hi", className: "press-file" }));
  // Spine label on the front wall: the letters of this catalogue.
  const fy = FILE.y + FILE.d;
  out.push(onFront(fy, flat(rectPath(FILE_X - 9, -(TRAY_Z + 8.4), 18, 6, 0.4), "press-label") + stroke(rectPath(FILE_X - 9, -(TRAY_Z + 8.4), 18, 6, 0.4), "hi") + `<text class="press-letters" x="${FILE_X}" y="${-(TRAY_Z + 3.9)}" font-size="4" text-anchor="middle">M–N</text>`));
  // Lift's front guide.
  return out.join("");
}

// ---------------------------------------------------------------------------------------------------------------
// 5. Archive: a bookcase behind the line, with the finished catalogues standing spine out, A to Z, and an empty
//    slot (in highlight) waiting for the open one, M–N.
const CASE = { x: -30, y: -96, w: 238, d: 40, r: 2 };
const CASE_Z0 = -12;
const CASE_Z = -4; // top of the plinth, where the volumes stand
const VOL = { w: 17, d: 28, gap: 1.6 };
const LETTERS = ["A–B", "C–D", "E–F", "G–H", "I–J", "K–L", "", "O–P", "Q–R", "S–T", "U–V", "W–Z"];
function archive() {
  const out = [halo(CASE, CASE_Z0, 10)];
  // Plinth on four feet, back panel with a seam, two side panels.
  for (const [x, y] of k.corners(CASE, 10).sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P))) out.push(S(k.cylinder(x, y, 4, CASE_Z0, 3, P, 20), { tone: "mid" }));
  out.push(box(CASE, CASE_Z0 + 3, CASE_Z - CASE_Z0 - 3, { tone: "hi" }, 4, 0.8));
  out.push(box({ x: CASE.x, y: CASE.y, w: CASE.w, d: 4, r: 0.6 }, CASE_Z, 52, { tone: "hi" }, 3));
  out.push(onFront(CASE.y + 4, stroke(`M${CASE.x + 6} ${-(CASE_Z + 46)}H${CASE.x + CASE.w - 6}`, "faint")));
  out.push(box({ x: CASE.x, y: CASE.y + 4, w: 4, d: CASE.d - 4, r: 0.6 }, CASE_Z, 52, { tone: "hi" }, 3));
  const x0 = CASE.x + 6;
  const vy = CASE.y + 6;
  LETTERS.forEach((letters, i) => {
    const x = x0 + i * (VOL.w + VOL.gap);
    if (!letters) {
      // The empty slot keeps its place with a divider card (in highlight) taller than the volumes: M–N goes here.
      const card = { x: x + VOL.w / 2 - 0.8, y: vy + 2, w: 1.6, d: VOL.d - 4, r: 0.3 };
      out.push(box(card, CASE_Z, 40, { tone: "hi", className: "press-gap" }, 2));
      const tab = { x: card.x, y: card.y + VOL.d - 4 - 13, w: 1.6, d: 13, r: 0.3 };
      out.push(box(tab, CASE_Z + 40, 7, { tone: "hi", className: "press-gap" }, 2));
      out.push(onSide(card.x + card.w + 0.01, `<text class="press-letters" x="${-(tab.y + tab.d / 2)}" y="${-(CASE_Z + 41.6)}" font-size="3.8" text-anchor="middle">M–N</text>`));
      return;
    }
    const h = 42 + ((i * 7) % 3) * 2;
    const vol = { x, y: vy, w: VOL.w, d: VOL.d, r: 1 };
    out.push(box(vol, CASE_Z, h, { tone: "hi", className: "press-file" }, 4, 0.6));
    // Spine: label with the letters, a finger hole, a band at the foot, a rule over the label.
    const fy = vol.y + vol.d;
    out.push(onFront(fy, flat(rectPath(x + 2.5, -(CASE_Z + h - 6), VOL.w - 5, 13, 0.6), "press-label") + stroke(rectPath(x + 2.5, -(CASE_Z + h - 6), VOL.w - 5, 13, 0.6), "hi") + `<text class="press-letters" x="${x + VOL.w / 2}" y="${-(CASE_Z + h - 15.4)}" font-size="4" text-anchor="middle">${letters}</text>` + stroke(`M${x + 4.5} ${-(CASE_Z + h - 9.2)}H${x + VOL.w - 4.5}`, "lo") + stroke(circle(x + VOL.w / 2, -(CASE_Z + 13), 2.4, 20), "hi") + stroke(`M${x + 0.8} ${-(CASE_Z + 6)}H${x + VOL.w - 0.8}`, "lo")));
  });
  // Right side panel last: it stands in front of the last volume.
  out.push(box({ x: CASE.x + CASE.w - 4, y: CASE.y + 4, w: 4, d: CASE.d - 4, r: 0.6 }, CASE_Z, 52, { tone: "hi" }, 3));
  out.push(screws([[CASE.x + 2, CASE.y + CASE.d - 3, CASE_Z + 52], [CASE.x + CASE.w - 2, CASE.y + CASE.d - 3, CASE_Z + 52]]));
  return out.join("");
}

// ---------------------------------------------------------------------------------------------------------------
// The moving sheet: drawn where it ends (on the pile), moved in from the feed, the press and the belt.
function movingSheet() {
  const cx = FILE_X;
  const cy = 0;
  const z = PILE_TOP;
  const sheet = blank(cx, cy, z);
  const print = `<g class="press-print">${template(cx, cy, z + T, { name: true })}</g>`;
  const offs = {
    "--at-feed": vec([FEED_X - cx, 0, Z - T - z]),
    "--at-press": vec([PRESS_X - cx, 0, Z - z]),
    "--at-end": vec([BELT_END_X - cx, 0, Z - z]),
    "--at-over": vec([0, 0, DROP * 0.15]),
  };
  const style = Object.entries(offs).map(([n, v]) => `${n}:${px(v)}`).join(";");
  return `<g class="press-sheet" style="${style}">${sheet}${print}</g>`;
}

const body = [
  archive(),
  base(),
  feedBack(),
  bridge(),
  pressBack(),
  beltBack(),
  fileBack(),
  movingSheet(),
  fileFront(),
  beltFront(),
  feedFront(),
  bridgeFront(),
  head(),
  pressFront(),
  drive(),
].join("");

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label: "An isometric drawing of a small press: a blank sheet leaves the feed tray, the press head prints the same CV layout on it, a belt carries it to an open catalogue, and finished catalogues stand in a bookcase behind it.",
  body,
});

const file = `// Generated by scripts/desk-hero/press.mjs. Do not edit by hand: change the build and run it again.
/* eslint-disable */
export const PRESS_SVG = ${JSON.stringify(svg)};
`;
writeFileSync(OUT, file);
const pageAt = process.argv.find((a) => a.startsWith("--page="));
if (pageAt) writeFileSync(pageAt.slice(7), k.pageHtml({ title: "Press", theme: "light", width: 1100, body: k.plateHtml({ fig: "Fig 4", title: "Press", hint: "", body: `<div class="iso-stage">${svg}</div>` }) }));
console.log(`wrote ${OUT} (${(file.length / 1024).toFixed(0)} KB)`);
