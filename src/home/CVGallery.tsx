import { useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { CVCard } from '../app/components/CVCard';
import { levels, people, type Person } from '../app/cv/people';

/** First jobs, experienced and senior CVs taken in turn, so every stretch of the gallery shows a mix. */
const mixed: Person[] = (() => {
  const byLevel = levels.map((l) => people.filter((p) => p.level === l));
  const out: Person[] = [];
  for (let i = 0; out.length < people.length; i++) byLevel.forEach((list) => list[i] && out.push(list[i]));
  return out;
})();
import { useI18n } from '../app/i18n';

/** A row that drifts sideways forever. The list is drawn twice so the loop has no seam;
 *  the copy is hidden from screen readers and the keyboard. */
function Row({ items, reverse, paused }: { items: Person[]; reverse?: boolean; paused: boolean }) {
  return (
    <div
      className="gallery-row overflow-hidden"
      data-paused={paused || undefined}
      // Once the row stops for keyboard focus, bring the focused card into view.
      onFocus={(e) => requestAnimationFrame(() => e.target.scrollIntoView({ block: 'nearest', inline: 'nearest' }))}
    >
      {/* About 10s per card, so the drift keeps the same calm speed however many examples there are. */}
      <div className={`gallery-track flex w-max gap-4 ${reverse ? 'gallery-reverse' : ''}`} style={{ animationDuration: `${items.length * 10}s` }}>
        <ul className="flex gap-4">
          {items.map((p) => <li key={p.id} className="w-[19rem] shrink-0 sm:w-[21rem]"><CVCard person={p} root="./" /></li>)}
        </ul>
        <ul className="gallery-copy flex gap-4" aria-hidden="true">
          {items.map((p) => <li key={p.id} className="w-[19rem] shrink-0 sm:w-[21rem]"><CVCard person={p} root="./" copy /></li>)}
        </ul>
      </div>
    </div>
  );
}

/** Example CVs as a slow two-row gallery. Pauses on hover, on focus and with its button; still under reduced motion. */
export function CVGallery() {
  const { m } = useI18n();
  const [paused, setPaused] = useState(false);
  return (
    <div className="space-y-4">
      <div className="mx-auto flex max-w-6xl xl:max-w-none xl:px-12 justify-end px-4 sm:px-8">
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          className="gallery-toggle inline-flex h-9 items-center gap-2 rounded-sm border border-ink px-3 font-sans text-[13px] hover:bg-ink hover:text-paper"
        >
          {paused ? <Play size={20} aria-hidden="true" /> : <Pause size={20} aria-hidden="true" />}
          {paused ? m.gallery.play : m.gallery.pause}
        </button>
      </div>
      <Row items={mixed.filter((_, i) => i % 2 === 0)} paused={paused} />
      <Row items={mixed.filter((_, i) => i % 2 === 1)} reverse paused={paused} />
    </div>
  );
}
