/**
 * CONTEXT:
 * Shadcn-based authenticated shell for the DCX admin workspace.
 * It replaces the old top-pill navigation shell with the same modern sidebar pattern
 * already proven on the app surface, while preserving the real admin route structure.
 */
import { type ReactNode } from "react"

import { AdminSidebar } from "@/components/admin-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

type Props = {
  title: string
  currentPathname: string
  userEmail: string | null
  userRole: string | null
  appHref: string
  onNavigateWithinAdmin: (nextPathname: string) => void
  onLogout: (() => void) | null
  isLogoutPending: boolean
  children: ReactNode
}

export function DcxAdminShell(props: Props) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AdminSidebar
          currentPathname={props.currentPathname}
          userEmail={props.userEmail}
          userRole={props.userRole}
          appHref={props.appHref}
          onNavigateWithinAdmin={props.onNavigateWithinAdmin}
          onLogout={props.onLogout}
          isLogoutPending={props.isLogoutPending}
        />
        <SidebarRail />
        <SidebarInset>
          <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70">
            <SidebarTrigger className="-ml-1" />
            <h1 className="text-lg font-semibold tracking-tight text-slate-950">
              {props.title}
            </h1>
          </header>
          <div className="flex flex-1 flex-col gap-4 bg-muted/25 p-4 md:p-6">
            {props.children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
