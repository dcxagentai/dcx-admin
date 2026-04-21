"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonGroupVariants = cva("inline-flex items-stretch", {
  variants: {
    orientation: {
      horizontal: "flex-row [&>[data-slot=button]:not(:first-child)]:ml-[-1px]",
      vertical: "flex-col [&>[data-slot=button]:not(:first-child)]:mt-[-1px]",
    },
  },
  defaultVariants: {
    orientation: "horizontal",
  },
})

function ButtonGroup({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof buttonGroupVariants>) {
  return (
    <div
      role="group"
      data-slot="button-group"
      data-orientation={orientation}
      className={cn(buttonGroupVariants({ orientation, className }))}
      {...props}
    />
  )
}

export { ButtonGroup }
