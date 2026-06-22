# Feature Implementation Plan

Purpose:
- turn the challenge transcript into a practical build checklist
- cover both product features and prompt behavior
- include the prompt externalization work so the personality/bootstrap prompt is no longer hardcoded

## Phase 1: Prompt and behavior foundation

- [x] Move the main bootstrap/system prompt out of `backend/agent/prompts.py` into markdown files under a prompt docs folder
- [x] Add a small loader in backend code that reads prompt markdown files at runtime
- [x] Keep language-specific prompt variants supported
- [x] Add a "buddy but useful" personality layer to the English prompt
- [x] Add matching tone guidance to Sinhala and Tamil prompt variants
- [x] Add explicit behavioral examples to the prompt, including the "flowers are not enough, go deliver them yourself" style example
- [ ] Add examples for:
  - [x] emotional gift recovery
  - [x] urgent apology shopping
  - [x] practical reorder requests
  - [x] budget-constrained gifting
  - [x] upsell without being annoying
- [x] Add rules that the agent should solve the user's actual problem, not just literal product retrieval
- [x] Add rules that the agent should recommend one strong path before listing too many options
- [x] Add rules for simple human wording instead of e-commerce jargon

## Phase 2: Personality and recommendation quality

- [ ] Make the agent feel like a trusted Sri Lankan shopping friend, not a search bar
- [ ] Add situational advice behavior for gifts and sensitive occasions
- [ ] Add common-sense recommendation logic before tool output is shown
- [ ] Add "soft correction" behavior when the user's chosen action is weak
- [x] Add better upsell logic:
  - [x] flowers plus chocolates
  - [x] cake plus candles
  - [x] gift plus greeting card
  - [x] grocery basket completion suggestions
- [x] Add better substitute handling when exact matches are unavailable
- [x] Add compact response patterns for product-heavy requests

## Phase 3: Friction reduction in the shopping flow

- [ ] Audit all user-facing labels for jargon
- [ ] Replace jargon with plain-language task labels where possible
- [ ] Review every action related to checkout and payment wording
- [ ] Reduce unnecessary follow-up questions in chat
- [ ] Reuse remembered context before asking the same thing again
- [ ] Optimize the path from discovery to add-to-cart to checkout

## Phase 4: Reorder and repeat-commerce features

- [x] Add a reorder intent path
- [ ] Support prompts like:
  - [x] "buy the same as last time"
  - [x] "reorder my groceries"
  - [x] "get my usual coffee"
- [x] Build a recent-items or recent-session reorder surface
- [x] Add one-tap "add all again" behavior for recent orders or recent carts
- [x] Add prompt rules for detecting likely repeat-purchase intent

## Phase 5: Tracking and post-purchase experience

- [x] Improve the tracking flow UX beyond raw status output
- [x] Add plain-language explanations for tracking states
- [x] Add "what this means" helper text for each tracking stage
- [x] Add honest limitation handling for unsupported order editing
- [ ] Add follow-up suggestions after tracking, such as:
  - [x] wait guidance
  - [x] support guidance if delayed
  - [x] next likely delivery expectation

## Phase 6: Broad shopping support beyond gifts

- [x] Improve flows for groceries
- [ ] Improve flows for flowers
- [ ] Improve flows for electronics
- [ ] Improve flows for clothing and fashion
- [ ] Improve flows for general need-based shopping
- [x] Add broad intent quick actions where useful
- [x] Make sure prompt examples are not over-focused on gifting only

## Phase 7: Mixed-language and local input handling

- [x] Improve Singlish handling in prompts
- [x] Improve mixed English/Sinhala/Tamil understanding
- [x] Preserve the user's language in responses
- [x] Avoid awkward over-translation of product names
- [x] Add examples in the prompt for mixed-language input styles

## Phase 8: Memory and session quality

- [ ] Expand session memory to retain useful shopping context
- [ ] Remember likely repeat context such as:
  - [ ] recipient
  - [ ] delivery city
  - [ ] preferred budget
  - [ ] recent categories
  - [ ] recent purchase intent
- [ ] Use memory to reduce repeated questions
- [ ] Add prompt rules for when to trust memory vs when to confirm

## Phase 9: Voice and conversational polish

- [ ] Keep improving voice input reliability
- [ ] Improve voice replies so they match the buddy-style personality
- [ ] Add better handling for mixed-language voice input if practical
- [ ] Make spoken responses concise and natural
- [x] Research a practical multilingual TTS provider path for English, Sinhala, and Tamil
- [x] Implement Azure Speech as the primary TTS provider
- [x] Add browser-native `speechSynthesis` as the fallback TTS path
- [x] Add a voice map for `en`, `si`, and `ta`

## Phase 10: Evaluation and testing

- [ ] Create manual test scripts for the buddy-style behaviors
- [ ] Create manual test scripts for reorder scenarios
- [ ] Create manual test scripts for broad shopping scenarios
- [ ] Create manual test scripts for tracking scenarios
- [ ] Create manual test scripts for Singlish and mixed-language prompts
- [x] Add backend tests for prompt loading from markdown files
- [ ] Add tests for graceful fallback if prompt markdown files are missing or malformed

## Prompt externalization plan

Target outcome:
- prompt content lives in markdown
- code loads it
- we can revise personality and examples without editing Python strings

### Suggested structure

- [x] Create `docs/prompts/system/en.md`
- [x] Create `docs/prompts/system/si.md`
- [x] Create `docs/prompts/system/ta.md`
- [x] Add a backend helper that reads those files
- [x] Keep `build_user_message()` in code for structured runtime context
- [x] Keep prompt examples in markdown, not Python string literals

### Why this is worth doing

- [x] easier iteration on personality
- [x] easier review of prompt behavior
- [x] cleaner source code
- [x] easier to add challenge-specific examples

## Highest-priority order

If we do this in value order:

- [x] 1. Externalize prompts to markdown
- [x] 2. Upgrade prompt personality with buddy-style examples
- [ ] 3. Improve plain-language wording and friction reduction
- [ ] 4. Add reorder flow
- [ ] 5. Improve post-purchase tracking guidance
- [ ] 6. Improve mixed-language handling
- [ ] 7. Expand session memory usage

## Notes

- The transcript strongly suggests personality plus friction reduction will matter more than raw tool count
- Tracking is worth improving, but order editing should not be faked because the MCP does not support it yet
- Reordering looks like one of the strongest underused opportunities
- TTS research points to Azure Speech as the most practical verified option for English + Sinhala + Sri Lankan Tamil, with browser-native speech synthesis as fallback
