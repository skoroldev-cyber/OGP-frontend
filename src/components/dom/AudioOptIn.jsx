/**
 * The audio opt-in moment.
 *
 * Audio is STRICTLY opt-in (BUILD_CONTRACT §0.4, master §2.9, §8.5.1): **nothing plays
 * before the reader chooses.** There is no autoplay, no muted-autoplay-then-unmute, and no
 * revival of a remembered preference on a later load — `AudioProvider` enforces all three;
 * this component is the only surface that may ask.
 *
 * Rules encoded here:
 *
 *  - One control, labelled exactly `COPY.AFFORDANCES.SOUND`, carrying its on/off state in
 *    `aria-pressed` rather than in a changing label. A control whose name changes under the
 *    reader is a control a screen-reader user has to re-learn every time they use it.
 *  - **Mute is always one action away**: the same control turns sound off, from anywhere it
 *    appears, with no confirmation step.
 *  - **The volume slider exists only while sound is on** (§3.9). A volume control over
 *    silence is machinery pretending to be a choice.
 *  - Silence is a complete experience. If the browser refuses to start an audio context the
 *    control simply stays off; nothing is reported to the reader, because nothing is wrong.
 */

import { useCallback } from 'react';

import { COPY } from '@/config/copy';
import { useAudio } from '@/context/AudioProvider';

/** Volume slider granularity. A percentage of the master gain, not a decibel scale. */
const VOLUME_STEP = 0.05;

/**
 * @param {{ variant?: 'affordance'|'panel', className?: string }} props
 *   `affordance` — the small bottom-edge control that lives with skip and motion (§8.7).
 *   `panel` — the reading-settings row, where the label sits beside the control (§3.9).
 */
export const AudioOptIn = ({ variant = 'affordance', className = '' }) => {
  const { audioEnabled, enableAudio, disableAudio, volume, setVolume } = useAudio();

  const toggle = useCallback(() => {
    if (audioEnabled) {
      void disableAudio();
      return;
    }
    // The consent moment. `enableAudio` constructs the audio context inside this reader
    // gesture — the only place a browser will allow it, and the only place we want it.
    void enableAudio();
  }, [audioEnabled, enableAudio, disableAudio]);

  const onVolume = useCallback(
    (event) => setVolume(Number(event.target.value)),
    [setVolume],
  );

  return (
    <div className={`ogp-audio-optin ogp-audio-optin--${variant} ${className}`.trim()}>
      <button
        type="button"
        className="ogp-affordance ogp-audio-optin__toggle"
        aria-pressed={audioEnabled}
        onClick={toggle}
      >
        {COPY.AFFORDANCES.SOUND}
      </button>

      {audioEnabled && (
        <label className="ogp-audio-optin__volume">
          <span className="ogp-audio-optin__volume-label">{COPY.SETTINGS.VOLUME}</span>
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
    </div>
  );
};

export default AudioOptIn;
