/**
 * CONTEXT:
 * First admin content-pages surface for the DCX internal frontend.
 * It exists to let clients and internal users create, edit, autosave, publish, and archive
 * multilingual-ready content pages backed by the immutable backend version model.
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  readDcxAdminContentPageCategoriesCatalog,
} from "../lib/read_dcx_admin_content_page_categories_catalog"
import {
  readDcxAdminContentPagesCatalog,
  type DcxAdminContentPageCatalogRow,
} from "../lib/read_dcx_admin_content_pages_catalog"
import {
  readDcxAdminContentPageDetail,
  type DcxAdminContentPageDetail,
} from "../lib/read_dcx_admin_content_page_detail"
import { createDcxAdminContentPageDraft } from "../lib/create_dcx_admin_content_page_draft"
import { createDcxAdminContentPageTranslation } from "../lib/create_dcx_admin_content_page_translation"
import {
  DCX_ADMIN_EDITABLE_FIELD_SAVED_VISIBLE_MS,
  readDcxAdminEditableFieldBorderClass,
  readDcxAdminEditableFieldCompactStatusLabel,
  readDcxAdminEditableFieldStatusTextClass,
  type DcxAdminEditableFieldVisualState,
} from "../lib/dcx_admin_editable_field_visuals"
import { saveDcxAdminContentPageLiveRow } from "../lib/save_dcx_admin_content_page_live_row"
import { publishDcxAdminContentPageLiveRow } from "../lib/publish_dcx_admin_content_page_live_row"
import { archiveDcxAdminContentPageLiveRow } from "../lib/archive_dcx_admin_content_page_live_row"
import { renderDcxBasicMarkdownToHtml } from "../lib/render_dcx_basic_markdown_to_html"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

type Props = {
  apiBaseUrl: string
  routePageKey: string | null
  routeLanguageCode: string | null
  onOpenPage: (params: { pageKey: string; languageCode: string }) => void
}

function formatTimestampLabel(timestampMs: number | null): string {
  if (typeof timestampMs !== "number") {
    return "Not set"
  }
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(timestampMs),
  )
}

function buildDetailSnapshot(detail: DcxAdminContentPageDetail): string {
  return JSON.stringify({
    category_key: detail.category_key,
    page_title: detail.page_title,
    page_lede: detail.page_lede,
    page_body_markdown: detail.page_body_markdown,
    meta_title: detail.meta_title,
    meta_description: detail.meta_description,
    page_slug: detail.page_slug,
    publication_status: detail.publication_status,
    published_at_ts_ms: detail.published_at_ts_ms,
  })
}

type DraftState = {
  category_key: string
  page_title: string
  page_lede: string
  page_body_markdown: string
  meta_title: string
  meta_description: string
  page_slug: string
  publication_status: string
  published_at_ts_ms: number | null
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

function PageRow(props: {
  row: DcxAdminContentPageCatalogRow
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={[
        "flex w-full flex-col gap-1 border px-4 py-4 text-left transition",
        props.isSelected
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-black/6 bg-white text-slate-950 hover:border-slate-300",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-base font-semibold tracking-tight">{props.row.page_title}</p>
        <span
          className={[
            "rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em]",
            props.isSelected ? "bg-white/10 text-white" : "bg-slate-100 text-slate-600",
          ].join(" ")}
        >
          {props.row.publication_status}
        </span>
      </div>
      <p className={props.isSelected ? "text-sm text-white/70" : "text-sm text-slate-600"}>
        /{props.row.category.category_slug}/{props.row.page_slug}
      </p>
      <p className={props.isSelected ? "text-xs text-white/60" : "text-xs text-slate-500"}>
        Updated {formatTimestampLabel(props.row.updated_at_ts_ms)}
      </p>
    </button>
  )
}

export function DcxAdminContentPagesPage(props: Props) {
  const queryClient = useQueryClient()
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resetStateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const categoriesQuery = useQuery({
    queryKey: ["dcx_admin_content_page_categories_catalog"],
    queryFn: async () => readDcxAdminContentPageCategoriesCatalog({ apiBaseUrl: props.apiBaseUrl }),
  })
  const pagesCatalogQuery = useQuery({
    queryKey: ["dcx_admin_content_pages_catalog"],
    queryFn: async () => readDcxAdminContentPagesCatalog({ apiBaseUrl: props.apiBaseUrl }),
  })
  const pageDetailQuery = useQuery({
    queryKey: ["dcx_admin_content_page_detail", props.routeLanguageCode, props.routePageKey],
    queryFn: async () =>
      readDcxAdminContentPageDetail({
        apiBaseUrl: props.apiBaseUrl,
        pageKey: props.routePageKey ?? "",
        languageCode: props.routeLanguageCode ?? "en",
      }),
    enabled: Boolean(props.routePageKey && props.routeLanguageCode),
  })
  const createDraftMutation = useMutation({
    mutationFn: async (params: { categoryKey: string; pageTitle: string; languageCode: string }) =>
      createDcxAdminContentPageDraft({
        apiBaseUrl: props.apiBaseUrl,
        categoryKey: params.categoryKey,
        pageTitle: params.pageTitle,
        languageCode: params.languageCode,
      }),
    onSuccess: async (payload) => {
      await queryClient.invalidateQueries({ queryKey: ["dcx_admin_content_pages_catalog"] })
      props.onOpenPage({
        pageKey: payload.data.page_key,
        languageCode: payload.data.language_code,
      })
    },
  })
  const saveMutation = useMutation({
    mutationFn: async (draft: DraftState & { pageId: number }) =>
      saveDcxAdminContentPageLiveRow({
        apiBaseUrl: props.apiBaseUrl,
        pageId: draft.pageId,
        categoryKey: draft.category_key,
        pageTitle: draft.page_title,
        pageLede: draft.page_lede,
        pageBodyMarkdown: draft.page_body_markdown,
        metaTitle: draft.meta_title,
        metaDescription: draft.meta_description,
        pageSlug: draft.page_slug,
        publicationStatus: draft.publication_status,
        publishedAtTsMs: draft.published_at_ts_ms,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dcx_admin_content_pages_catalog"] }),
        queryClient.invalidateQueries({
          queryKey: ["dcx_admin_content_page_detail", props.routeLanguageCode, props.routePageKey],
        }),
      ])
    },
  })
  const publishMutation = useMutation({
    mutationFn: async (draft: DraftState & { pageId: number }) =>
      publishDcxAdminContentPageLiveRow({
        apiBaseUrl: props.apiBaseUrl,
        pageId: draft.pageId,
        categoryKey: draft.category_key,
        pageTitle: draft.page_title,
        pageLede: draft.page_lede,
        pageBodyMarkdown: draft.page_body_markdown,
        metaTitle: draft.meta_title,
        metaDescription: draft.meta_description,
        pageSlug: draft.page_slug,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dcx_admin_content_pages_catalog"] }),
        queryClient.invalidateQueries({
          queryKey: ["dcx_admin_content_page_detail", props.routeLanguageCode, props.routePageKey],
        }),
        queryClient.invalidateQueries({ queryKey: ["dcx_admin_public_site_publish_status"] }),
      ])
    },
  })
  const archiveMutation = useMutation({
    mutationFn: async (draft: DraftState & { pageId: number }) =>
      archiveDcxAdminContentPageLiveRow({
        apiBaseUrl: props.apiBaseUrl,
        pageId: draft.pageId,
        categoryKey: draft.category_key,
        pageTitle: draft.page_title,
        pageLede: draft.page_lede,
        pageBodyMarkdown: draft.page_body_markdown,
        metaTitle: draft.meta_title,
        metaDescription: draft.meta_description,
        pageSlug: draft.page_slug,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dcx_admin_content_pages_catalog"] }),
        queryClient.invalidateQueries({
          queryKey: ["dcx_admin_content_page_detail", props.routeLanguageCode, props.routePageKey],
        }),
        queryClient.invalidateQueries({ queryKey: ["dcx_admin_public_site_publish_status"] }),
      ])
    },
  })
  const createTranslationMutation = useMutation({
    mutationFn: async (params: { targetLanguageCode: string }) =>
      createDcxAdminContentPageTranslation({
        apiBaseUrl: props.apiBaseUrl,
        pageKey: props.routePageKey ?? "",
        sourceLanguageCode: props.routeLanguageCode ?? "en",
        targetLanguageCode: params.targetLanguageCode,
      }),
    onSuccess: async (payload) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dcx_admin_content_pages_catalog"] }),
        queryClient.invalidateQueries({
          queryKey: ["dcx_admin_content_page_detail", props.routeLanguageCode, props.routePageKey],
        }),
      ])
      props.onOpenPage({
        pageKey: payload.data.page_key,
        languageCode: payload.data.language_code,
      })
    },
  })

  const categories = categoriesQuery.data?.data.categories ?? []
  const pages = pagesCatalogQuery.data?.data.pages ?? []
  const detail = pageDetailQuery.data?.data ?? null

  const [newPageTitle, setNewPageTitle] = useState("")
  const [newPageCategoryKey, setNewPageCategoryKey] = useState("insights")
  const [editorDraft, setEditorDraft] = useState<DraftState | null>(null)
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState("")
  const [visualState, setVisualState] = useState<DcxAdminEditableFieldVisualState>("idle")

  useEffect(() => {
    if (categories.length > 0 && !categories.some((row) => row.category_key === newPageCategoryKey)) {
      setNewPageCategoryKey(categories[0].category_key)
    }
  }, [categories, newPageCategoryKey])

  useEffect(() => {
    if (!detail) {
      setEditorDraft(null)
      setLastSavedSnapshot("")
      setVisualState("idle")
      return
    }

    const nextDraft = {
      category_key: detail.category_key,
      page_title: detail.page_title,
      page_lede: detail.page_lede,
      page_body_markdown: detail.page_body_markdown,
      meta_title: detail.meta_title,
      meta_description: detail.meta_description,
      page_slug: detail.page_slug,
      publication_status: detail.publication_status,
      published_at_ts_ms: detail.published_at_ts_ms,
    }
    setEditorDraft(nextDraft)
    setLastSavedSnapshot(buildDetailSnapshot(detail))
    setVisualState("idle")
  }, [detail?.page_id, detail?.updated_at_ts_ms])

  useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current)
      if (resetStateTimeoutRef.current) clearTimeout(resetStateTimeoutRef.current)
    }
  }, [])

  const currentDraftSnapshot = editorDraft ? buildDraftSnapshot(editorDraft) : ""
  const isDirty = detail !== null && editorDraft !== null && currentDraftSnapshot !== lastSavedSnapshot
  const isAnyWritePending =
    createDraftMutation.isPending ||
    saveMutation.isPending ||
    publishMutation.isPending ||
    archiveMutation.isPending ||
    createTranslationMutation.isPending

  async function persistCurrentDraft(): Promise<void> {
    if (!detail || !editorDraft || !isDirty) {
      return
    }
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current)
      autosaveTimeoutRef.current = null
    }

    setVisualState("saving")
    try {
      await saveMutation.mutateAsync({
        pageId: detail.page_id,
        ...editorDraft,
      })
      setVisualState("saved")
      if (resetStateTimeoutRef.current) clearTimeout(resetStateTimeoutRef.current)
      resetStateTimeoutRef.current = setTimeout(() => {
        setVisualState("idle")
      }, DCX_ADMIN_EDITABLE_FIELD_SAVED_VISIBLE_MS)
    } catch (error) {
      setVisualState("error")
    }
  }

  useEffect(() => {
    if (!detail || !editorDraft || !isDirty || isAnyWritePending) {
      return
    }

    setVisualState("editing")

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current)
    }

    autosaveTimeoutRef.current = setTimeout(() => {
      void persistCurrentDraft()
    }, 30000)
  }, [detail, editorDraft, isDirty, isAnyWritePending])

  const selectedPageIds = useMemo(() => new Set(props.routePageKey ? [props.routePageKey] : []), [props.routePageKey])

  function updateDraft(patch: Partial<DraftState>) {
    setEditorDraft((current) => (current ? { ...current, ...patch } : current))
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
      <section className="space-y-6">
        <article className="border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
          <div className="mb-5 space-y-2 border-b border-black/6 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Content</p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Pages</h2>
            <p className="text-sm leading-6 text-slate-600">
              Create, edit, autosave, and publish public content pages. This first pass is English-only in practice, but the backend model is translation-ready from the start.
            </p>
          </div>

          <div className="space-y-3 border border-black/6 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              New page
            </p>
            <select
              value={newPageCategoryKey}
              onChange={(event) => setNewPageCategoryKey(event.target.value)}
              className="h-11 border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none"
            >
              {categories.map((category) => (
                <option key={category.category_key} value={category.category_key}>
                  {category.category_name}
                </option>
              ))}
            </select>
            <input
              value={newPageTitle}
              onChange={(event) => setNewPageTitle(event.target.value)}
              placeholder="Page title"
              className="h-11 border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none"
            />
            <Button
              type="button"
              onClick={() =>
                createDraftMutation.mutate({
                  categoryKey: newPageCategoryKey,
                  pageTitle: newPageTitle,
                  languageCode: "en",
                })
              }
              disabled={createDraftMutation.isPending || newPageTitle.trim() === ""}
              className="rounded-none bg-slate-900 px-5 text-white hover:bg-slate-800"
            >
              {createDraftMutation.isPending ? "Creating page..." : "New page"}
            </Button>
            {createDraftMutation.isError ? (
              <p className="text-sm text-red-600">
                {(createDraftMutation.error as Error & { suggested_action?: string }).suggested_action ??
                  (createDraftMutation.error as Error).message}
              </p>
            ) : null}
          </div>
        </article>

        <article className="border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
          <div className="mb-5 flex items-start justify-between gap-4 border-b border-black/6 pb-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Catalog
              </p>
              <h3 className="text-xl font-semibold tracking-tight text-slate-950">Existing pages</h3>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              {pagesCatalogQuery.data?.data.total_live_page_count ?? 0} live rows
            </div>
          </div>

          {pagesCatalogQuery.isLoading ? <p className="text-sm text-slate-500">Loading pages...</p> : null}
          {pagesCatalogQuery.isError ? (
            <p className="text-sm text-red-600">
              {(pagesCatalogQuery.error as Error & { suggested_action?: string }).suggested_action ??
                (pagesCatalogQuery.error as Error).message}
            </p>
          ) : null}

          <div className="space-y-3">
            {pages.map((page) => (
              <PageRow
                key={page.page_id}
                row={page}
                isSelected={selectedPageIds.has(page.page_key)}
                onClick={() =>
                  props.onOpenPage({
                    pageKey: page.page_key,
                    languageCode: page.language.language_code,
                  })
                }
              />
            ))}
            {pages.length === 0 && !pagesCatalogQuery.isLoading ? (
              <p className="text-sm text-slate-500">No content pages exist yet.</p>
            ) : null}
          </div>
        </article>
      </section>

      <article className="border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-black/6 pb-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Editor</p>
            <h3 className="text-xl font-semibold tracking-tight text-slate-950">
              {detail ? `${detail.language.language_name_native} page` : "Select a page"}
            </h3>
          </div>
          {detail ? (
            <p className={["text-xs font-medium", readDcxAdminEditableFieldStatusTextClass(visualState)].join(" ")}>
              {readDcxAdminEditableFieldCompactStatusLabel(visualState)}
            </p>
          ) : null}
        </div>

        {!props.routePageKey ? (
          <p className="text-sm text-slate-500">Choose a page from the list or create a new one.</p>
        ) : null}
        {pageDetailQuery.isLoading ? <p className="text-sm text-slate-500">Loading page detail...</p> : null}
        {pageDetailQuery.isError ? (
          <p className="text-sm text-red-600">
            {(pageDetailQuery.error as Error & { suggested_action?: string }).suggested_action ??
              (pageDetailQuery.error as Error).message}
          </p>
        ) : null}

        {detail && editorDraft ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Category</span>
                <select
                  value={editorDraft.category_key}
                  onChange={(event) => updateDraft({ category_key: event.target.value })}
                  className={["h-11 w-full border bg-slate-50 px-4 text-sm outline-none", readDcxAdminEditableFieldBorderClass(visualState)].join(" ")}
                >
                  {categories.map((category) => (
                    <option key={category.category_key} value={category.category_key}>
                      {category.category_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Slug</span>
                <input
                  value={editorDraft.page_slug}
                  onChange={(event) => updateDraft({ page_slug: event.target.value })}
                  className={["h-11 w-full border bg-slate-50 px-4 text-sm outline-none", readDcxAdminEditableFieldBorderClass(visualState)].join(" ")}
                />
              </label>
            </div>

            <section className="space-y-4 border border-black/6 bg-slate-50 px-4 py-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Translations
                </p>
                <h4 className="text-lg font-semibold tracking-tight text-slate-950">
                  Existing and missing language rows
                </h4>
                <p className="text-sm leading-6 text-slate-600">
                  Pages are already wired to the same immutable original/translation model as the rest of the CMS. Create missing language rows here, then autosave will take over in that route.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {detail.translation_summary.existing_translations.map((translation) => (
                  <button
                    key={translation.language.language_code}
                    type="button"
                    onClick={() =>
                      props.onOpenPage({
                        pageKey: translation.page_key,
                        languageCode: translation.language.language_code,
                      })
                    }
                    className={[
                      "border px-4 py-2 text-sm font-medium transition",
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
                      <Button
                        key={language.language_code}
                        type="button"
                        onClick={() =>
                          createTranslationMutation.mutate({
                            targetLanguageCode: language.language_code,
                          })
                        }
                        disabled={createTranslationMutation.isPending}
                        variant="outline"
                        className="rounded-none border-slate-200 bg-white px-4 py-2 text-slate-700 hover:border-slate-300 hover:text-slate-950"
                      >
                        {createTranslationMutation.isPending
                          ? "Creating..."
                          : `Create ${language.language_name_native}`}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-emerald-700">
                  This page already has live rows in every currently supported language.
                </p>
              )}

              {createTranslationMutation.isError ? (
                <p className="text-sm text-red-600">
                  {(createTranslationMutation.error as Error & { suggested_action?: string }).suggested_action ??
                    (createTranslationMutation.error as Error).message}
                </p>
              ) : null}
            </section>

            <label className="space-y-2">
              <span className={["text-xs font-semibold uppercase tracking-[0.18em]", readDcxAdminEditableFieldStatusTextClass(visualState)].join(" ")}>
                Title · {readDcxAdminEditableFieldCompactStatusLabel(visualState)}
              </span>
              <input
                value={editorDraft.page_title}
                onChange={(event) => updateDraft({ page_title: event.target.value })}
                className={["h-12 w-full border bg-slate-50 px-4 text-base outline-none", readDcxAdminEditableFieldBorderClass(visualState)].join(" ")}
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Lede</span>
              <Textarea
                value={editorDraft.page_lede}
                onChange={(event) => updateDraft({ page_lede: event.target.value })}
                rows={3}
                className={["w-full resize-y rounded-none border bg-slate-50 px-4 py-3 text-sm outline-none", readDcxAdminEditableFieldBorderClass(visualState)].join(" ")}
              />
            </label>

            <div className="grid gap-4 xl:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Body markdown</span>
                <Textarea
                  value={editorDraft.page_body_markdown}
                  onChange={(event) => updateDraft({ page_body_markdown: event.target.value })}
                  rows={18}
                  className={["min-h-[28rem] w-full resize-y rounded-none border bg-slate-50 px-4 py-4 font-mono text-sm leading-7 outline-none", readDcxAdminEditableFieldBorderClass(visualState)].join(" ")}
                />
              </label>
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Preview</span>
                <div
                  className="min-h-[28rem] border border-black/6 bg-slate-50 px-5 py-5 text-slate-700"
                  dangerouslySetInnerHTML={{
                    __html: renderDcxBasicMarkdownToHtml(editorDraft.page_body_markdown),
                  }}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Meta title</span>
                <input
                  value={editorDraft.meta_title}
                  onChange={(event) => updateDraft({ meta_title: event.target.value })}
                className={["h-11 w-full border bg-slate-50 px-4 text-sm outline-none", readDcxAdminEditableFieldBorderClass(visualState)].join(" ")}
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Meta description</span>
                <Textarea
                  value={editorDraft.meta_description}
                  onChange={(event) => updateDraft({ meta_description: event.target.value })}
                  rows={3}
                className={["w-full resize-y rounded-none border bg-slate-50 px-4 py-3 text-sm outline-none", readDcxAdminEditableFieldBorderClass(visualState)].join(" ")}
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={() => void persistCurrentDraft()}
                disabled={!isDirty || isAnyWritePending}
                variant="outline"
                className="rounded-none border-slate-200 bg-white px-5 text-slate-700 hover:border-slate-300 hover:text-slate-950"
              >
                {saveMutation.isPending ? "Saving..." : "Save page"}
              </Button>
              <Button
                type="button"
                onClick={() => publishMutation.mutate({ pageId: detail.page_id, ...editorDraft })}
                disabled={isAnyWritePending}
                className="rounded-none bg-slate-900 px-5 text-white hover:bg-slate-800"
              >
                {publishMutation.isPending ? "Publishing..." : "Publish"}
              </Button>
              <Button
                type="button"
                onClick={() => archiveMutation.mutate({ pageId: detail.page_id, ...editorDraft })}
                disabled={isAnyWritePending}
                variant="outline"
                className="rounded-none border-slate-200 bg-slate-50 px-5 text-slate-700 hover:border-slate-300 hover:text-slate-950"
              >
                {archiveMutation.isPending ? "Archiving..." : "Archive"}
              </Button>
            </div>

            {publishMutation.isError ? (
              <p className="text-sm text-red-600">
                {(publishMutation.error as Error & { suggested_action?: string }).suggested_action ??
                  (publishMutation.error as Error).message}
              </p>
            ) : null}
            {archiveMutation.isError ? (
              <p className="text-sm text-red-600">
                {(archiveMutation.error as Error & { suggested_action?: string }).suggested_action ??
                  (archiveMutation.error as Error).message}
              </p>
            ) : null}

            <dl>
              <MetadataRow label="Page key" value={detail.page_key} />
              <MetadataRow label="Status" value={detail.publication_status} />
              <MetadataRow label="Published at" value={formatTimestampLabel(detail.published_at_ts_ms)} />
              <MetadataRow label="Updated at" value={formatTimestampLabel(detail.updated_at_ts_ms)} />
              <MetadataRow
                label="Public route"
                value={`/${detail.language.language_code}/${detail.category.category_slug}/${editorDraft.page_slug || detail.page_slug}`}
              />
            </dl>
          </div>
        ) : null}
      </article>
    </section>
  )
}
