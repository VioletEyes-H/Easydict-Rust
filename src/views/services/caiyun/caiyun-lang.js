const caiyunLangMap = {
  auto: 'auto',
  zh: 'zh',
  en: 'en',
  ja: 'ja',
  ko: 'ko',
  fr: 'fr',
  de: 'de',
  es: 'es',
  it: 'it',
  pt: 'pt',
  ru: 'ru',
  tr: 'tr',
  vi: 'vi',
}

export function toCaiyunLang(lang) {
  return caiyunLangMap[lang] || 'auto'
}

/**
 * Build Caiyun trans_type: "source2target"
 * Returns null if unsupported
 */
export function getCaiyunTransType(sourceLang, targetLang) {
  const from = caiyunLangMap[sourceLang]
  const to = caiyunLangMap[targetLang]
  if (!from || !to) return null
  if (from === to) return null
  return `${from}2${to}`
}
