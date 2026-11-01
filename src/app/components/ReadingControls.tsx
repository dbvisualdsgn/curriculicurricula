import { TypeSwitcher } from './TypeSwitcher';
import { LanguageSwitcher } from './LanguageSwitcher';
import { PaperControls } from './PaperControls';
import { useI18n } from '../i18n';

/** Fonts, language and appearance for the site pages: the same named buttons as the CV menu, on one line. */
export function ReadingControls() {
  const { m } = useI18n();
  return (
    <div className="flex flex-wrap items-center justify-center gap-1">
      <TypeSwitcher label={m.app.fonts} />
      <LanguageSwitcher />
      <PaperControls label={m.app.appearance} />
    </div>
  );
}
