/**
 * CONTEXT:
 * This file owns timezone-aware admin date/time helpers for scheduled DCX operations.
 * It exists so admin users schedule newsletters and sequences in the timezone saved on their
 * DCX account, while the backend continues to store absolute Unix millisecond timestamps.
 *
 * CODE:
 */

type DcxDateTimeParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

function readSafeTimezoneIanaName(timezoneIanaName: string | null | undefined): string | undefined {
  const normalizedTimezone = timezoneIanaName?.trim()
  return normalizedTimezone === "" ? undefined : normalizedTimezone
}

function readDateTimePartsInTimezone(timestampMs: number, timezoneIanaName: string | null | undefined): DcxDateTimeParts {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: readSafeTimezoneIanaName(timezoneIanaName),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })
  const parts = Object.fromEntries(
    formatter
      .formatToParts(new Date(timestampMs))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  )

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  }
}

export function formatDcxAdminTimestampLabel(timestampMs: number | null, timezoneIanaName: string | null | undefined): string {
  if (typeof timestampMs !== "number") {
    return "Not set"
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: readSafeTimezoneIanaName(timezoneIanaName),
  }).format(new Date(timestampMs))
}

export function formatDcxAdminCalendarDateLabel(dateValue: Date | undefined): string {
  if (!dateValue) {
    return "Choose send date"
  }

  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(Date.UTC(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate(), 12, 0, 0)),
  )
}

export function buildDcxAdminCalendarDateFromTimestamp(
  timestampMs: number | null,
  timezoneIanaName: string | null | undefined,
): Date | undefined {
  if (typeof timestampMs !== "number") {
    return undefined
  }

  const parts = readDateTimePartsInTimezone(timestampMs, timezoneIanaName)
  return new Date(parts.year, parts.month - 1, parts.day)
}

export function buildDcxAdminDateInputValueFromTimestamp(
  timestampMs: number | null,
  timezoneIanaName: string | null | undefined,
): string {
  if (typeof timestampMs !== "number") {
    return ""
  }

  const parts = readDateTimePartsInTimezone(timestampMs, timezoneIanaName)
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`
}

export function buildDcxAdminTimeInputValueFromTimestamp(
  timestampMs: number | null,
  timezoneIanaName: string | null | undefined,
): string {
  if (typeof timestampMs !== "number") {
    return ""
  }

  const parts = readDateTimePartsInTimezone(timestampMs, timezoneIanaName)
  return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`
}

export function readDcxAdminTimestampFromCalendarDateAndTime(
  dateValue: Date | undefined,
  timeValue: string,
  timezoneIanaName: string | null | undefined,
): number | null {
  if (!dateValue) {
    return null
  }

  return readDcxAdminTimestampFromDateAndTime(
    `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, "0")}-${String(dateValue.getDate()).padStart(2, "0")}`,
    timeValue,
    timezoneIanaName,
  )
}

export function readDcxAdminTimestampFromDateAndTime(
  dateValue: string,
  timeValue: string,
  timezoneIanaName: string | null | undefined,
): number | null {
  if (dateValue.trim() === "" || timeValue.trim() === "") {
    return null
  }

  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue)
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeValue)
  if (!dateMatch || !timeMatch) {
    return null
  }

  const year = Number(dateMatch[1])
  const month = Number(dateMatch[2])
  const day = Number(dateMatch[3])
  const hour = Number(timeMatch[1])
  const minute = Number(timeMatch[2])
  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null
  }

  if (!readSafeTimezoneIanaName(timezoneIanaName)) {
    const localDate = new Date(year, month - 1, day, hour, minute, 0, 0)
    return Number.isNaN(localDate.getTime()) ? null : localDate.getTime()
  }

  const timezoneWallClockAsUtcMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0)
  const firstOffsetMs = readTimezoneOffsetMs(timezoneWallClockAsUtcMs, timezoneIanaName)
  let resolvedTimestampMs = timezoneWallClockAsUtcMs - firstOffsetMs
  const secondOffsetMs = readTimezoneOffsetMs(resolvedTimestampMs, timezoneIanaName)
  if (secondOffsetMs !== firstOffsetMs) {
    resolvedTimestampMs = timezoneWallClockAsUtcMs - secondOffsetMs
  }

  return Number.isNaN(resolvedTimestampMs) ? null : resolvedTimestampMs
}

function readTimezoneOffsetMs(timestampMs: number, timezoneIanaName: string | null | undefined): number {
  const parts = readDateTimePartsInTimezone(timestampMs, timezoneIanaName)
  const timezoneWallClockAsUtcMs = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    0,
  )
  return timezoneWallClockAsUtcMs - timestampMs
}
