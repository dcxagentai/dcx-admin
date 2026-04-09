/**
 * CONTEXT:
 * This file renders a deliberately small subset of markdown into safe HTML for DCX admin preview panels.
 * It exists so content pages and newsletters can show a basic split preview without introducing rich-text editors or third-party markdown packages.
 *
 * CODE:
 */
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function formatInlineMarkdown(value: string): string {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
}

export function renderDcxBasicMarkdownToHtml(markdown: string): string {
  const normalized = markdown.replace(/\r\n/g, "\n").trim()
  if (normalized === "") {
    return '<p class="text-slate-400">Nothing to preview yet.</p>'
  }

  const lines = normalized.split("\n")
  const htmlParts: string[] = []
  let currentListType: "ul" | "ol" | null = null

  function closeList() {
    if (currentListType) {
      htmlParts.push(`</${currentListType}>`)
      currentListType = null
    }
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === "") {
      closeList()
      continue
    }

    const unorderedMatch = /^-\s+(.+)$/.exec(trimmed)
    if (unorderedMatch) {
      if (currentListType !== "ul") {
        closeList()
        currentListType = "ul"
        htmlParts.push('<ul class="list-disc space-y-2 pl-6">')
      }
      htmlParts.push(`<li>${formatInlineMarkdown(unorderedMatch[1])}</li>`)
      continue
    }

    const orderedMatch = /^\d+\.\s+(.+)$/.exec(trimmed)
    if (orderedMatch) {
      if (currentListType !== "ol") {
        closeList()
        currentListType = "ol"
        htmlParts.push('<ol class="list-decimal space-y-2 pl-6">')
      }
      htmlParts.push(`<li>${formatInlineMarkdown(orderedMatch[1])}</li>`)
      continue
    }

    closeList()

    if (trimmed.startsWith("### ")) {
      htmlParts.push(`<h3 class="text-lg font-semibold">${formatInlineMarkdown(trimmed.slice(4))}</h3>`)
      continue
    }
    if (trimmed.startsWith("## ")) {
      htmlParts.push(`<h2 class="text-xl font-semibold">${formatInlineMarkdown(trimmed.slice(3))}</h2>`)
      continue
    }
    if (trimmed.startsWith("# ")) {
      htmlParts.push(`<h1 class="text-2xl font-semibold">${formatInlineMarkdown(trimmed.slice(2))}</h1>`)
      continue
    }

    htmlParts.push(`<p>${formatInlineMarkdown(trimmed)}</p>`)
  }

  closeList()
  return htmlParts.join("\n")
}
