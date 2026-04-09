/**
 * CONTEXT:
 * First admin content-page categories surface for the DCX internal frontend.
 * It exists to let internal users create, edit, translate, and save public content-page categories
 * using the same immutable multilingual model as pages and newsletters.
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { readDcxAdminContentPageCategoriesCatalog } from "../lib/read_dcx_admin_content_page_categories_catalog"
import {
  readDcxAdminContentPageCategoryDetail,
  type DcxAdminContentPageCategoryDetail,
} from "../lib/read_dcx_admin_content_page_category_detail"
import { createDcxAdminContentPageCategoryDraft } from "../lib/create_dcx_admin_content_page_category_draft"
import { createDcxAdminContentPageCategoryTranslation } from "../lib/create_dcx_admin_content_page_category_translation"
import { saveDcxAdminContentPageCategoryLiveRow } from "../lib/save_dcx_admin_content_page_category_live_row"

type Props = {
  apiBaseUrl: string
  routeCategoryKey: string | null
  routeLanguageCode: string | null
  onOpenCategory: (params: { categoryKey: string; languageCode: string }) => void
}

type EditorVisualState = "idle" | "editing" | "saving" | "saved" | "error"

type DraftState = {
  category_name: string
  category_description: string
  category_slug: string
}

function formatTimestampLabel(timestampMs: number | null): string {
  if (typeof timestampMs !== "number") return "Not set"
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(timestampMs),
  )
}

function readVisualBorderClass(state: EditorVisualState): string {
  if (state === "editing" || state === "saving") return "border-amber-300"
  if (state === "saved") return "border-emerald-300"
  if (state === "error") return "border-red-300"
  return "border-sky-300"
}

function readVisualTextClass(state: EditorVisualState): string {
  if (state === "editing" || state === "saving") return "text-amber-600"
  if (state === "saved") return "text-emerald-600"
  if (state === "error") return "text-red-600"
  return "text-sky-700"
}

function buildDetailSnapshot(detail: DcxAdminContentPageCategoryDetail): string {
  return JSON.stringify({
    category_name: detail.category_name,
    category_description: detail.category_description,
    category_slug: detail.category_slug,
  })
}

function buildDraftSnapshot(draft: DraftState): string {
  return JSON.stringify(draft)
}

function MetadataRow(props: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-black/5 py-3 last:border-b-0">
      <dt className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
        {props.label}
      </dt>
      <dd className="max-w-[22rem] text-right text-sm text-slate-900">{props.value}</dd>
    </div>
  )
}

export function DcxAdminContentPageCategoriesPage(props: Props) {
  const queryClient = useQueryClient()
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resetStateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const categoriesQuery = useQuery({
    queryKey: ["dcx_admin_content_page_categories_catalog"],
    queryFn: async () => readDcxAdminContentPageCategoriesCatalog({ apiBaseUrl: props.apiBaseUrl }),
  })
  const categoryDetailQuery = useQuery({
    queryKey: ["dcx_admin_content_page_category_detail", props.routeLanguageCode, props.routeCategoryKey],
    queryFn: async () =>
      readDcxAdminContentPageCategoryDetail({
        apiBaseUrl: props.apiBaseUrl,
        categoryKey: props.routeCategoryKey ?? "",
        languageCode: props.routeLanguageCode ?? "en",
      }),
    enabled: Boolean(props.routeCategoryKey && props.routeLanguageCode),
  })

  const createDraftMutation = useMutation({
    mutationFn: async (params: { categoryName: string; languageCode: string }) =>
      createDcxAdminContentPageCategoryDraft({
        apiBaseUrl: props.apiBaseUrl,
        categoryName: params.categoryName,
        languageCode: params.languageCode,
      }),
    onSuccess: async (payload) => {
      await queryClient.invalidateQueries({ queryKey: ["dcx_admin_content_page_categories_catalog"] })
      props.onOpenCategory({
        categoryKey: payload.data.category_key,
        languageCode: payload.data.language_code,
      })
    },
  })
  const saveMutation = useMutation({
    mutationFn: async (params: DraftState & { categoryId: number }) =>
      saveDcxAdminContentPageCategoryLiveRow({
        apiBaseUrl: props.apiBaseUrl,
        categoryId: params.categoryId,
        categoryName: params.category_name,
        categoryDescription: params.category_description,
        categorySlug: params.category_slug,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dcx_admin_content_page_categories_catalog"] }),
        queryClient.invalidateQueries({
          queryKey: ["dcx_admin_content_page_category_detail", props.routeLanguageCode, props.routeCategoryKey],
        }),
        queryClient.invalidateQueries({ queryKey: ["dcx_admin_public_site_publish_status"] }),
      ])
    },
  })
  const createTranslationMutation = useMutation({
    mutationFn: async (params: { targetLanguageCode: string }) =>
      createDcxAdminContentPageCategoryTranslation({
        apiBaseUrl: props.apiBaseUrl,
        categoryKey: props.routeCategoryKey ?? "",
        sourceLanguageCode: props.routeLanguageCode ?? "en",
        targetLanguageCode: params.targetLanguageCode,
      }),
    onSuccess: async (payload) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dcx_admin_content_page_categories_catalog"] }),
        queryClient.invalidateQueries({
          queryKey: ["dcx_admin_content_page_category_detail", props.routeLanguageCode, props.routeCategoryKey],
        }),
      ])
      props.onOpenCategory({
        categoryKey: payload.data.category_key,
        languageCode: payload.data.language_code,
      })
    },
  })

  const categories = categoriesQuery.data?.data.categories ?? []
  const detail = categoryDetailQuery.data?.data ?? null
  const [newCategoryName, setNewCategoryName] = useState("")
  const [editorDraft, setEditorDraft] = useState<DraftState | null>(null)
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState("")
  const [visualState, setVisualState] = useState<EditorVisualState>("idle")
  const [statusText, setStatusText] = useState(
    "Blue means editable. Orange means changed. Autosave runs every 30 seconds or you can save now.",
  )

  useEffect(() => {
    if (!detail) {
      setEditorDraft(null)
      setLastSavedSnapshot("")
      setVisualState("idle")
      setStatusText(
        "Blue means editable. Orange means changed. Autosave runs every 30 seconds or you can save now.",
      )
      return
    }
    const nextDraft = {
      category_name: detail.category_name,
      category_description: detail.category_description,
      category_slug: detail.category_slug,
    }
    setEditorDraft(nextDraft)
    setLastSavedSnapshot(buildDetailSnapshot(detail))
    setVisualState("idle")
    setStatusText(
      "Blue means editable. Orange means changed. Autosave runs every 30 seconds or you can save now.",
    )
  }, [detail?.category_id, detail?.updated_at_ts_ms])

  useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current)
      if (resetStateTimeoutRef.current) clearTimeout(resetStateTimeoutRef.current)
    }
  }, [])

  const draftSnapshot = editorDraft ? buildDraftSnapshot(editorDraft) : ""
  const isDirty = detail !== null && editorDraft !== null && draftSnapshot !== lastSavedSnapshot
  const isAnyWritePending =
    createDraftMutation.isPending || saveMutation.isPending || createTranslationMutation.isPending

  async function persistCurrentDraft(): Promise<void> {
    if (!detail || !editorDraft || !isDirty) return
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current)
      autosaveTimeoutRef.current = null
    }
    setVisualState("saving")
    setStatusText("Saving category...")
    try {
      await saveMutation.mutateAsync({ categoryId: detail.category_id, ...editorDraft })
      setVisualState("saved")
      setStatusText("Category saved.")
      if (resetStateTimeoutRef.current) clearTimeout(resetStateTimeoutRef.current)
      resetStateTimeoutRef.current = setTimeout(() => {
        setVisualState("idle")
        setStatusText(
          "Blue means editable. Orange means changed. Autosave runs every 30 seconds or you can save now.",
        )
      }, 1400)
    } catch (error) {
      setVisualState("error")
      setStatusText(
        (error as Error & { suggested_action?: string }).suggested_action ??
          "Save failed. Keep the tab open and retry after the backend is healthy.",
      )
    }
  }

  useEffect(() => {
    if (!detail || !editorDraft || !isDirty || isAnyWritePending) return
    setVisualState("editing")
    setStatusText("Editing. Save now or wait for the 30 second autosave.")
    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current)
    autosaveTimeoutRef.current = setTimeout(() => {
      void persistCurrentDraft()
    }, 30000)
  }, [detail, editorDraft, isDirty, isAnyWritePending])

  const selectedCategoryKeys = useMemo(
    () => new Set(props.routeCategoryKey ? [props.routeCategoryKey] : []),
    [props.routeCategoryKey],
  )

  function updateDraft(patch: Partial<DraftState>) {
    setEditorDraft((current) => (current ? { ...current, ...patch } : current))
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
      <section className="space-y-6">
        <article className="rounded-[1.75rem] border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
          <div className="mb-5 space-y-2 border-b border-black/6 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Content</p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Page categories</h2>
            <p className="text-sm leading-6 text-slate-600">
              Create, edit, and translate the categories used by public content pages. Category rows follow the same immutable version model as the rest of the CMS.
            </p>
          </div>

          <div className="space-y-3 rounded-[1.25rem] border border-black/6 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              New category
            </p>
            <input
              value={newCategoryName}
              onChange={(event) => setNewCategoryName(event.target.value)}
              placeholder="Category name"
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none"
            />
            <button
              type="button"
              onClick={() =>
                createDraftMutation.mutate({
                  categoryName: newCategoryName,
                  languageCode: "en",
                })
              }
              disabled={createDraftMutation.isPending || newCategoryName.trim() === ""}
              className="inline-flex h-11 items-center justify-center rounded-full bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createDraftMutation.isPending ? "Creating category..." : "New category"}
            </button>
            {createDraftMutation.isError ? (
              <p className="text-sm text-red-600">
                {(createDraftMutation.error as Error & { suggested_action?: string }).suggested_action ??
                  (createDraftMutation.error as Error).message}
              </p>
            ) : null}
          </div>
        </article>

        <article className="rounded-[1.75rem] border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
          <div className="mb-5 flex items-start justify-between gap-4 border-b border-black/6 pb-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Catalog</p>
              <h3 className="text-xl font-semibold tracking-tight text-slate-950">Existing categories</h3>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              {categoriesQuery.data?.data.total_live_category_count ?? 0} live rows
            </div>
          </div>

          <div className="space-y-3">
            {categories.map((category) => (
              <button
                key={category.category_key}
                type="button"
                onClick={() =>
                  props.onOpenCategory({
                    categoryKey: category.category_key,
                    languageCode: category.language.language_code,
                  })
                }
                className={[
                  "flex w-full flex-col gap-1 rounded-[1.25rem] border px-4 py-4 text-left transition",
                  selectedCategoryKeys.has(category.category_key)
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-black/6 bg-white text-slate-950 hover:border-slate-300",
                ].join(" ")}
              >
                <p className="text-base font-semibold tracking-tight">{category.category_name}</p>
                <p className={selectedCategoryKeys.has(category.category_key) ? "text-sm text-white/70" : "text-sm text-slate-600"}>
                  /{category.category_slug}
                </p>
                <p className={selectedCategoryKeys.has(category.category_key) ? "text-xs text-white/60" : "text-xs text-slate-500"}>
                  Updated {formatTimestampLabel(category.updated_at_ts_ms)}
                </p>
              </button>
            ))}
            {categories.length === 0 && !categoriesQuery.isLoading ? (
              <p className="text-sm text-slate-500">No content-page categories exist yet.</p>
            ) : null}
          </div>
        </article>
      </section>

      <article className="rounded-[1.75rem] border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-black/6 pb-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Editor</p>
            <h3 className="text-xl font-semibold tracking-tight text-slate-950">
              {detail ? `${detail.language.language_name_native} category` : "Select a category"}
            </h3>
          </div>
          {detail ? (
            <p className={["text-xs font-medium", readVisualTextClass(visualState)].join(" ")}>
              {statusText}
            </p>
          ) : null}
        </div>

        {!props.routeCategoryKey ? (
          <p className="text-sm text-slate-500">Choose a category from the list or create a new one.</p>
        ) : null}

        {detail && editorDraft ? (
          <div className="space-y-6">
            <section className="space-y-4 rounded-[1.25rem] border border-black/6 bg-slate-50 px-4 py-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Translations
                </p>
                <h4 className="text-lg font-semibold tracking-tight text-slate-950">
                  Existing and missing language rows
                </h4>
              </div>
              <div className="flex flex-wrap gap-3">
                {detail.translation_summary.existing_translations.map((translation) => (
                  <button
                    key={translation.language.language_code}
                    type="button"
                    onClick={() =>
                      props.onOpenCategory({
                        categoryKey: translation.category_key,
                        languageCode: translation.language.language_code,
                      })
                    }
                    className={[
                      "rounded-full border px-4 py-2 text-sm font-medium transition",
                      translation.is_current_language
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-950",
                    ].join(" ")}
                  >
                    {translation.language.language_name_native}
                    {translation.is_original ? " · original" : ""}
                  </button>
                ))}
              </div>
              {detail.translation_summary.missing_languages.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Missing languages
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {detail.translation_summary.missing_languages.map((language) => (
                      <button
                        key={language.language_code}
                        type="button"
                        onClick={() => createTranslationMutation.mutate({ targetLanguageCode: language.language_code })}
                        disabled={createTranslationMutation.isPending}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {createTranslationMutation.isPending ? "Creating..." : `Create ${language.language_name_native}`}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Category name</span>
              <input
                value={editorDraft.category_name}
                onChange={(event) => updateDraft({ category_name: event.target.value })}
                className={["h-12 w-full rounded-2xl border bg-slate-50 px-4 text-base outline-none", readVisualBorderClass(visualState)].join(" ")}
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Description</span>
              <textarea
                value={editorDraft.category_description}
                onChange={(event) => updateDraft({ category_description: event.target.value })}
                rows={4}
                className={["w-full resize-y rounded-[1.1rem] border bg-slate-50 px-4 py-3 text-sm outline-none", readVisualBorderClass(visualState)].join(" ")}
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Slug</span>
              <input
                value={editorDraft.category_slug}
                onChange={(event) => updateDraft({ category_slug: event.target.value })}
                className={["h-11 w-full rounded-2xl border bg-slate-50 px-4 text-sm outline-none", readVisualBorderClass(visualState)].join(" ")}
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void persistCurrentDraft()}
                disabled={!isDirty || isAnyWritePending}
                className="inline-flex h-11 items-center justify-center rounded-full bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saveMutation.isPending ? "Saving..." : "Save category"}
              </button>
            </div>

            {saveMutation.isError ? (
              <p className="text-sm text-red-600">
                {(saveMutation.error as Error & { suggested_action?: string }).suggested_action ??
                  (saveMutation.error as Error).message}
              </p>
            ) : null}

            <dl>
              <MetadataRow label="Category key" value={detail.category_key} />
              <MetadataRow label="Updated at" value={formatTimestampLabel(detail.updated_at_ts_ms)} />
              <MetadataRow
                label="Public route base"
                value={`/${detail.language.language_code}/${editorDraft.category_slug}`}
              />
            </dl>
          </div>
        ) : null}
      </article>
    </section>
  )
}
