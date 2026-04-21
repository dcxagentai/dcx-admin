# 2026-04-21 Newsletter Audience, Sequences, And Schedule First Pass

## What changed
- Newsletter send controls now include a shadcn select for `All eligible users`, `Admins only`, and `Devs only`.
- Newsletter send rows now show the chosen audience scope in the operations card.
- Added a real first-pass admin sequences surface:
  - create sequence
  - browse sequence catalog
  - open sequence detail route
  - edit metadata
  - manage ordered steps against existing live original email rows
  - save sequence shell
- Replaced the old schedule placeholder with a real list surface that shows scheduled newsletter sends and scheduled sequence launches.

## UX intent
- This gets newsletters, sequences, and schedule to a believable client/investor stage without claiming the final live worker/webhook plumbing is already complete.
- The sequence editor is intentionally practical rather than fancy. The goal is to prove the model and the control flow, not to over-design the chrome.
- The schedule page is intentionally a list-first overview that can later grow into reschedule/cancel controls.

## Verification
- `dcx_admin` production build passed after the new sequence and schedule surfaces landed.
- The only build output of note was the existing large-chunk Vite warning, not a build failure.

## Remaining follow-up
- Sequence detail does not yet have autosave; it is a manual save surface.
- Sequence steps currently save as a full replacement set rather than granular patch updates.
- The schedule page currently lists newsletter sends and sequence launches, not future content-page publish jobs.
