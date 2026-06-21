# Feature 06: Multilingual UI

## Goal

Make the product feel more Sri Lanka-aware by adding localized UI copy and lightweight language-aware helper responses on top of the current backend language handling.

## Checklist

- [ ] Review candidate multilingual dictionaries and language-detection behavior
- [ ] Decide the minimum viable language surface for this app
- [ ] Add localized labels and helper copy for the main UI flows
- [ ] Keep language changes lightweight and avoid duplicating business logic
- [ ] Verify English remains the default fallback
- [ ] Add at least one focused test for language selection or copy mapping
- [ ] Run `npm run lint`
- [ ] Run `npm run build`
- [ ] Verify the flow in a live browser session
- [ ] Commit, push branch, and open draft PR

## Notes

- Candidate reference: `tmp_compare/Kapruka-Ai-Shopping-Agent/lib/i18n/index.js`
- Candidate reference: `tmp_compare/Kapruka-Ai-Shopping-Agent/lib/i18n/en.js`
- Candidate reference: `tmp_compare/Kapruka-Ai-Shopping-Agent/lib/i18n/si.js`
