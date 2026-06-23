# Kapruka Challenge Transcript Analysis

Source analyzed:
- `D:/Downloads/The Kapruka Agent Challenge Dulith Herath on the Future of Shopping  TechTalk360.txt`

Purpose of this doc:
- extract what the challenge host seems to value
- turn the discussion into concrete product and prompt opportunities
- separate "build now" items from "good idea, but MCP/backend not ready"

## What the challenge is really rewarding

The transcript suggests the winning agent is not just a product search bot. It should feel like:

- a real shopping companion with personality
- a low-friction order flow that replaces long form-based checkout
- a broad commerce assistant, not just a gift assistant
- something users would prefer over going back to the normal website

The strongest signals from the discussion:

1. Personality matters a lot
   - The example given was not "show me flowers"
   - The better behavior was context-aware advice like a friend or buddy
   - The host explicitly said this must be built intentionally, not expected automatically from the model

2. Reduce friction aggressively
   - Current web order flow was described as around 7 minutes
   - Agent flow target was described as closer to 2 minutes
   - The agent should remove form-filling pain wherever possible

3. Language and wording matter
   - They gave a concrete example: changing `checkout` to `continue to delivery` improved conversion
   - That means plain-language UI and prompt wording is a real product advantage

4. The solution should go beyond gifts
   - The host explicitly said not to over-focus on gifts
   - Kapruka has a wide catalog, so broad shopping use cases matter

5. Reordering is a major opportunity
   - Reordering groceries and repeat purchases was called out as very powerful
   - This is likely a high-value practical agent behavior

6. Post-purchase matters too
   - Tracking is important
   - Users want "where is my order?" after purchase
   - Order editing is not yet available in MCP, so that is a limitation to respect

7. Voice and local language behavior matter
   - Voice was discussed directly
   - Singlish-style input was mentioned as working and useful
   - This suggests multilingual and mixed-language commerce is a differentiator

## Features we should implement now

These fit the transcript, are product-visible, and are realistic with the current app direction.

### 1. Stronger agent personality modes

Why:
- The host repeatedly emphasized human personality and "best buddy" behavior

What to build:
- a clear assistant persona in the system prompt
- supportive, situational replies instead of flat search responses
- tone that feels local, practical, and commerce-focused
- subtle upsell behavior when relevant, not spammy

Implementation ideas:
- system prompt rules for empathy, practical advice, and quick decision-making
- response style rules such as:
  - recommend, then explain briefly
  - ask only necessary follow-ups
  - suggest one smarter alternative when useful
  - help fix the user’s actual problem, not just list products

### 2. Reorder flow

Why:
- Reordering was one of the clearest future-facing opportunities discussed

What to build:
- "reorder my last groceries"
- "buy the same as last time"
- "reorder detergent / coffee / weekly essentials"

Minimum viable version:
- surface recent cart/session items
- offer one-tap repeat purchase suggestions
- prompt users with repeat intents if the app detects recurring categories

### 3. Better post-purchase tracking flow

Why:
- Tracking was specifically called out as important after sale

What to build:
- dedicated track order screen
- tracking summary plus friendly explanation
- "what this status means" language
- proactive next-step messaging such as "it has left the facility" or "expected today"

Nice additions:
- plain-language tracking labels
- delivery confidence phrasing
- clear limitations when order edit is unavailable

### 4. Plain-language checkout wording

Why:
- The transcript gave an explicit conversion example around `checkout`

What to build:
- rewrite rigid e-commerce labels into friendlier task language

Examples:
- `Checkout` -> `Continue to delivery`
- `Place order` -> `Confirm and place order`
- `Track order` -> `Check my delivery`
- `Recipient` -> `Who is receiving this?`

### 5. Broad shopping quick flows

Why:
- The host explicitly said not to limit this to gifts

What to build:
- groceries
- flowers
- electronics
- clothing
- urgent need-based shopping

UI ideas:
- category quick-start prompts
- common shopping intents
- reorder shortcuts
- "help me choose" flows inside categories

### 6. Singlish and mixed-language prompt support

Why:
- Singlish was mentioned positively in the discussion

What to build:
- detect mixed-language input
- normalize it before tool use when needed
- respond naturally in the user’s chosen language

Minimum viable version:
- add prompt instructions to handle English, Sinhala, Tamil, and mixed Romanized forms
- avoid over-correcting user phrasing

### 7. Proactive recommendation logic

Why:
- The host mentioned upselling and practical help

What to build:
- small accessory or bundle suggestions
- event-aware gift upgrades
- budget-aware substitution suggestions

Examples:
- flowers plus chocolate
- cake plus candles
- groceries with missing essentials

### 8. Persisted shopping memory inside the session

Why:
- They want the agent to replace repeated browsing and form-filling

What to build:
- remember recipient, city, typical budget, recent intent, preferred categories
- use this to reduce follow-up questions

## Prompt and behavior improvements

These are not separate features, but they are probably high-impact.

### System prompt improvements

Add rules so the agent:

- behaves like a smart shopping friend, not a search engine
- solves the user's real problem, not just the literal request
- gives one strong recommendation before listing too many options
- reduces checkout friction by collecting only needed info
- uses simple wording instead of e-commerce jargon
- handles gifts, groceries, tracking, and repeat ordering equally well
- uses context from the current session before asking again

### Response strategy improvements

Good default response pattern:

1. acknowledge the situation briefly
2. make a practical recommendation
3. show product options
4. guide the next action

For example:
- not just "here are flowers"
- but "flowers can help, but if this is personal, hand-delivering may work better. Here are three safer options at different price points."

### Tool-use policy improvements

The agent should:

- search first only when needed
- not ask for details already known
- not overuse the chat for structured flows like tracking
- move fast toward add-to-cart and checkout

## UI and UX opportunities from the transcript

### 1. Replace jargon with intent-based copy

Transcript signal:
- simpler language improved conversion

Apply this across:
- buttons
- forms
- tracking states
- delivery steps
- checkout steps

### 2. "You never need to go back to the site" benchmark

The host said a gold-standard agent should make users stop needing the website.

That implies the app should cover:

- discovery
- recommendations
- add to cart
- checkout details
- order tracking
- reordering

### 3. Friendly recovery states

If the user is vague, emotional, rushed, or unsure:

- the agent should guide
- not just dump results

This is especially relevant for gifts, urgent purchases, and apology-style shopping moments.

## MCP and backend limitations we should respect

These came through clearly in the transcript.

### 1. Order editing is not available yet

Transcript signal:
- tracking is available
- editing the order is not yet released in MCP

So:
- do not design fake order-edit flows
- if asked, the app should clearly explain the limitation

### 2. Tracking is available and detailed

So:
- invest in better tracking presentation
- do not undersell this with plain raw text output

### 3. The MCP is just the base layer

Transcript signal:
- there is nothing magical about the MCP itself
- the product quality comes from how the agent is built around it

So:
- prompt design
- memory
- workflow shaping
- UI language
- recommendation logic

all matter as much as raw tool access

## Highest-value shortlist

If we prioritize only the strongest transcript-aligned improvements, this is the order I would use:

1. strengthen agent personality and response style
2. improve plain-language UX and button text
3. build a proper reorder flow
4. improve tracking UX and post-purchase guidance
5. improve mixed-language and Singlish handling
6. add lightweight session memory for repeat commerce
7. add smarter upsell and bundle suggestions

## Concrete next implementation candidates

These are the most practical items to pick next:

### Candidate A: Reorder mode
- detect repeat purchase intents
- suggest recent items
- allow one-tap add-all to cart

### Candidate B: Personality prompt upgrade
- rewrite system prompt around "trusted Sri Lankan shopping friend"
- add situational advice behavior
- add upsell and bundle heuristics

### Candidate C: Tracking UX polish
- richer tracking explanations
- delivery status translation into plain language
- clear handling for unavailable edit actions

### Candidate D: Mixed-language understanding
- better Singlish and mixed-language prompt handling
- language-consistent follow-up responses

## Suggested file follow-up

After this analysis, we should probably create:

- a feature checklist for transcript-driven improvements
- a prompt improvement doc
- a shortlist implementation plan ordered by impact vs effort

