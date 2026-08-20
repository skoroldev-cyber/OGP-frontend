import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { COPY } from '@/config/copy';
import { OGP_TYPE } from '@/config/ogpTheme';
import { MOTION_PREFERENCES, READING_THEMES, STATES, stateIndex } from '@/experience/states';
import { PATHS } from '@/routes';
import { ensureSession } from '@/services/session';
import {
  AREAS,
  STORAGE_KEYS,
  readNamespaced,
  readRecord,
  writePreferences,
  writeReadingSession,
} from '@/services/storage';
import { QuestionnaireForm } from '@/components/dom/questionnaire/QuestionnaireForm';

const LOGO_MARK = '/logo/main-logo-64.png';
const LOGO_MARK_2X = '/logo/main-logo-128.png';

// This page deliberately stays outside the experience tree, so it cannot read settings through
// the ReadingProvider. It reads the same stored slice the provider writes, with the same
// precedence, so a reviewer who set their theme and text size in the reading room finds them
// here rather than being thrown back to the defaults.
const storedSettings = () => ({
  ...(readRecord(AREAS.LOCAL, STORAGE_KEYS.PREFS)?.reading ?? {}),
  ...(readRecord(AREAS.LOCAL, STORAGE_KEYS.READING)?.settings ?? {}),
});

const preferredTheme = () =>
  storedSettings().theme === READING_THEMES.LIGHT ? READING_THEMES.LIGHT : READING_THEMES.DARK;

const preferredMotion = () => {
  const stored = storedSettings().motion;
  if (Object.values(MOTION_PREFERENCES).includes(stored)) return stored;
  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
  return reduce ? MOTION_PREFERENCES.REDUCED : MOTION_PREFERENCES.FULL;
};

const preferredTextScale = () => {
  const index = storedSettings().textSizeIndex;
  return OGP_TYPE.textSizeSteps[index] ?? OGP_TYPE.textSizeSteps[OGP_TYPE.textSizeDefaultIndex];
};

const arcComplete = () => {
  const machine = readNamespaced(AREAS.SESSION, STORAGE_KEYS.SESSION, 'machine');
  return (
    Boolean(machine?.state) &&
    stateIndex(machine.state) >= stateIndex(STATES.S13_OPENING_ARC_COMPLETE)
  );
};

export default function TestQuestionnairePage() {
  const [ready, setReady] = useState(false);
  const [theme, setTheme] = useState(preferredTheme);

  const pathwaysReached = useMemo(() => arcComplete(), []);

  useEffect(() => {
    let cancelled = false;
    ensureSession({ entryVia: 'direct' }).finally(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const root = document.documentElement;
    const previousTheme = root.dataset.theme;
    const previousMotion = root.dataset.motion;

    root.dataset.motion = preferredMotion();
    root.style.setProperty('--ogp-text-scale', String(preferredTextScale()));

    return () => {
      if (previousTheme) root.dataset.theme = previousTheme;
      else delete root.dataset.theme;
      if (previousMotion) root.dataset.motion = previousMotion;
      else delete root.dataset.motion;
      root.style.removeProperty('--ogp-text-scale');
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Written the way `ReadingProvider.setSetting` writes it, to both slices, so the choice made
  // here is the choice the reading room opens with rather than a setting that quietly reverts.
  const onTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === READING_THEMES.LIGHT ? READING_THEMES.DARK : READING_THEMES.LIGHT;
      const settings = { ...storedSettings(), theme: next };
      writePreferences({ reading: settings });
      if (settings.rememberPlace !== false) writeReadingSession({ settings });
      return next;
    });
  }, []);

  return (
    <div className="ogp-questionnaire-page">
      <nav className="ogp-questionnaire-bar" aria-label={COPY.QUESTIONNAIRE.NAV_LABEL}>
        <div className="ogp-questionnaire-bar__identity">
          <img
            className="ogp-questionnaire-bar__mark"
            src={LOGO_MARK}
            srcSet={`${LOGO_MARK} 1x, ${LOGO_MARK_2X} 2x`}
            width="64"
            height="64"
            alt=""
            aria-hidden="true"
            draggable="false"
            decoding="async"
          />

          <span className="ogp-questionnaire-bar__identity-text">
            <span className="ogp-questionnaire-bar__wordmark">{COPY.META.ORGANISATION}</span>
            <span className="ogp-questionnaire-bar__folio">{COPY.QUESTIONNAIRE.PAGE_LABEL}</span>
          </span>
        </div>

        <div className="ogp-questionnaire-bar__controls">
          <button type="button" className="ogp-affordance" onClick={onTheme}>
            {theme === READING_THEMES.LIGHT
              ? COPY.SETTINGS.THEME_DARK
              : COPY.SETTINGS.THEME_LIGHT}
          </button>

          {pathwaysReached && (
            <Link className="ogp-affordance" to={PATHS.PATHWAYS}>
              {COPY.NAV.PATHS}
            </Link>
          )}

          <Link className="ogp-affordance" to={PATHS.READING_ROOM}>
            {COPY.QUESTIONNAIRE.RETURN}
          </Link>
        </div>
      </nav>

      <main
        className="ogp-questionnaire ogp-questionnaire--page"
        aria-label={COPY.QUESTIONNAIRE.PAGE_LABEL}
      >
        {ready ? (
          <QuestionnaireForm />
        ) : (
          <div className="ogp-questionnaire__column ogp-questionnaire__column--centred">
            <p className="ogp-questionnaire__notice" role="status">
              {COPY.QUESTIONNAIRE.LOADING}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
