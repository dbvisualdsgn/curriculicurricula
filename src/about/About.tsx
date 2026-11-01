import { useEffect } from 'react';
import { ArrowRight, Github } from 'lucide-react';
import { SiteHeader } from '../app/components/SiteHeader';
import { Portrait } from '../app/components/Portrait';
import { useReveal } from '../app/hooks/useReveal';
import { useI18n } from '../app/i18n';
import { SiteFooter } from '../app/components/SiteFooter';
import { Closing, GITHUB_URL, Part, WithName, body, label, textLink, wrap } from '../why/parts';

const NAME = 'Daniele Brusca';

/** Who made the site, told in the third person: no quotes, no signature. */
export function About() {
  const { m } = useI18n();
  const a = m.about;
  const heroRef = useReveal<HTMLDivElement>(0.1);

  useEffect(() => {
    document.title = `${a.nav} · ${m.app.name}`;
  }, [a.nav, m.app.name]);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-sm focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-paper">
        {m.app.skipToContent}
      </a>
      <SiteHeader root="../" current="about" />

      <main id="main" tabIndex={-1} className="focus:outline-none">
        {/* Opening: the portrait, set like a photo on a CV, next to the name. */}
        <section className={`${wrap} pb-16 pt-14 md:pb-24 md:pt-24`}>
          <div ref={heroRef} className="reveal grid items-end gap-8 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] md:gap-14">
            <Portrait photo="../about/daniele.jpg" name={NAME} alt={a.photoAlt} className="aspect-square w-48 sm:w-full" />
            <div className="min-w-0">
              <p className={label}>{a.kicker}</p>
              <h1 className="mt-6 font-title text-[clamp(2.5rem,7vw,6rem)] font-normal leading-[0.92] tracking-[-0.03em] hyphens-auto [overflow-wrap:anywhere]">
                {NAME}
              </h1>
              <p className="mt-6 max-w-[30ch] font-body text-2xl leading-snug md:text-3xl">{a.lead}</p>
            </div>
          </div>
        </section>

        <Part id="who" n={1} title={a.whoTitle}>
          <p className="max-w-[34ch] font-body text-2xl leading-snug md:text-3xl">{a.who1}</p>
          <p className={`mt-6 ${body}`}>{a.who2}</p>
        </Part>

        <Part id="saw" n={2} title={a.sawTitle}>
          <p className={body}>{a.sawLead}</p>
          <ul className="mt-8 border-t border-ink">
            {[a.saw1, a.saw2, a.saw3].map((t) => (
              <li key={t} className="border-b border-rule py-4 font-title text-2xl leading-tight md:text-3xl">{t}</li>
            ))}
          </ul>
          <p className="mt-10 font-title text-2xl leading-tight md:text-4xl">
            <span className="hl">{a.sawEnd}</span>
          </p>
        </Part>

        <Part id="made" n={3} title={a.madeTitle}>
          <p className="max-w-[34ch] font-body text-2xl leading-snug md:text-3xl">
            <WithName text={a.made1} />
          </p>
          <p className={`mt-6 ${body}`}>{a.made2}</p>
          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-4">
            <a href="../why/" className={`nudge ${textLink}`}>
              {a.whyLink}
              <ArrowRight size={20} aria-hidden="true" />
            </a>
            <a href={GITHUB_URL} className={textLink} rel="noopener noreferrer" target="_blank">
              <Github size={20} aria-hidden="true" />
              {m.home.source}
            </a>
          </div>
        </Part>

        <Closing root="../" />
      </main>

      <SiteFooter root="../" onAbout />
    </div>
  );
}
