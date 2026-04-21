Context
- This note records the admin frontend slice completed on 2026-04-20 after the backend send catalog started returning delivery and click aggregates for newsletter sends.

What changed
- `src/lib/read_dcx_admin_newsletter_sends_catalog.ts`
  - Expanded the TypeScript send-row type to include delivery lifecycle counts and click counts.
  - Updated the fallback error wording from "prepared newsletter sends" to the more accurate "newsletter send rows".
- `src/components/dcx_admin_newsletters_page.tsx`
  - The send section copy now talks about delivery outcomes and click activity instead of saying the surface only snapshots preparation.
  - The section heading now reads as send operations rather than pure preparation.
  - Send cards now distinguish:
    - prepared / sending / sent / failed / cancelled
  - Each send card now shows:
    - recipients
    - send candidates
    - tracked links
    - total clicks
    - unique clicked links
    - awaiting provider
    - accepted by provider
    - delivered
    - skipped
    - failed
  - Cards also surface operational issue badges for:
    - bounced
    - complained
    - waiting translation
    - cancelled recipient rows

Why this matters
- Before this slice, the admin editor had the new backend machinery underneath it, but the send area still looked like a staging list.
- After this change, internal users should start seeing a more truthful operational picture without needing a brand new page or workflow.

Verification
- Admin production build passed successfully with the updated send-row type and UI.
- The existing large chunk-size warning remains, but it is the same non-blocking warning seen elsewhere in the project.

Likely next step
- If we want the admin surface to go deeper, the next useful jump is a recipient-level detail view for one send row, not more summary fields on the current cards.
