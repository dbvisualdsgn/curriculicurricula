# curriculi curricula

A quick, calm way to write your CV. An editable, accessible online CV with official tool logos, an ATS-friendly PDF export and a built-in recruiter check,
available in English (default), Italian, French, Spanish, German, Portuguese and Dutch.
The original design is available at https://www.figma.com/design/68PhbcZDT2IDB8ndJuw2h6/Recreate-CV.

## Pages

- `/` is the homepage (`index.html` → `src/home/`): claim and desk hero, how it works (the recruiter check and job-ad
  tips appear only as extras), private or shared, example CVs, quick answers.
- `/app/` is the CV tool (`app/index.html` → `src/app/`). `app/?new=1` starts writing and `app/?person=<id>` opens an example CV.
  Old `app/?example=1` links go to `/people/`. `app/#cv=…` opens a shared CV, read-only.
- `/people/` lists example CVs (`people/index.html` → `src/people/`), filtered by level (first job, experienced, senior and lead)
  and by field. The 34 profiles in `src/app/cv/people.ts` are fictional: from waiter, rider and student to head chef and CTO.
- `/why/` explains why the project exists (`why/index.html` → `src/why/`): a CV should be a standard format, not a
  design project. Then one person's passport, driving licence and CV, animated (paused by a button, still under
  reduced motion), what it does and doesn't do, your data, and who it's for.
- Every site page ends with `SiteFooter`: a short CV of its maker (black-and-white photo in `public/images/`, one line,
  email, LinkedIn).

**My CVs:** keep several CVs in the same browser (`src/app/cv/library.ts`). Switch, create and delete them from the
"My CVs" menu and the editor. An older single CV is migrated automatically.

**Import from PDF:** PDFs downloaded here carry the full CV in their XMP metadata (invisible to readers and ATS), so
importing one restores it exactly, photo and logos included. Any other PDF with selectable text is read with pdf.js and
split into sections using multilingual headings, month names and date ranges (`src/app/cv/importPdf.ts`). It reads
two-column layouts column by column and letter-spaced headings ("P R O F I L E"); `importPdf.test.ts` checks this on
the PDFs in `src/app/cv/__fixtures__`. Check the result in the editor; scanned PDFs without text can't be read.

**Share:** a CV stays in the browser. **Share** makes a link that carries the whole CV inside it (`src/app/cv/share.ts`),
so nothing is stored online.

**Downloads:** "As on the page" builds a PDF with the same layout, embedded fonts (`public/fonts`: Switzer and Gambetta by the Indian Type Foundry via Fontshare, IBM Plex Mono under the SIL OFL), logos and
photo. "ATS plain" builds the one-column, text-only version for job portals.

The brand and tokens are documented in [DESIGN.md](DESIGN.md).

## Running the code

Run `npm i` to install the dependencies, then `npm run dev` to start the development server.

## Make it your own

1. Click **Edit CV**. Every section is editable, and changes save automatically in your browser.
2. Use **New CV** for another empty CV. The example CVs live on `/people/`.
3. **Import from PDF** fills every section from a CV you already have, including LinkedIn's "Save to PDF".
   A PDF downloaded here comes back exactly.

### Tool and company logos

Type a tool or company name and its official logo is added automatically. Click a logo to search more than
4,400 brands or upload your own. Logos come from the Iconify "logos" set and Simple Icons (both CC0).
`npm run icons` regenerates `src/app/cv/brandIcons.ts` and `src/app/cv/icon-catalog/` after updating either package.

## Sharing

Every CV lives only in your browser's storage. Nobody else can open it until you share it.

**Share** builds one link (`…/app/#cv=…`) that carries the whole CV inside it: the CV is compressed (deflate),
encoded (base64url) and put in the URL fragment, which browsers never send to a server. Nothing is stored online,
and there is no backend.

- The link shows the CV as it was when you copied it. After an edit, share a new link.
- Whoever opens it reads the CV read-only, and can edit a copy in their own browser.
- A photo makes the link long (around 50 KB). Some chat and mail apps cut long links; the dialog says so, and
  the PDF is always there instead.
- A link can't be withdrawn: anyone who has it keeps the CV it carries.

Links from the old public CV server (`app/?id=…`) no longer open a CV.

### Renaming the GitHub repository

The repository is still called `Careerpath`, so the site lives at `dbvisualdsgn.github.io/Careerpath/`. It can be
renamed in the repository's **Settings → General**. Renaming changes the GitHub Pages URL, so share links people
already sent (which point at the old address) would stop opening. Only the storage keys `careerpath.cv.v1` and
`careerpath.jd.v1` keep the old name on purpose: saved CVs live under them.

## Languages

Pick a language from the header (English is the default). It translates the interface, the CV section headings
(on screen and in the PDF) and the ATS advice, and sets the page `lang` attribute.
Strings live in `src/app/i18n/`. Add a locale by copying `en.ts` and registering it in `src/app/i18n/index.tsx`.
Wording checks (action verbs, tense, clichés) run for English only.

## Accessibility

Built and tested against WCAG 2.2 AA with axe-core (0 violations in light, dark, editor and translated views):
skip link, landmarks and a logical heading order, labelled controls with linked hints, visible focus
outlines, AA colour contrast in both themes, decorative icons hidden from screen readers, a native language
selector, and animations that respect "reduce motion".

## Built for recruiters and hiring software

- **Download PDF** builds a single-column, text-only PDF in the browser (jsPDF, Helvetica). It has standard section
  headings, contact details in the body, real selectable text, no icons, tables or columns, and title/author/keyword
  metadata. Printing the page (Ctrl+P) uses the same single-column layout.
- The page title becomes the PDF file name: `Name - Headline - CV`.
- Experience uses separate start/end dates and achievement bullets. Skills and tools are plain-text keywords.
- schema.org `Person` JSON-LD is embedded so AI tools can read the CV.
- **Recruiter check** (from the CV menu) scores the CV out of 100 and lists fixes, each with the points it adds:
  contact details, numbers in bullets, months on dates, a strong latest role, length, and more. The points add
  up to exactly 100, so an empty CV scores 0; they are documented at the top of `src/app/cv/atsCheck.ts`.
  Writing advice (weak openers, tense, clichés) is shown but not scored.
- **Paste a job ad** (its own frame under the check) shows the ad's job title, whether your headline matches it,
  and which keywords are missing, matched as whole words in 7 languages.

## Credits

Typefaces: **Switzer** and **Gambetta** by the [Indian Type Foundry](https://www.indiantypefoundry.com), from
[Fontshare](https://www.fontshare.com) (ITF Free Font License); **IBM Plex Mono** (SIL Open Font License).
Title fonts: 78 families from Fontshare, each under its own license (ITF Free Font License or SIL OFL), with
designers listed in `public/fonts/titles/CREDITS.txt`.
Logos: Iconify "logos" set and Simple Icons (CC0).
