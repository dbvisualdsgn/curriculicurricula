import { useEffect, useId, useRef, useState } from 'react';
import { Check, Copy, ExternalLink, Loader2, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { DownloadMenu } from './DownloadMenu';
import { shareLink } from '../cv/share';
import { useI18n } from '../i18n';
import type { CVData } from '../cv/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cv: CVData;
  /** The person's own CV (true) or one they are reading (false): only the wording changes. */
  own: boolean;
}

/** Past this length some chat and mail apps cut links short (a photo makes the link long). */
const LONG_LINK = 8000;

/** A read-only field with a copy button (falls back to selecting the text when the clipboard is blocked). */
function CopyField({ label, value, copyLabel }: { label: string; value: string; copyLabel: string }) {
  const { m } = useI18n();
  const id = useId();
  const ref = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(m.share.copied);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      ref.current?.focus();
      ref.current?.select();
    }
  };
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium">{label}</label>
      <div className="flex items-start gap-2">
        <Input id={id} ref={ref} readOnly value={value} onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
        <Button type="button" onClick={copy} className="shrink-0 gap-1.5">
          {copied ? <Check size={20} aria-hidden="true" /> : <Copy size={20} aria-hidden="true" />}
          {copied ? m.share.copied : copyLabel}
        </Button>
      </div>
    </div>
  );
}

/** Share: one link that carries the CV inside it. Nothing is stored online. */
export function ShareDialog({ open, onOpenChange, cv, own }: Props) {
  const { m } = useI18n();
  const s = m.share;
  const [url, setUrl] = useState<string | null>(null);

  // The link is built from the CV as it is when the dialog opens.
  useEffect(() => {
    if (!open) return;
    let live = true;
    setUrl(null);
    shareLink(cv).then((u) => live && setUrl(u), () => live && toast.error(s.failed));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const nativeShare = (link: string) =>
    navigator.share({ title: `${cv.profile.name} - ${m.app.cvTitle}`, text: `${cv.profile.name} - ${cv.profile.headline}`, url: link }).catch(() => undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-sm border-ink bg-paper text-ink sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-title text-2xl">{s.title}</DialogTitle>
          <DialogDescription className="text-ink-soft">{own ? s.description : s.viewingDescription}</DialogDescription>
        </DialogHeader>
        {url ? (
          <div className="space-y-4">
            <CopyField label={s.linkLabel} value={url} copyLabel={s.copy} />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" className="gap-1.5" asChild>
                <a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink size={20} aria-hidden="true" /> {s.open}</a>
              </Button>
              {canNativeShare && (
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => nativeShare(url)}>
                  <Share2 size={20} aria-hidden="true" /> {s.nativeShare}
                </Button>
              )}
            </div>
            {url.length > LONG_LINK && <p className="border-l-2 border-ink pl-3 text-[13px] leading-snug text-ink-soft">{s.longLink}</p>}
          </div>
        ) : (
          <p className="flex items-center gap-2 text-[13px] text-ink-soft" role="status">
            <Loader2 size={20} aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
            {s.making}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4">
          <DownloadMenu cv={cv} />
          {own && <p className="max-w-[30ch] text-xs text-ink-soft">{s.snapshot}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
