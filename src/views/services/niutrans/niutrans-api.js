import {invoke} from '@tauri-apps/api/core'
import {toNiuTransLang} from './niutrans-lang.js'

const API_URL = 'https://api.niutrans.com/NiuTransServer/translation'
const DEFAULT_API_KEY = ''

/**
 * NiuTrans Translate API
 * @param {string} apiKey - API key (uses default if empty)
 */
export async function fetchNiuTransTranslate(text, sourceLang, targetLang, apiKey, signal) {
  if (!apiKey) {
    throw new Error('请先配置小牛翻译 API Key')
  }

  if (signal?.aborted) throw signal.reason

  const trimmed = text.slice(0, 5000)
  const fromLang = toNiuTransLang(sourceLang)
  const toLang = toNiuTransLang(targetLang)

  const params = new URLSearchParams({
    apikey: apiKey,
    src_text: trimmed,
    from: fromLang,
    to: toLang,
    source: 'translate-tauri',
  })

  const response = await invoke('http_post', {
    url: API_URL,
    body: params.toString(),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })

  if (signal?.aborted) throw signal.reason

  const data = JSON.parse(response)

  if (data.tgt_text) {
    return data.tgt_text
  }

  if (data.error_code) {
    const msg = data.error_msg ? `${data.error_code}: ${data.error_msg}` : data.error_code
    throw new Error(`小牛翻译错误: ${msg}`)
  }

  throw new Error('翻译结果为空')
}
