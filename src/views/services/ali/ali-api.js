import {invoke} from '@tauri-apps/api/core'
import CryptoJS from 'crypto-js'
import {toAliLang} from './ali-lang.js'

const API_URL = 'https://mt.aliyuncs.com'

/**
 * RFC 3986 percent encoding
 */
function percentEncode(str) {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A')
}

/**
 * Aliyun RPC-style signature (HMAC-SHA1)
 */
function sign(params, accessKeySecret) {
  // 1. Sort parameters alphabetically
  const sortedKeys = Object.keys(params).sort()

  // 2. Build canonicalized query string
  const canonicalizedQuery = sortedKeys
    .map(key => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join('&')

  // 3. Build string to sign
  const stringToSign = `POST&${percentEncode('/')}&${percentEncode(canonicalizedQuery)}`

  // 4. HMAC-SHA1 with key = secretKey + "&"
  const key = accessKeySecret + '&'
  const signature = CryptoJS.HmacSHA1(stringToSign, key).toString(CryptoJS.enc.Base64)

  return signature
}

/**
 * Call Aliyun Machine Translation API
 */
export async function fetchAliTranslate(text, sourceLang, targetLang, accessKeyId, accessKeySecret, signal) {
  if (!accessKeyId || !accessKeySecret) {
    throw new Error('请先配置阿里翻译 AccessKeyId 和 AccessKeySecret')
  }

  if (signal?.aborted) throw signal.reason

  const trimmed = text.slice(0, 5000)
  const fromLang = toAliLang(sourceLang)
  const toLang = toAliLang(targetLang)

  const timestamp = new Date().toISOString()
  const nonce = crypto.randomUUID()

  const params = {
    FormatType: 'text',
    SourceLanguage: fromLang,
    TargetLanguage: toLang,
    SourceText: trimmed,
    Scene: 'general',
    Action: 'TranslateGeneral',
    Version: '2018-10-12',
    Format: 'JSON',
    AccessKeyId: accessKeyId,
    SignatureNonce: nonce,
    Timestamp: timestamp,
    SignatureMethod: 'HMAC-SHA1',
    SignatureVersion: '1.0',
  }

  const signature = sign(params, accessKeySecret)
  params.Signature = signature

  // Build form body
  const body = Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&')

  const response = await invoke('http_post', {
    url: API_URL,
    body,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })

  if (signal?.aborted) throw signal.reason

  const data = JSON.parse(response)

  if (data.Code && data.Code !== '200') {
    throw new Error(`阿里翻译错误: ${data.Code} - ${data.Message}`)
  }

  if (data.Data?.Translated) {
    return data.Data.Translated
  }

  throw new Error('翻译结果为空')
}
