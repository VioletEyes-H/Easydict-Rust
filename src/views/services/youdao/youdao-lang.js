const webLangMap = {
  zh: 'zh-CHS',
  en: 'en',
  ja: 'ja',
  ko: 'ko',
  fr: 'fr',
  de: 'de',
  es: 'es',
  pt: 'pt',
  ru: 'ru',
  ar: 'ar',
  it: 'it',
  th: 'th',
  vi: 'vi',
  id: 'id',
  ms: 'ms',
  tr: 'tr',
  nl: 'nl',
  pl: 'pl',
  sv: 'sv',
  da: 'da',
  fi: 'fi',
  nb: 'nb',
  cs: 'cs',
  el: 'el',
  he: 'he',
  hi: 'hi',
  bn: 'bn',
  uk: 'uk',
  ro: 'ro',
  hu: 'hu',
  sk: 'sk',
  bg: 'bg',
  hr: 'hr',
  lt: 'lt',
  lv: 'lv',
  et: 'et',
  sl: 'sl',
}

const dictSupportedLangs = new Set(['en', 'ja', 'ko', 'fr'])

export function toYoudaoLang(lang) {
  return webLangMap[lang] || lang
}

export function isDictSupported(sourceLang, targetLang) {
  if (sourceLang === 'auto') return false
  if (sourceLang === 'zh') return dictSupportedLangs.has(targetLang)
  if (targetLang === 'zh') return dictSupportedLangs.has(sourceLang)
  return false
}
