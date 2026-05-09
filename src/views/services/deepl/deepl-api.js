import {invoke} from '@tauri-apps/api/core'
import {toDeepLSourceLang, toDeepLTargetLang} from './deepl-lang.js'

const WEB_URL = 'https://www2.deepl.com/jsonrpc'
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

function getICount(text) {
  return (text.match(/i/g) || []).length
}

function getRandomNumber() {
  const rand = Math.floor(Math.random() * (189998 - 100000 + 1)) + 100000
  return rand * 1000
}

function getTimestamp(iCount) {
  const ts = Date.now()
  if (iCount !== 0) {
    const count = iCount + 1
    return ts - (ts % count) + count
  }
  return ts
}

/**
 * DeepL web translate (free, no API key needed)
 * Uses JSONRPC endpoint with anti-bot measures
 */
export async function fetchDeepLWebTranslate(text, sourceLang, targetLang, signal) {
  if (signal?.aborted) throw signal.reason

  const trimmed = text.slice(0, 5000)
  const fromLang = toDeepLSourceLang(sourceLang)
  const toLang = toDeepLTargetLang(targetLang)

  const requestID = getRandomNumber()
  const iCount = getICount(trimmed)
  const timestamp = getTimestamp(iCount)

  const params = {
    texts: [{text: trimmed, requestAlternatives: 3}],
    splitting: 'newlines',
    lang: {
      source_lang_user_selected: fromLang === 'auto' ? 'auto' : fromLang.split('-')[0].toUpperCase(),
      target_lang: toLang.split('-')[0].toUpperCase(),
    },
    timestamp,
  }

  // Add regional variant for target language if needed
  const baseTarget = toLang.split('-')[0]
  if (toLang !== baseTarget) {
    params.commonJobParams = {
      regionalVariant: toLang,
      mode: 'translate',
      browserType: 1,
      textType: 'plaintext',
    }
  }

  const postData = {
    jsonrpc: '2.0',
    method: 'LMT_handle_texts',
    id: requestID,
    params,
  }

  let postStr = JSON.stringify(postData)

  // DeepL anti-bot: method spacing depends on request ID
  if ((requestID + 5) % 29 === 0 || (requestID + 3) % 13 === 0) {
    postStr = postStr.replace('"method":"', '"method" : "')
  } else {
    postStr = postStr.replace('"method":"', '"method": "')
  }

  const response = await invoke('http_post', {
    url: WEB_URL,
    body: postStr,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT,
    },
  })

  if (signal?.aborted) throw signal.reason

  const data = JSON.parse(response)

  if (data.result?.texts?.[0]?.text) {
    return data.result.texts[0].text
  }

  if (data.error) {
    throw new Error(data.error.message || 'DeepL 翻译失败')
  }

  throw new Error('翻译结果为空')
}

/**
 * DeepL official API translate (requires auth key)
 * @param {string} authKey - DeepL auth key
 * @param {string} endpoint - Custom endpoint (optional)
 */
export async function fetchDeepLTranslate(text, sourceLang, targetLang, authKey, endpoint, signal) {
  if (signal?.aborted) throw signal.reason
  if (!authKey) throw new Error('请先配置 DeepL Auth Key')

  const trimmed = text.slice(0, 5000)
  const fromLang = toDeepLSourceLang(sourceLang)
  const toLang = toDeepLTargetLang(targetLang)

  // DeepL free keys end with :fx
  const isFreeKey = authKey.endsWith(':fx')
  const host = isFreeKey ? 'https://api-free.deepl.com' : 'https://api.deepl.com'
  let url = `${host}/v2/translate`

  if (endpoint) {
    url = endpoint
  }

  const params = new URLSearchParams({
    text: trimmed,
    source_lang: fromLang === 'auto' ? 'auto' : fromLang.split('-')[0].toUpperCase(),
    target_lang: toLang.toUpperCase(),
  })

  const response = await invoke('http_post', {
    url,
    body: params.toString(),
    headers: {
      'Authorization': `DeepL-Auth-Key ${authKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
  })

  if (signal?.aborted) throw signal.reason

  const data = JSON.parse(response)

  if (data.translations?.[0]?.text) {
    return data.translations[0].text
  }

  if (data.message) {
    throw new Error(data.message)
  }

  throw new Error('翻译结果为空')
}
