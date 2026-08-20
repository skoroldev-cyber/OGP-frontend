import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { OGP_TIMING } from '@/config/ogpTheme';
import { useExperience } from '@/experience/ExperienceProvider';
import { readPreferences, writePreferences } from '@/services/storage';
import {
  disable as disableEngine,
  enable as enableEngine,
  fadeTo as fadeToEngine,
  playAmbience as playAmbienceEngine,
  setDocumentHidden,
  setMasterVolume,
  silenceAll,
  stopAmbience as stopAmbienceEngine,
} from '@/utils/audioManager';

const AudioContextValue = createContext(null);

export const useAudio = () => {
  const context = useContext(AudioContextValue);
  if (!context) throw new Error('useAudio must be used within an AudioProvider');
  return context;
};

export const AudioProvider = ({ children }) => {
  const { setAudioEnabled: setMachineAudioEnabled } = useExperience();

  const [audioEnabled, setAudioEnabled] = useState(false);
  const [audioPreferred] = useState(() => readPreferences().audioEnabled === true);
  const [volume, setVolumeState] = useState(
    () => readPreferences().audioVolume ?? OGP_TIMING.audio.defaultVolume,
  );

  const enableAudio = useCallback(async () => {
    const started = await enableEngine();
    if (!started) return false;
    setMasterVolume(volume);
    setAudioEnabled(true);
    setMachineAudioEnabled(true);
    writePreferences({ audioEnabled: true, audioVolume: volume });
    return true;
  }, [volume, setMachineAudioEnabled]);

  const disableAudio = useCallback(async () => {
    setAudioEnabled(false);
    setMachineAudioEnabled(false);
    writePreferences({ audioEnabled: false });
    await disableEngine();
  }, [setMachineAudioEnabled]);

  const setVolume = useCallback((next) => {
    const clamped = Math.max(0, Math.min(1, next));
    setVolumeState(clamped);
    setMasterVolume(clamped);
    writePreferences({ audioVolume: clamped });
  }, []);

  const playAmbience = useCallback(
    (name, options) => playAmbienceEngine(name, options),
    [],
  );

  const stopAmbience = useCallback((name, fadeSec) => stopAmbienceEngine(name, fadeSec), []);

  const fadeTo = useCallback((name, target, ms) => fadeToEngine(name, target, ms), []);

  const silence = useCallback(() => silenceAll(), []);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const onVisibility = () => setDocumentHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const value = useMemo(
    () => ({
      audioEnabled,
      audioPreferred,
      enableAudio,
      disableAudio,
      volume,
      setVolume,
      playAmbience,
      stopAmbience,
      fadeTo,
      silence,
    }),
    [
      audioEnabled,
      audioPreferred,
      enableAudio,
      disableAudio,
      volume,
      setVolume,
      playAmbience,
      stopAmbience,
      fadeTo,
      silence,
    ],
  );

  return <AudioContextValue.Provider value={value}>{children}</AudioContextValue.Provider>;
};

export default AudioProvider;
