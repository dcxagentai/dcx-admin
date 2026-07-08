/**
 * CONTEXT:
 * This file summarizes recent AI translation jobs for admin editor badges.
 * The jobs API intentionally returns retry history, so status badges must collapse rows to the
 * latest job per target language before counting failures or active work.
 */

export type DcxAdminAiTranslationStatusJob = {
  job_id: number | null
  job_status: string
  target_language?: {
    language_code?: string
  }
  last_error_code?: string | null
}

export function readLatestDcxAdminAiTranslationJobsByTargetLanguage<
  TJob extends DcxAdminAiTranslationStatusJob,
>(jobs: TJob[]): TJob[] {
  const latestJobs = [...jobs].sort((leftJob, rightJob) => {
    return (rightJob.job_id ?? 0) - (leftJob.job_id ?? 0)
  })
  const latestJobsByTargetLanguage = new Map<string, TJob>()

  for (const job of latestJobs) {
    const targetLanguageCode = job.target_language?.language_code?.trim() ?? ""
    const targetKey = targetLanguageCode !== "" ? targetLanguageCode : `job:${job.job_id ?? latestJobsByTargetLanguage.size}`
    if (!latestJobsByTargetLanguage.has(targetKey)) {
      latestJobsByTargetLanguage.set(targetKey, job)
    }
  }

  return Array.from(latestJobsByTargetLanguage.values())
}

export function hasDcxAdminAiTranslationActiveJobs(
  jobs: DcxAdminAiTranslationStatusJob[],
): boolean {
  return readLatestDcxAdminAiTranslationJobsByTargetLanguage(jobs).some((job) =>
    ["queued", "processing"].includes(job.job_status),
  )
}

export function readDcxAdminAiTranslationStatusLabel(
  jobs: DcxAdminAiTranslationStatusJob[],
): string {
  const latestJobs = readLatestDcxAdminAiTranslationJobsByTargetLanguage(jobs)
  const activeCount = latestJobs.filter((job) => ["queued", "processing"].includes(job.job_status)).length
  const failedJobs = latestJobs.filter((job) => job.job_status === "failed")
  const staleCount = latestJobs.filter((job) => job.job_status === "stale_source").length

  if (activeCount > 0) {
    return `${activeCount} AI translation job${activeCount === 1 ? "" : "s"} running`
  }

  if (failedJobs.length > 0) {
    const distinctErrorCodes = Array.from(
      new Set(
        failedJobs
          .map((job) => job.last_error_code?.trim() ?? "")
          .filter((errorCode) => errorCode !== ""),
      ),
    )
    const errorCodeLabel =
      distinctErrorCodes.length === 1
        ? ` (${distinctErrorCodes[0]})`
        : distinctErrorCodes.length > 1
          ? ` (${distinctErrorCodes.slice(0, 2).join(", ")})`
          : ""
    return `${failedJobs.length} AI translation job${failedJobs.length === 1 ? "" : "s"} failed${errorCodeLabel}`
  }

  if (staleCount > 0) {
    return `${staleCount} AI translation job${staleCount === 1 ? "" : "s"} needs re-run`
  }

  return "AI translations idle"
}
