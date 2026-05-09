import {invoke} from '@tauri-apps/api/core'
import {getCaiyunTransType} from './caiyun-lang.js'

const API_URL = 'https://api.interpreter.caiyunai.com/v1/translator'
const DEFAULT_TOKEN = '3975l6LR5wQzNgnMIjq0'

/**
 * Caiyun (Lingocloud) Translate API
 * @param {string} token - API token (uses default if empty)
 */
export async function fetchCaiyunTranslate(text, sourceLang, targetLang, token, signal) {
  if (signal?.aborted) throw signal.reason

  const transType = getCaiyunTransType(sourceLang, targetLang)
  if (!transType) {
    throw new Error('不支持的语言对，请检查源语言和目标语言')
  }

  const trimmed = text.slice(0, 5000)
  const apiToken = token || DEFAULT_TOKEN

  const payload = JSON.stringify({
    source: trimmed.split('\n'),
    trans_type: transType,
    media: 'text',
    request_id: 'translate-tauri',
    detect: transType.startsWith('auto'),
  })

  const response = await invoke('http_post', {
    url: API_URL,
    body: payload,
    headers: {
      'Content-Type': 'application/json',
      'X-Authorization': `token ${apiToken}`,
    },
  })

  if (signal?.aborted) throw signal.reason

  const data = JSON.parse(response)

  if (data.target && data.target.length > 0) {
    return data.target.join('\n')
  }

  if (data.error) {
    throw new Error(data.error)
  }

  throw new Error('翻译结果为空')
}
