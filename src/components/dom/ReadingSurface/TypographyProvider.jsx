/**
 * The 7 × 9 reading panel — "Immersive Reading Layout — 7 × 9" (master §3.4.1, §8.4.1).
 *
 * One centred column emulating a 7:9 page proportion, letterboxed in the ambient scene on
 * desktop; full-bleed with safe-area insets on mobile, where the measure is preserved
 * through the type scale rather than through the frame. Mobile is a primary experience,
 * "not a reduced afterthought" (§3.11).
 *
 * The panel owns three things and nothing else:
 *
 *  1. **Geometry.** The `reading-panel` mixin, which is the single definition of the 7:9
 *     proportion and of its mobile behaviour.
 *  2. **Type tokens.** The `reading-measure` mixin — serif family, fluid base size scaled by
 *     `--ogp-text-scale`, 1.65 leading, 34em measure. No component sets a font, a size or a
 *     colour of its own (BUILD_CONTRACT §0.10).
 *  3. **Theme.** `data-theme` selects the opt-in light page surface, which changes the
 *     SURFACE only; the surrounding environment stays dark so immersion holds (§8.8).
 *
 * Nothing decorative competes with the text. There is no ornament, rule, watermark, frame
 * or figure inside this panel that the manuscript did not author.
 *
 * The context it publishes carries the resolved reading conditions so that the manuscript
 * renderer can honour them without re-deriving them per block — notably the epigraph fade,
 * which is 400 ms under full motion and *absent* under reduced motion (§3.4.1).
 */

import { createContext, useContext, useMemo } from 'react';

import { OGP_TYPE } from '@/config/ogpTheme';
import { READING_THEMES } from '@/experience/states';
import { useExperience } from '@/experience/ExperienceProvider';
import { useReading } from '@/context/ReadingProvider';

const TypographyContext = createContext({
  theme: READING_THEMES.DARK,
  textScale: 1,
  reducedMotion: false,
});

/**
 * @returns {{ theme: string, textScale: number, reducedMotion: boolean }}
 */
export const useTypography = () => useContext(TypographyContext);

/**
 * @param {{ children: React.ReactNode, className?: string }} props
 */
export const TypographyProvider = ({ children, className = '' }) => {
  const { settings } = useReading();
  const { reducedMotion } = useExperience();

  const theme = settings.theme === READING_THEMES.LIGHT ? READING_THEMES.LIGHT : READING_THEMES.DARK;
  const textScale = OGP_TYPE.textSizeSteps[settings.textSizeIndex] ?? 1;

  const value = useMemo(
    () => ({ theme, textScale, reducedMotion }),
    [theme, textScale, reducedMotion],
  );

  return (
    <TypographyContext.Provider value={value}>
      <div className={`ogp-typography ${className}`.trim()} data-theme={theme}>
        <div className="ogp-typography__panel">{children}</div>
      </div>
    </TypographyContext.Provider>
  );
};

export default TypographyProvider;
