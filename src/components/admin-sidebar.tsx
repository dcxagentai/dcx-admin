"use client"

import * as React from "react"
import dcxLogo from "@/assets/dcx_logo.png"
import {
  CalendarDaysIcon,
  FilesIcon,
  LanguagesIcon,
  LayoutDashboardIcon,
  SendIcon,
  SquareUserRoundIcon,
} from "lucide-react"

import { AdminNavMain, type AdminNavMainItem } from "@/components/admin-nav-main"
import { AdminNavUser } from "@/components/admin-nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

type Props = React.ComponentProps<typeof Sidebar> & {
  currentPathname: string
  userEmail: string | null
  userRole: string | null
  appHref: string
  onNavigateWithinAdmin: (nextPathname: string) => void
  onLogout: (() => void) | null
  isLogoutPending: boolean
}

function readAdminNavMainItems(currentPathname: string): AdminNavMainItem[] {
  return [
    {
      id: "users",
      title: "Users",
      url: "/users",
      icon: <SquareUserRoundIcon />,
      isActive: currentPathname === "/users",
    },
    {
      id: "schedule",
      title: "Schedule",
      url: "/schedule",
      icon: <CalendarDaysIcon />,
      isActive: currentPathname.startsWith("/schedule"),
    },
    {
      id: "content",
      title: "Content",
      url: "/content/pages",
      icon: <FilesIcon />,
      isActive: currentPathname.startsWith("/content/"),
      items: [
        {
          id: "content_pages_group",
          title: "Website",
          url: "/content/pages",
          isActive:
            currentPathname.startsWith("/content/pages") ||
            currentPathname.startsWith("/content/page-categories"),
          items: [
            {
              id: "content_pages_categories",
              title: "Categories",
              url: "/content/page-categories",
              isActive: currentPathname.startsWith("/content/page-categories"),
            },
            {
              id: "content_pages_articles",
              title: "Pages",
              url: "/content/pages",
              isActive: currentPathname.startsWith("/content/pages"),
            },
          ],
        },
        {
          id: "content_emails_group",
          title: "Emails",
          url: "/content/emails/newsletters",
          isActive: currentPathname.startsWith("/content/emails/"),
          items: [
            {
              id: "content_emails_newsletters",
              title: "Newsletters",
              url: "/content/emails/newsletters",
              isActive: currentPathname.startsWith("/content/emails/newsletters"),
            },
            {
              id: "content_emails_sequences",
              title: "Sequences",
              url: "/content/emails/sequences",
              isActive: currentPathname.startsWith("/content/emails/sequences"),
            },
            {
              id: "content_emails_transactional",
              title: "Transactional",
              url: "/content/emails/transactional",
              isActive: currentPathname.startsWith("/content/emails/transactional"),
            },
          ],
        },
      ],
    },
    {
      id: "ux",
      title: "UX",
      url: "/ux/public",
      icon: <LanguagesIcon />,
      isActive:
        currentPathname.startsWith("/ux/") ||
        currentPathname.startsWith("/content/ux") ||
        currentPathname.startsWith("/content/public") ||
        currentPathname.startsWith("/content/app") ||
        currentPathname.startsWith("/content/admin"),
      items: [
        {
          id: "ux_public",
          title: "Public UX",
          url: "/ux/public",
          isActive:
            currentPathname.startsWith("/ux/public") ||
            currentPathname.startsWith("/content/public"),
        },
        {
          id: "ux_app",
          title: "App UX",
          url: "/ux/app",
          isActive:
            currentPathname.startsWith("/ux/app") ||
            currentPathname.startsWith("/content/app"),
        },
        {
          id: "ux_admin",
          title: "Admin UX",
          url: "/ux/admin",
          isActive:
            currentPathname.startsWith("/ux/admin") ||
            currentPathname.startsWith("/content/admin") ||
            currentPathname.startsWith("/content/ux") ||
            currentPathname.startsWith("/translations/ux"),
        },
      ],
    },
    {
      id: "publish",
      title: "Publish",
      url: "/publish",
      icon: <SendIcon />,
      isActive: currentPathname === "/publish" || currentPathname.startsWith("/publish/"),
      items: [
        {
          id: "publish_public_site",
          title: "Public Site",
          url: "/publish",
          isActive:
            currentPathname === "/publish" || currentPathname === "/publish/public-site",
        },
      ],
    },
  ]
}

export function AdminSidebar({
  currentPathname,
  userEmail,
  userRole,
  appHref,
  onNavigateWithinAdmin,
  onLogout,
  isLogoutPending,
  ...props
}: Props) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a
                href="/users"
                onClick={(event) => {
                  event.preventDefault()
                  onNavigateWithinAdmin("/users")
                }}
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-none bg-[#fbfaf7] ring-1 ring-sidebar-border">
                  <img src={dcxLogo} alt="DCX logo" className="size-6 object-contain" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">DCX Admin</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <AdminNavMain
          items={readAdminNavMainItems(currentPathname)}
          groupLabel="Workspace"
          toggleSectionLabel="Toggle section"
          onNavigateWithinAdmin={onNavigateWithinAdmin}
        />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="App workspace">
              <a href={appHref}>
                <LayoutDashboardIcon />
                <span>App workspace</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <AdminNavUser
          user={{
            name: userRole ?? "admin",
            email: userEmail ?? "DCX admin",
          }}
          onLogout={onLogout}
          isLogoutPending={isLogoutPending}
        />
      </SidebarFooter>
    </Sidebar>
  )
}
