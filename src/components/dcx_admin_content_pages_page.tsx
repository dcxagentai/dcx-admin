/**
 * CONTEXT:
 * First admin content-pages surface for the DCX internal frontend.
 * It exists to let clients and internal users create, edit, autosave, publish, and archive
 * multilingual-ready content pages backed by the immutable backend version model.
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createColumnHelper,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"

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
import { DcxAdminUnifiedTranslationLanguageSelector } from "./dcx_admin_translation_language_controls"
import { Button } from "@/components/ui/button"
import { DcxAdminDataTable } from "@/components/ui/dcx_admin_data_table"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ArrowUpDownIcon, ChevronDownIcon } from "lucide-react"

type Props = {
  apiBaseUrl: string
  routePageKey: string | null
  routeLanguageCode: string | null
  onOpenPage: (params: { pageKey: string; languageCode: string }) => void
  onReturnToCatalog: () => void
}

const pageColumnHelper = createColumnHelper<DcxAdminContentPageCatalogRow>()

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

function PageContentComparisonCard(props: {
  eyebrow: string
  detail: DcxAdminContentPageDetail | null
  draft?: DraftState | null
  editable?: boolean
  visualState?: DcxAdminEditableFieldVisualState
  onChangeDraft?: (patch: Partial<DraftState>) => void
  categoryOptions?: Array<{
    category_key: string
    category_name: string
  }>
}) {
  return (
    <article className="border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
      <div className="mb-5 border-b border-black/6 pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          {props.eyebrow}
        </p>
      </div>

      {props.detail ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Category
              </span>
              {props.editable && props.draft && props.onChangeDraft && props.categoryOptions ? (
                <select
                  value={props.draft.category_key}
                  onChange={(event) => props.onChangeDraft?.({ category_key: event.target.value })}
                  className={[
                    "h-11 w-full border bg-slate-50 px-4 text-sm outline-none",
                    readDcxAdminEditableFieldBorderClass(props.visualState ?? "idle"),
                  ].join(" ")}
                >
                  {props.categoryOptions.map((category) => (
                    <option key={category.category_key} value={category.category_key}>
                      {category.category_name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">
                  {props.detail.category.category_name}
                </div>
              )}
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Slug
              </span>
              {props.editable && props.draft && props.onChangeDraft ? (
                <input
                  value={props.draft.page_slug}
                  onChange={(event) => props.onChangeDraft?.({ page_slug: event.target.value })}
                  className={[
                    "h-11 w-full border bg-slate-50 px-4 text-sm outline-none",
                    readDcxAdminEditableFieldBorderClass(props.visualState ?? "idle"),
                  ].join(" ")}
                />
              ) : (
                <div className="border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">
                  /{props.detail.page_slug}
                </div>
              )}
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Title
            </span>
            {props.editable && props.draft && props.onChangeDraft ? (
              <input
                value={props.draft.page_title}
                onChange={(event) => props.onChangeDraft?.({ page_title: event.target.value })}
                className={[
                  "h-12 w-full border bg-slate-50 px-4 text-base outline-none",
                  readDcxAdminEditableFieldBorderClass(props.visualState ?? "idle"),
                ].join(" ")}
              />
            ) : (
              <div className="border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900">
                {props.detail.page_title}
              </div>
            )}
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Lede
            </span>
            {props.editable && props.draft && props.onChangeDraft ? (
              <Textarea
                value={props.draft.page_lede}
                onChange={(event) => props.onChangeDraft?.({ page_lede: event.target.value })}
                rows={3}
                className={[
                  "w-full resize-y rounded-none border bg-slate-50 px-4 py-3 text-sm outline-none",
                  readDcxAdminEditableFieldBorderClass(props.visualState ?? "idle"),
                ].join(" ")}
              />
            ) : (
              <div className="border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">
                {props.detail.page_lede || "No lede yet."}
              </div>
            )}
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Body markdown
            </span>
            {props.editable && props.draft && props.onChangeDraft ? (
              <Textarea
                value={props.draft.page_body_markdown}
                onChange={(event) =>
                  props.onChangeDraft?.({ page_body_markdown: event.target.value })
                }
                rows={18}
                className={[
                  "min-h-[28rem] w-full resize-y rounded-none border bg-slate-50 px-4 py-4 font-mono text-sm leading-7 outline-none",
                  readDcxAdminEditableFieldBorderClass(props.visualState ?? "idle"),
                ].join(" ")}
              />
            ) : (
              <div className="min-h-[28rem] border border-slate-200 bg-slate-50 px-4 py-4 font-mono text-sm leading-7 whitespace-pre-wrap text-slate-900">
                {props.detail.page_body_markdown || "No body markdown yet."}
              </div>
            )}
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Meta title
              </span>
              {props.editable && props.draft && props.onChangeDraft ? (
                <input
                  value={props.draft.meta_title}
                  onChange={(event) =>
                    props.onChangeDraft?.({ meta_title: event.target.value })
                  }
                  className={[
                    "h-11 w-full border bg-slate-50 px-4 text-sm outline-none",
                    readDcxAdminEditableFieldBorderClass(props.visualState ?? "idle"),
                  ].join(" ")}
                />
              ) : (
                <div className="border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">
                  {props.detail.meta_title || "No meta title yet."}
                </div>
              )}
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Meta description
              </span>
              {props.editable && props.draft && props.onChangeDraft ? (
                <Textarea
                  value={props.draft.meta_description}
                  onChange={(event) =>
                    props.onChangeDraft?.({ meta_description: event.target.value })
                  }
                  rows={3}
                  className={[
                    "w-full resize-y rounded-none border bg-slate-50 px-4 py-3 text-sm outline-none",
                    readDcxAdminEditableFieldBorderClass(props.visualState ?? "idle"),
                  ].join(" ")}
                />
              ) : (
                <div className="border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">
                  {props.detail.meta_description || "No meta description yet."}
                </div>
              )}
            </label>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-500">This page content is not available yet.</p>
      )}
    </article>
  )
}

function PageMetadataCard(props: {
  eyebrow: string
  detail: DcxAdminContentPageDetail
  publicRoute: string
}) {
  return (
    <article className="border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
      <div className="mb-5 border-b border-black/6 pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          {props.eyebrow}
        </p>
      </div>

      <dl>
        <MetadataRow label="Language" value={renderLanguageLabel(props.detail.language)} />
        <MetadataRow label="Page key" value={props.detail.page_key} />
        <MetadataRow label="Status" value={props.detail.publication_status} />
        <MetadataRow label="Published at" value={formatTimestampLabel(props.detail.published_at_ts_ms)} />
        <MetadataRow label="Updated at" value={formatTimestampLabel(props.detail.updated_at_ts_ms)} />
        <MetadataRow label="Public route" value={props.publicRoute} />
      </dl>
    </article>
  )
}

function DcxAdminSortableHeader(props: {
  column: {
    getIsSorted: () => false | "asc" | "desc"
    toggleSorting: (desc?: boolean) => void
  }
  title: string
}) {
  const isSorted = props.column.getIsSorted()
  return (
    <button
      type="button"
      onClick={() => props.column.toggleSorting(isSorted === "asc")}
      className="inline-flex items-center gap-1 text-left"
    >
      <span>{props.title}</span>
      <ArrowUpDownIcon className="h-3.5 w-3.5 text-slate-400" />
    </button>
  )
}

function renderLanguageLabel(language: DcxAdminContentPageCatalogRow["language"]): string {
  return `${language.language_name_native} (${language.language_code})`
}

function readCatalogColumnWidthClassName(columnId: string): string {
  switch (columnId) {
    case "page_title":
      return "w-[16rem]"
    case "category":
      return "w-[9rem]"
    case "page_slug":
      return "w-[14rem]"
    case "language":
      return "w-[9rem]"
    case "publication_status":
      return "w-[8rem]"
    case "updated_at_ts_ms":
      return "w-[10rem]"
    default:
      return ""
  }
}

function readCatalogColumnDefinitionId(
  column: ColumnDef<DcxAdminContentPageCatalogRow, any>,
): string | null {
  if (typeof column.id === "string" && column.id !== "") {
    return column.id
  }
  const accessorKey = (column as { accessorKey?: unknown }).accessorKey
  return typeof accessorKey === "string" && accessorKey !== "" ? accessorKey : null
}

export function DcxAdminContentPagesPage(props: Props) {
  const queryClient = useQueryClient()
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resetStateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const preserveSavedVisualStateRef = useRef(false)
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
  const currentDetailData = pageDetailQuery.data?.data ?? null
  const originalTranslationRow =
    currentDetailData?.translation_summary.existing_translations.find((translation) => translation.is_original) ??
    null
  const originalPageDetailQuery = useQuery({
    queryKey: [
      "dcx_admin_content_page_detail_original",
      originalTranslationRow?.language.language_code,
      originalTranslationRow?.page_key,
    ],
    queryFn: async () =>
      readDcxAdminContentPageDetail({
        apiBaseUrl: props.apiBaseUrl,
        pageKey: originalTranslationRow?.page_key ?? "",
        languageCode: originalTranslationRow?.language.language_code ?? "en",
      }),
    enabled: Boolean(currentDetailData && !currentDetailData.is_original && originalTranslationRow),
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
  const detail = currentDetailData
  const originalDetail =
    detail?.is_original ? detail : originalPageDetailQuery.data?.data ?? null

  const [newPageTitle, setNewPageTitle] = useState("")
  const [newPageCategoryKey, setNewPageCategoryKey] = useState("insights")
  const [editorDraft, setEditorDraft] = useState<DraftState | null>(null)
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState("")
  const [visualState, setVisualState] = useState<DcxAdminEditableFieldVisualState>("idle")
  const [nextAutosaveAtTsMs, setNextAutosaveAtTsMs] = useState<number | null>(null)
  const [autosaveCountdownSeconds, setAutosaveCountdownSeconds] = useState<number | null>(null)
  const [catalogSorting, setCatalogSorting] = useState<SortingState>([
    { id: "updated_at_ts_ms", desc: true },
  ])
  const [catalogVisibility, setCatalogVisibility] = useState<VisibilityState>({
    published_at_ts_ms: false,
  })
  const [catalogEmailFilter, setCatalogEmailFilter] = useState("")

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
    setNextAutosaveAtTsMs(null)
    setAutosaveCountdownSeconds(null)
    if (preserveSavedVisualStateRef.current) {
      preserveSavedVisualStateRef.current = false
    } else {
      setVisualState("idle")
    }
  }, [detail?.page_id, detail?.updated_at_ts_ms])

  useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current)
      if (resetStateTimeoutRef.current) clearTimeout(resetStateTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (!nextAutosaveAtTsMs) {
      setAutosaveCountdownSeconds(null)
      return
    }

    const updateCountdown = () => {
      const secondsRemaining = Math.max(
        0,
        Math.ceil((nextAutosaveAtTsMs - Date.now()) / 1000),
      )
      setAutosaveCountdownSeconds(secondsRemaining)
    }

    updateCountdown()
    const intervalId = window.setInterval(updateCountdown, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [nextAutosaveAtTsMs])

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
    setNextAutosaveAtTsMs(null)
    setAutosaveCountdownSeconds(null)

    setVisualState("saving")
    try {
      const savedSnapshot = buildDraftSnapshot(editorDraft)
      await saveMutation.mutateAsync({
        pageId: detail.page_id,
        ...editorDraft,
      })
      preserveSavedVisualStateRef.current = true
      setLastSavedSnapshot(savedSnapshot)
      setVisualState("saved")
      if (resetStateTimeoutRef.current) clearTimeout(resetStateTimeoutRef.current)
      resetStateTimeoutRef.current = setTimeout(() => {
        setVisualState("idle")
      }, DCX_ADMIN_EDITABLE_FIELD_SAVED_VISIBLE_MS)
    } catch (error) {
      setNextAutosaveAtTsMs(null)
      setAutosaveCountdownSeconds(null)
      setVisualState("error")
    }
  }

  useEffect(() => {
    if (!detail || !editorDraft || !isDirty || isAnyWritePending) {
      setNextAutosaveAtTsMs(null)
      setAutosaveCountdownSeconds(null)
      return
    }

    setVisualState("editing")

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current)
    }

    const nextAutosaveTsMs = Date.now() + 30000
    setNextAutosaveAtTsMs(nextAutosaveTsMs)
    setAutosaveCountdownSeconds(30)
    autosaveTimeoutRef.current = setTimeout(() => {
      void persistCurrentDraft()
    }, 30000)
  }, [detail, editorDraft, isDirty, isAnyWritePending])

  const selectedPageIds = useMemo(() => new Set(props.routePageKey ? [props.routePageKey] : []), [props.routePageKey])
  const isCatalogRoute = !props.routePageKey || !props.routeLanguageCode
  const filteredPages = useMemo(() => {
    const normalizedFilter = catalogEmailFilter.trim().toLowerCase()
    if (normalizedFilter === "") {
      return pages
    }

    return pages.filter((page) => {
      return [
        page.page_title,
        page.category.category_name,
        page.category.category_slug,
        page.page_slug,
        page.language.language_name_native,
        page.language.language_code,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedFilter)
    })
  }, [catalogEmailFilter, pages])

  const readCategoryOptionsForLanguage = (
    languageCode: string | null,
    currentDetail?: DcxAdminContentPageDetail | null,
  ): Array<{
    category_key: string
    category_name: string
  }> => {
    if (!languageCode) {
      return categories.map((category) => ({
        category_key: category.category_key,
        category_name: category.category_name,
      }))
    }

    const categoriesForLanguage = categories
      .filter(
      (category) => category.language.language_code === languageCode,
    )
      .map((category) => ({
        category_key: category.category_key,
        category_name: category.category_name,
      }))

    if (categoriesForLanguage.length > 0) {
      return categoriesForLanguage
    }

    if (currentDetail) {
      return [
        {
          category_key: currentDetail.category_key,
          category_name: currentDetail.category.category_name,
        },
      ]
    }

    return categories.map((category) => ({
      category_key: category.category_key,
      category_name: category.category_name,
    }))
  }

  const catalogColumns = useMemo<ColumnDef<DcxAdminContentPageCatalogRow, any>[]>(() => {
    return [
      pageColumnHelper.accessor("page_title", {
        header: ({ column }) => <DcxAdminSortableHeader column={column} title="Page" />,
        cell: ({ row }) => (
          <span className="block truncate font-medium text-slate-950" title={row.original.page_title}>
            {row.original.page_title}
          </span>
        ),
      }),
      pageColumnHelper.display({
        id: "category",
        header: "Category",
        cell: ({ row }) => (
          <span className="block truncate text-sm text-slate-900" title={row.original.category.category_name}>
            {row.original.category.category_name}
          </span>
        ),
        sortingFn: (left, right) =>
          left.original.category.category_name.localeCompare(right.original.category.category_name),
      }),
      pageColumnHelper.accessor("page_slug", {
        header: ({ column }) => <DcxAdminSortableHeader column={column} title="Slug" />,
        cell: ({ row }) => (
          <span
            className="block truncate text-sm text-slate-900"
            title={`/${row.original.category.category_slug}/${row.original.page_slug}`}
          >
            /{row.original.category.category_slug}/{row.original.page_slug}
          </span>
        ),
      }),
      pageColumnHelper.display({
        id: "language",
        header: ({ column }) => <DcxAdminSortableHeader column={column} title="Language" />,
        cell: ({ row }) => <span className="text-sm text-slate-900">{renderLanguageLabel(row.original.language)}</span>,
        sortingFn: (left, right) =>
          renderLanguageLabel(left.original.language).localeCompare(renderLanguageLabel(right.original.language)),
      }),
      pageColumnHelper.accessor("publication_status", {
        header: ({ column }) => <DcxAdminSortableHeader column={column} title="Status" />,
        cell: ({ row }) => (
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-600">
            {row.original.publication_status}
          </span>
        ),
      }),
      pageColumnHelper.accessor("updated_at_ts_ms", {
        header: ({ column }) => <DcxAdminSortableHeader column={column} title="Updated" />,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-slate-900">
            {formatTimestampLabel(row.original.updated_at_ts_ms)}
          </span>
        ),
      }),
      pageColumnHelper.accessor("published_at_ts_ms", {
        header: ({ column }) => <DcxAdminSortableHeader column={column} title="Published" />,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-slate-900">
            {formatTimestampLabel(row.original.published_at_ts_ms)}
          </span>
        ),
      }),
    ]
  }, [])

  function updateDraft(patch: Partial<DraftState>) {
    setEditorDraft((current) => (current ? { ...current, ...patch } : current))
  }

  const catalogContent = (
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
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-black/6 pb-4">
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              {pagesCatalogQuery.data?.data.total_live_page_count ?? 0} live rows
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <Input
                value={catalogEmailFilter}
                onChange={(event) => setCatalogEmailFilter(event.target.value)}
                placeholder="Filter pages..."
                className="h-10 w-[17rem] rounded-none border-slate-200 bg-white"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" className="rounded-none border-slate-200 bg-white">
                    Columns
                    <ChevronDownIcon className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-none">
                  {catalogColumns
                    .map((column) => ({
                      column,
                      columnId: readCatalogColumnDefinitionId(column),
                    }))
                    .filter((entry) => entry.columnId !== null)
                    .map((column) => {
                      const columnId = column.columnId as string
                      const isVisible = catalogVisibility[columnId] !== false
                      return (
                        <DropdownMenuCheckboxItem
                          key={columnId}
                          className="capitalize"
                          checked={isVisible}
                          onCheckedChange={(checked) =>
                            setCatalogVisibility((current) => ({ ...current, [columnId]: Boolean(checked) }))
                          }
                        >
                          {columnId.replaceAll("_", " ")}
                        </DropdownMenuCheckboxItem>
                      )
                    })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {pagesCatalogQuery.isLoading ? <p className="text-sm text-slate-500">Loading pages...</p> : null}
          {pagesCatalogQuery.isError ? (
            <p className="text-sm text-red-600">
              {(pagesCatalogQuery.error as Error & { suggested_action?: string }).suggested_action ??
                (pagesCatalogQuery.error as Error).message}
            </p>
          ) : null}

          {!pagesCatalogQuery.isLoading && !pagesCatalogQuery.isError ? (
            <DcxAdminDataTable
              columns={catalogColumns}
              data={filteredPages}
              emptyLabel="No content pages exist yet."
              sorting={catalogSorting}
              onSortingChange={setCatalogSorting}
              columnVisibility={catalogVisibility}
              onColumnVisibilityChange={setCatalogVisibility}
              readColumnWidthClassName={readCatalogColumnWidthClassName}
              onRowClick={(page) =>
                props.onOpenPage({
                  pageKey: page.page_key,
                  languageCode: page.language.language_code,
                })
              }
              readRowClassName={(page) =>
                selectedPageIds.has(page.page_key)
                  ? "!bg-slate-900 text-white hover:!bg-slate-900 [&_p]:text-white [&_.text-slate-500]:!text-white/65 [&_.text-slate-600]:!text-white/75 [&_.text-slate-900]:!text-white"
                  : ""
              }
            />
          ) : null}
        </article>
      </section>
  )

  const editorContent = (
      <article className="border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-black/6 pb-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Editor</p>
            {detail ? (
              <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                {(originalDetail?.page_title ?? detail.page_title) || detail.page_key}
              </h3>
            ) : (
              <h3 className="text-xl font-semibold tracking-tight text-slate-950">Select a page</h3>
            )}
          </div>
          <div className="flex min-w-[24rem] flex-col items-end gap-3">
            <div className="flex flex-wrap items-center justify-end gap-3">
              {detail &&
              !(visualState === "editing" && autosaveCountdownSeconds !== null && !isAnyWritePending) ? (
                <p className={["text-xs font-medium", readDcxAdminEditableFieldStatusTextClass(visualState)].join(" ")}>
                  {visualState === "saving"
                    ? "Saving..."
                    : readDcxAdminEditableFieldCompactStatusLabel(visualState)}
                </p>
              ) : null}
              {detail && isDirty && autosaveCountdownSeconds !== null && !isAnyWritePending ? (
                <p className="text-xs font-medium text-amber-600">
                  Autosave in ... {autosaveCountdownSeconds}s
                </p>
              ) : null}
              {detail && editorDraft ? (
                <>
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
                </>
              ) : null}
            </div>
            {detail ? (
              <div className="w-full max-w-[32rem]">
                <DcxAdminUnifiedTranslationLanguageSelector
                  existingLanguageRows={detail.translation_summary.existing_translations.map((translation) => ({
                    language_code: translation.language.language_code,
                    language_name_native: translation.language.language_name_native,
                    is_original: translation.is_original,
                  }))}
                  selectedLanguageCode={detail.language.language_code}
                  onSelectExistingLanguage={(languageCode) => {
                    const matchingTranslation = detail.translation_summary.existing_translations.find(
                      (translation) => translation.language.language_code === languageCode,
                    )
                    if (!matchingTranslation) {
                      return
                    }
                    props.onOpenPage({
                      pageKey: matchingTranslation.page_key,
                      languageCode,
                    })
                  }}
                  missingLanguages={detail.translation_summary.missing_languages}
                  onCreateMissingLanguage={(languageCode) =>
                    createTranslationMutation.mutate({
                      targetLanguageCode: languageCode,
                    })
                  }
                  isCreatePending={createTranslationMutation.isPending}
                />
              </div>
            ) : null}
          </div>
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
            {createTranslationMutation.isError ? (
              <p className="text-sm text-red-600">
                {(createTranslationMutation.error as Error & { suggested_action?: string }).suggested_action ??
                  (createTranslationMutation.error as Error).message}
              </p>
            ) : null}

            {detail.is_original ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Category</span>
                    <select
                      value={editorDraft.category_key}
                      onChange={(event) => updateDraft({ category_key: event.target.value })}
                      className={["h-11 w-full border bg-slate-50 px-4 text-sm outline-none", readDcxAdminEditableFieldBorderClass(visualState)].join(" ")}
                    >
                      {readCategoryOptionsForLanguage(detail.language.language_code, detail).map((category) => (
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
              </>
            ) : originalDetail ? (
              <>
                <section className="grid gap-6 xl:grid-cols-2">
                  <PageContentComparisonCard
                    eyebrow="Original"
                    detail={originalDetail}
                    categoryOptions={readCategoryOptionsForLanguage(
                      originalDetail.language.language_code,
                      originalDetail,
                    )}
                  />
                  <PageContentComparisonCard
                    eyebrow="Selected language"
                    detail={detail}
                    draft={editorDraft}
                    editable
                    visualState={visualState}
                    onChangeDraft={updateDraft}
                    categoryOptions={readCategoryOptionsForLanguage(
                      detail.language.language_code,
                      detail,
                    )}
                  />
                </section>

                <section className="grid gap-6 xl:grid-cols-2">
                  <PageMetadataCard
                    eyebrow="Original metadata"
                    detail={originalDetail}
                    publicRoute={`/${originalDetail.language.language_code}/${originalDetail.category.category_slug}/${originalDetail.page_slug}`}
                  />
                  <PageMetadataCard
                    eyebrow="Selected metadata"
                    detail={detail}
                    publicRoute={`/${detail.language.language_code}/${detail.category.category_slug}/${editorDraft.page_slug || detail.page_slug}`}
                  />
                </section>
              </>
            ) : originalPageDetailQuery.isLoading ? (
              <p className="text-sm text-slate-500">Loading original language reference...</p>
            ) : (
              <p className="text-sm text-red-600">
                {(originalPageDetailQuery.error as Error & { suggested_action?: string })?.suggested_action ??
                  (originalPageDetailQuery.error as Error | undefined)?.message ??
                  "We could not load the original language row for this page."}
              </p>
            )}

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
            {detail.is_original ? (
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
            ) : null}
          </div>
        ) : null}
      </article>
  )

  if (isCatalogRoute) {
    return catalogContent
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={props.onReturnToCatalog}
          className="rounded-none border-slate-200 bg-white"
        >
          Back to pages
        </Button>
      </div>
      {editorContent}
    </section>
  )
}
