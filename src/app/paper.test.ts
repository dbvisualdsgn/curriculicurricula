import { describe, expect, it } from 'vitest';
import { accentFor, bgFromHue, clampBg, clampInk, colorPresets, contrast, inkFromHue, paperColors, parseHex, readPaper, toOklch } from './paper';

describe('appearance colours', () => {
  const hues = Array.from({ length: 36 }, (_, i) => i * 10);

  it('keeps the background at one light level, whatever the tone', () => {
    for (const h of hues) expect(toOklch(bgFromHue(h)).L).toBeCloseTo(0.94, 2);
    expect(toOklch(parseHex(clampBg('#ff6600'))!).L).toBeCloseTo(0.94, 2);
    expect(toOklch(parseHex(clampBg('#000000'))!).L).toBeCloseTo(0.94, 2);
  });

  it('keeps text at 9:1 and ink on the highlight at 4.5:1 on every background', () => {
    for (const hb of hues) {
      const bg = bgFromHue(hb);
      for (const hi of hues) {
        const ink = inkFromHue(hi, bg);
        expect(contrast(ink, bg)).toBeGreaterThanOrEqual(9);
        expect(contrast(ink, accentFor(ink))).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('cuts light text colours off', () => {
    const bg = clampBg('#dce8f6');
    expect(contrast(parseHex(clampInk('#ffff00', bg))!, parseHex(bg)!)).toBeGreaterThanOrEqual(7);
  });

  it('keeps every soft text colour at AAA in every look and preset', () => {
    const looks = [
      readPaper({ mode: 'classic' }),
      readPaper({ warmth: 100, brightness: 0 }),
      ...colorPresets.map((p) => readPaper({ mode: 'color', bg: p.bg, ink: p.ink })),
    ];
    for (const s of looks) {
      const c = paperColors(s);
      expect(c.inkRatio).toBeGreaterThanOrEqual(7);
      expect(c.softRatio).toBeGreaterThanOrEqual(7);
    }
  });

  it('opens older saves as Paper and drops bad values', () => {
    expect(readPaper({ warmth: 20, brightness: 80 })).toMatchObject({ mode: 'paper', warmth: 20, brightness: 80 });
    expect(readPaper({ mode: 'neon', bg: 'red', warmth: 500 })).toMatchObject({ mode: 'paper', warmth: 100 });
  });
});
