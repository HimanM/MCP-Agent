# Feature 04: Voice Mode

## Goal

Add browser-native voice input and optional spoken assistant replies using built-in Web Speech APIs, following the candidate approach without new paid services.

## Checklist

- [x] Review candidate voice input/output implementation
- [x] Decide the smallest supported browser behavior and fallback text
- [x] Add voice input button and listening state
- [x] Add optional voice output toggle for assistant replies
- [x] Keep the chat input usable when voice APIs are unavailable
- [x] Ensure the UI remains clean on desktop and mobile
- [x] Add at least one lightweight check for prompt/input behavior
- [x] Run `npm run lint`
- [x] Run `npm run build`
- [x] Verify the flow in a live browser session
- [ ] Commit, push branch, and open draft PR

## Notes

- Candidate reference: `tmp_compare/kavi-kapruka/lib/speech.ts`
- Candidate reference: `tmp_compare/kavi-kapruka/components/chat/VoiceButton.tsx`
- The implementation uses browser-native Web Speech APIs only. No backend work and no paid service dependency.
- Lightweight check: `node --test --experimental-strip-types frontend/src/lib/speech.spec.ts`
- Live browser verification used a Playwright fallback because the in-app Browser tool was not callable in this thread.
- Browser checks covered:
  - supported-browser mock: mic button renders, enters listening state, and the spoken-reply toggle flips on
  - unsupported-browser mock: the normal text input still renders while voice controls stay hidden
