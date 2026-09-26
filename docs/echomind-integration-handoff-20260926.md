# EchoMind → L-And-N: Pronunciation practice

Date: 2026-09-26. Status: request for the peer owner; no adapter activated.

Offer an optional lesson deep link accepting an allowlisted lesson/language and user-selected text. Return a result card only when requested. Keep recordings, calibration and scoring owned by L & N; do not upload raw audio or claim a clinical assessment.

## Canonical contract

Read the EchoMind repository's `EchoMind/docs/integrations/ecosystem-v1.md`
on branch `release/ios73-layout-20260906`. Local canonical checkout:
`/home/lachlan/ProjectsLFS/EchoMindSanitized-cache/EchoMindSanitized-formal-current`.
Baseline rollback tag: `pre-agent-navigation-20260926`.

## Scope and next action

EchoMind supplies a versioned, minimal share envelope with an event ID and
explicitly selected resource. This app supplies its own optional adapter,
identity consent, deduplication and unavailable-service fallback. Confirm the
public identifiers/deep links and return a curated handoff before enabling it.
Use the shared contract's six acceptance tests. Keep all core app functions
usable when the peer is absent.

This note does not authorize a wallet transfer, subscription change, service
restart, repository merge, shared database access or credential copying.
Existing app/store work remains owned by this repository's active session.
No runtime, source code, credentials or balances were changed by this handoff.

