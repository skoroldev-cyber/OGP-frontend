# Sounds

Nothing here is committed, and the application is complete without it. **Silent entry is a
complete experience, not a fallback** (§2.9). Audio is strictly opt-in: nothing plays until the
reader chooses it, there is no autoplay and no muted-autoplay-then-unmute, and
`audioManager.js` degrades to silence on a missing file rather than throwing.

## Expected files

| Path | Use |
|---|---|
| `field_air_distant.ogg` | the opening bed — soft wind and breath texture, environmental space |
| `field_water_low.ogg` | distant ocean resonance, restrained |
| `earth_harmonic_open.ogg` | one quiet harmonic as Earth fully appears — *"Not victory. Recognition."* |
| `room_tone_reading.ogg` | Reading Room ambience, ≤ 20% of opening level and decaying further as the reader settles |

Ship an `.m4a` beside each `.ogg` for Safari.

## Source material

**Natural field recordings are the controlling source.** Synthetic acoustic candidates were
considered and rejected. Licensed or commissioned recordings only, with provenance logged per
file in the asset register.

Any UI acknowledgement tick is recorded from a natural material — paper, wood, breath — at
≤ −30 LUFS. Nothing is generated.

## The palette (§2.9, §8.5.2)

Low sub-bass warmth · distant ocean resonance · soft wind and breath texture · a heartbeat-like
pulse so faint it is almost imperceptible · real air and water presence · at full Earth
appearance, one quiet harmonic opening.

The intent, verbatim: *"Be still. Look. Remember where you are from."*

## Prohibited

Melody. Voice as mandatory exposition. Movie-trailer percussion. Triumphant anthems. Cinematic
impacts. "Awakening" noises. Synthetic activation sounds. Manipulative score. Orchestral swell
at the Earth reveal. **Audible loop seams** — loop points must be crossfade-edited so no reset
is ever perceptible, because a perceptible loop is visible machinery (§8.3.3).

Silence is an active compositional element. The 50–70 s fermata may be nearly silent, and the
"Become Family." threshold is *surrounded* by silence — ambient audio fades out before the
phrase appears (§8.10.2).

## Behaviour rules

- Every audio state change is a gain-ramped fade of ≥ 2 s. Never a cut, never a hard pause.
  `AudioManager.fade()` in the reference itom codebase was a hard-pause stub; this
  implementation ramps properly (§7.12 defect 6).
- No sound event may coincide with manuscript text appearing.
- One-signature epigraph pauses carry near-silence, never a cue sting.
- Reading Room ambience defaults to ≤ 20% of opening level and decays as the reader settles;
  after reading begins, sound must not remain dominant or the experience becomes multimedia
  entertainment.
- Mute is always one action away, and volume persists across visits.

## Authority

The complete soundscape and spatial mix are reserved for the Founding Immersive and Adaptive
Creative Director (§2.9). Ship the proof with palette stems and a placeholder mix, flagged
non-final. Do not finish the mix internally.
