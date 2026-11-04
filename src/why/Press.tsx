import { useEffect, useRef } from 'react';
import { useReveal } from '../app/hooks/useReveal';
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
 * The press: one sheet every 6s, the same CV layout with a new name, into the open catalogue.
 * Decorative (the heading says what it shows). Each loop the page writes the next name and the counter.
 */
export function Press({ paused }: { paused: boolean }) {
  const ref = useReveal<HTMLDivElement>(0.25);
  const turn = useRef(0);

  useEffect(() => {
    const root = ref.current;
    const svg = root?.querySelector('svg');
    if (!root || !svg) return;
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

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-paused={paused || undefined}
      className="press press-art iso iso-site mx-auto w-full max-w-[64rem]"
      data-theme="light"
      dangerouslySetInnerHTML={{ __html: PRESS_SVG }}
    />
  );
}
