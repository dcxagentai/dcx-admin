/**
 * CONTEXT:
 * Small admin-only language label primitive with a flag and readable text.
 * It keeps editor headers and selected-language labels visually consistent
 * with the new flagged translation comboboxes.
 */
import { DcxCountryFlagIcon } from "@/components/ui/dcx_country_flag_icon"
import { readDcxAdminLanguageFlagRegionCode } from "@/lib/dcx_admin_language_flag_options"
import { cn } from "@/lib/utils"

type Props = {
  languageCode: string
  label: string
  className?: string
  flagClassName?: string
  textClassName?: string
}

export function DcxAdminLanguageFlagLabel(props: Props) {
  return (
    <span className={cn("inline-flex items-center gap-3", props.className)}>
      <DcxCountryFlagIcon
        regionCode={readDcxAdminLanguageFlagRegionCode(props.languageCode)}
        title={props.label}
        fallbackLabel={props.languageCode.toUpperCase()}
        className={props.flagClassName}
      />
      <span className={cn("truncate", props.textClassName)}>{props.label}</span>
    </span>
  )
}
