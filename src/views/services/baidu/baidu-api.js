import {invoke} from '@tauri-apps/api/core'
import {md5} from '@/utils/crypto.js'
import {toBaiduLang} from './baidu-lang.js'

const API_URL = 'https://fanyi-api.baidu.com/api/trans/vip/translate'

/**
 * 调用百度翻译 API
 * @param {string} text - 待翻译文本
 * @param {string} from - 源语言代码
 * @param {string} to - 目标语言代码
 * @param {string} appId - 百度翻译 App ID
 * @param {string} secretKey - 百度翻译密钥
 * @param {AbortSignal} signal - 取消信号
 * @returns {Promise<string>} 翻译结果
 */
export async function fetchBaiduTranslate(text, from, to, appId, secretKey, signal) {
  if (!appId || !secretKey) {
    throw new Error('请先配置百度翻译 App ID 和密钥')
  }

  const q = text.slice(0, 5000)
  const salt = crypto.randomUUID()
  const sign = md5(appId + q + salt + secretKey)

  const fromLang = toBaiduLang(from)
  const toLang = toBaiduLang(to)

  const params = new URLSearchParams({
    q,
    from: fromLang,
    to: toLang,
    appid: appId,
    salt,
    sign,
  })

  const body = params.toString()

  const response = await invoke('http_post', {
    url: API_URL,
    body,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError')
  }

  const data = JSON.parse(response)

  if (data.error_code) {
    throw new Error(`百度翻译错误: ${data.error_code} - ${data.error_msg}`)
  }

  if (!data.trans_result || data.trans_result.length === 0) {
    throw new Error('翻译结果为空')
  }

  return data.trans_result.map(item => item.dst).join('\n')
}
