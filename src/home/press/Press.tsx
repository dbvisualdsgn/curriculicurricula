import { useEffect, useMemo, useRef, useState } from 'react';
import { useReveal } from '../../app/hooks/useReveal';
import { useI18n } from '../../app/i18n';
import { PRESS_SVG } from './pressFigure';
import './press.css';

/** Example CVs at every level, printed one after another with the same layout. */
const PEOPLE = [
  ['Amara Okafor', 'Registered Nurse'],
  ['Karim Benali', 'Delivery Rider'],
  ['Nadia Rahman', 'Chief Technology Officer'],
  ['Jean Moreau', 'Bus Driver'],
  ['Chloé Martin', 'Barista & Student'],
  ['Paolo Greco', 'Head Chef'],
  ['Paweł Nowak', 'Warehouse Operative'],
  ['Giulia Romano', 'Primary School Teacher'],
] as const;
const FIRST_COUNT = 1247;

/**
 * The homepage press: one sheet every 6s, the same CV layout with a new name, into the open catalogue.
 * Each loop the page writes the next name and the counter. A click (or Enter/Space) pauses it and starts it again.
 */
export function Press() {
  const { m } = useI18n();
  const ref = useReveal<HTMLDivElement>(0.2);
  const turn = useRef(0);
  const still = useMemo(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const svg = ref.current?.querySelector('svg');
    if (!svg) return;
    const name = svg.querySelector('[data-part="name"]');
    const role = svg.querySelector('[data-part="role"]');
    const count = svg.querySelector('[data-part="count"]');
    const sheet = svg.querySelector('.press-sheet');
    const show = () => {
      const [n, r] = PEOPLE[turn.current % PEOPLE.length];
      if (name) name.textContent = n;
      if (role) role.textContent = r;
      if (count) count.textContent = String(FIRST_COUNT + turn.current).padStart(5, '0');
    };
    show();
    const next = () => {
      turn.current += 1;
      show();
    };
    sheet?.addEventListener('animationiteration', next);
    return () => sheet?.removeEventListener('animationiteration', next);
  }, [ref]);

  const toggle = () => !still && setPaused((p) => !p);
  return (
    <div
      ref={ref}
      data-paused={paused || undefined}
      className={`press press-art iso iso-site mx-auto w-full max-w-[58rem] ${still ? '' : 'cursor-pointer'} focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus)]`}
      data-theme="light"
      role={still ? 'img' : 'button'}
      tabIndex={still ? undefined : 0}
      aria-pressed={still ? undefined : paused}
      aria-label={`${m.homeX.pressLabel}${still ? '' : ` ${paused ? m.homeX.heroPlay : m.homeX.heroPause}`}`}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      }}
      dangerouslySetInnerHTML={{ __html: PRESS_SVG }}
    />
  );
}
