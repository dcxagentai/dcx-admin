import * as React from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox"
import { CheckIcon, ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const Combobox = ComboboxPrimitive.Root

const ComboboxInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<typeof ComboboxPrimitive.Input>
>(({ className, ...props }, ref) => (
  <ComboboxPrimitive.Input
    ref={ref}
    className={cn(
      "flex h-12 w-full rounded-none border border-black/8 bg-white px-4 text-sm text-slate-950 shadow-none outline-none placeholder:text-slate-400 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
))
ComboboxInput.displayName = "ComboboxInput"

const ComboboxContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof ComboboxPrimitive.Popup>
>(({ className, ...props }, ref) => (
  <ComboboxPrimitive.Portal>
    <ComboboxPrimitive.Positioner sideOffset={6}>
      <ComboboxPrimitive.Popup
        ref={ref}
        className={cn(
          "z-50 max-h-80 w-[var(--anchor-width)] overflow-hidden rounded-none border border-black/8 bg-white text-slate-950 shadow-lg",
          className,
        )}
        {...props}
      />
    </ComboboxPrimitive.Positioner>
  </ComboboxPrimitive.Portal>
))
ComboboxContent.displayName = "ComboboxContent"

const ComboboxEmpty = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof ComboboxPrimitive.Empty>
>(({ className, ...props }, ref) => (
  <ComboboxPrimitive.Empty
    ref={ref}
    className={cn("px-4 py-3 text-sm text-slate-500", className)}
    {...props}
  />
))
ComboboxEmpty.displayName = "ComboboxEmpty"

const ComboboxList = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof ComboboxPrimitive.List>
>(({ className, ...props }, ref) => (
  <ComboboxPrimitive.List
    ref={ref}
    className={cn("max-h-80 overflow-y-auto p-1", className)}
    {...props}
  />
))
ComboboxList.displayName = "ComboboxList"

const ComboboxItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof ComboboxPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <ComboboxPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default items-center gap-3 rounded-none px-3 py-2.5 text-sm outline-none select-none data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-950 data-[selected]:bg-slate-50",
      className,
    )}
    {...props}
  >
    {children}
    <span className="ml-auto flex size-4 items-center justify-center text-slate-500">
      <ComboboxPrimitive.ItemIndicator>
        <CheckIcon className="size-4" />
      </ComboboxPrimitive.ItemIndicator>
    </span>
  </ComboboxPrimitive.Item>
))
ComboboxItem.displayName = "ComboboxItem"

function ComboboxTriggerIcon(props: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-slate-400",
        props.className,
      )}
    >
      <ChevronDownIcon className="size-4" />
    </span>
  )
}

export {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTriggerIcon,
}
