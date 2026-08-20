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

export const useTypography = () => useContext(TypographyContext);

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
