const tencentLangMap = {
  auto: 'auto',
  zh: 'zh',
  en: 'en',
  ja: 'ja',
  ko: 'ko',
  fr: 'fr',
  de: 'de',
  es: 'es',
  pt: 'pt',
  it: 'it',
  tr: 'tr',
  ru: 'ru',
  vi: 'vi',
  id: 'id',
  th: 'th',
  ms: 'ms',
  ar: 'ar',
  hi: 'hi',
}

export function toTencentLang(lang) {
  return tencentLangMap[lang] || lang
}

// Tencent has restricted language pairs
const supportedPairs = {
  zh: ['en', 'ja', 'ko', 'fr', 'es', 'it', 'de', 'tr', 'ru', 'pt', 'vi', 'id', 'th', 'ms'],
  en: ['zh', 'ja', 'ko', 'fr', 'es', 'it', 'de', 'tr', 'ru', 'pt', 'vi', 'id', 'th', 'ms', 'ar', 'hi'],
  ja: ['zh', 'en', 'ko'],
  ko: ['zh', 'en', 'ja'],
  fr: ['zh', 'en', 'es', 'it', 'de', 'tr', 'ru', 'pt'],
  es: ['zh', 'en', 'fr', 'it', 'de', 'tr', 'ru', 'pt'],
  it: ['zh', 'en', 'fr', 'es', 'de', 'tr', 'ru', 'pt'],
  de: ['zh', 'en', 'fr', 'es', 'it', 'tr', 'ru', 'pt'],
  tr: ['zh', 'en', 'fr', 'es', 'it', 'de', 'ru', 'pt'],
  ru: ['zh', 'en', 'fr', 'es', 'it', 'de', 'tr', 'pt'],
  pt: ['zh', 'en', 'fr', 'es', 'it', 'de', 'tr', 'ru'],
  vi: ['zh', 'en'],
  id: ['zh', 'en'],
  th: ['zh', 'en'],
  ms: ['zh', 'en'],
  ar: ['en'],
  hi: ['en'],
}

export function isTencentPairSupported(sourceLang, targetLang) {
  const src = sourceLang === 'auto' ? 'auto' : sourceLang
  if (src === 'auto') return true
  const targets = supportedPairs[src]
  if (!targets) return false
  return targets.includes(targetLang)
}
