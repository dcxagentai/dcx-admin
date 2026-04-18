/**
 * CONTEXT:
 * First admin content-page categories surface for the DCX internal frontend.
 * It exists to let internal users create, edit, translate, and save public content-page categories
 * using the same immutable multilingual model as pages and newsletters.
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createColumnHelper,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"

import { readDcxAdminContentPageCategoriesCatalog } from "../lib/read_dcx_admin_content_page_categories_catalog"
import {
  readDcxAdminContentPageCategoryDetail,
  type DcxAdminContentPageCategoryDetail,
} from "../lib/read_dcx_admin_content_page_category_detail"
import { createDcxAdminContentPageCategoryDraft } from "../lib/create_dcx_admin_content_page_category_draft"
import { createDcxAdminContentPageCategoryTranslation } from "../lib/create_dcx_admin_content_page_category_translation"
import {
  DCX_ADMIN_EDITABLE_FIELD_SAVED_VISIBLE_MS,
  readDcxAdminEditableFieldBorderClass,
  readDcxAdminEditableFieldCompactStatusLabel,
  readDcxAdminEditableFieldStatusTextClass,
  type DcxAdminEditableFieldVisualState,
} from "../lib/dcx_admin_editable_field_visuals"
import { saveDcxAdminContentPageCategoryLiveRow } from "../lib/save_dcx_admin_content_page_category_live_row"
import { DcxAdminLanguageFlagLabel } from "./dcx_admin_language_flag_label"
import { DcxAdminTranslationLanguageControls } from "./dcx_admin_translation_language_controls"
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
  routeCategoryKey: string | null
  routeLanguageCode: string | null
  onOpenCategory: (params: { categoryKey: string; languageCode: string }) => void
  onReturnToCatalog: () => void
}

type DcxAdminContentPageCategoryCatalogRow =
  Awaited<ReturnType<typeof readDcxAdminContentPageCategoriesCatalog>>["data"]["categories"][number]

const categoryColumnHelper = createColumnHelper<DcxAdminContentPageCategoryCatalogRow>()

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

function renderLanguageLabel(language: {
  language_name_native: string
  language_code: string
}): string {
  return `${language.language_name_native} (${language.language_code})`
}

function readCatalogColumnWidthClassName(columnId: string): string {
  switch (columnId) {
    case "category_name":
      return "w-[14rem]"
    case "category_slug":
      return "w-[9rem]"
    case "language":
      return "w-[9rem]"
    case "category_description":
      return "w-[18rem]"
    case "updated_at_ts_ms":
      return "w-[10rem]"
    default:
      return ""
  }
}

function readCatalogColumnDefinitionId(
  column: ColumnDef<DcxAdminContentPageCategoryCatalogRow, any>,
): string | null {
  if (typeof column.id === "string" && column.id !== "") {
    return column.id
  }
  const accessorKey = (column as { accessorKey?: unknown }).accessorKey
  return typeof accessorKey === "string" && accessorKey !== "" ? accessorKey : null
}

export function DcxAdminContentPageCategoriesPage(props: Props) {
  const queryClient = useQueryClient()
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resetStateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [localSelectedCategoryKey, setLocalSelectedCategoryKey] = useState<string | null>(
    props.routeCategoryKey,
  )
  const [localSelectedLanguageCode, setLocalSelectedLanguageCode] = useState<string | null>(
    props.routeLanguageCode,
  )
  const effectiveCategoryKey = props.routeCategoryKey ?? localSelectedCategoryKey
  const effectiveLanguageCode = props.routeLanguageCode ?? localSelectedLanguageCode
  const categoriesQuery = useQuery({
    queryKey: ["dcx_admin_content_page_categories_catalog"],
    queryFn: async () => readDcxAdminContentPageCategoriesCatalog({ apiBaseUrl: props.apiBaseUrl }),
  })
  const categoryDetailQuery = useQuery({
    queryKey: ["dcx_admin_content_page_category_detail", effectiveLanguageCode, effectiveCategoryKey],
    queryFn: async () =>
      readDcxAdminContentPageCategoryDetail({
        apiBaseUrl: props.apiBaseUrl,
        categoryKey: effectiveCategoryKey ?? "",
        languageCode: effectiveLanguageCode ?? "en",
      }),
    enabled: Boolean(effectiveCategoryKey && effectiveLanguageCode),
  })

  useEffect(() => {
    if (props.routeCategoryKey) {
      setLocalSelectedCategoryKey(props.routeCategoryKey)
    }
    if (props.routeLanguageCode) {
      setLocalSelectedLanguageCode(props.routeLanguageCode)
    }
  }, [props.routeCategoryKey, props.routeLanguageCode])

  const createDraftMutation = useMutation({
    mutationFn: async (params: { categoryName: string; languageCode: string }) =>
      createDcxAdminContentPageCategoryDraft({
        apiBaseUrl: props.apiBaseUrl,
        categoryName: params.categoryName,
        languageCode: params.languageCode,
      }),
    onSuccess: async (payload) => {
      await queryClient.invalidateQueries({ queryKey: ["dcx_admin_content_page_categories_catalog"] })
      setLocalSelectedCategoryKey(payload.data.category_key)
      setLocalSelectedLanguageCode(payload.data.language_code)
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
          queryKey: ["dcx_admin_content_page_category_detail", effectiveLanguageCode, effectiveCategoryKey],
        }),
        queryClient.invalidateQueries({ queryKey: ["dcx_admin_public_site_publish_status"] }),
      ])
    },
  })
  const createTranslationMutation = useMutation({
    mutationFn: async (params: { targetLanguageCode: string }) =>
      createDcxAdminContentPageCategoryTranslation({
        apiBaseUrl: props.apiBaseUrl,
        categoryKey: effectiveCategoryKey ?? "",
        sourceLanguageCode: effectiveLanguageCode ?? "en",
        targetLanguageCode: params.targetLanguageCode,
      }),
    onSuccess: async (payload) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dcx_admin_content_page_categories_catalog"] }),
        queryClient.invalidateQueries({
          queryKey: ["dcx_admin_content_page_category_detail", effectiveLanguageCode, effectiveCategoryKey],
        }),
      ])
      setLocalSelectedCategoryKey(payload.data.category_key)
      setLocalSelectedLanguageCode(payload.data.language_code)
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
  const [visualState, setVisualState] = useState<DcxAdminEditableFieldVisualState>("idle")
  const [catalogSorting, setCatalogSorting] = useState<SortingState>([
    { id: "updated_at_ts_ms", desc: true },
  ])
  const [catalogVisibility, setCatalogVisibility] = useState<VisibilityState>({})
  const [catalogFilter, setCatalogFilter] = useState("")

  useEffect(() => {
    if (!detail) {
      setEditorDraft(null)
      setLastSavedSnapshot("")
      setVisualState("idle")
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
    try {
      await saveMutation.mutateAsync({ categoryId: detail.category_id, ...editorDraft })
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
    if (!detail || !editorDraft || !isDirty || isAnyWritePending) return
    setVisualState("editing")
    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current)
    autosaveTimeoutRef.current = setTimeout(() => {
      void persistCurrentDraft()
    }, 30000)
  }, [detail, editorDraft, isDirty, isAnyWritePending])

  const selectedCategoryKeys = useMemo(
    () => new Set(effectiveCategoryKey ? [effectiveCategoryKey] : []),
    [effectiveCategoryKey],
  )
  const isCatalogRoute = !props.routeCategoryKey || !props.routeLanguageCode
  const filteredCategories = useMemo(() => {
    const normalizedFilter = catalogFilter.trim().toLowerCase()
    if (normalizedFilter === "") {
      return categories
    }

    return categories.filter((category) =>
      [
        category.category_name,
        category.category_slug,
        category.category_description,
        category.language.language_name_native,
        category.language.language_code,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedFilter),
    )
  }, [catalogFilter, categories])

  const catalogColumns = useMemo<ColumnDef<DcxAdminContentPageCategoryCatalogRow, any>[]>(() => {
    return [
      categoryColumnHelper.accessor("category_name", {
        header: ({ column }) => <DcxAdminSortableHeader column={column} title="Category" />,
        cell: ({ row }) => (
          <span className="block truncate font-medium text-slate-950" title={row.original.category_name}>
            {row.original.category_name}
          </span>
        ),
      }),
      categoryColumnHelper.accessor("category_slug", {
        header: ({ column }) => <DcxAdminSortableHeader column={column} title="Slug" />,
        cell: ({ row }) => <span className="truncate text-sm text-slate-900">/{row.original.category_slug}</span>,
      }),
      categoryColumnHelper.display({
        id: "language",
        header: ({ column }) => <DcxAdminSortableHeader column={column} title="Language" />,
        cell: ({ row }) => <span className="text-sm text-slate-900">{renderLanguageLabel(row.original.language)}</span>,
        sortingFn: (left, right) =>
          renderLanguageLabel(left.original.language).localeCompare(renderLanguageLabel(right.original.language)),
      }),
      categoryColumnHelper.accessor("category_description", {
        header: ({ column }) => <DcxAdminSortableHeader column={column} title="Description" />,
        cell: ({ row }) => (
          <span
            className="block truncate text-sm text-slate-900"
            title={row.original.category_description || "No description yet"}
          >
            {row.original.category_description || "No description yet"}
          </span>
        ),
      }),
      categoryColumnHelper.accessor("updated_at_ts_ms", {
        header: ({ column }) => <DcxAdminSortableHeader column={column} title="Updated" />,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-slate-900">
            {formatTimestampLabel(row.original.updated_at_ts_ms)}
          </span>
        ),
      }),
    ]
  }, [categories])

  function updateDraft(patch: Partial<DraftState>) {
    setEditorDraft((current) => (current ? { ...current, ...patch } : current))
  }

  const catalogContent = (
    <section className="space-y-6">
        <article className="border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
          <div className="mb-5 space-y-2 border-b border-black/6 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Content</p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Page categories</h2>
            <p className="text-sm leading-6 text-slate-600">
              Create, edit, and translate the categories used by public content pages. Category rows follow the same immutable version model as the rest of the CMS.
            </p>
          </div>

          <div className="space-y-3 border border-black/6 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              New category
            </p>
            <input
              value={newCategoryName}
              onChange={(event) => setNewCategoryName(event.target.value)}
              placeholder="Category name"
              className="h-11 border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none"
            />
            <Button
              type="button"
              onClick={() =>
                createDraftMutation.mutate({
                  categoryName: newCategoryName,
                  languageCode: "en",
                })
              }
              disabled={createDraftMutation.isPending || newCategoryName.trim() === ""}
              className="rounded-none bg-slate-900 px-5 text-white hover:bg-slate-800"
            >
              {createDraftMutation.isPending ? "Creating category..." : "New category"}
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
              {categoriesQuery.data?.data.total_live_category_count ?? 0} live rows
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <Input
                value={catalogFilter}
                onChange={(event) => setCatalogFilter(event.target.value)}
                placeholder="Filter categories..."
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
                      columnId: readCatalogColumnDefinitionId(column),
                    }))
                    .filter((entry) => entry.columnId !== null)
                    .map((entry) => {
                    const columnId = entry.columnId as string
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

          {categoriesQuery.isError ? (
            <p className="text-sm text-red-600">
              {(categoriesQuery.error as Error & { suggested_action?: string }).suggested_action ??
                (categoriesQuery.error as Error).message}
            </p>
          ) : null}

          {!categoriesQuery.isLoading && !categoriesQuery.isError ? (
            <DcxAdminDataTable
              columns={catalogColumns}
              data={filteredCategories}
              emptyLabel="No content-page categories exist yet."
              sorting={catalogSorting}
              onSortingChange={setCatalogSorting}
              columnVisibility={catalogVisibility}
              onColumnVisibilityChange={setCatalogVisibility}
              readColumnWidthClassName={readCatalogColumnWidthClassName}
              onRowClick={(category) => {
                setLocalSelectedCategoryKey(category.category_key)
                setLocalSelectedLanguageCode(category.language.language_code)
                props.onOpenCategory({
                  categoryKey: category.category_key,
                  languageCode: category.language.language_code,
                })
              }}
              readRowClassName={(category) =>
                selectedCategoryKeys.has(category.category_key)
                  ? "!bg-slate-900 text-white hover:!bg-slate-900 [&_p]:text-white [&_.text-slate-500]:!text-white/65 [&_.text-slate-900]:!text-white"
                  : ""
              }
            />
          ) : categoriesQuery.isLoading ? (
            <p className="text-sm text-slate-500">Loading categories...</p>
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
                <DcxAdminLanguageFlagLabel
                  languageCode={detail.language.language_code}
                  label={`${detail.language.language_name_native} category`}
                  textClassName="text-xl font-semibold tracking-tight text-slate-950"
                />
              </h3>
            ) : (
              <h3 className="text-xl font-semibold tracking-tight text-slate-950">Select a category</h3>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            {detail ? (
              <p className={["text-xs font-medium", readDcxAdminEditableFieldStatusTextClass(visualState)].join(" ")}>
                {readDcxAdminEditableFieldCompactStatusLabel(visualState)}
              </p>
            ) : null}
            {detail && editorDraft ? (
              <Button
                type="button"
                onClick={() => void persistCurrentDraft()}
                disabled={!isDirty || isAnyWritePending}
                className="rounded-none bg-slate-900 px-5 text-white hover:bg-slate-800"
              >
                {saveMutation.isPending ? "Saving..." : "Save category"}
              </Button>
            ) : null}
          </div>
        </div>

        {!effectiveCategoryKey ? (
          <p className="text-sm text-slate-500">Choose a category from the list or create a new one.</p>
        ) : null}

        {effectiveCategoryKey && categoryDetailQuery.isError ? (
          <p className="text-sm text-red-600">
            {(categoryDetailQuery.error as Error & { suggested_action?: string }).suggested_action ??
              (categoryDetailQuery.error as Error).message}
          </p>
        ) : null}

        {detail && editorDraft ? (
          <div className="space-y-6">
            <label className="space-y-2">
                <span className={["text-xs font-semibold uppercase tracking-[0.18em]", readDcxAdminEditableFieldStatusTextClass(visualState)].join(" ")}>
                  Category name · {readDcxAdminEditableFieldCompactStatusLabel(visualState)}
                </span>
              <input
                value={editorDraft.category_name}
                onChange={(event) => updateDraft({ category_name: event.target.value })}
                className={["h-12 w-full border bg-slate-50 px-4 text-base outline-none", readDcxAdminEditableFieldBorderClass(visualState)].join(" ")}
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Description</span>
              <Textarea
                value={editorDraft.category_description}
                onChange={(event) => updateDraft({ category_description: event.target.value })}
                rows={4}
                className={["w-full resize-y rounded-none border bg-slate-50 px-4 py-3 text-sm outline-none", readDcxAdminEditableFieldBorderClass(visualState)].join(" ")}
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Slug</span>
              <input
                value={editorDraft.category_slug}
                onChange={(event) => updateDraft({ category_slug: event.target.value })}
                className={["h-11 w-full border bg-slate-50 px-4 text-sm outline-none", readDcxAdminEditableFieldBorderClass(visualState)].join(" ")}
              />
            </label>

            {saveMutation.isError ? (
              <p className="text-sm text-red-600">
                {(saveMutation.error as Error & { suggested_action?: string }).suggested_action ??
                  (saveMutation.error as Error).message}
              </p>
            ) : null}

            <DcxAdminTranslationLanguageControls
              title="Existing and missing language rows"
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
                setLocalSelectedCategoryKey(matchingTranslation.category_key)
                setLocalSelectedLanguageCode(languageCode)
                props.onOpenCategory({
                  categoryKey: matchingTranslation.category_key,
                  languageCode,
                })
              }}
              missingLanguages={detail.translation_summary.missing_languages}
              onCreateMissingLanguage={(languageCode) =>
                createTranslationMutation.mutate({ targetLanguageCode: languageCode })
              }
              isCreatePending={createTranslationMutation.isPending}
            />

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
          Back to categories
        </Button>
      </div>
      {editorContent}
    </section>
  )
}
