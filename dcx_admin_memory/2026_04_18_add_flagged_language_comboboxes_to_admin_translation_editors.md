Context
- We extended the new admin catalog-and-editor pattern with a reusable flag-based language combobox for translation-aware editors.
- The old translation controls were rectangular button strips that did not scale well and did not visually match the new phone-country language/country selection pattern.

What changed
- `dcx_admin` now includes local combobox and flag icon UI primitives plus the required dependencies:
  - `@base-ui/react`
  - `country-flag-icons`
- Added `dcx_admin_translation_language_controls.tsx` as one shared translation-language switcher for:
  - page categories
  - pages
  - newsletters
  - transactional emails
  - UX strings
- Existing live language rows now open via a searchable combobox with flags.
- Missing languages on pages/categories/newsletters now also use a searchable combobox with flags for translation creation.

Why this matters
- The translation areas now feel like one coherent admin system instead of five separate one-off widgets.
- Flags provide a quicker visual pointer for internal users and client demos.
- The shared component gives us one place to keep refining the interaction if we later add more languages or more content types.

What to judge next in-browser
- Whether the admin translation comboboxes should remain inside the translation card or move into the editor header on some surfaces.
- Whether the missing-language creator should stay a combobox or become a smaller secondary action on dense editors.
- Whether the selected-language label in each editor header is now enough, or whether we also want a small flag next to the header title.
