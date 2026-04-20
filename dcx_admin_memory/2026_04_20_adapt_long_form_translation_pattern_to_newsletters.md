The newsletter editor now follows the same emerging long-form translation pattern as content pages.

What changed:
- The header now uses the actual newsletter subject instead of a generic flagged language title.
- The unified language selector/creator moved into the top-right editor control cluster.
- Translation mode now swaps into a compare layout:
  - left column = original newsletter, read-only
  - right column = selected translation, editable
- Original mode keeps the simpler editable subject/body + preview layout.
- Newsletter autosave/save-state behavior now matches the stronger pages pattern:
  - autosave countdown visible
  - manual save shows saving state
  - successful save holds green state

Why this matters:
- We now have a coherent “longer content” translation pattern that sits naturally beside the smaller UX/category/transactional pattern.
- This gives us a real template for sequence emails once that route becomes a real editor rather than a placeholder shell.

Open follow-up:
- `email_sequences` in `App.tsx` is still only a placeholder route, so the same pattern has not yet been applied there because there is no real sequence editor component to port.
