/**
 * CallerDesk click_to_call_v2 expects `authcode` (Integration key).
 * Users sometimes paste a full URL, `authcode=...`, or copy with BOM / smart quotes — normalize when saving.
 */
export function normalizeCallerDeskIntegrationInput(raw: string): string {
  let t = raw.trim().replace(/^\uFEFF/, '')
  t = t.replace(/[\u200B-\u200D\uFEFF]/g, '').trim()
  if (!t) return ''

  const stripWrappingQuotes = (s: string) => {
    const x = s.trim()
    if ((x.startsWith('"') && x.endsWith('"')) || (x.startsWith("'") && x.endsWith("'"))) {
      return x.slice(1, -1).trim()
    }
    return x
  }

  const compact = t.replace(/\s+/g, '')
  const match = /(?:^|[?&])authcode=([^&]+)/i.exec(compact)
  if (match?.[1]) {
    try {
      return stripWrappingQuotes(decodeURIComponent(match[1]).replace(/\s+/g, '').trim())
    } catch {
      return stripWrappingQuotes(match[1].replace(/\s+/g, '').trim())
    }
  }

  return stripWrappingQuotes(compact)
}
