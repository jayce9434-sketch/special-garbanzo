# Audio System

The final runtime does not build island parts from live OscillatorNode beeps. It ships original stereo WAV assets and uses Web Audio as the playback/mixing engine.

## Timing

A scheduler wakes every 25 ms but schedules notes ahead against AudioContext time. Song events and animation cues share the same musical clock. Performance cues begin slightly before their audio transient when anticipation is required, so a percussion arm can wind up and reach its contact pose on the sound itself.

## Mix

- master, music, and SFX gain
- stereo panning
- convolution reverb using `room_ir.wav`
- dynamics compression
- final limiter
- two round-robin samples for most instrument families
- pitched sample playback for melodic instruments

Instrument families include hand drum, tom, shaker, wood block, metal percussion, cymbal, marimba, kalimba, handpan, dulcimer, pluck, harp, bass, cello, flute, reed, horn, pipe, vocal, and choir.
