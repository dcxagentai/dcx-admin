"use client"

import { type Dispatch, type ReactNode, type SetStateAction, useEffect, useMemo, useState } from "react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { ChevronRightIcon } from "lucide-react"

const DCX_ADMIN_NAV_MAIN_OPEN_STATE_STORAGE_KEY = "dcx_admin_nav_main_open_state_v2"

export type AdminNavMainItem = {
  id: string
  title: string
  url: string
  icon?: ReactNode
  isActive?: boolean
  items?: AdminNavMainItem[]
}

function collectItemIds(items: AdminNavMainItem[]): string[] {
  return items.flatMap((item) => [item.id, ...(item.items ? collectItemIds(item.items) : [])])
}

function buildDefaultOpenState(items: AdminNavMainItem[]): Record<string, boolean> {
  return Object.fromEntries(
    items.flatMap((item) => [
      [item.id, readHasActiveDescendant(item)],
      ...(item.items ? Object.entries(buildDefaultOpenState(item.items)) : []),
    ]),
  )
}

function buildStoredOpenState(
  items: AdminNavMainItem[],
  storedValue: Record<string, boolean> | null,
): Record<string, boolean> {
  const defaultState = buildDefaultOpenState(items)
  const knownIds = collectItemIds(items)
  for (const itemId of knownIds) {
    if (storedValue && Object.prototype.hasOwnProperty.call(storedValue, itemId)) {
      defaultState[itemId] = Boolean(storedValue[itemId])
    }
  }
  return defaultState
}

function readHasActiveDescendant(item: AdminNavMainItem): boolean {
  if (!item.items?.length) {
    return Boolean(item.isActive)
  }

  return item.items.some((childItem) => readHasActiveDescendant(childItem))
}

function AdminNavMainTreeItem(props: {
  item: AdminNavMainItem
  depth: number
  toggleSectionLabel: string
  openStateById: Record<string, boolean>
  setOpenStateById: Dispatch<SetStateAction<Record<string, boolean>>>
  onNavigateWithinAdmin: (nextPathname: string) => void
}) {
  const hasChildren = Boolean(props.item.items?.length)
  const isOpen = props.openStateById[props.item.id] ?? readHasActiveDescendant(props.item)

  const content = hasChildren ? (
    <CollapsibleContent>
      <SidebarMenuSub>
        {props.item.items?.map((childItem) => (
          <AdminNavMainTreeItem
            key={childItem.id}
            item={childItem}
            depth={props.depth + 1}
            toggleSectionLabel={props.toggleSectionLabel}
            openStateById={props.openStateById}
            setOpenStateById={props.setOpenStateById}
            onNavigateWithinAdmin={props.onNavigateWithinAdmin}
          />
        ))}
      </SidebarMenuSub>
    </CollapsibleContent>
  ) : null

  if (props.depth === 0) {
    return (
      <Collapsible
        asChild
        open={isOpen}
        onOpenChange={(nextOpenState) => {
          props.setOpenStateById((previousState) => ({
            ...previousState,
            [props.item.id]: nextOpenState,
          }))
        }}
      >
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            tooltip={props.item.title}
            isActive={props.item.isActive}
          >
            <a
              href={props.item.url}
              onClick={(event) => {
                event.preventDefault()
                props.onNavigateWithinAdmin(props.item.url)
              }}
            >
              {props.item.icon}
              <span>{props.item.title}</span>
            </a>
          </SidebarMenuButton>
          {hasChildren ? (
            <>
              <CollapsibleTrigger asChild>
                <SidebarMenuAction className="data-[state=open]:rotate-90">
                  <ChevronRightIcon />
                  <span className="sr-only">{props.toggleSectionLabel}</span>
                </SidebarMenuAction>
              </CollapsibleTrigger>
              {content}
            </>
          ) : null}
        </SidebarMenuItem>
      </Collapsible>
    )
  }

  return (
    <Collapsible
      asChild
      open={isOpen}
      onOpenChange={(nextOpenState) => {
        props.setOpenStateById((previousState) => ({
          ...previousState,
          [props.item.id]: nextOpenState,
        }))
      }}
    >
      <SidebarMenuSubItem>
        <div className="relative">
          <SidebarMenuSubButton
            asChild
            isActive={props.item.isActive}
            className={hasChildren ? "pr-8" : undefined}
          >
            <a
              href={props.item.url}
              onClick={(event) => {
                event.preventDefault()
                props.onNavigateWithinAdmin(props.item.url)
              }}
            >
              <span>{props.item.title}</span>
            </a>
          </SidebarMenuSubButton>
          {hasChildren ? (
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="absolute top-1/2 right-1 inline-flex size-6 -translate-y-1/2 items-center justify-center text-slate-500 transition hover:text-slate-950 data-[state=open]:rotate-90"
              >
                <ChevronRightIcon className="size-4" />
                <span className="sr-only">{props.toggleSectionLabel}</span>
              </button>
            </CollapsibleTrigger>
          ) : null}
        </div>
        {content}
      </SidebarMenuSubItem>
    </Collapsible>
  )
}

export function AdminNavMain(props: {
  items: AdminNavMainItem[]
  groupLabel: string
  toggleSectionLabel: string
  onNavigateWithinAdmin: (nextPathname: string) => void
}) {
  const defaultOpenState = useMemo(() => buildDefaultOpenState(props.items), [props.items])
  const [openStateById, setOpenStateById] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") {
      return defaultOpenState
    }

    try {
      const storedValue = window.localStorage.getItem(DCX_ADMIN_NAV_MAIN_OPEN_STATE_STORAGE_KEY)
      if (!storedValue) {
        return defaultOpenState
      }

      const parsedValue = JSON.parse(storedValue) as Record<string, boolean>
      return buildStoredOpenState(props.items, parsedValue)
    } catch {
      return defaultOpenState
    }
  })

  useEffect(() => {
    window.localStorage.setItem(
      DCX_ADMIN_NAV_MAIN_OPEN_STATE_STORAGE_KEY,
      JSON.stringify(openStateById),
    )
  }, [openStateById])

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{props.groupLabel}</SidebarGroupLabel>
      <SidebarMenu>
        {props.items.map((item) => (
          <AdminNavMainTreeItem
            key={item.id}
            item={item}
            depth={0}
            toggleSectionLabel={props.toggleSectionLabel}
            openStateById={openStateById}
            setOpenStateById={setOpenStateById}
            onNavigateWithinAdmin={props.onNavigateWithinAdmin}
          />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
