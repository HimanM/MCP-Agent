# Feature 04: Voice Mode

## Goal

Add browser-native voice input and optional spoken assistant replies using built-in Web Speech APIs, following the candidate approach without new paid services.

## Checklist

- [ ] Review candidate voice input/output implementation
- [ ] Decide the smallest supported browser behavior and fallback text
- [ ] Add voice input button and listening state
- [ ] Add optional voice output toggle for assistant replies
- [ ] Keep the chat input usable when voice APIs are unavailable
- [ ] Ensure the UI remains clean on desktop and mobile
- [ ] Add at least one lightweight check for prompt/input behavior
- [ ] Run `npm run lint`
- [ ] Run `npm run build`
- [ ] Verify the flow in a live browser session
- [ ] Commit, push branch, and open draft PR

## Notes

- Candidate reference: `tmp_compare/kavi-kapruka/lib/speech.ts`
- Candidate reference: `tmp_compare/kavi-kapruka/components/chat/VoiceButton.tsx`
