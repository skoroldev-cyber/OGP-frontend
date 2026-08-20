import { useCallback } from 'react';

import { COPY } from '@/config/copy';
import { useAudio } from '@/context/AudioProvider';

const VOLUME_STEP = 0.05;

export const AudioOptIn = ({ variant = 'affordance', className = '' }) => {
  const { audioEnabled, enableAudio, disableAudio, volume, setVolume } = useAudio();

  const toggle = useCallback(() => {
    if (audioEnabled) {
      void disableAudio();
      return;
    }
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
