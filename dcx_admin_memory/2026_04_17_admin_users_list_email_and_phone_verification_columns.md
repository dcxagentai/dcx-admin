The admin users directory table was updated to stop showing two redundant confirmation signals (`status` and `confirmed`) that effectively both mirrored the confirmed-account state.

New shape:

- keep the first email column with the actual primary email address
- replace the old `Status` column with a compact primary-email verification indicator
- replace the old `Confirmed` column with a compact primary-phone verification indicator

Verification display logic:

- green check icon = primary contact method exists and is verified
- orange check icon = primary contact method exists but is saved and not yet verified
- dash = no primary contact method exists for that type

Backend changes:

- `admin/users/read_dcx_admin_user_list.py` now reads both the primary email and primary phone contact-method rows via lateral joins
- the response payload now includes:
  - `primary_phone`
  - `primary_phone_confirmed`
  - `primary_phone_confirmed_at_ts_ms`

Frontend changes:

- `dcx_admin_users_list_page.tsx` renders compact icon cells for email and phone verification instead of repeating the old account-confirmed state
- `read_dcx_admin_users_list.ts` type definitions now include the primary phone fields

Checks run:

- backend `py_compile` passed for the touched capability
- frontend `npx tsc -b` passed in `dcx_admin`

Follow-up idea:

- if we want to make the table even more legible later, we can add small hover titles or tooltips that include the actual primary phone value and whether the status is verified vs pending verification.
