# TTS Implementation Plan

Purpose:
- pick a practical voice output path that actually supports English, Sinhala, and Tamil
- avoid shipping a fake multilingual TTS story that breaks the moment Sinhala is selected

## Recommendation

Primary provider:
- Azure Speech

Fallback:
- browser-native `speechSynthesis`

Why this wins:
- Azure is the strongest verified option with official support for:
  - English
  - Sinhala (`si-LK`)
  - Tamil, including Sri Lankan Tamil (`ta-LK`)
- It also has a usable free tier for early deployment and judging.
- Browser-native speech is free and easy, but too inconsistent across devices to trust as the main path.

## Verified voice direction

- `en` -> default to `en-IN-NeerjaNeural` for now; Azure does not currently expose an `en-LK` English voice in the practical public voice list, so `en-IN` is the closest sensible default for this app
- `si` -> `si-LK-ThiliniNeural` or `si-LK-SameeraNeural`
- `ta` -> `ta-LK-SaranyaNeural` or `ta-LK-KumarNeural`

## Provider ranking

1. Azure Speech
   - verified practical fit for `en`, `si-LK`, and `ta-LK`
   - already matches this repo's backend `/api/tts` shape
   - free tier is good enough for early challenge deployment
2. Browser-native `speechSynthesis`
   - keep only as resilience fallback
   - do not treat as guaranteed Sinhala or Tamil coverage
3. Other providers
   - Google Cloud TTS is fine for English and some Tamil paths, but not a strong verified Sinhala answer here
   - ElevenLabs is good for voice quality, but not the cleanest low-cost verified Sinhala plus Tamil path for this project

## Why not rely on browser speech only

- voice availability depends on the device and browser
- Sinhala and Tamil can be missing or low quality
- behavior is inconsistent between desktop and mobile

So the safe product path is:
- API TTS first
- browser fallback second
- text-only fallback last

## Implementation phases

### Phase 1: backend foundation

- [x] Add TTS provider config to backend settings
- [x] Add Azure Speech credentials to env docs
- [x] Create a backend TTS service wrapper
- [x] Add a `POST /tts` endpoint that accepts message text and language
- [x] Return audio bytes or a streamable response
- [x] Enforce short input limits so we do not waste characters on giant product lists

### Phase 2: frontend playback

- [x] Add play and stop actions to assistant messages
- [x] Add a global audio on/off setting
- [x] Cache the most recent audio per assistant message
- [x] Fall back to browser `speechSynthesis` if the API TTS call fails
- [ ] Keep playback controls consistent on desktop and mobile

### Phase 3: UX rules

- [ ] Speak concise assistant summaries, not full product grids
- [ ] Read tracking updates in short natural language
- [ ] Keep buddy-style spoken replies warm but brief
- [ ] Respect the currently selected app language in chat and non-chat screens

### Phase 4: testing

- [x] Test English playback
- [ ] Test Sinhala playback
- [ ] Test Tamil playback
- [ ] Test mobile playback on Chrome and Safari
- [x] Test API failure fallback into browser speech
- [ ] Test no-audio fallback when neither provider is available

## Suggested response policy

Read aloud:
- short recommendation summaries
- tracking summaries
- confirmation messages

Do not read aloud by default:
- long product grids
- full checkout details
- debug or status responses

## Risks and notes

- Azure is not fully free forever, so rate limits and payload limits matter
- Sinhala voice variety is limited, but official support exists, which is the hard requirement
- Browser-native fallback is good resilience, not a premium experience
- Romanized Singlish and Tanglish can still sound awkward unless we later add text normalization before synthesis

## Sources reviewed

- Azure Speech language support
- Azure Speech pricing and free tier
- Google Cloud TTS voice lists
- Amazon Polly supported languages
- MDN `speechSynthesis`
