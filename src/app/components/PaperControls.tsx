import { useEffect, useId, useState } from 'react';
import { Paintbrush, Sun, Thermometer } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import {
  bgFromHue,
  clampBg,
  clampInk,
  colorPresets,
  hex,
  hueOf,
  inkFromHue,
  paperColors,
  parseHex,
  usePaper,
  type AppearanceMode,
} from '../paper';
import { fmt, useI18n } from '../i18n';

const micro = 'font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft';
const HUES = Array.from({ length: 13 }, (_, i) => i * 30);

/** A HEX field: shows the colour in use, takes any hex, and hands it on when the person is done typing. */
function HexField({ id, label, value, onCommit }: { id: string; label: string; value: string; onCommit: (hex: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    const rgb = parseHex(draft);
    if (rgb) onCommit(hex(rgb));
    else setDraft(value);
  };
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden="true" className="h-7 w-7 shrink-0 rounded-sm border border-ink" style={{ background: value }} />
      <label htmlFor={id} className="sr-only">{label}</label>
      <input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        spellCheck={false}
        autoComplete="off"
        maxLength={7}
        className="h-8 w-24 rounded-sm border border-rule bg-paper px-2 font-mono text-[13px] uppercase text-ink outline-none focus-visible:border-ink"
      />
    </span>
  );
}

/** Appearance: Classic, Paper or Color. Paper keeps the e-reader light (brightness, warmth); Color takes a light
 *  background tone and a dark text tone, both clamped so text always reads at AAA. With `label`, the button shows
 *  a paintbrush and its name (from md up), as in the CV menu; without, a sun icon, as in the site header. */
export function PaperControls({ label }: { label?: string } = {}) {
  const { m } = useI18n();
  const p = m.paper;
  const [settings, setSettings] = usePaper();
  const { inkRatio, softRatio, paper, ink } = paperColors(settings);
  const bId = useId();
  const wId = useId();
  const bgId = useId();
  const inkId = useId();
  const minRatio = Math.min(inkRatio, softRatio);
  const bg = clampBg(settings.bg);

  const slider = (id: string, value: number, onChange: (v: number) => void, name: string, low: string, high: string, icon: React.ReactNode, track: string, max = 100) => (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="flex items-center gap-2 text-[14px] font-medium">
          {icon}
          {name}
        </label>
        <span className="font-mono text-[12px] text-ink-soft tabular-nums" aria-hidden="true">{Math.round(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={low && high ? `${Math.round(value)} · ${value < max / 2 ? low : high}` : `${Math.round(value)}°`}
        className="paper-range mt-3 w-full"
        style={{ '--track': track } as React.CSSProperties}
      />
      {low && (
        <div className="mt-1 flex justify-between font-mono text-[11px] uppercase tracking-[0.1em] text-ink-soft" aria-hidden="true">
          <span>{low}</span>
          <span>{high}</span>
        </div>
      )}
    </div>
  );

  const modes: { id: AppearanceMode; name: string; swatch: [string, string] }[] = [
    { id: 'classic', name: p.classic, swatch: ['#ffffff', '#111111'] },
    { id: 'paper', name: p.paperMode, swatch: ['#ece0c9', '#111111'] },
    { id: 'color', name: p.color, swatch: settings.mode === 'color' ? [paper, ink] : ['#f0e6ff', '#49248b'] },
  ];
  const bgTrack = `linear-gradient(90deg, ${HUES.map((h) => hex(bgFromHue(h))).join(', ')})`;
  const bgRgb = parseHex(bg)!;
  const inkTrack = `linear-gradient(90deg, ${HUES.map((h) => hex(inkFromHue(h, bgRgb))).join(', ')})`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label ?? p.title}
          title={label ?? p.title}
          className={label ? 'inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-sm px-2 text-[13px] text-ink hover:bg-zinc-100 md:h-9 md:min-w-9' : 'inline-flex h-11 w-11 items-center justify-center rounded-sm text-ink hover:bg-zinc-100 md:h-9 md:w-9'}
        >
          {label ? <Paintbrush size={20} aria-hidden="true" /> : <Sun size={20} aria-hidden="true" />}
          {label && <span className="hidden whitespace-nowrap md:inline">{label}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" aria-label={p.title} className="max-h-[80vh] w-80 overflow-y-auto rounded-sm border-ink bg-paper p-0 text-ink">
        <div className="flex items-center justify-between border-b border-rule px-4 py-2.5">
          <p className={micro}>{p.title}</p>
          <span aria-hidden="true" className="h-4 w-8 rounded-sm border border-ink" style={{ background: paper }} />
        </div>

        <div role="radiogroup" aria-label={p.title} className="grid grid-cols-3 gap-1 p-2">
          {modes.map((mo) => {
            const on = settings.mode === mo.id;
            return (
              <button
                key={mo.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setSettings((s) => ({ ...s, mode: mo.id }))}
                className={`flex flex-col items-center gap-1.5 rounded-sm border px-1 py-2 text-[13px] ${on ? 'border-ink bg-zinc-100 font-medium' : 'border-rule hover:border-ink'}`}
              >
                <span aria-hidden="true" className="flex h-6 w-10 items-center justify-center rounded-sm border border-ink font-title text-[12px] leading-none" style={{ background: mo.swatch[0], color: mo.swatch[1] }}>
                  Aa
                </span>
                {mo.name}
              </button>
            );
          })}
        </div>

        {settings.mode === 'paper' && (
          <>
            <div className="border-t border-rule" />
            {slider(bId, settings.brightness, (brightness) => setSettings((s) => ({ ...s, brightness })), p.brightness, p.soft, p.bright,
              <Sun size={20} aria-hidden="true" />, 'linear-gradient(90deg, #bdbbb6, #f5f6f3)')}
            <div className="border-t border-rule" />
            {slider(wId, settings.warmth, (warmth) => setSettings((s) => ({ ...s, warmth })), p.warmth, p.cool, p.warm,
              <Thermometer size={20} aria-hidden="true" />, 'linear-gradient(90deg, #f5f6f3, #eceae5, #ecddbf)')}
          </>
        )}

        {settings.mode === 'color' && (
          <>
            <div className="border-t border-rule px-4 py-3">
              <p className={micro}>{p.presets}</p>
              <div className="mt-2 grid grid-cols-6 gap-1.5">
                {colorPresets.map((pr) => {
                  const b = clampBg(pr.bg);
                  const i = clampInk(pr.ink, b);
                  return (
                    <button
                      key={pr.id}
                      type="button"
                      onClick={() => setSettings((s) => ({ ...s, bg: pr.bg, ink: pr.ink }))}
                      aria-label={p.presetNames[pr.id]}
                      title={p.presetNames[pr.id]}
                      className="flex h-9 items-center justify-center rounded-sm border border-rule font-title text-[13px] leading-none hover:border-ink"
                      style={{ background: b, color: i }}
                    >
                      Aa
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="border-t border-rule">
              {slider(`${bgId}-hue`, hueOf(settings.bg), (h) => setSettings((s) => ({ ...s, bg: hex(bgFromHue(h)) })), p.background, '', '',
                <span aria-hidden="true" className="h-4 w-4 rounded-sm border border-ink" style={{ background: bg }} />, bgTrack, 359)}
              <div className="flex items-center justify-between px-4 pb-3">
                <span className="text-[12px] text-ink-soft">{p.hex}</span>
                <HexField id={bgId} label={`${p.background} ${p.hex}`} value={bg} onCommit={(v) => setSettings((s) => ({ ...s, bg: clampBg(v) }))} />
              </div>
            </div>
            <div className="border-t border-rule">
              {slider(`${inkId}-hue`, hueOf(settings.ink), (h) => setSettings((s) => ({ ...s, ink: hex(inkFromHue(h, bgRgb)) })), p.text, '', '',
                <span aria-hidden="true" className="h-4 w-4 rounded-sm border border-ink" style={{ background: ink }} />, inkTrack, 359)}
              <div className="flex items-center justify-between px-4 pb-3">
                <span className="text-[12px] text-ink-soft">{p.hex}</span>
                <HexField id={inkId} label={`${p.text} ${p.hex}`} value={ink} onCommit={(v) => setSettings((s) => ({ ...s, ink: v }))} />
              </div>
            </div>
          </>
        )}

        <p className="border-t border-rule px-4 py-3 text-[12px] text-ink-soft" aria-live="polite">
          {fmt(p.contrast, { ratio: minRatio.toFixed(1) })}
        </p>
      </PopoverContent>
    </Popover>
  );
}
