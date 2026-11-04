import { useEffect, useState, type CSSProperties } from 'react';
import { Accessibility, Github, Languages, Link2, Lock, Pause, Play, Smartphone, X } from 'lucide-react';
import { SiteHeader } from '../app/components/SiteHeader';
import { useReveal } from '../app/hooks/useReveal';
import { useI18n } from '../app/i18n';
import { Documents } from './Documents';
import { Press } from './Press';
import { SiteFooter } from '../app/components/SiteFooter';
import { Closing, Part, WithName, body, label, wrap } from './parts';

const reducedMotion = () => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

export function Why() {
  const { m } = useI18n();
  const w = m.why;
  const [paused, setPaused] = useState(false);
  const [pressPaused, setPressPaused] = useState(false);
  const [still] = useState(reducedMotion);
  const heroRef = useReveal<HTMLDivElement>(0.1);

  useEffect(() => {
    document.title = `${w.nav} · ${m.app.name}`;
  }, [w.nav, m.app.name]);

  const asks = [w.ask1, w.ask2, w.ask3, w.ask4, w.ask5, w.ask6];
  const does = [
    [w.does1t, w.does1],
    [w.does2t, w.does2],
    [w.does3t, w.does3],
    [w.does4t, w.does4],
  ];
  const forAll = [
    { icon: Languages, text: w.all1 },
    { icon: Smartphone, text: w.all2 },
    { icon: Accessibility, text: w.all3 },
    { icon: Github, text: w.all4 },
  ];

  return (
    <div className="min-h-screen bg-paper text-ink">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-sm focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-paper">
        {m.app.skipToContent}
      </a>
      <SiteHeader root="../" current="why" />

      <main id="main" tabIndex={-1} data-paused={paused || undefined} className="focus:outline-none">
        {/* Opening */}
        <section className={`${wrap} pb-16 pt-14 md:pb-24 md:pt-24`}>
          <div ref={heroRef} className="reveal">
            <div className="flex items-start justify-between gap-6">
              <p className={label}>{w.kicker}</p>
              <span className="-mt-4 font-title text-[96px] leading-none md:-mt-8 md:text-[160px]" aria-hidden="true">*</span>
            </div>
            <h1 className="max-w-[22ch] font-title text-[clamp(2.25rem,8vw,3.75rem)] font-normal leading-[0.95] hyphens-auto [overflow-wrap:break-word] md:text-[clamp(3rem,5.6vw,6.25rem)] md:hyphens-manual">
              {w.title}
            </h1>
            {/* The freestyle part: the questions everyone answers alone, crossed out one by one. */}
            <div className="mt-14 grid gap-12 md:mt-20 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:items-end md:gap-16">
              <div>
                <p className={label}>{w.asksLabel}</p>
                <ul className="mt-5 flex flex-wrap gap-2">
                  {asks.map((a, i) => (
                    <li
                      key={a}
                      className="strike rounded-full border border-rule px-4 py-2 font-body text-lg leading-snug text-ink-soft md:text-xl"
                      style={{ '--d': `${500 + i * 160}ms` } as CSSProperties}
                    >
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-title text-2xl leading-tight md:text-4xl">
                  <span className="hl" style={{ transitionDelay: '1500ms' }}>
                    <WithName text={w.idea3} />
                  </span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* One person, three documents */}
        <section aria-labelledby="docs" className={`border-t border-ink ${wrap} py-16 md:py-24`}>
          <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
            <div>
              <h2 id="docs" className="font-title text-3xl leading-[1.05] md:text-5xl">{w.docsTitle}</h2>
              <p className={`mt-4 ${body}`}>{w.docsLead}</p>
            </div>
            {!still && (
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                className="inline-flex h-9 items-center gap-2 rounded-sm px-2 text-[14px] hover:bg-zinc-100"
              >
                {paused ? <Play size={20} aria-hidden="true" /> : <Pause size={20} aria-hidden="true" />}
                {paused ? w.play : w.pause}
              </button>
            )}
          </div>
          <Documents />
        </section>

        <Part id="does" title={w.doesTitle}>
          <p className="max-w-[34ch] font-body text-2xl leading-snug md:text-3xl">{w.doesLead}</p>
          <ol className="mt-10 grid gap-px border border-ink bg-ink sm:grid-cols-2">
            {does.map(([t, d], i) => (
              <li key={t} className="bg-paper p-6">
                <span className="font-mono text-[11px] text-ink-soft" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="mt-6 font-title text-2xl">{t}</h3>
                <p className="mt-2 font-body text-[15px] leading-relaxed text-ink-soft">{d}</p>
              </li>
            ))}
          </ol>
        </Part>

        <Part id="not" title={w.notTitle}>
          <ul className="border-t border-ink">
            {[w.not1, w.not2, w.not3].map((t) => (
              <li key={t} className="flex items-center gap-4 border-b border-rule py-4 font-title text-2xl md:text-3xl">
                <X size={20} aria-hidden="true" className="shrink-0" />
                {t}
              </li>
            ))}
          </ul>
          <p className={`mt-8 ${body}`}>{w.notJob}</p>
        </Part>

        <Part id="data" title={w.dataTitle}>
          <ul className="grid gap-px border border-ink bg-ink md:grid-cols-2">
            {[
              { icon: Lock, text: w.data1 },
              { icon: Link2, text: w.data2 },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="bg-paper p-6 md:p-8">
                <Icon size={20} aria-hidden="true" />
                <p className="mt-6 font-body text-lg leading-snug">{text}</p>
              </li>
            ))}
          </ul>
        </Part>

        <Part id="all" title={w.allTitle}>
          <ul className="grid gap-px border border-ink bg-ink sm:grid-cols-2">
            {forAll.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-4 bg-paper p-6">
                <Icon size={20} aria-hidden="true" className="shrink-0" />
                <span className="font-title text-xl leading-tight">{text}</span>
              </li>
            ))}
          </ul>
        </Part>

        {/* One layout for everyone: the press prints the same CV with a new name and files it. */}
        <section aria-labelledby="press" className={`border-t border-ink ${wrap} py-16 md:py-24`}>
          <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
            <div>
              <h2 id="press" className="max-w-[24ch] font-title text-3xl leading-[1.05] md:text-5xl">{w.pressTitle}</h2>
              <p className={`mt-4 ${body}`}>{w.pressLead}</p>
            </div>
            {!still && (
              <button
                type="button"
                onClick={() => setPressPaused((p) => !p)}
                className="inline-flex h-9 items-center gap-2 rounded-sm px-2 text-[14px] hover:bg-zinc-100"
              >
                {pressPaused ? <Play size={20} aria-hidden="true" /> : <Pause size={20} aria-hidden="true" />}
                {pressPaused ? w.play : w.pause}
              </button>
            )}
          </div>
          <div className="mt-6 md:mt-8">
            <Press paused={pressPaused} />
          </div>
        </section>

        <Closing root="../" />
      </main>

      <SiteFooter root="../" />
    </div>
  );
}
