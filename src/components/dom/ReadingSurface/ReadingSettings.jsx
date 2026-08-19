/**
 * The single quiet settings affordance (master §3.9).
 *
 * Available from S9 onward, corner placement, never overlaying text. Every control is
 * honoured instantly and persisted; none is account-gated. Escape closes it, and so does a
 * press anywhere outside it.
 *
 * The complete surface, and nothing beyond it:
 *
 * | Setting            | Options                        | Default                     |
 * |--------------------|--------------------------------|-----------------------------|
 * | Text size          | 5 steps, 0.875x–1.5x           | 1x                          |
 * | Theme              | Deep field / Light page        | Deep field                  |
 * | Audio              | Off / Ambient                  | **Off**                     |
 * | Experience depth   | six age layers                 | current — flag-gated only   |
 * | Remember my place  | On / Off                       | On (device)                 |
 * | Language           | reserved                       | —                           |
 * | Position mark      | On / Off                       | **Off**                     |
 *
 * What is deliberately absent, permanently: **no streaks, no reading goals, no progress
 * celebrations, no percentage read, no time-remaining estimate, no session statistics.**
 * The hairline position mark is the only progress affordance the corpus permits, and it is
 * off by default because "optional progress … never obstructs reading".
 *
 * This is a disclosure, not a modal — there are no modals in S8–S13. Focus is nevertheless
 * kept inside it while it is open, because a settings panel a keyboard reader can tab out
 * of, into text they cannot see, is its own kind of trap; and Escape always closes, so the
 * containment can never become one. Nothing is dimmed or blocked behind it: turning back to
 * the page is itself the dismissal.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { COPY } from '@/config/copy';
import { FLAGS } from '@/config/env';
import { OGP_TIMING, OGP_TYPE } from '@/config/ogpTheme';
import { useAudio } from '@/context/AudioProvider';
import { useReading } from '@/context/ReadingProvider';
import { READING_THEMES } from '@/experience/states';
import { useExperience } from '@/experience/ExperienceProvider';
import { trapFocus } from '@/utils/dom';

/** Volume slider granularity — the same step the affordance cluster uses. */
const VOLUME_STEP = 0.05;

/**
 * Marks the chrome control that opens this panel.
 *
 * That control toggles, so a press on it must not also count as a press outside: the panel
 * would close here, the button's own handler would then find it closed and open it again,
 * and the reader would have pressed a button that appeared to do nothing.
 */
const TOGGLE_ATTR = 'data-ogp-settings-toggle';

/** Spread onto the control that opens the panel. */
export const settingsToggleProps = Object.freeze({ [TOGGLE_ATTR]: '' });

const THEME_OPTIONS = [
  { value: READING_THEMES.DARK, label: COPY.SETTINGS.THEME_DARK },
  { value: READING_THEMES.LIGHT, label: COPY.SETTINGS.THEME_LIGHT },
];

const AUDIO_OPTIONS = [
  { value: 'off', label: COPY.SETTINGS.AUDIO_OFF },
  { value: 'ambient', label: COPY.SETTINGS.AUDIO_AMBIENT },
];

/**
 * @param {{ open: boolean, onClose: () => void }} props
 */
export const ReadingSettings = ({ open, onClose }) => {
  const { settings, setSetting } = useReading();
  const { setAgeBand, ageBand } = useExperience();
  const { audioEnabled, enableAudio, disableAudio, volume, setVolume } = useAudio();

  const panelRef = useRef(null);
  const [confirmingClear, setConfirmingClear] = useState(false);

  // Escape always closes. The containment is released the instant the panel does.
  useEffect(() => {
    if (!open) return undefined;
    const node = panelRef.current;
    if (!node) return undefined;
    const release = trapFocus(node, { onEscape: onClose });
    return release;
  }, [open, onClose]);

  // Pressing anywhere else closes it too, which is what a disclosure in the corner of the
  // room should do — the reader dismisses it by returning to the page, not by finding the
  // control again. Capture phase and `pointerdown`, so a press that lands on the manuscript
  // dismisses the panel on the way down rather than after a full click completes.
  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined;

    const onPointerDown = (event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (panelRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest(`[${TOGGLE_ATTR}]`)) return;
      onClose();
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open, onClose]);

  const stepCount = OGP_TYPE.textSizeSteps.length;
  const stepIndex = Math.min(Math.max(settings.textSizeIndex ?? 0, 0), stepCount - 1);

  const onSmaller = useCallback(
    () => setSetting('textSizeIndex', Math.max(0, stepIndex - 1)),
    [setSetting, stepIndex],
  );
  const onLarger = useCallback(
    () => setSetting('textSizeIndex', Math.min(stepCount - 1, stepIndex + 1)),
    [setSetting, stepIndex, stepCount],
  );

  const onTheme = useCallback((event) => setSetting('theme', event.target.value), [setSetting]);

  const onAudio = useCallback(
    (event) => {
      if (event.target.value === 'ambient') {
        void enableAudio();
        return;
      }
      void disableAudio();
    },
    [enableAudio, disableAudio],
  );

  const onVolume = useCallback((event) => setVolume(Number(event.target.value)), [setVolume]);

  const onDepth = useCallback((event) => setAgeBand(event.target.value), [setAgeBand]);

  const onRememberPlace = useCallback(
    (event) => {
      if (event.target.checked) {
        setSetting('rememberPlace', true);
        setConfirmingClear(false);
        return;
      }
      // Turning it off clears local progress, so it is confirmed first — inline, never in
      // a browser dialog, which would be a popup.
      setConfirmingClear(true);
    },
    [setSetting],
  );

  const confirmClear = useCallback(() => {
    setSetting('rememberPlace', false);
    setConfirmingClear(false);
  }, [setSetting]);

  const cancelClear = useCallback(() => setConfirmingClear(false), []);

  const onPositionIndicator = useCallback(
    (event) => setSetting('positionIndicator', event.target.checked),
    [setSetting],
  );

  if (!open) return null;

  return (
    <div
      className="ogp-reading-settings"
      ref={panelRef}
      role="group"
      aria-label={COPY.SETTINGS.TITLE}
      // A press on the panel's own padding would otherwise drop focus on the body, and
      // Escape — which is bound to this container — would stop closing the panel the reader
      // is still looking at. `-1` keeps it out of the tab order and out of `focusableWithin`,
      // so the initial focus is still the close control.
      tabIndex={-1}
    >
      <div className="ogp-reading-settings__head">
        <h2 className="ogp-reading-settings__title">{COPY.SETTINGS.TITLE}</h2>
        <button type="button" className="ogp-affordance" onClick={onClose}>
          {COPY.SETTINGS.CLOSE}
        </button>
      </div>

      {/* Text size — 5 steps, honoured instantly, on top of any OS or browser zoom. */}
      <fieldset className="ogp-reading-settings__row">
        <legend>{COPY.SETTINGS.TEXT_SIZE}</legend>
        <div className="ogp-reading-settings__steps">
          <button
            type="button"
            className="ogp-affordance"
            onClick={onSmaller}
            disabled={stepIndex === 0}
          >
            {COPY.SETTINGS.TEXT_SIZE_SMALLER}
          </button>
          <span className="ogp-reading-settings__marks" aria-hidden="true">
            {OGP_TYPE.textSizeSteps.map((step, index) => (
              <span
                key={step}
                className="ogp-reading-settings__mark"
                data-active={index <= stepIndex ? 'true' : 'false'}
              />
            ))}
          </span>
          <button
            type="button"
            className="ogp-affordance"
            onClick={onLarger}
            disabled={stepIndex === stepCount - 1}
          >
            {COPY.SETTINGS.TEXT_SIZE_LARGER}
          </button>
        </div>
      </fieldset>

      {/* Theme — one choice for the whole experience: the room, its chrome and every
          pathway flow move with the page, so nothing stays dark behind a light page. */}
      <fieldset className="ogp-reading-settings__row">
        <legend>{COPY.SETTINGS.THEME}</legend>
        {THEME_OPTIONS.map((option) => (
          <label key={option.value} className="ogp-reading-settings__choice">
            <input
              type="radio"
              name="ogp-theme"
              value={option.value}
              checked={settings.theme === option.value}
              onChange={onTheme}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </fieldset>

      {/* Audio — default Off, always. The volume slider exists only while sound is on. */}
      <fieldset className="ogp-reading-settings__row">
        <legend>{COPY.SETTINGS.AUDIO}</legend>
        {AUDIO_OPTIONS.map((option) => (
          <label key={option.value} className="ogp-reading-settings__choice">
            <input
              type="radio"
              name="ogp-audio"
              value={option.value}
              checked={(audioEnabled ? 'ambient' : 'off') === option.value}
              onChange={onAudio}
            />
            <span>{option.label}</span>
          </label>
        ))}
        {audioEnabled && (
          <label className="ogp-reading-settings__choice ogp-reading-settings__volume">
            <span>{COPY.SETTINGS.VOLUME}</span>
            <input
              type="range"
              min="0"
              max="1"
              step={VOLUME_STEP}
              value={volume}
              onChange={onVolume}
            />
          </label>
        )}
      </fieldset>

      {/* Experience depth — visible only when the age layer is on (§3.9). */}
      {FLAGS.ageLayerEnabled && (
        <div className="ogp-reading-settings__row">
          <label className="ogp-reading-settings__choice" htmlFor="ogp-experience-depth">
            <span>{COPY.SETTINGS.EXPERIENCE_DEPTH}</span>
          </label>
          <select id="ogp-experience-depth" value={ageBand ?? ''} onChange={onDepth}>
            <option value="">{COPY.AGE.DECLINE}</option>
            {COPY.AGE.BANDS.map((band) => (
              <option key={band} value={band}>
                {band}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Remember my place — on by device, and turning it off is confirmed inline. */}
      <div className="ogp-reading-settings__row">
        <label className="ogp-reading-settings__choice">
          <input
            type="checkbox"
            checked={settings.rememberPlace !== false}
            onChange={onRememberPlace}
          />
          <span>{COPY.SETTINGS.REMEMBER_PLACE}</span>
        </label>

        {confirmingClear && (
          <div className="ogp-reading-settings__confirm" role="group">
            <p>{COPY.SETTINGS.REMEMBER_PLACE_CONFIRM}</p>
            <button type="button" className="ogp-affordance" onClick={confirmClear}>
              {COPY.SETTINGS.REMEMBER_PLACE_CLEAR}
            </button>
            <button type="button" className="ogp-affordance" onClick={cancelClear}>
              {COPY.A11Y.BACK}
            </button>
          </div>
        )}
      </div>

      {/* The one permitted progress affordance, off by default. Never a percentage. */}
      <div className="ogp-reading-settings__row">
        <label className="ogp-reading-settings__choice">
          <input
            type="checkbox"
            checked={settings.positionIndicator === true}
            onChange={onPositionIndicator}
          />
          <span>{COPY.SETTINGS.POSITION_INDICATOR}</span>
        </label>
      </div>

      {/* Language — reserved for the Multilingual Resonance Layer, a later phase. */}
      <div className="ogp-reading-settings__row">
        <label className="ogp-reading-settings__choice" htmlFor="ogp-language">
          <span>{COPY.SETTINGS.LANGUAGE}</span>
        </label>
        <select id="ogp-language" value="en" disabled onChange={undefined}>
          <option value="en">{COPY.SETTINGS.LANGUAGE_CURRENT}</option>
        </select>
      </div>
    </div>
  );
};

export default ReadingSettings;
