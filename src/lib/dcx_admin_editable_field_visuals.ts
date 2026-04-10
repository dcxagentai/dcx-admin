/**
 * CONTEXT:
 * Shared visual-state helpers for editable DCX admin fields and editors.
 * They keep categories, pages, newsletters, UX strings, and email templates aligned
 * around one compact human-readable save-state language while we modernize the admin UI.
 */

export type DcxAdminEditableFieldVisualState = "idle" | "editing" | "saving" | "saved" | "error"

export const DCX_ADMIN_EDITABLE_FIELD_SAVED_VISIBLE_MS = 10000

export function readDcxAdminEditableFieldBorderClass(
  visualState: DcxAdminEditableFieldVisualState,
): string {
  if (visualState === "editing" || visualState === "saving") {
    return "border-amber-300"
  }

  if (visualState === "saved") {
    return "border-emerald-300"
  }

  if (visualState === "error") {
    return "border-red-300"
  }

  return "border-sky-300"
}

export function readDcxAdminEditableFieldStatusTextClass(
  visualState: DcxAdminEditableFieldVisualState,
): string {
  if (visualState === "editing" || visualState === "saving") {
    return "text-amber-600"
  }

  if (visualState === "saved") {
    return "text-emerald-600"
  }

  if (visualState === "error") {
    return "text-red-600"
  }

  return "text-sky-700"
}

export function readDcxAdminEditableFieldCompactStatusLabel(
  visualState: DcxAdminEditableFieldVisualState,
): string {
  if (visualState === "editing" || visualState === "saving") {
    return "Changed, unsaved"
  }

  if (visualState === "saved") {
    return "Saved"
  }

  if (visualState === "error") {
    return "Save failed"
  }

  return "Editable"
}
