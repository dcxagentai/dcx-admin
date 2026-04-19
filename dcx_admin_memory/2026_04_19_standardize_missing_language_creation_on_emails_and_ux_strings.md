The admin translation-editor pattern is now more consistent across the CMS. Pages, categories, and newsletters already had a real "create missing language row" combobox flow; this session extended that same pattern to transactional emails and UX strings so those editors no longer stop at language switching alone.

Frontend changes:
- Added `create_dcx_admin_email_translation.ts` and `create_dcx_admin_ux_string_translation.ts` so the admin frontend has explicit translation-create boundaries for transactional emails and UX strings.
- Extended `dcx_admin_language_flag_options.ts` with a small supported-language source of truth plus `readDcxAdminMissingLanguageRows()`, which lets editors compute missing language rows from the currently available live translations.
- Patched `dcx_admin_emails_catalog_page.tsx` so the shared translation controls can now render the missing-language combobox and create new transactional-email translations.
- Patched `dcx_admin_ux_strings_catalog_page.tsx` the same way, and also changed the editor layout so the right-hand editable column remains visible even when the selected route is the English original row.

Product/UI effect:
- Missing-language creation now uses the same combobox-based pattern across pages, categories, newsletters, transactional emails, and UX strings.
- UX strings now always preserve the "original on the left / editable selected language on the right" mental model, even when the selected row is English original. That keeps the layout stable for admins and makes the translation model easier to explain to clients.

Checks:
- `dcx_admin` TypeScript build passed with `tsc -b`.
