Context
- This note records the admin UI refinement completed on 2026-04-20 after the newsletter send operations section was already showing richer send-state summaries.

What changed
- The admin app now includes local `shadcn`-style `Popover` and `Calendar` primitives in:
  - `src/components/ui/popover.tsx`
  - `src/components/ui/calendar.tsx`
- The admin app now also includes a local `ButtonGroup` primitive in:
  - `src/components/ui/button-group.tsx`
- The official `shadcn` generator was attempted first, but it only completed the dependency install portion because the repo already had some existing UI files and the interactive flow did not finish the file-generation step.
- `package.json` now includes the dependencies needed for the calendar stack:
  - `react-day-picker`
  - `date-fns`
- `src/components/dcx_admin_newsletters_page.tsx`
  - Replaced the raw `datetime-local` scheduler field with:
    - a `Popover + Calendar` date picker
    - a dedicated time input
  - Wrapped the adjacent send action buttons in a shared `ButtonGroup` so the newsletter operations surface starts using grouped shadcn-style actions consistently.
  - Kept the existing backend contract unchanged by still deriving one `scheduled_send_at_ts_ms` timestamp from the selected date + time.

Why this matters
- This keeps the scheduling UX inside the same `shadcn` component language the admin app is already using.
- It also gives us a reusable calendar primitive for future admin surfaces instead of leaving date-picking stuck on browser-native inputs.

Verification
- `npm run build` passed in `dcx_site/dcx_admin`.
- The existing chunk-size warning remains non-blocking and unchanged in nature.

Likely next step
- Reuse the same calendar/popover pair for other admin scheduling or publish-at surfaces instead of introducing more raw date inputs.
