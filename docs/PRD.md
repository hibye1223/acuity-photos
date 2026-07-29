# Acuity Photos — Product Requirements Document

## 1. Product Name

Name: Acuity Photos
Domain: [acuityphotos.com](http://acuityphotos.com/)
Brand shorthand (later, once established): Acuity

## 2. One-Line Statement

Acuity Photos helps people with overwhelming photo libraries use smart technology to effortlessly organize, clean, and rediscover their pictures.

## 3. Summary

An AI-first photo app that helps people confidently clean up massive, overwhelming photo libraries, starting with duplicates, near-duplicates, screenshots, and low-quality shots without the fear of losing something important. Long-term vision: evolve into a "memory intelligence" system with natural-language search and automatic life-story organization. This PRD covers v1 (MVP) only.

## 4. Problem Statement

Research basis: manual analysis of 500+ one-star Apple Photos App Store reviews, categorized into 40 distinct problem statements.

Two problem clusters dominate the data and are addressed by this MVP:

- Users cannot confidently delete unwanted photos because they fear losing important memories, and lack any automated signal for what's safe to remove (~30% of weighted complaints).
- Users accumulate hundreds of near-identical photos and screenshots/junk with no help picking the best shot or clearing clutter (~30% of weighted complaints combined).
- Compounding both: users spend hours manually cleaning photos because existing apps (Apple/Google Photos) only store — they don't manage.

Existing point solutions (Gemini Photos, Slidebox, Swipewipe, various screenshot cleaners) each address a slice of this, but none combine detection + confident deletion + a trustable workflow into one coherent experience and a real market of paid "professional photo organizers" (APPO) confirms people will pay to have this problem solved for them.

## 5. Solution / Value Proposition

One job: let the user trust that they can clean up their photos without regretting it.

Not "organize your memories" (that's v2+). v1 removes the fear that currently blocks cleanup, using visible, explainable signals (why something is suggested for removal) rather than an opaque black box.

## 6. Target User (v1)

Someone with an overloaded camera roll (5,000+ photos) who has hit a "storage full" notification, has likely tried and abandoned a manual cleanup or a swipe-cleaner app before, and currently avoids deleting anything because they're unsure what's safe to lose.

## 7. User Journey

Starts with: Thousands of unsorted photos — duplicates, bursts, screenshots, memes, blurry shots — and background anxiety about deleting anything.

Leaves with: A library that feels trustworthy again — duplicates consolidated to one best shot, junk cleared, and confidence about what's safe to remove going forward. The exit feeling is relief, not just a smaller storage number.

## 9. Personalization in v1: Cleanup Preference Profile

A short, declared (not learned) setup flow — 3-4 questions during onboarding, editable anytime in settings:

- **Aggressiveness**: how strict should duplicate/near-duplicate matching be (loose vs. strict)?
- **Junk categories**: which types should be flagged at all — screenshots, memes/downloads, blurry shots — opt in/out per category.
- **Automation level**: always ask before removing anything, or auto-clean with a post-hoc summary (ties directly to Feature 5).
- **Confidence threshold**: how sure should the app be before suggesting something as safe to delete (conservative vs. aggressive)?

This is deliberately not the adaptive, behavior-learning personalization system from the long-term roadmap (that stays deferred to a later release, once there's a retained user base and behavioral data to learn from). This version is a preference form, not a model — cheap to build, ships on schedule, and gives users a real sense of control that reinforces the MVP's core trust goal.

## 10. Explicitly Out of Scope for v1 (later)

- Natural-language / semantic photo search
- Automatic meaningful albums or life-story timelines
- Face recognition / relationship-based organization
- Cross-platform or cross-cloud photo aggregation
- Sharing / collaborative albums
- Adaptive AI personalization that learns preferences over time
- Library health dashboards, storage analytics views
- "Personal AI assistant for your whole library" framing/marketing

## 11. Success Metrics (proposed, needs founder input)

- % of suggested deletions accepted without reversal (trust proxy)
- Retention: % of users who return for a second cleanup session within 30 days
- Time-to-first-value: time from install to first completed cleanup batch
- Volume: average photos reviewed per session

## 12. Phased Technical Approach

Why phased: the core v1 job ("clean up your real photo library") requires deep, ongoing access to the system photo library and the ability to actually delete/modify items in place. Web apps cannot get this on iOS — Safari only allows a one-time manual file picker, with no batch library access, no metadata (Live Photos, bursts, iCloud status), and no ability to delete from the real Photos app. So "web app" and "shippable MVP" are not the same target — they're two different phases with two different purposes.

### Phase 0 — Web Prototype (proof of concept)

Purpose: validate the detection algorithms and review/swipe UX quickly, before investing in native platform work.

Scope:

- User manually uploads a sample batch of photos (not live device library access)
- Runs duplicate/near-duplicate detection, screenshot/junk classification, and quality scoring against that sample set
- Full swipe/review UI, confidence signal display, and automation-approval toggle — all testable here
- Cleanup Preference Profile onboarding flow — testable here too

Explicitly not solved at this phase: real library access, in-place delete, undo against the actual Photos app, on-device privacy guarantees (uploads would need to be understood by testers as non-production).

Output: a working demo for mentor/investor validation and UX testing — not a distributable product.

### Phase 1 — iOS Native (the actual v1 MVP)

Purpose: deliver the real PRD promise against a user's actual photo library.

Requirements:

- PHPhotoLibrary / Photos framework integration for library read + in-place delete
- On-device inference (Core ML or equivalent) for duplicate/screenshot/quality detection — evaluate model size/latency tradeoffs early, this is a real constraint, not a marketing afterthought
- Native undo/recovery architecture tied to the system's own trash/recently-deleted behavior — this must be solid before launch; a single visible false-positive deletion in a user's first session is a bigger risk to this product than any missing feature
- Local-only processing to back up the privacy positioning from the original pitch

Sequencing note: build Phase 0 first to validate the algorithm and UX fast, but treat it as disposable prototyping code, not a codebase to gradually migrate into the native app — the underlying platform APIs are different enough (browser JS vs. Swift + Photos framework) that a rewrite, not a port, is expected.

## 13. Key Risks

- A bad auto-suggestion early in onboarding could break trust permanently — treat QA on this as higher priority than shipping additional features.
- "Confident cleanup" alone, without a visible roadmap toward natural-language search, may not be differentiated enough to defend against Apple/Google shipping similar cleanup tools.

## 14. Open Questions

- Exact wording/UX for the "why" signal — how much explanation is reassuring vs. overwhelming?
- Where the line sits between "aggressive" and "strict" defaults for a first-time user with no behavioral history yet.
- Pricing model (subscription vs. one-time, per the competitor precedents in Gemini Photos/Slidebox).

## Screen-by-Screen Breakdown

### Onboarding Flow

1. Welcome / value prop screen — one-line statement, brief visual of "before/after" library state
2. Permission request screen — iOS Photos library access request (Phase 1 only; Phase 0 uses a file-upload picker instead)
3. Cleanup Preference Profile setup — the 3-4 question flow: aggressiveness, junk categories to flag, automation level, confidence threshold
4. Initial scan / processing screen — a progress state while on-device detection runs the first pass (needs clear "this may take a moment" messaging, since first scans on large libraries could be slow)

### Core Review Flow (the heart of the app)

5. Home / Library Overview screen — entry point after onboarding; shows what's been found, broken into categories (e.g. "142 duplicates," "38 screenshots," "12 blurry shots"), each tappable into its own review queue
6. Duplicate/near-duplicate review screen — swipe interface, shows the group together with the suggested "best shot" pre-highlighted, "why" signal visible (e.g. "1 of 12 near-identical")
7. Screenshot/junk review screen — same swipe pattern, different context label ("screenshot," "meme," "download")
8. Blurry/low-quality review screen — same pattern again, reusing the same swipe component with a different "why" tag
9. Batch action confirmation screen — shows what's about to be deleted before it happens (especially important if the user has "auto-clean" mode on — this is the trust checkpoint)
10. Post-cleanup summary screen — "you freed X GB, reviewed Y photos" — the payoff/relief moment the "leaves with" state is built around

### Safety Net

11. Undo / Recently Deleted screen — recoverable items, mirrors or hooks into iOS's own "Recently Deleted" album where possible rather than building a fully separate one
12. Confirmation/undo toast or in-flow prompt — lightweight, appears right after any delete action

### Settings

13. Settings / Preferences screen — edit the Cleanup Preference Profile anytime (not just at onboarding), toggle automation level, adjust confidence threshold
14. Privacy/on-device processing info screen — a simple, honest explanation screen reinforcing the privacy positioning (builds trust, doesn't need to be technical)

### Shared Components (not screens, but worth naming for the build)

- Swipe card component — reused across screens 6, 7, 8; this is genuinely the single most important piece of UI in the whole app per the core features list
- "Why" signal badge/tag — reused everywhere a suggestion appears
- Progress/scanning indicator — reused for initial scan and any re-scan

### Open Structural Question

Should duplicates, screenshots, and blurry photos be three separate review queues (screens 6/7/8 as distinct flows) or one unified "review everything" queue with mixed cards tagged by type? Separate queues are clearer for a first-time user (matches the "batch review" language in the PRD) and easier to build incrementally; default to separate queues for v1 and consider merging later if user testing shows people want one continuous flow.
