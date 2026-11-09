import { BrandIcon } from './BrandIcon';
import { dateRange } from '../cv/format';
import type { Experience } from '../cv/types';

interface ExperienceCardProps extends Experience {
  index: number;
}

/** One role as a ruled entry, the same size as the education and certification rows: logo, title and dates on one line, then company and achievements. */
export function ExperienceCard({ title, company, location, employmentType, start, end, bullets, logo }: ExperienceCardProps) {
  const dates = dateRange(start, end);
  const items = bullets.filter((b) => b.trim());
  return (
    <article className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-4 border-t border-rule py-5 first:border-t-0 first:pt-1">
      {/* Company logo - full-frame tile */}
      <div className="mt-0.5 h-8 w-8 overflow-hidden rounded-sm ring-1 ring-inset ring-rule">
        <BrandIcon src={logo} name={company} fill />
      </div>

      <div className="min-w-0">
        <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-baseline sm:gap-6">
          <h3 className="font-title text-lg font-medium leading-snug">{title}</h3>
          {dates && <span className="whitespace-nowrap font-mono text-[12px] text-ink-soft">{dates}</span>}
        </div>
        <p className="mt-1 font-sans text-[14px] text-ink-soft">
          {[company, location, employmentType].filter(Boolean).join(' · ')}
        </p>

        {items.length > 0 && (
          <ul className="mt-3 space-y-1.5 text-[16px] leading-relaxed">
            {items.map((b, i) => (
              <li key={i} className="grid grid-cols-[1rem_minmax(0,1fr)]">
                <span aria-hidden="true" className="text-ink-soft">–</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
