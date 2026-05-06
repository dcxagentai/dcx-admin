"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
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
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  readDcxAdminAuthenticatedUserClockTimezones,
  type DcxAdminAuthenticatedUserClockTimezone,
} from "@/lib/read_dcx_admin_authenticated_user_clock_timezones"

type Props = React.ComponentProps<typeof Sidebar> & {
  apiBaseUrl: string
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
              id: "content_emails_sequences_group",
              title: "Sequences",
              url: "/content/emails/sequences",
              isActive:
                currentPathname.startsWith("/content/emails/sequences") ||
                currentPathname.startsWith("/content/emails/sequence-emails"),
              items: [
                {
                  id: "content_emails_sequence_plans",
                  title: "Groups",
                  url: "/content/emails/sequences",
                  isActive: currentPathname.startsWith("/content/emails/sequences"),
                },
                {
                  id: "content_emails_sequence_emails",
                  title: "Emails",
                  url: "/content/emails/sequence-emails",
                  isActive: currentPathname.startsWith("/content/emails/sequence-emails"),
                },
              ],
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
  apiBaseUrl,
  currentPathname,
  userEmail,
  userRole,
  appHref,
  onNavigateWithinAdmin,
  onLogout,
  isLogoutPending,
  ...props
}: Props) {
  const clockTimezonesQuery = useQuery({
    queryKey: ["dcx_admin_authenticated_user_clock_timezones"],
    queryFn: async () =>
      readDcxAdminAuthenticatedUserClockTimezones({
        apiBaseUrl,
      }),
  })
  const clockTimezones = clockTimezonesQuery.data?.data ?? null

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
        <DcxAdminSidebarTradingClocks
          preferredTimezone={clockTimezones?.preferred_timezone ?? null}
          sidebarClockTimezones={clockTimezones?.selected_sidebar_clock_timezones ?? []}
        />
        <AdminNavMain
          items={readAdminNavMainItems(currentPathname)}
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

function DcxAdminSidebarTradingClocks(props: {
  preferredTimezone: DcxAdminAuthenticatedUserClockTimezone | null
  sidebarClockTimezones: DcxAdminAuthenticatedUserClockTimezone[]
}) {
  const [now, setNow] = React.useState(() => new Date())
  React.useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(intervalId)
  }, [])

  const clockTimezones = readDcxAdminSidebarClockTimezones({
    preferredTimezone: props.preferredTimezone,
    sidebarClockTimezones: props.sidebarClockTimezones,
  })

  if (clockTimezones.length === 0) {
    return null
  }

  return (
    <SidebarGroup className="pt-2 group-data-[collapsible=icon]:hidden">
      <SidebarGroupContent>
        <div className="grid grid-cols-3 gap-1 px-1.5 pb-2 pt-1">
          {clockTimezones.map((timezone) => (
            <div
              key={`${timezone.kind}:${timezone.id}`}
              className="flex justify-center text-center"
            >
              <DcxAdminSidebarTradingClock
                timezone={timezone}
                now={now}
              />
            </div>
          ))}
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function DcxAdminSidebarTradingClock(props: {
  timezone: DcxAdminAuthenticatedUserClockTimezone & { kind: "preferred" | "selected" }
  now: Date
}) {
  const timeParts = readDcxAdminSidebarClockTimeParts(props.timezone.iana_name, props.now)
  const hourAngle = ((timeParts.hour % 12) + timeParts.minute / 60 + timeParts.second / 3600) * 30
  const minuteAngle = (timeParts.minute + timeParts.second / 60) * 6
  const secondAngle = timeParts.second * 6
  const clockNumerals = Array.from({ length: 12 }, (_, numeralIndex) => numeralIndex + 1)

  return (
    <div className="flex min-w-0 flex-col items-center gap-1">
      <svg
        viewBox="0 0 100 100"
        role="img"
        aria-label={`${readDcxAdminSidebarClockLabel(props.timezone)} local time`}
        className="size-[4.35rem]"
      >
        <circle cx="50" cy="50" r="48" className="fill-white stroke-slate-100" strokeWidth="1" />
        <circle cx="50" cy="50" r="47" className="fill-transparent stroke-slate-200" strokeWidth="1.2" />
        {clockNumerals.map((numeral) => {
          const numeralCoordinates = readDcxAdminSidebarClockHandCoordinates(numeral * 30, 36)
          return (
            <text
              key={numeral}
              x={numeralCoordinates.x}
              y={numeralCoordinates.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-slate-500 text-[8.5px] font-semibold"
            >
              {numeral}
            </text>
          )
        })}
        {Array.from({ length: 60 }).map((_, tickIndex) => {
          if (tickIndex % 5 !== 0) {
            return null
          }
          const tickAngle = tickIndex * 6
          const tickStart = readDcxAdminSidebarClockHandCoordinates(tickAngle, 42)
          const tickEnd = readDcxAdminSidebarClockHandCoordinates(tickAngle, 44)
          return (
            <line
              key={tickIndex}
              x1={tickStart.x}
              y1={tickStart.y}
              x2={tickEnd.x}
              y2={tickEnd.y}
              className="stroke-slate-300"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          )
        })}
        <line x1="50" y1="50" x2="50" y2="32" className="stroke-[#314f70]" strokeWidth="5" strokeLinecap="round" transform={`rotate(${hourAngle} 50 50)`} />
        <line x1="50" y1="50" x2="50" y2="17" className="stroke-[#3a5b7f]" strokeWidth="3" strokeLinecap="round" transform={`rotate(${minuteAngle} 50 50)`} />
        <line x1="50" y1="50" x2="50" y2="14" className="stroke-[#f08a24]" strokeWidth="1.5" strokeLinecap="round" transform={`rotate(${secondAngle} 50 50)`} />
        <circle cx="50" cy="50" r="3.5" className="fill-slate-400" />
      </svg>
      <span className="max-w-[4.35rem] truncate text-[0.66rem] font-semibold leading-none text-sidebar-foreground">
        {readDcxAdminSidebarClockLabel(props.timezone)}
      </span>
    </div>
  )
}

function readDcxAdminSidebarClockTimezones(params: {
  preferredTimezone: DcxAdminAuthenticatedUserClockTimezone | null
  sidebarClockTimezones: DcxAdminAuthenticatedUserClockTimezone[]
}): Array<DcxAdminAuthenticatedUserClockTimezone & { kind: "preferred" | "selected" }> {
  const seenTimezoneIds = new Set<number>()
  const clockTimezones: Array<DcxAdminAuthenticatedUserClockTimezone & { kind: "preferred" | "selected" }> = []
  if (params.preferredTimezone) {
    clockTimezones.push({ ...params.preferredTimezone, kind: "preferred" })
    seenTimezoneIds.add(params.preferredTimezone.id)
  }
  for (const timezone of params.sidebarClockTimezones) {
    if (seenTimezoneIds.has(timezone.id)) {
      continue
    }
    clockTimezones.push({ ...timezone, kind: "selected" })
    seenTimezoneIds.add(timezone.id)
  }
  return clockTimezones.slice(0, 3)
}

function readDcxAdminSidebarClockTimeParts(ianaName: string, now: Date): {
  hour: number
  minute: number
  second: number
} {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: ianaName,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
  const parts = formatter.formatToParts(now)
  return {
    hour: Number(parts.find((part) => part.type === "hour")?.value ?? "0"),
    minute: Number(parts.find((part) => part.type === "minute")?.value ?? "0"),
    second: Number(parts.find((part) => part.type === "second")?.value ?? "0"),
  }
}

function readDcxAdminSidebarClockHandCoordinates(angleDegrees: number, length: number): {
  x: number
  y: number
} {
  const angleRadians = (angleDegrees * Math.PI) / 180
  return {
    x: 50 + Math.sin(angleRadians) * length,
    y: 50 - Math.cos(angleRadians) * length,
  }
}

function readDcxAdminSidebarClockLabel(timezone: DcxAdminAuthenticatedUserClockTimezone): string {
  const withoutUtcPrefix = timezone.display_label.replace(/^\(UTC[^)]*\)\s*/, "").trim()
  if (withoutUtcPrefix) {
    return withoutUtcPrefix
  }
  return timezone.iana_name.split("/").at(-1)?.replace(/_/g, " ") ?? timezone.iana_name
}
