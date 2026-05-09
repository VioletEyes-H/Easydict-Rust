import {invoke} from '@tauri-apps/api/core'
import {toGoogleLang} from './google-lang.js'

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

// TKK signing for Google Translate
let tkk = '444000.1270171236'

function xr(a, b) {
  const c = a + b
  const d = c.length
  let e = 0
  for (let f = 0; f < d; f++) {
    const g = c.charCodeAt(f)
    e = (e + (g << (f % 5 + 3))) & 0xffffffff
  }
  return e
}

function sign(text) {
  const tkkParts = tkk.split('.')
  const a = parseInt(tkkParts[0], 10) || 0
  let b = parseInt(tkkParts[1], 10) || 0

  const bytes = []
  for (let i = 0; i < text.length; i++) {
    let charCode = text.charCodeAt(i)
    if (charCode < 0x80) {
      bytes.push(charCode)
    } else if (charCode < 0x800) {
      bytes.push((charCode >> 6) | 0xc0)
      bytes.push((charCode & 0x3f) | 0x80)
    } else if ((charCode & 0xfc00) === 0xd800 && i + 1 < text.length && (text.charCodeAt(i + 1) & 0xfc00) === 0xdc00) {
      charCode = 0x10000 + ((charCode & 0x3ff) << 10) + (text.charCodeAt(++i) & 0x3ff)
      bytes.push((charCode >> 18) | 0xf0)
      bytes.push(((charCode >> 12) & 0x3f) | 0x80)
      bytes.push(((charCode >> 6) & 0x3f) | 0x80)
      bytes.push((charCode & 0x3f) | 0x80)
    } else {
      bytes.push((charCode >> 12) | 0xe0)
      bytes.push(((charCode >> 6) & 0x3f) | 0x80)
      bytes.push((charCode & 0x3f) | 0x80)
    }
  }

  let d = a
  for (let i = 0; i < bytes.length; i++) {
    d += bytes[i]
    d = xr(d, '+-a^+6')
  }
  d = xr(d, '+-3^+b+-f')
  d ^= b
  if (d < 0) d = (d & 0x7fffffff) + 0x80000000
  d %= 1e6
  return d.toString() + '.' + (d ^ a)
}

async function refreshTKK(signal) {
  try {
    if (signal?.aborted) throw signal.reason
    const html = await invoke('http_get', {
      url: 'https://translate.google.com',
      headers: {'User-Agent': USER_AGENT},
    })
    const match = html.match(/tkk:'(\d+\.\d+)'/)
    if (match) {
      tkk = match[1]
    }
  } catch {
    // use default tkk
  }
}

/**
 * Google GTX Translate - general translation
 */
export async function fetchGoogleTranslate(text, sourceLang, targetLang, signal) {
  if (signal?.aborted) throw signal.reason

  const fromLang = toGoogleLang(sourceLang)
  const toLang = toGoogleLang(targetLang)
  const trimmed = text.slice(0, 5000)

  const params = new URLSearchParams({
    client: 'gtx',
    sl: fromLang,
    tl: toLang,
    dt: 't',
    dj: '1',
    ie: 'UTF-8',
    q: trimmed,
  })

  const url = `https://translate.google.com/translate_a/single?${params}`

  const response = await invoke('http_get', {
    url,
    headers: {'User-Agent': USER_AGENT},
  })

  if (signal?.aborted) throw signal.reason

  const data = JSON.parse(response)

  if (data.sentences) {
    return data.sentences.map(s => s.trans || '').join('')
  }

  throw new Error('翻译结果为空')
}

/**
 * Google WebApp Translate - rich dictionary lookup
 */
export async function fetchGoogleDictQuery(text, sourceLang, targetLang, signal) {
  if (signal?.aborted) throw signal.reason

  const fromLang = toGoogleLang(sourceLang)
  const toLang = toGoogleLang(targetLang)
  const trimmed = text.slice(0, 2000)

  await refreshTKK(signal)
  const tk = sign(trimmed)

  // URLSearchParams only keeps last value for duplicate keys, build manually
  const qs = `client=webapp&sl=${fromLang}&tl=${toLang}&hl=en&dt=at&dt=bd&dt=ex&dt=ld&dt=md&dt=qca&dt=rw&dt=rm&dt=ss&dt=t&otf=2&ssel=3&tsel=0&kc=6&tk=${encodeURIComponent(tk)}&q=${encodeURIComponent(trimmed)}`

  const url = `https://translate.google.com/translate_a/single?${qs}`

  const response = await invoke('http_get', {
    url,
    headers: {'User-Agent': USER_AGENT},
  })

  if (signal?.aborted) throw signal.reason

  const data = JSON.parse(response)
  return parseGoogleDictResponse(data, sourceLang)
}

function parseGoogleDictResponse(data, sourceLang) {
  const result = {
    phonetics: [],
    posTranslations: [],
    webTranslations: [],
    similar: [],
  }

  // data[0] contains translation segments
  // data[1] contains dictionary entries
  // data[0] may also have src_transliteration

  if (data[1]) {
    for (const dictEntry of data[1]) {
      const pos = dictEntry[0] || ''
      const entries = dictEntry[1] || []
      if (entries.length > 0) {
        const translations = entries.slice(0, 5).map(e => e[0])
        result.posTranslations.push({pos, translations})
      }
    }
  }

  // data[12] may have synonyms
  if (data[12]) {
    for (const group of data[12]) {
      const pos = group[0] || ''
      const synonyms = group[1]?.[0]?.slice(0, 3) || []
      if (synonyms.length > 0) {
        result.similar.push({pos, translations: synonyms.join(', ')})
      }
    }
  }

  return result
}
