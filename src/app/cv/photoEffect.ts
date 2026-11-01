// The photo as the page shows it, for the designed PDF: in colour (Classic), grey multiplied onto the paper (Paper),
// or a duotone that maps shadows to the ink and lights to the paper (Color). Same rules as .portrait-img in theme.css.
import { parseHex } from '../paper';
import type { PhotoEffect } from '../paper';

export async function photoForPdf(src: string, effect: PhotoEffect, ink: string, paper: string): Promise<string> {
  if (effect === 'color') return src;
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = src;
  });
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = data.data;
  const a = parseHex(ink) ?? [17, 17, 17];
  const b = parseHex(paper) ?? [236, 234, 229];
  for (let i = 0; i < d.length; i += 4) {
    let y = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
    if (effect === 'gray') {
      y = Math.max(0, Math.min(1, (y - 0.5) * 1.1 + 0.5));
      for (let c = 0; c < 3; c++) d[i + c] = y * b[c];
    } else {
      y = Math.max(0, Math.min(1, (y - 0.5) * 1.25 + 0.5));
      for (let c = 0; c < 3; c++) d[i + c] = a[c] + (b[c] - a[c]) * y;
    }
  }
  ctx.putImageData(data, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.9);
}
