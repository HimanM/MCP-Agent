# Feature 06: Multilingual UI

## Goal

Make the product feel more Sri Lanka-aware by adding localized UI copy and lightweight language-aware helper responses on top of the current backend language handling.

## Checklist

- [x] Review candidate multilingual dictionaries and language-detection behavior
- [x] Decide the minimum viable language surface for this app
- [x] Add localized labels and helper copy for the main UI flows
- [x] Keep language changes lightweight and avoid duplicating business logic
- [x] Verify English remains the default fallback
- [x] Add at least one focused test for language selection or copy mapping
- [x] Run `npm run lint`
- [x] Run `npm run build`
- [x] Verify the flow in a live browser session
- [ ] Commit, push branch, and open draft PR

## Notes

- Candidate reference: `tmp_compare/Kapruka-Ai-Shopping-Agent/lib/i18n/index.js`
- Candidate reference: `tmp_compare/Kapruka-Ai-Shopping-Agent/lib/i18n/en.js`
- Candidate reference: `tmp_compare/Kapruka-Ai-Shopping-Agent/lib/i18n/si.js`
- The implementation stays frontend-only: a tiny UI copy map plus a header toggle for `en`, `si`, and `ta`.
- Focused check: `node --test --experimental-strip-types frontend/src/lib/ui-copy.spec.ts`
- Live browser verification used a Playwright fallback because the in-app Browser tool was not callable in this thread.
- Browser checks confirmed:
  - English is the default UI language
  - selecting `si` updates the visible hero copy
  - switching back to `en` restores the English fallback
