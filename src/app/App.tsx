import { TypeSwitcher } from './components/TypeSwitcher';
import { PaperControls } from './components/PaperControls';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Mail, Share2, Phone, MapPin, Linkedin, PencilLine, Eye, Globe, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { TooltipProvider } from './components/ui/tooltip';
import { ToolBadge } from './components/ToolBadge';
import { ExperienceCard } from './components/ExperienceCard';
import { CertificationCard } from './components/CertificationCard';
import { Wordmark } from './components/Wordmark';
import { PrintCV } from './components/PrintCV';
import { CVEditor, sectionTab, type EditorTab } from './components/editor/CVEditor';
import { runAtsCheck, type Finding } from './cv/atsCheck';
import { useJobAd } from './cv/jobAd';
import { hasSavedCV, useLibrary } from './cv/library';
import { LibraryMenu } from './components/LibraryMenu';
import { avatarOf, displayUrl, hrefUrl, toJsonLd } from './cv/format';
import { DownloadMenu } from './components/DownloadMenu';
import { AtsSummary } from './components/AtsSummary';
import { DeleteCVDialog } from './components/DeleteCVDialog';
import { AtsPanel } from './components/editor/AtsPanel';
import { JobAdCard } from './components/JobAdCard';
import { BeyondNote, beyondNoteWanted } from './components/BeyondNote';
import { Portrait } from './components/Portrait';
import { findPerson } from './cv/people';
import { useReveal } from './hooks/useReveal';
import { clearShareHash, readSharedCV } from './cv/share';
import { blankCV } from './cv/defaultCV';
import { ShareDialog } from './components/ShareDialog';
import type { CVData } from './cv/types';
import { I18nProvider, fmt, useI18n } from './i18n';
import { setPaper, usePaper } from './paper';
import { setFaces, useTypeFaces } from './typography';

// Read before the first render, because the library saves the sample as soon as it mounts.
const hadSavedCV = hasSavedCV();

// CV menu buttons: icon, with a label from md up; 44px on phones. Pressed = ink fill (the shared button states).
const toolBtn =
  'inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-sm px-2 text-[13px] text-ink hover:bg-zinc-100 disabled:opacity-60 aria-pressed:bg-ink aria-pressed:text-paper md:h-9 md:min-w-9';
const toolLabel = 'hidden whitespace-nowrap md:inline';

export default function App() {
  return (
    <I18nProvider>
      <TooltipProvider>
        <CVPage />
      </TooltipProvider>
    </I18nProvider>
  );
}

/** A CV section that rises in once when scrolled into view. */
function RevealSection({ children, className = '', ...rest }: React.ComponentProps<'section'>) {
  const ref = useReveal<HTMLElement>(0.15);
  return (
    <section ref={ref} className={`reveal ${className}`} {...rest}>
      {children}
    </section>
  );
}

/** Swiss-style section opener: hairline rule and a small mono title. */
function SectionHead({ id, title }: { id: string; title: string }) {
  return (
    <div className="mb-5 border-t border-ink pt-3">
      <h2 id={id} className="font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-ink">{title}</h2>
    </div>
  );
}

/** ATS score as a monochrome mark: dashed (needs work), outlined (good), filled (strong).
 *  On a pressed (ink) button it is drawn in paper, so the score stays readable. An empty CV scores 0. */
function ScoreMark({ score, onInk = false }: { score: number; onInk?: boolean }) {
  const tone = onInk
    ? score >= 85 ? 'bg-paper text-ink border-paper' : score >= 65 ? 'border-paper text-paper' : 'border-dashed border-paper text-paper'
    : score >= 85 ? 'bg-ink text-paper border-ink' : score >= 65 ? 'border-ink text-ink' : 'border-dashed border-ink text-ink';
  return (
    <span className={`inline-flex min-w-8 justify-center rounded-sm border px-1 py-0.5 font-mono text-[11px] font-semibold tabular-nums leading-none ${tone}`} aria-hidden="true">
      {score}
    </span>
  );
}

function CVPage() {
  const { cv: ownCV, setCV, update, items, activeId, versionName, create, duplicate, rename, select, remove } = useLibrary();
  const pdfRef = useRef<HTMLInputElement>(null);
  const { m, locale } = useI18n();
  // A CV opened from a share link (#cv=…) is shown read-only and never overwrites the visitor's own CV.
  const [sharedCV, setSharedCV] = useState<CVData | null>(null);
  const [banner, setBanner] = useState<'shared' | 'directory'>('shared');
  const cv = sharedCV ?? ownCV;

  // Each CV keeps the look it was edited in (appearance and typefaces). Opening a CV, from My CVs or a link,
  // applies its look; changing the look while your own CV is open saves it into that CV.
  const [paperSettings] = usePaper();
  const typeFaces = useTypeFaces();
  const styleKey = sharedCV ? `shared:${sharedCV.profile.name}` : activeId;
  const styleReady = useRef<string | null>(null);
  useEffect(() => {
    const saved = cv.style;
    if (saved) {
      setPaper(saved.paper);
      setFaces(saved.faces);
    }
    styleReady.current = saved ? `wait:${styleKey}` : styleKey;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleKey]);
  useEffect(() => {
    const style = { paper: paperSettings, faces: typeFaces };
    // Wait until the opened CV's own look is on the page before saving anything into it.
    if (styleReady.current === `wait:${styleKey}`) {
      if (JSON.stringify(cv.style) === JSON.stringify(style)) styleReady.current = styleKey;
      return;
    }
    if (sharedCV || styleReady.current !== styleKey) return;
    if (JSON.stringify(ownCV.style) !== JSON.stringify(style)) update((d) => ({ ...d, style }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paperSettings, typeFaces, styleKey]);
  const [shareOpen, setShareOpen] = useState(false);
  // A first visit (nothing saved, no shared or example CV in the URL) opens the editor: there is nothing to read yet.
  const [editing, setEditing] = useState(() => !hadSavedCV && !/[?&]person=/.test(window.location.search) && !window.location.hash.includes('cv='));
  const [editorTab, setEditorTab] = useState<EditorTab>('profile');

  useEffect(() => {
    const load = () =>
      readSharedCV(window.location.hash)
        // No #cv= in the URL: leave any CV already on screen (e.g. the example) alone.
        .then((shared) => shared && setSharedCV(shared))
        .catch(() => {
          setSharedCV(null);
          toast.error(m.shared.loadError);
        });
    load();
    window.addEventListener('hashchange', load);
    return () => window.removeEventListener('hashchange', load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const leaveShared = (next: CVData, openEditor: boolean) => {
    // Editing a copy or starting fresh adds a CV to the library; nothing the visitor had is overwritten.
    create(structuredClone(next));
    setSharedCV(null);
    setBanner('shared');
    clearShareHash();
    if (openEditor) {
      setEditorTab('profile');
      setEditing(true);
    }
  };

  const importPdfFile = async (file: File | undefined) => {
    if (!file) return;
    const id = toast.loading(m.library.pdfReading);
    try {
      const { importPdf } = await import('./cv/importPdf');
      const { cv: imported, exact } = await importPdf(file);
      create(imported);
      setSharedCV(null);
      clearShareHash();
      setEditorTab('profile');
      setEditing(true);
      toast.success(exact ? m.library.pdfExact : m.library.pdfDone, { id });
    } catch (err) {
      toast.error((err as { code?: string })?.code === 'no-text' ? m.library.pdfNoText : m.library.pdfError, { id });
    }
  };
  // Links from the old public CV server (?id=…) no longer open anything: say so instead of showing another CV.
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('id')) return;
    toast.error(m.shared.loadError);
    history.replaceState(null, '', `${window.location.pathname}${window.location.hash}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Entry points: ?new=1 (start writing) and ?person= (an example CV). Old ?example=1 links go to people/ (see app/index.html).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('new') && !params.has('person')) return;
    const person = params.get('person') && findPerson(params.get('person')!);
    if (person) {
      setSharedCV(structuredClone(person.cv));
      setBanner('directory');
      // A portrait ships as a file; the CV keeps images as data URLs, so read it in (the PDF needs it too).
      if (person.photo) {
        fetch(`../${person.photo}`)
          .then((r) => (r.ok ? r.blob() : Promise.reject(r.status)))
          .then((b) => new Promise<string>((done) => { const fr = new FileReader(); fr.onload = () => done(String(fr.result)); fr.readAsDataURL(b); }))
          .then((photo) => setSharedCV((c) => (c ? { ...c, profile: { ...c.profile, photo, avatar: 'photo' } } : c)))
          .catch(() => {});
      }
    }
    if (params.has('new')) {
      // First visit: the starting CV is replaced by a blank one. Returning visitor: add a new blank CV unless the open one is empty.
      if (!hadSavedCV) setCV(structuredClone(blankCV));
      else if (ownCV.profile.name || ownCV.experience.length) create(structuredClone(blankCV));
      setEditorTab('profile');
      setEditing(true);
    }
    history.replaceState(null, '', `${window.location.pathname}${window.location.hash}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The job ad belongs to the person, so its title only counts for their own CV.
  const jobAd = useJobAd();
  const targetTitle = sharedCV ? undefined : jobAd.title;
  const atsScore = useMemo(() => runAtsCheck(cv, locale, { targetTitle }).score, [cv, locale, targetTitle]);
  // The recruiter check sits above the CV only while it is switched on in the CV menu.
  const [checkOpen, setCheckOpen] = useState(false);
  const [fullCheck, setFullCheck] = useState(false);
  const [jobAdRequest, setJobAdRequest] = useState(0);
  const [beyondOpen, setBeyondOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [jobAdOpen, setJobAdOpen] = useState(false);
  const openJobAd = () => {
    setJobAdOpen(true);
    setJobAdRequest((n) => n + 1);
  };
  const openSection = (section: Finding['section']) => {
    setEditorTab(sectionTab[section]);
    setEditing(true);
  };
  const deleteOwn = async () => {
    remove(activeId);
    return true;
  };
  const { profile } = cv;
  const avatar = avatarOf(profile);
  const bannerText = banner === 'directory' ? m.directory.banner : m.shared.banner;
  const name = profile.name || m.app.namePlaceholder;
  const headline = profile.headline || m.app.headlinePlaceholder;

  // Document title doubles as the default PDF file name when printing.
  useEffect(() => {
    document.title = [profile.name, profile.headline, m.app.cvTitle].filter(Boolean).join(' - ');
  }, [profile.name, profile.headline, m.app.cvTitle]);

  // Structured data so AI tools and search engines can parse the CV reliably.
  useEffect(() => {
    let el = document.getElementById('cv-jsonld') as HTMLScriptElement | null;
    if (!el) {
      el = document.createElement('script');
      el.type = 'application/ld+json';
      el.id = 'cv-jsonld';
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(toJsonLd(cv));
  }, [cv]);

  const contacts = [
    profile.email && { icon: Mail, kind: m.contact.email, label: profile.email, href: `mailto:${profile.email}` },
    profile.phone && { icon: Phone, kind: m.contact.phone, label: profile.phone, href: `tel:${profile.phone.replace(/[^\d+]/g, '')}` },
    profile.location && { icon: MapPin, kind: m.contact.location, label: profile.location },
    profile.linkedin && { icon: Linkedin, kind: m.contact.linkedin, label: displayUrl(profile.linkedin), href: hrefUrl(profile.linkedin) },
    profile.website && { icon: Globe, kind: m.contact.website, label: displayUrl(profile.website), href: hrefUrl(profile.website) },
  ].filter(Boolean) as { icon: LucideIcon; kind: string; label: string; href?: string }[];

  return (
    <div className="min-h-screen bg-paper text-ink print:bg-white print:min-h-0">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[100] focus:rounded-sm focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-paper print:hidden"
      >
        {m.app.skipToContent}
      </a>
      <Toaster className="print:hidden" toastOptions={{ className: 'rounded-sm border-ink bg-paper text-ink' }} />

      <style>{`
        @media print {
          @page { margin: 14mm 16mm; }
          body { background: white !important; }
        }
      `}</style>

      {/* ATS-friendly single-column version, shown only when printing / saving as PDF */}
      <PrintCV cv={cv} />

      <div className={`print:hidden ${editing ? 'lg:pl-[480px]' : ''}`}>
        <header className="sticky top-0 z-40 w-full border-b border-rule bg-paper">
          {/* Row 1: the site. Row 2: everything you can do with this CV. */}
          <nav aria-label={m.app.home} className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-1">
              <Wordmark href="../" />
              {!sharedCV && (
                <LibraryMenu
                  items={items}
                  activeId={activeId}
                  compact={editing}
                  onSelect={(id) => select(id)}
                  onNew={() => {
                    create();
                    setEditorTab('profile');
                    setEditing(true);
                    toast.success(m.library.created);
                  }}
                  onImportPdf={() => pdfRef.current?.click()}
                />
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <LanguageSwitcher />
              <a href="../people/" className="inline-flex h-11 shrink-0 items-center rounded-sm px-2 text-[13px] text-ink hover:bg-zinc-100 md:h-9">
                {m.directory.nav}
              </a>
            </div>
          </nav>
          {/* Two blocks: every tool that changes the CV or how it looks, then who gets it. Download is the one filled button. */}
          <div role="group" aria-label={m.app.cvActions} className="border-t border-rule">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-3 py-1.5 sm:px-6">
              <div role="group" aria-label={m.app.editTools} className="flex flex-wrap items-center gap-0.5 rounded-sm border border-rule p-0.5">
                {!sharedCV && (
                  <>
                    <button type="button" onClick={() => setEditing((on) => !on)} aria-pressed={editing} className={toolBtn}>
                      <PencilLine size={20} aria-hidden="true" />
                      <span className="whitespace-nowrap md:hidden">{m.app.editShort}</span>
                      <span className={toolLabel}>{m.app.edit}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckOpen((on) => !on)}
                      aria-pressed={checkOpen}
                      aria-label={`${m.atsCard.title}: ${atsScore}/100`}
                      title={`${m.atsCard.title}: ${atsScore}/100`}
                      className={toolBtn}
                    >
                      <ScoreMark score={atsScore} onInk={checkOpen} />
                      <span className={toolLabel}>{m.atsCard.title}</span>
                    </button>
                  </>
                )}
                <TypeSwitcher label={m.app.fonts} />
                <PaperControls label={m.app.appearance} />
                {!sharedCV && (
                  <button type="button" onClick={() => setDeleteOpen(true)} aria-label={m.library.delete} title={m.library.delete} className={toolBtn}>
                    <Trash2 size={20} aria-hidden="true" />
                    <span className={toolLabel}>{m.app.remove}</span>
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShareOpen(true)}
                  aria-label={m.app.share}
                  className="inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-sm border border-ink px-3 text-[13px] text-ink hover:bg-ink hover:text-paper md:h-9"
                >
                  <Share2 size={20} aria-hidden="true" />
                  <span className={toolLabel} aria-hidden="true">{m.app.share}</span>
                </button>
                <DownloadMenu cv={cv} compact={editing} onDownloaded={() => beyondNoteWanted() && setBeyondOpen(true)} />
              </div>
            </div>
          </div>
          {/* A live region that is always there, so the note is announced when it appears. */}
          <div role="status">{beyondOpen && <BeyondNote onClose={() => setBeyondOpen(false)} />}</div>
        </header>

        {sharedCV && (
          <div role="region" aria-label={bannerText} className="bg-ink text-paper">
            <div className="mx-auto flex max-w-4xl flex-col justify-between gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-6">
              <p className="flex items-center gap-2 text-sm">
                <Eye size={20} aria-hidden="true" className="shrink-0" />
                {bannerText}
              </p>
              <div className="flex gap-2">
                <button type="button" className="h-8 rounded-sm border border-paper px-3 text-xs hover:bg-paper hover:text-ink" onClick={() => leaveShared(sharedCV, true)}>
                  {m.shared.makeCopy}
                </button>
                <button type="button" className="h-8 rounded-sm bg-paper px-3 text-xs text-ink hover:opacity-90" onClick={() => leaveShared(blankCV, true)}>
                  {m.shared.createOwn}
                </button>
              </div>
            </div>
          </div>
        )}

        {!sharedCV && checkOpen && (
          <aside aria-label={m.atsCard.title} className="mx-auto max-w-5xl px-3 pt-6 sm:px-6 md:pt-8">
            <AtsSummary cv={cv} targetTitle={targetTitle} onOpen={openSection} fullOpen={fullCheck} onToggleFull={() => setFullCheck((on) => !on)} />
            {fullCheck && (
              <div id="ats-full" className="border border-t-0 border-ink bg-paper p-5 md:p-7">
                <AtsPanel cv={ownCV} onJump={openSection} />
              </div>
            )}
            <JobAdCard
              cv={ownCV}
              open={jobAdOpen}
              onOpen={openJobAd}
              focusRequest={jobAdRequest}
              onSetHeadline={(headline) => update((d) => ({ ...d, profile: { ...d.profile, headline } }))}
              onAddSkill={(skill) =>
                update((d) => (d.skills.some((k) => k.toLowerCase() === skill.toLowerCase()) ? d : { ...d, skills: [...d.skills, skill] }))
              }
            />
          </aside>
        )}

        <main
          id="main"
          tabIndex={-1}
          className="mx-auto max-w-5xl px-3 py-6 font-body focus:outline-none sm:px-6 md:py-12 print:p-0"
        >
          {/* The sheet: one page on the desk, in the paper the person chose (no fill of its own). */}
          <div className="space-y-10 border border-rule bg-sheet px-5 py-8 shadow-[0_1px_0_var(--rule),0_12px_32px_-18px_rgb(0_0_0/0.25)] sm:px-10 md:space-y-12 md:px-14 md:py-14 print:space-y-8 print:border-0 print:bg-transparent print:p-0 print:shadow-none">
          <div className="grid items-start gap-5 sm:grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)] sm:items-center sm:gap-7 md:grid-cols-[minmax(0,9rem)_minmax(0,1fr)] md:gap-8">
            {avatar !== 'none' && (
              <Portrait
                photo={avatar === 'photo' ? profile.photo : undefined}
                name={name}
                alt={fmt(m.photo.alt, { name })}
                className="aspect-square w-24 text-[2.5rem] sm:w-full md:text-[3.25rem]"
              />
            )}
            <div className={`min-w-0 ${avatar === 'none' ? 'sm:col-span-2' : ''}`}>
                <h1 className="font-title text-[clamp(2rem,4.6vw,3.25rem)] hyphens-auto [overflow-wrap:anywhere] font-normal leading-[0.92] tracking-[-0.035em]">{name}</h1>
                {/* The job title is set in the text face, not the title face: a second voice that can run long and still read. */}
                <p className="mt-2 max-w-[36ch] text-balance font-body text-[clamp(1.125rem,2vw,1.5rem)] leading-[1.2] tracking-[-0.01em] text-ink">{headline}</p>
            <address className="mt-4 not-italic">
              <ul className="flex flex-wrap gap-x-5 gap-y-1.5 font-sans text-[14px] text-ink-soft">
                {contacts.map(({ icon: Icon, kind, label, href }) => {
                  const content = (
                    <>
                      <Icon size={16} aria-hidden="true" className="shrink-0" />
                      <span className="sr-only">{kind}: </span>
                      <span className="break-all">{label}</span>
                    </>
                  );
                  return (
                    <li key={kind}>
                      {href ? (
                        <a
                          href={href}
                          target={href.startsWith('http') ? '_blank' : undefined}
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-sm underline decoration-rule underline-offset-4 hover:text-ink hover:decoration-ink"
                        >
                          {content}
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-2">{content}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </address>
            </div>
          </div>

          {/* The summary reads straight on from the header: no rule, no label, it is the person's own voice. */}
          {cv.summary.trim() && (
            <section aria-label={m.sections.summary} className="-mt-2 md:-mt-4">
              <p className="max-w-[64ch] whitespace-pre-line text-lg leading-relaxed">{cv.summary}</p>
            </section>
          )}


          {(cv.skills.length > 0 || cv.tools.length > 0) && (
            // Two columns that each open with their own rule and title, so Skills needs no extra heading row.
            <RevealSection aria-label={m.sections.skills} className="grid gap-10 md:grid-cols-2 md:gap-x-10">
              {cv.skills.length > 0 && (
                <div className={cv.tools.length === 0 ? 'md:col-span-2' : ''}>
                  <SectionHead id="skills-heading" title={m.sections.coreSkills} />
                  <ul className="flex flex-wrap gap-2 text-[15px]">
                    {cv.skills.map((s) => (
                      <li key={s} className="rounded-sm border border-ink px-2.5 py-1">{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {cv.tools.length > 0 && (
                <div className={cv.skills.length === 0 ? 'md:col-span-2' : ''}>
                  <SectionHead id="tools-heading" title={m.sections.tools} />
                  <ul className="flex flex-wrap gap-2">
                    {cv.tools.map((tool) => (
                      <ToolBadge key={tool.id} icon={tool.icon} name={tool.name} description={tool.description} />
                    ))}
                  </ul>
                </div>
              )}
            </RevealSection>
          )}

          <RevealSection aria-labelledby="experience-heading">
            <SectionHead id="experience-heading" title={m.sections.experience} />
            <div className="border-b border-rule">
              {cv.experience.map((exp, index) => (
                <ExperienceCard key={exp.id} {...exp} index={index} />
              ))}
            </div>
            {cv.experience.length === 0 && (
              <button
                type="button"
                onClick={() => {
                  setEditorTab('experience');
                  setEditing(true);
                }}
                className="w-full rounded-sm border border-dashed border-ink p-8 font-sans text-sm hover:bg-zinc-100"
              >
                {m.app.addFirstRole}
              </button>
            )}
          </RevealSection>

          {cv.education.length > 0 && (
            <RevealSection aria-labelledby="education-heading">
              <SectionHead id="education-heading" title={m.sections.education} />
              <ul className="border-b border-rule">
                {cv.education.map((e, index) => (
                  <CertificationCard
                    key={e.id}
                    title={e.degree}
                    description={[e.location, e.details].filter(Boolean).join(' · ')}
                    institution={e.school}
                    year={[e.start, e.end].filter(Boolean).join(' – ')}
                    index={index}
                    icon="education"
                  />
                ))}
              </ul>
            </RevealSection>
          )}

          {cv.certifications.length > 0 && (
            <RevealSection aria-labelledby="certifications-heading">
              <SectionHead id="certifications-heading" title={m.sections.certifications} />
              <ul className="border-b border-rule">
                {cv.certifications.map((cert, index) => (
                  <CertificationCard
                    key={cert.id}
                    title={cert.title}
                    description={cert.description}
                    institution={cert.issuer}
                    year={cert.year}
                    index={index}
                  />
                ))}
              </ul>
            </RevealSection>
          )}

          {cv.languages.length > 0 && (
            <RevealSection aria-labelledby="languages-heading">
              <SectionHead id="languages-heading" title={m.sections.languages} />
              <dl className="grid grid-cols-1 border-l border-t border-rule sm:grid-cols-3">
                {cv.languages.map((l) => (
                  <div key={l.id} className="border-b border-r border-rule px-4 py-4">
                    <dt className="font-title text-xl">{l.name}</dt>
                    <dd className="mt-1 font-mono text-[12px] uppercase tracking-[0.1em] text-ink-soft">{l.level}</dd>
                  </div>
                ))}
              </dl>
            </RevealSection>
          )}
          </div>
        </main>

        <footer className="border-t border-ink">
          <div className="mx-auto flex max-w-4xl flex-col justify-between gap-4 px-4 py-10 text-sm text-ink-soft sm:flex-row sm:items-center sm:px-6">
            <Wordmark href="../" />
            <p>© {new Date().getFullYear()} {name}</p>
            {profile.email && (
              <a href={`mailto:${profile.email}`} className="rounded-sm underline underline-offset-4 hover:text-ink">{m.app.contact}</a>
            )}
          </div>
        </footer>
      </div>

      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} cv={cv} own={!sharedCV} />
      {!sharedCV && <DeleteCVDialog open={deleteOpen} onOpenChange={setDeleteOpen} name={ownCV.profile.name} onDelete={deleteOwn} />}
      <CVEditor
        open={editing && !sharedCV}
        onOpenChange={setEditing}
        cv={ownCV}
        update={update}
        versionName={versionName}
        onRenameVersion={rename}
        onSaveVersion={(name) => duplicate(name)}
        tab={editorTab}
        onTabChange={setEditorTab}
        onImportPdf={() => pdfRef.current?.click()}
      />
      <input
        ref={pdfRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(ev) => {
          importPdfFile(ev.target.files?.[0]);
          ev.target.value = '';
        }}
      />
    </div>
  );
}
