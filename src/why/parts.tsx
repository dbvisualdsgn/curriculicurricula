// Building blocks shared by the Why and About pages.
import { ArrowRight, Github } from 'lucide-react';
import { Wordmark } from '../app/components/Wordmark';
import { useReveal } from '../app/hooks/useReveal';
import { useI18n } from '../app/i18n';

export const label = 'font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft';
export const primaryBtn = 'nudge inline-flex h-12 items-center gap-3 rounded-sm bg-ink px-5 text-[15px] font-medium text-paper hover:opacity-90';
export const textLink = 'inline-flex items-center gap-1.5 text-[15px] text-ink underline decoration-1 underline-offset-[6px] hover:decoration-2';
export const body = 'max-w-[46ch] font-body text-lg leading-relaxed text-ink-soft';
export const wrap = 'mx-auto max-w-6xl xl:max-w-none xl:px-12 px-4 sm:px-8';

/** The name as the brand writes it, inside a sentence. */
export function Name() {
  return (
    <span className="whitespace-nowrap">
      curriculi <em>curricula</em>
    </span>
  );
}

/** "{name} …" with the brand set in place. */
export function WithName({ text }: { text: string }) {
  const [before, after] = text.split('{name}');
  return (
    <>
      {before}
      {after !== undefined && <Name />}
      {after}
    </>
  );
}

/** A numbered part of the page: number and title on the left, the text on the right. */
export function Part({ id, n, title, children }: { id: string; n: number; title: string; children: React.ReactNode }) {
  const ref = useReveal<HTMLElement>(0.12);
  return (
    <section ref={ref} aria-labelledby={id} className="reveal border-t border-ink">
      <div className={`${wrap} grid gap-8 py-16 md:py-24 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16`}>
        <div>
          <p className="font-title text-[72px] leading-none md:text-[112px]" aria-hidden="true">{n}.</p>
          <h2 id={id} className="mt-6 font-title text-3xl leading-[1.05] hyphens-auto [overflow-wrap:anywhere] md:text-5xl">{title}</h2>
        </div>
        <div className="min-w-0 lg:pt-4">{children}</div>
      </div>
    </section>
  );
}

/** "Everyone has one." and the button to start, at the end of a page. */
export function Closing({ root }: { root: string }) {
  const { m } = useI18n();
  return (
    <section className="border-t border-ink">
      <div className={`${wrap} py-20 md:py-32`}>
        <p className="font-title text-[clamp(2.75rem,8vw,6.5rem)] leading-[0.95]">
          <span className="hl">{m.home.closing}</span>
        </p>
        <a href={`${root}app/?new=1`} className={`${primaryBtn} mt-10`}>
          {m.home.closingCta}
          <ArrowRight size={20} aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}

export const GITHUB_URL = 'https://github.com/dbvisualdsgn/Careerpath';

export function PageFooter({ root }: { root: string }) {
  const { m } = useI18n();
  return (
    <footer className="border-t border-ink">
      <div className={`${wrap} flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between`}>
        <Wordmark href={root} />
        <p className="font-body text-[15px] text-ink-soft">{m.home.footer}</p>
        <a href={GITHUB_URL} className={textLink} rel="noopener noreferrer" target="_blank">
          <Github size={20} aria-hidden="true" />
          {m.home.source}
        </a>
      </div>
    </footer>
  );
}
