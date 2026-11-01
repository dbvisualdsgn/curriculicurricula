import { Github, Linkedin, Mail } from 'lucide-react';
import { Portrait } from './Portrait';
import { Wordmark } from './Wordmark';
import { useI18n } from '../i18n';

const NAME = 'Daniele Brusca';
const EMAIL = 'dbvisualdesign@gmail.com';
const LINKEDIN = 'https://www.linkedin.com/in/danielebrusca';
const GITHUB = 'https://github.com/dbvisualdsgn/Careerpath';
/** The small black-and-white portrait next to the name, like the top of a CV. */
const SHOW_PHOTO = true;

const wrap = 'mx-auto max-w-6xl xl:max-w-none xl:px-12 px-4 sm:px-8';
const link = 'inline-flex min-h-11 items-center gap-2 text-[15px] text-ink underline decoration-1 underline-offset-[6px] hover:decoration-2 sm:min-h-0';

/** Footer for the site pages (not the CV tool): who made it, as a short CV, then the site line.
 *  `root` is the relative path to the site root. */
export function SiteFooter({ root }: { root: string }) {
  const { m } = useI18n();
  const f = m.footer;
  return (
    <footer className="border-t border-ink">
      <div className={`${wrap} py-12 md:py-16`}>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">{f.madeBy}</p>
        <div className={`mt-6 grid items-start gap-5 ${SHOW_PHOTO ? 'grid-cols-[4.5rem_minmax(0,1fr)] md:grid-cols-[6rem_minmax(0,1fr)] md:gap-8' : ''}`}>
          {SHOW_PHOTO && <Portrait photo={`${root}images/daniele.jpg`} name={NAME} alt={f.photoAlt} className="aspect-square w-full" />}
          <div className="min-w-0">
            <p className="font-title text-2xl leading-tight md:text-3xl">{NAME}</p>
            <p className="mt-2 max-w-[52ch] font-body text-lg leading-snug text-ink-soft">{f.bio}</p>
            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-1">
              <li>
                <a href={`mailto:${EMAIL}`} className={link}>
                  <Mail size={20} aria-hidden="true" />
                  <span className="sr-only">{f.email}: </span>
                  {EMAIL}
                </a>
              </li>
              <li>
                <a href={LINKEDIN} className={link} rel="noopener noreferrer" target="_blank">
                  <Linkedin size={20} aria-hidden="true" />
                  LinkedIn
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-rule">
        <div className={`${wrap} flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between`}>
          <Wordmark href={root} />
          <p className="font-body text-[15px] text-ink-soft">{m.home.footer}</p>
          <a href={GITHUB} className={link} rel="noopener noreferrer" target="_blank">
            <Github size={20} aria-hidden="true" />
            {m.home.source}
          </a>
        </div>
      </div>
    </footer>
  );
}
