const BASE = {
  width: 20,
  height: 20,
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
  focusable: 'false',
};

const GLYPHS = {
  email: (
    <>
      <rect x="2.25" y="4.25" width="15.5" height="11.5" rx="1.75" />
      <path d="M3 5.5l6.02 4.6a1.6 1.6 0 0 0 1.96 0L17 5.5" />
    </>
  ),
  whatsapp: (
    <>
      <path d="M17 9.6c0 3.35-2.98 6.07-6.65 6.07a7.2 7.2 0 0 1-2.53-.45L3.5 16.5l1.34-3.1A5.85 5.85 0 0 1 3.7 9.6c0-3.35 2.98-6.07 6.65-6.07S17 6.25 17 9.6Z" />
      <path d="M7.9 8.55h4.9M7.9 11.05h3.1" />
    </>
  ),
  linkedin: (
    <>
      <circle cx="6.6" cy="6.4" r="2.15" />
      <circle cx="14.1" cy="12.5" r="2.15" />
      <path d="M3.2 15.6c0-1.9 1.52-3.2 3.4-3.2.62 0 1.2.14 1.7.4" />
      <path d="M8.35 8.1l3.5 3.1" />
    </>
  ),
  note: (
    <>
      <path d="M4.5 3.75h7.4l4.1 4.05v8.45a1.5 1.5 0 0 1-1.5 1.5H4.5a1.5 1.5 0 0 1-1.5-1.5V5.25a1.5 1.5 0 0 1 1.5-1.5Z" />
      <path d="M11.6 3.9v3.9h4" />
      <path d="M6.3 11.1h7M6.3 13.7h4.6" />
    </>
  ),
  passage: (
    <>
      <path d="M8.3 5.4C6.2 6.3 5 8 5 10.1c0 1.7 1 2.9 2.5 2.9S10 11.9 10 10.5 9.1 8.2 7.9 8.2c-.3 0-.6 0-.8.2" />
      <path d="M16.3 5.4C14.2 6.3 13 8 13 10.1c0 1.7 1 2.9 2.5 2.9S18 11.9 18 10.5s-.9-2.3-2.1-2.3c-.3 0-.6 0-.8.2" />
    </>
  ),
};

export const ChannelIcon = ({ name, className = '' }) => {
  const glyph = GLYPHS[name];
  if (!glyph) return null;

  return (
    <svg {...BASE} className={`ogp-channel-icon ${className}`.trim()}>
      {glyph}
    </svg>
  );
};

export default ChannelIcon;
