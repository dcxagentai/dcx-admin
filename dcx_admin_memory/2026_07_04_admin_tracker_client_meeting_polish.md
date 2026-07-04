CONTEXT:
Small Tracker polish pass before a client meeting.

WHAT CHANGED:
- Removed the redundant Tracker eyebrow label from the page header.
- Removed the explanatory tracker sentence under the page title.
- Kept the Activity update subheader, but removed visible Item, Type, and Update labels from the composer.
- Moved the activity update textarea directly under the Activity update subheader and made it full width.
- Moved the composer controls to the next line in this order:
  - update type
  - target item
  - Add update button

VERIFICATION:
- `cmd /c node_modules\.bin\tsc -b` passed.
- `cmd /c node_modules\.bin\vite build --logLevel error` passed when run outside the restricted sandbox.
