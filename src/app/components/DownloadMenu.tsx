import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { buildDesignedPdf } from '../cv/pdfDesigned';
import { saveFile } from '../cv/save';
import { fileSlug } from '../cv/format';
import { useI18n } from '../i18n';
import type { CVData } from '../cv/types';
import { currentFaces } from '../typography';

/** One download: the page as designed, with real selectable text. */
export function DownloadMenu({ cv, compact = false, onDownloaded }: { cv: CVData; compact?: boolean; onDownloaded?: () => void }) {
  const { m } = useI18n();
  const d = m.download;
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      const pdf = await buildDesignedPdf(cv, m, currentFaces());
      const outcome = await saveFile(`${fileSlug(cv.profile.name)}_CV.pdf`, pdf, 'application/pdf');
      if (outcome === 'saved') {
        toast.success(m.app.pdfSaved);
        onDownloaded?.();
      } else if (outcome === 'failed') toast.error(m.app.pdfError);
    } catch {
      toast.error(m.app.pdfError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={download}
      disabled={busy}
      aria-busy={busy}
      aria-label={d.title}
      className="inline-flex h-11 items-center gap-2 rounded-sm border border-ink bg-ink px-3 text-[13px] font-medium text-paper hover:opacity-90 active:translate-y-px disabled:opacity-60 md:h-9"
    >
      {busy ? <Loader2 size={20} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Download size={20} aria-hidden="true" />}
      {/* The one filled button in the CV menu. "PDF" where space is tight, the full label from lg. */}
      <span aria-hidden="true" className={compact ? '' : 'lg:hidden'}>PDF</span>
      <span className={compact ? 'hidden' : 'hidden whitespace-nowrap lg:inline'}>{d.title}</span>
    </button>
  );
}
