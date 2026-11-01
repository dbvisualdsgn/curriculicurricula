import { initials } from '../cv/format';

interface PortraitProps {
  photo?: string;
  name: string;
  alt?: string;
  className?: string;
}

/** Square portrait, no rounding. The photo follows the appearance (grey, colour or duotone; see theme.css);
 *  without a photo, the initials are set large in the title font on black. */
export function Portrait({ photo, name, alt, className = '' }: PortraitProps) {
  if (photo) {
    return (
      <span className={`block overflow-hidden bg-paper ring-1 ring-inset ring-rule ${className}`}>
        <img
          src={photo}
          alt={alt ?? ''}
          className="portrait-img h-full w-full object-cover"
        />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`flex items-end bg-ink p-2 font-title leading-none tracking-[-0.04em] text-paper ${className}`}
    >
      {initials(name)}
    </span>
  );
}
