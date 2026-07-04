CONTEXT:
Fourth admin Tracker UX pass after testing the first route-filtered views.

WHAT CHANGED:
- Tracker home is now a hierarchy map from top-level items down through Challenges. Tasks are intentionally omitted from the home map.
- Long-term, Strategies, Operations, Challenges, and Tasks views now show flat lists containing only items at that level.
- Detail panel now carries the context:
  - Belongs to: clickable ancestor titles.
  - Contains: clickable descendant titles grouped by level.
- Activity update composer moved near the top of every loaded Tracker page, below the header block.
- Activity composer has dropdowns for target item and update type, and selected cards prefill the target item.
- The moving below-card `Child` button was removed. Each visible work card now has a stable icon-only plus control on the card.
- Updates view now shows the recent update stream; update rows can open the related work item in the detail panel.

VERIFICATION:
- `cmd /c node_modules\.bin\tsc -b` passed.
- `cmd /c node_modules\.bin\vite build --logLevel error` passed when run outside the restricted sandbox.

NOTES:
- No backend/storage change was needed for this pass.
