// "As on the page" PDF: the same layout, typefaces, paper colour, rules, logos and photo as the
// screen, with real selectable text. Fonts are the files in /public/fonts (Switzer, Gambetta, IBM Plex
// Mono), embedded on demand.
import { avatarOf, dateRange, displayUrl, initials } from './format';
import type { CVData } from './types';
import { packCV, PDF_DATA_NS } from './share';
import { resolveLogos } from './logos';
import type { Messages } from '../i18n/en';
import type { TypeFaces } from '../typography';
import { currentPaper } from '../paper';
import { photoForPdf } from './photoEffect';

const W = 595.28; // A4 in points
const H = 841.89;
const M = 48;
const CW = W - M * 2;


const families = {
  sans: { name: 'Switzer', file: 'Switzer' },
  serif: { name: 'Gambetta', file: 'Gambetta' },
} as const;
const MONO_FILE = 'IBMPlexMono';

const fontCache = new Map<string, Promise<string>>();
function fontBase64(file: string) {
  if (!fontCache.has(file)) {
    const url = new URL(`../fonts/${file}.ttf`, window.location.href).href;
    fontCache.set(
      file,
      fetch(url)
        .then((r) => {
          if (!r.ok) throw new Error(`font ${file}`);
          return r.arrayBuffer();
        })
        .then((buf) => {
          const bytes = new Uint8Array(buf);
          let bin = '';
          for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
          return btoa(bin);
        }),
    );
  }
  return fontCache.get(file)!;
}

/** SVG/raster logo → PNG data URL the PDF can embed. */
async function rasterize(src: string, px = 96): Promise<string | undefined> {
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = src;
    });
    const canvas = document.createElement('canvas');
    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext('2d')!;
    const w = img.naturalWidth || px;
    const h = img.naturalHeight || px;
    const k = Math.min(px / w, px / h);
    ctx.drawImage(img, (px - w * k) / 2, (px - h * k) / 2, w * k, h * k);
    return canvas.toDataURL('image/png');
  } catch {
    return undefined;
  }
}

// Contact, education and certification icons: the same Lucide marks as the page, drawn in the soft text colour.
const CONTACT_ICONS = {
  email: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  phone:
    '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  location: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  linkedin:
    '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/>',
  website: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  education:
    '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
  award:
    '<path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/><circle cx="12" cy="8" r="6"/>',
} as const;
type ContactKind = keyof typeof CONTACT_ICONS;

function iconSvg(kind: ContactKind, color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${CONTACT_ICONS[kind]}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export async function buildDesignedPdf(input: CVData, m: Messages, faces: TypeFaces): Promise<Blob> {
  const cv = await resolveLogos(input);
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  // The PDF uses the appearance picked on the page: paper, ink, soft text, rules and the photo effect.
  const C = currentPaper();

  // Fonts: the text family the reader picked, the sans for meta lines, mono for labels.
  const needed = new Set([families[faces.body].file, families.sans.file, MONO_FILE]);
  for (const file of needed) {
    for (const [suffix, style] of [['Regular', 'normal'], ['Medium', 'bold'], ['Italic', 'italic']] as const) {
      const data = await fontBase64(`${file}-${suffix}`);
      doc.addFileToVFS(`${file}-${suffix}.ttf`, data);
      doc.addFont(`${file}-${suffix}.ttf`, file, style);
    }
  }
  // Titles: the chosen title font's single bold file, used for every style.
  const TITLE = `T-${faces.title}`;
  const titleData = await fontBase64(`titles/${faces.title}`);
  doc.addFileToVFS(`${TITLE}.ttf`, titleData);
  for (const style of ['normal', 'bold', 'italic'] as const) doc.addFont(`${TITLE}.ttf`, TITLE, style);
  const BODY = families[faces.body].name;
  const SANS = families.sans.name;
  const MONO = MONO_FILE;

  // Logos and photo as embeddable images.
  const toolIcons = await Promise.all(cv.tools.map((t) => (t.icon ? rasterize(t.icon, 64) : Promise.resolve(undefined))));
  const expLogos = await Promise.all(cv.experience.map((e) => (e.logo ? rasterize(e.logo, 96) : Promise.resolve(undefined))));

  let y = M;
  const paint = () => {
    doc.setFillColor(C.paper);
    doc.rect(0, 0, W, H, 'F');
  };
  paint();
  const ensure = (h: number) => {
    if (y + h > H - M) {
      doc.addPage();
      paint();
      y = M;
    }
  };
  const font = (family: string, size: number, style: 'normal' | 'bold' | 'italic' = 'normal', color = C.ink) => {
    doc.setFont(family, style);
    doc.setFontSize(size);
    doc.setTextColor(color);
  };
  const label = (text: string, x: number, yy: number, color = C.soft, size = 7.5, align: 'left' | 'right' = 'left') => {
    font(MONO, size, 'normal', color);
    doc.text(text.toUpperCase(), x, yy, { charSpace: size * 0.14, align });
  };
  const para = (text: string, family: string, size: number, opts: { color?: string; width?: number; x?: number; lead?: number; style?: 'normal' | 'bold' | 'italic' } = {}) => {
    font(family, size, opts.style ?? 'normal', opts.color ?? C.ink);
    const lines: string[] = doc.splitTextToSize(text, opts.width ?? CW);
    const lh = size * (opts.lead ?? 1.4);
    for (const line of lines) {
      ensure(lh);
      doc.text(line, opts.x ?? M, y + size * 0.85);
      y += lh;
    }
  };
  const hline = (x1: number, x2: number, yy: number, color = C.rule, w = 0.5) => {
    doc.setDrawColor(color);
    doc.setLineWidth(w);
    doc.line(x1, yy, x2, yy);
  };
  const head = (title: string) => {
    ensure(70);
    y += 26;
    hline(M, W - M, y, C.ink, 0.8);
    y += 13;
    font(MONO, 8, 'bold', C.ink);
    doc.text(title.toUpperCase(), M, y, { charSpace: 1.1 });
    y += 16;
  };

  // ---- Header: square photo or initials on the left, then name, headline (in the text face), contacts ----
  const { profile } = cv;
  const avatar = avatarOf(profile);
  const picSize = 64;
  const tx = avatar === 'none' ? M : M + picSize + 18;
  const textWidth = W - M - tx;
  const top = y;
  if (avatar === 'photo') {
    const photo = await photoForPdf(profile.photo!, C.photo, C.ink, C.paper).catch(() => profile.photo!);
    doc.addImage(photo, 'JPEG', M, y, picSize, picSize);
  }
  if (avatar === 'initials') {
    doc.setFillColor(C.ink);
    doc.rect(M, y, picSize, picSize, 'F');
    font(TITLE, 24, 'normal', C.paper);
    doc.text(initials(profile.name), M + 6, y + picSize - 7);
  }
  font(TITLE, 26, 'normal');
  const nameLines: string[] = doc.splitTextToSize(profile.name || m.app.namePlaceholder, textWidth);
  for (const line of nameLines) {
    doc.text(line, tx, y + 21);
    y += 25;
  }
  y += 4;
  para(profile.headline || m.app.headlinePlaceholder, BODY, 14, { width: Math.min(textWidth, 380), lead: 1.2, x: tx });
  y += 6;
  // Contacts: icon + text, flowing like the page, wrapping inside the text column.
  {
    const p = profile;
    const items = ([
      ['email', p.email],
      ['phone', p.phone],
      ['location', p.location],
      ['linkedin', p.linkedin && displayUrl(p.linkedin)],
      ['website', p.website && displayUrl(p.website)],
    ] as [ContactKind, string | undefined][]).filter(([, v]) => v) as [ContactKind, string][];
    const icons = await Promise.all(items.map(([k]) => rasterize(iconSvg(k, C.soft), 48)));
    font(SANS, 8.5, 'normal', C.soft);
    const iz = 8.5;
    const lh = 14;
    let x = tx;
    items.forEach(([, text], i) => {
      const w = iz + 4 + doc.getTextWidth(text);
      if (x > tx && x + w > W - M) {
        x = tx;
        y += lh;
      }
      const icon = icons[i];
      if (icon) doc.addImage(icon, 'PNG', x, y + 0.6, iz, iz);
      doc.text(text, x + iz + 4, y + 7.6);
      x += w + 14;
    });
    if (items.length) y += lh;
  }
  // ---- Summary: shares the name's left edge, like the page (one column, the photo in the margin) ----
  if (cv.summary.trim()) {
    y += 12;
    para(cv.summary.trim(), BODY, 10.5, { width: Math.min(textWidth, 420), lead: 1.55, x: tx });
  }
  if (avatar !== 'none') y = Math.max(y, top + picSize + 4);

  // ---- Skills: two columns, each opening with its own rule and title (Core skills | Stack & tools) ----
  if (cv.skills.length || cv.tools.length) {
    const ph = 18;
    const gap = 5;
    const colGap = 24;
    type Pill = { text: string; icon?: string; tool: boolean };
    const groups: { title: string; pills: Pill[] }[] = [];
    if (cv.skills.length) groups.push({ title: m.sections.coreSkills, pills: cv.skills.map((text) => ({ text, tool: false })) });
    if (cv.tools.length) groups.push({ title: m.sections.tools, pills: cv.tools.map((t, i) => ({ text: t.name, icon: toolIcons[i], tool: true })) });
    const colW = groups.length === 2 ? (CW - colGap) / 2 : CW;
    // Lay the pills out first, so the block can move to the next page whole.
    font(BODY, 9.5);
    const laid = groups.map((g) => {
      let x = 0;
      let row = 0;
      const pos = g.pills.map((p) => {
        const w = doc.getTextWidth(p.text) + 14 + (p.tool ? 14 : 0);
        if (x > 0 && x + w > colW) {
          x = 0;
          row += 1;
        }
        const at = { x, row, w };
        x += w + gap;
        return at;
      });
      return { ...g, pos, rows: (pos.at(-1)?.row ?? 0) + 1 };
    });
    const headH = 26;
    const blockH = headH + Math.max(...laid.map((g) => g.rows)) * (ph + gap);
    y += 26;
    ensure(blockH);
    const top = y;
    laid.forEach((g, gi) => {
      const cx = M + gi * (colW + colGap);
      hline(cx, cx + colW, top, C.ink, 0.8);
      font(MONO, 8, 'bold', C.ink);
      doc.text(g.title.toUpperCase(), cx, top + 13, { charSpace: 1.1 });
      g.pills.forEach((p, i) => {
        const { x, row, w } = g.pos[i];
        const px = cx + x;
        const py = top + headH + row * (ph + gap);
        doc.setDrawColor(C.ink);
        doc.setLineWidth(0.6);
        doc.rect(px, py, w, ph);
        let textX = px + 7;
        if (p.tool) {
          if (p.icon) doc.addImage(p.icon, 'PNG', px + 6, py + 4, 10, 10);
          else {
            doc.setFillColor(C.ink);
            doc.rect(px + 6, py + 4, 10, 10, 'F');
            font(BODY, 6.5, 'normal', C.paper);
            doc.text(p.text.charAt(0).toUpperCase(), px + 11, py + 11.3, { align: 'center' });
          }
          textX = px + 20;
        }
        font(BODY, 9.5);
        doc.text(p.text, textX, py + 12.3);
      });
    });
    y = top + blockH - gap;
  }

  // ---- Experience: ruled entries with logo tiles ----
  if (cv.experience.length) {
    head(m.sections.experience);
    cv.experience.forEach((e, i) => {
      ensure(60);
      if (i > 0) {
        hline(M, W - M, y);
        y += 12;
      }
      const tx = M + 32;
      const logo = expLogos[i];
      if (logo) doc.addImage(logo, 'PNG', M, y, 22, 22);
      else {
        doc.setFillColor(C.ink);
        doc.rect(M, y, 22, 22, 'F');
        font(TITLE, 10, 'normal', C.paper);
        doc.text((e.company || '?').charAt(0).toUpperCase(), M + 11, y + 14.8, { align: 'center' });
      }
      const dates = dateRange(e.start, e.end);
      font(MONO, 8, 'normal', C.soft);
      const dw = dates ? doc.getTextWidth(dates) + 12 : 0;
      if (dates) doc.text(dates, W - M, y + 9, { align: 'right' });
      const top = y;
      para(e.title, TITLE, 11.5, { width: CW - 32 - dw, x: tx, lead: 1.3, style: 'bold' });
      y = Math.max(y, top + 15);
      para([e.company, e.location, e.employmentType].filter(Boolean).join(' · '), SANS, 8.5, { color: C.soft, x: tx, width: CW - 32 });
      y += 5;
      e.bullets.filter((b) => b.trim()).forEach((b) => {
        font(BODY, 10);
        const lines: string[] = doc.splitTextToSize(b.trim(), CW - 32 - 12);
        lines.forEach((line, j) => {
          ensure(14.5);
          if (j === 0) {
            font(BODY, 10, 'normal', C.soft);
            doc.text('–', tx, y + 8.5);
            font(BODY, 10);
          }
          doc.text(line, tx + 12, y + 8.5);
          y += 14.5;
        });
      });
      y += 8;
    });
  }

  // ---- Education & certifications: ruled rows ----
  // Each row opens with its icon (graduation cap, award), like the page; text lines up with the experience entries.
  const rowIcons = {
    education: await rasterize(iconSvg('education', C.soft), 48),
    award: await rasterize(iconSvg('award', C.soft), 48),
  };
  const rows = (title: string, kind: 'education' | 'award', items: { title: string; meta: string; year: string }[]) => {
    if (!items.length) return;
    head(title);
    const rx = M + 32;
    items.forEach((it, i) => {
      ensure(40);
      if (i > 0) {
        hline(M, W - M, y);
        y += 12;
      }
      if (it.year) {
        font(MONO, 8, 'normal', C.soft);
        doc.text(it.year, W - M, y + 9, { align: 'right' });
      }
      const icon = rowIcons[kind];
      if (icon) doc.addImage(icon, 'PNG', M + 1, y + 1, 12, 12);
      para(it.title, TITLE, 11.5, { width: CW - 32 - 90, x: rx, style: 'bold', lead: 1.3 });
      if (it.meta) para(it.meta, SANS, 8.5, { color: C.soft, width: CW - 32 - 90, x: rx });
      y += 8;
    });
  };
  rows(m.sections.education, 'education', cv.education.map((e) => ({ title: e.degree, meta: [e.school, e.location, e.details].filter(Boolean).join(' · '), year: dateRange(e.start, e.end) })));
  rows(m.sections.certifications, 'award', cv.certifications.map((c) => ({ title: c.title, meta: [c.description, c.issuer].filter(Boolean).join(' · '), year: c.year })));

  // ---- Languages: hairline grid ----
  if (cv.languages.length) {
    head(m.sections.languages);
    const cols = 3;
    const cw = CW / cols;
    const ch = 40;
    cv.languages.forEach((l, i) => {
      const col = i % cols;
      if (col === 0) {
        ensure(ch);
        if (i > 0) y += ch;
      }
      const x = M + col * cw;
      doc.setDrawColor(C.rule);
      doc.setLineWidth(0.5);
      doc.rect(x, y, cw, ch);
      font(TITLE, 12);
      doc.text(l.name, x + 10, y + 17);
      if (l.level) label(l.level, x + 10, y + 30);
    });
    y += ch;
  }

  // Running footer on every page.
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    hline(M, W - M, H - 30, C.rule);
    label('curriculi curricula', M, H - 18);
    label(`${i} / ${pages}`, W - M, H - 18, C.soft, 7.5, 'right');
  }

  doc.setProperties({
    title: [profile.name, profile.headline, m.app.cvTitle].filter(Boolean).join(' - '),
    author: profile.name,
    subject: profile.headline,
    keywords: [...cv.skills, ...cv.tools.map((t) => t.name)].join(', '),
    creator: 'curriculi curricula',
  });
  // The full CV travels inside the PDF metadata (invisible to readers and ATS) so it can be imported back exactly.
  doc.addMetadata(await packCV(cv), PDF_DATA_NS);
  return doc.output('blob');
}
