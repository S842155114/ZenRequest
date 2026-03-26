export type ResponseCodeLanguage = 'json' | 'xml' | 'html' | 'text'

export interface PreparedResponseCodeView {
  content: string
  language: ResponseCodeLanguage
  canPreviewAsHtml: boolean
}

const HTML_TAG_PATTERN = /<(?:!doctype\s+html|html|head|body|title|meta|link|style|script|div|span|main|section|article|header|footer|nav|aside|p|a|ul|ol|li|table|thead|tbody|tr|td|th|form|input|button)\b/i
const HTML_VOID_TAG_PATTERN = /^<(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)\b/i

const normalizeContentType = (value?: string) => value?.split(';', 1)[0].trim().toLowerCase() ?? ''

const looksLikeJson = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) return false

  try {
    JSON.parse(trimmed)
    return true
  } catch {
    return false
  }
}

const detectMarkupLanguage = (value: string): ResponseCodeLanguage | null => {
  const trimmed = value.trim()
  if (!trimmed.startsWith('<')) return null
  if (/^<!doctype html/i.test(trimmed) || /^<html[\s>]/i.test(trimmed) || HTML_TAG_PATTERN.test(trimmed)) {
    return 'html'
  }
  if (/^<\?xml/i.test(trimmed)) return 'xml'
  if (/^<([A-Za-z_][\w:.-]*)(\s[^>]*)?>[\s\S]*<\/\1>\s*$/.test(trimmed) || /^<([A-Za-z_][\w:.-]*)(\s[^>]*)?\/>\s*$/.test(trimmed)) {
    return 'xml'
  }
  return null
}

export const resolveResponseCodeLanguage = (body: string, contentType?: string): ResponseCodeLanguage => {
  const trimmed = body.trim()
  if (!trimmed) return 'text'

  const normalizedContentType = normalizeContentType(contentType)
  if (normalizedContentType.includes('json') || normalizedContentType.endsWith('+json')) return 'json'
  if (normalizedContentType.includes('html')) return 'html'
  if (normalizedContentType.includes('xml') || normalizedContentType.endsWith('+xml')) return 'xml'

  if (looksLikeJson(trimmed)) return 'json'
  return detectMarkupLanguage(trimmed) ?? 'text'
}

const formatJson = (value: string) => {
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}

const formatMarkup = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return value

  const lines = trimmed
    .replace(/>\s*</g, '>\n<')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  let depth = 0
  const formattedLines: string[] = []

  for (const line of lines) {
    const isClosingTag = /^<\/[\w:-]+/.test(line)
    const isMetaTag = /^<\?/.test(line) || /^<!/.test(line)
    const isInlineTag = /^<[^/!][^>]*>.*<\/[^>]+>$/.test(line)
    const isSelfClosingTag = /\/>$/.test(line) || HTML_VOID_TAG_PATTERN.test(line)

    if (isClosingTag) {
      depth = Math.max(depth - 1, 0)
    }

    formattedLines.push(`${'  '.repeat(depth)}${line}`)

    const isOpeningTag = /^<[^/!][^>]*>$/.test(line)
    if (isOpeningTag && !isMetaTag && !isInlineTag && !isSelfClosingTag) {
      depth += 1
    }
  }

  return formattedLines.join('\n')
}

export const prepareResponseCodeView = (body: string, contentType?: string): PreparedResponseCodeView => {
  const language = resolveResponseCodeLanguage(body, contentType)
  const canPreviewAsHtml = language === 'html'

  switch (language) {
    case 'json':
      return { language, content: formatJson(body), canPreviewAsHtml }
    case 'xml':
    case 'html':
      return { language, content: formatMarkup(body), canPreviewAsHtml }
    default:
      return { language, content: body, canPreviewAsHtml }
  }
}
