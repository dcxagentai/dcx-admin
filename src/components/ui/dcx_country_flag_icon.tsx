import * as React from "react"
import * as FlagIcons from "country-flag-icons/react/3x2"

import { cn } from "@/lib/utils"

type Props = {
  regionCode: string
  title?: string
  fallbackLabel?: string
  className?: string
}

export function DcxCountryFlagIcon(props: Props) {
  const normalizedRegionCode = props.regionCode.toUpperCase() as keyof typeof FlagIcons
  const FlagComponent = FlagIcons[normalizedRegionCode] as
    | React.ComponentType<React.SVGProps<SVGSVGElement>>
    | undefined

  if (!FlagComponent) {
    return (
      <span
        title={props.title}
        className={cn(
          "inline-flex min-w-9 items-center justify-center border border-black/10 bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700",
          props.className,
        )}
      >
        {props.fallbackLabel ?? props.regionCode}
      </span>
    )
  }

  return (
    <span
      title={props.title}
      className={cn(
        "inline-flex h-6 w-9 items-center justify-center overflow-hidden border border-black/10 bg-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]",
        props.className,
      )}
    >
      <FlagComponent className="block h-full w-full" />
    </span>
  )
}
