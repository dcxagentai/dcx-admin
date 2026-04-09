The admin workspace now has first-pass content management surfaces for pages and newsletter content.

What was added:
- new path-based routes:
  - `/content/pages`
  - `/content/pages/{language_code}/{page_key}`
  - `/content/newsletters`
  - `/content/newsletters/{language_code}/{email_key}`
- new workspace tabs:
  - `Pages`
  - `Newsletters`
- content pages editor:
  - create draft
  - catalog list
  - debounced autosave
  - explicit publish
  - explicit archive
  - simple markdown split preview
- newsletter content editor:
  - create draft
  - catalog list
  - debounced autosave
  - simple markdown split preview

Important UX decisions:
- path-based routing instead of query-string selectors
- simple markdown preview only, no rich text editor and no extra library
- autosave is document-oriented and debounced rather than immediate keystroke-by-keystroke versioning

Verification completed:
- `dcx_admin` production build passed

Residual follow-up:
- no sending/scheduling controls exist yet for newsletters
- page and newsletter copy polish can happen later once the client starts using the basic CMS surfaces
