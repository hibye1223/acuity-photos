# Acuity Photos — Product Requirements Document

> **Note for engineering (Claude Code): this PRD reflects a scope pivot from an earlier version.** If you have context from a prior version of this doc, the MVP's *hero feature* has changed — read Section 5 and 8 carefully before building. The old "cleanup-first" MVP is now a secondary, still-shipped feature, not the lead feature.

## 1. Product Name

**Acuity Photos**
Domain: [acuityphotos.com](http://acuityphotos.com)
Brand shorthand (later, once established): **Acuity**

## 2. One-Line Statement

Acuity Photos helps people with overwhelming photo libraries use smart technology to effortlessly organize, clean, and rediscover their pictures.

## 3. Summary

An AI-first photo app built around two things: (1) an **AI Album Assistant** that co-creates photo albums with the user through natural-language collaboration — arranging, captioning, and building albums together rather than either fully manual work or a fully automated black box — and (2) a **Cleanup** feature (duplicate detection, junk filtering, confident deletion) offered as a real, marketed secondary feature for users who specifically want it. This PRD covers **v1 (MVP) only**.

## 4. Scope Change Log (why this version differs from earlier drafts)

Earlier MVP planning centered entirely on "confident cleanup" (duplicates, junk, safe deletion) as the hero feature, based on App Store review analysis. That research remains valid and is still reflected in the Cleanup feature below. However, two things changed the plan:

1. **Differentiation risk**: cleanup-only is proven, cheap-to-build tech already shipped by Gemini Photos, Slidebox, and Swipewipe. Leading with it risks the product reading as "just another duplicate cleaner."
2. **New primary research**: direct interviews (not App Store reviews) surfaced a strong, repeated pain point — parents, especially mothers, describing the manual work of building family/trip albums as tedious, and explicitly wishing it were automated **while still feeling personal, not robotic**. This is first-hand qualitative evidence, distinct from and additional to the original review dataset.

Decision: **the AI Album Assistant becomes the MVP's hero feature. Cleanup is retained and still shipped, but repositioned as a supporting/secondary feature**, both marketed on its own for users who want it and used internally as a quality filter (e.g., not proposing a blurry or duplicate photo into an album).

**Caveat engineering should know:** the album-assistant direction is currently based on a smaller set of direct interviews, not yet validated at the scale of the original 500-review dataset. Broader interview validation is an open action item (see Section 15), not yet complete.

## 5. Solution / Value Proposition

**Hero feature — one job:** let a user build a genuinely good, personal-feeling photo album (a trip, an event, a family history) by collaborating with an AI, instead of either doing it all manually or accepting an automated result that feels robotic or generic.

**Secondary feature — one job:** let the user trust that they can clean up their photos without regretting it (unchanged from earlier scope).

**Critical design principle for the hero feature:** the bar is not just "arranges photos correctly" — it's **"feels like something a thoughtful person made, not a machine."** This came directly from interview language ("automatic, but still normal-sounding"). Outputs that are technically correct but feel templated, robotic, or uncanny (odd captions, generic arrangement, mislabeled people) count as a failure of this feature, not just a rough edge.

## 6. Target Users (v1)

**Primary — Album Assistant:** Parents (mothers specifically surfaced repeatedly in interviews) who want to create family/trip/event albums to share or preserve, but find manually selecting, arranging, and captioning photos too time-consuming to actually do it.

**Secondary — Cleanup:** Someone with an overloaded camera roll (5,000+ photos) who has hit a "storage full" notification and avoids deleting anything because they're unsure what's safe to lose. (Unchanged from earlier scope — this persona and feature still ship, just not as the lead.)

## 7. User Journey (Hero Feature)

**Starts with:** A folder/library of photos from a specific trip, event, or time period the user wants to turn into an album, plus the tedium of knowing they'd have to select, sort, and caption everything manually to do it well.

**Leaves with:** A finished, shareable album that feels personally curated — correctly arranged, captioned, with ambiguous inclusions (like an unrecognized recurring person) resolved by the user's own input, not the AI's silent guess.

## 8. Core Features (Must-Have for v1)

### 8A. AI Album Assistant (Hero Feature)

| # | Feature | Notes |
|---|---|---|
| 1 | Natural-language album commands | User can request things like "build an album from the Tokyo trip," "put these in order," "add captions" — conversational, not a rigid form |
| 2 | Time + location clustering | Groups photos into candidate "events" using timestamp and GPS data — reliable, low-risk signal, not deep semantic inference |
| 3 | AI-generated sequencing and captions | The AI proposes an order and captions; user can accept, edit, or regenerate — never a final, unchangeable output |
| 4 | Face clustering with human-confirmed labeling | The AI notices a recurring unlabeled face and **asks** the user who it is or whether to include/exclude them — the AI never infers relationships (e.g. "family" vs. "coworker") or makes exclusion decisions on its own |
| 5 | Manual override at every step | User can add, remove, reorder, or re-caption anything the AI proposes — this is explicitly collaborative, not a one-shot generator |
| 6 | Quality filter (uses Cleanup's detection engine) | Duplicate/blurry photos are filtered out of album suggestions automatically, reusing the detection engine from 8B rather than duplicating the work |

### 8B. Cleanup (Secondary, still marketed)

| # | Feature | Solves |
|---|---|---|
| 7 | Duplicate / near-duplicate detection with "best shot" suggestion | Duplicate overload |
| 8 | Screenshot / junk auto-detection with batch review | Screenshot/meme pollution |
| 9 | Fast swipe-style review interface | Manual cleanup burden |
| 10 | Visible "why" signal per suggestion (e.g. "1 of 12 near-identical," "screenshot," "blurry") | Fear of deleting |
| 11 | Automation-approval control ("review everything" vs. "auto-clean, summarize after") | Trust at scale |
| 12 | Undo / recovery safety net | Fear of deleting |
| 13 | On-device processing | Privacy positioning, trust |
| 14 | Cleanup Preference Profile (declared, not learned — see Section 9) | Personalization without ML complexity |

## 9. Personalization in v1: Cleanup Preference Profile

(Unchanged from earlier scope — applies to the Cleanup feature.)

A short, declared (not learned) setup flow — 3-4 questions during onboarding, editable anytime in settings:

- **Aggressiveness**: how strict should duplicate/near-duplicate matching be (loose vs. strict)?
- **Junk categories**: which types should be flagged at all — screenshots, memes/downloads, blurry shots — opt in/out per category.
- **Automation level**: always ask before removing anything, or auto-clean with a post-hoc summary.
- **Confidence threshold**: how sure should the app be before suggesting something as safe to delete (conservative vs. aggressive)?

This is deliberately **not** the adaptive, behavior-learning system deferred to a later release. It's a preference form, not a model.

**Note:** face-label memory in the Album Assistant (Section 8A, #4 — remembering a labeled face next time it appears) is a small, explicitly-scoped exception to "no learning in v1." It stores a user-provided label tied to a face cluster — it does not infer relationships or preferences on its own. Keep this distinct from the deferred adaptive personalization system in engineering discussions, so it doesn't quietly expand scope.

## 10. Explicitly Out of Scope for v1

- Automatic relationship inference (the AI deciding who is "family," "friend," or "coworker" on its own)
- Automatic exclusion of people/photos from an album without explicit user direction
- Fully automatic albums with no human-in-the-loop step
- General natural-language *search* across the whole library (distinct from album-building commands, which are in scope)
- Cross-platform or cross-cloud photo aggregation
- Sharing / collaborative multi-user albums (single-user album creation is in scope; multi-person shared editing is not)
- Adaptive AI personalization that learns preferences over time (beyond the scoped face-label exception above)
- Library health dashboards, storage analytics views

## 11. Success Metrics (proposed — needs founder input)

**Album Assistant:**

- % of AI-proposed albums shared or saved without being abandoned mid-creation
- Number of manual edits/regenerations per album (proxy for "did it feel right the first time")
- % of unlabeled-face prompts the user actually responds to vs. ignores/dismisses

**Cleanup:**

- % of suggested deletions accepted without reversal (trust proxy)
- Time-to-first-value: time from install to first completed cleanup batch

## 12. Phased Technical Approach

**Why phased:** the Cleanup feature's core job ("clean up your real photo library") requires deep, ongoing access to the system photo library and the ability to delete/modify items in place. Web apps cannot get this on iOS — Safari only allows a one-time manual file picker, no batch library access, no metadata, and no ability to delete from the real Photos app. The Album Assistant's core job (arranging/captioning a user-selected set of photos) is less dependent on this constraint, since it operates on a chosen subset rather than requiring full in-place library management — but it still benefits from real device integration for a production-quality experience.

### Phase 0 — Web Prototype (proof of concept)

**Purpose:** validate both features' core interactions quickly, before investing in native platform work.

**Scope:**

- User manually uploads a sample batch of photos (stand-in for library access)
- **Album Assistant flow**: time/location clustering, natural-language album commands, AI-proposed sequencing/captions, face clustering with human-confirmed labeling prompts — all testable here
- **Cleanup flow**: duplicate/near-duplicate detection, screenshot/junk classification, quality scoring, swipe review UI, Cleanup Preference Profile — all testable here (unchanged from earlier scope)

**Explicitly not solved at this phase:** real library access, in-place delete, undo against the actual Photos app, on-device privacy guarantees.

**Output:** a working demo for mentor/investor validation and UX testing — not a distributable product.

### Phase 1 — iOS Native (the actual v1 MVP)

**Purpose:** deliver both features against a user's actual photo library, with production-quality privacy and reliability.

**Requirements:**

- `PHPhotoLibrary` / Photos framework integration for library read + in-place delete (Cleanup) and photo selection (Album Assistant)
- On-device inference (Core ML or equivalent) for duplicate/screenshot/quality detection
- On-device or hybrid approach for face clustering and natural-language command interpretation for the Album Assistant — **this is a bigger technical lift than Cleanup's classical computer-vision work and needs its own evaluation of on-device feasibility vs. a privacy-conscious hybrid (on-device clustering, minimal cloud calls only for caption generation, clearly disclosed to the user)**
- Native undo/recovery architecture tied to the system's own trash/recently-deleted behavior
- Local-only processing wherever feasible, to back up the privacy positioning

**Sequencing note for Claude Code:** build Phase 0 first to validate both flows fast, but treat it as disposable prototyping code, not a codebase to migrate — the underlying platform APIs are different enough (browser JS vs. Swift + Photos framework) that a rewrite is expected. **Within Phase 0, build the Cleanup flow first** (lower technical risk, already-validated approach) before the Album Assistant flow (higher risk, less-proven interaction pattern) — this de-risks the harder feature by validating the underlying detection/clustering engine on the easier feature first.

## 13. Key Risks

- **Evidentiary risk**: the Album Assistant, now the hero feature, rests on a smaller, less-validated research base (direct interviews) than the Cleanup feature (500-review analysis). Treat this as an open validation item, not settled fact — see Section 15.
- **"Feels robotic" failure mode**: per the interview finding, technically-correct-but-impersonal output (odd captions, uncanny arrangement, mislabeled people) counts as a product failure even if the underlying logic is accurate. This needs dedicated design/QA attention, not just functional testing.
- **Face-clustering trust risk**: even with human-confirmed labeling (not auto-inference), a face-clustering system that's inaccurate or intrusive-feeling could undermine trust fast — the "why is it asking me about this person" moment needs careful UX handling.
- **Technical risk**: the Album Assistant's natural-language command interpretation and captioning likely requires more sophisticated AI (possibly hybrid on-device/cloud) than Cleanup's classical computer vision — this is a bigger, less-proven engineering lift and should be scoped and estimated separately from Cleanup's timeline.
- **Original risk (unchanged)**: a bad auto-suggestion early in onboarding (either feature) could break trust permanently — QA here is higher priority than shipping additional scope.

## 14. Open Questions

- Exact wording/UX for face-clustering prompts ("who is this?") — how to ask without feeling invasive.
- How much AI-proposed album output should be shown at once vs. built up conversationally, turn by turn.
- Where the "feels robotic" line actually sits — needs real user testing, not just internal judgment.
- Whether Album Assistant captioning/sequencing runs fully on-device or needs a disclosed hybrid cloud component, and how that's communicated to preserve the privacy promise.
- Pricing model (subscription vs. one-time), and whether Cleanup and Album Assistant are priced/packaged separately or together.

## 15. Action Items Before Full Commitment

- **Expand interview validation**: current "moms want automated-but-personal album help" finding comes from a limited set of direct interviews. Broaden this (aim for 10-15+ across a less-concentrated network) before treating it as fully validated demand for the hero feature.
- Confirm with mentors specifically *why* they suggested web-first, to reconcile with the technical tradeoffs in Section 12.
