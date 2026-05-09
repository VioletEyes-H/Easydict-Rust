import {invoke} from '@tauri-apps/api/core'
import CryptoJS from 'crypto-js'
import {toVolcanoLang} from './volcano-lang.js'

const API_HOST = 'translate.volcengineapi.com'
const API_URL = `https://${API_HOST}`
const REGION = 'cn-north-1'
const SERVICE = 'translate'
const ACTION = 'TranslateText'
const VERSION = '2020-06-01'

function getXDate() {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const day = String(now.getUTCDate()).padStart(2, '0')
  const hours = String(now.getUTCHours()).padStart(2, '0')
  const minutes = String(now.getUTCMinutes()).padStart(2, '0')
  const seconds = String(now.getUTCSeconds()).padStart(2, '0')
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`
}

function sha256Hex(message) {
  return CryptoJS.SHA256(message).toString(CryptoJS.enc.Hex)
}

function hmacSha256(key, message) {
  return CryptoJS.HmacSHA256(message, key)
}

function hmacSha256Hex(key, message) {
  return CryptoJS.HmacSHA256(message, key).toString(CryptoJS.enc.Hex)
}

function getCanonicalHeaders(headers) {
  return Object.entries(headers)
    .map(([k, v]) => `${k.toLowerCase()}:${v.trim()}`)
    .sort()
    .join('\n') + '\n'
}

function getSignedHeaders(headers) {
  return Object.keys(headers)
    .map(k => k.toLowerCase())
    .sort()
    .join(';')
}

/**
 * Volcano Engine V4 signing (HMAC-SHA256)
 * https://www.volcengine.com/docs/6369/67269
 */
function volcanoSign(accessKeyId, secretAccessKey, payload) {
  const httpMethod = 'POST'
  const uri = '/'
  const queryString = `Action=${ACTION}&Version=${VERSION}`
  const algorithm = 'HMAC-SHA256'
  const xDate = getXDate()
  const shortDate = xDate.slice(0, 8)

  const headers = {
    'Content-Type': 'application/json',
    'Host': API_HOST,
    'X-Date': xDate,
  }

  // Step 1: Canonical request
  const canonicalHeaders = getCanonicalHeaders(headers)
  const signedHeaders = getSignedHeaders(headers)
  const hashedPayload = sha256Hex(payload)
  const canonicalRequest = [
    httpMethod, uri, queryString,
    canonicalHeaders, signedHeaders, hashedPayload,
  ].join('\n')

  // Step 2: String to sign
  const credentialScope = `${shortDate}/${REGION}/${SERVICE}/request`
  const hashedCanonicalRequest = sha256Hex(canonicalRequest)
  const stringToSign = [algorithm, xDate, credentialScope, hashedCanonicalRequest].join('\n')

  // Step 3: Signature
  const kDate = hmacSha256(CryptoJS.enc.Utf8.parse(secretAccessKey), shortDate)
  const kRegion = hmacSha256(kDate, REGION)
  const kService = hmacSha256(kRegion, SERVICE)
  const kSigning = hmacSha256(kService, 'request')
  const signature = hmacSha256(kSigning, stringToSign).toString(CryptoJS.enc.Hex)

  // Step 4: Authorization header
  const authorization = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  return {
    ...headers,
    'Authorization': authorization,
  }
}

/**
 * Volcano Engine Translate API
 * @param {string} accessKeyId
 * @param {string} secretAccessKey
 */
export async function fetchVolcanoTranslate(text, sourceLang, targetLang, accessKeyId, secretAccessKey, signal) {
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('请先配置火山引擎 AccessKeyID 和 SecretAccessKey')
  }

  if (signal?.aborted) throw signal.reason

  const trimmed = text.slice(0, 5000)
  const fromLang = toVolcanoLang(sourceLang)
  const toLang = toVolcanoLang(targetLang)

  const payload = JSON.stringify({
    SourceLanguage: fromLang,
    TargetLanguage: toLang,
    TextList: [trimmed],
  })

  const headers = volcanoSign(accessKeyId, secretAccessKey, payload)

  const response = await invoke('http_post', {
    url: `${API_URL}?Action=${ACTION}&Version=${VERSION}`,
    body: payload,
    headers,
  })

  if (signal?.aborted) throw signal.reason

  const data = JSON.parse(response)

  if (data.ResponseMetadata?.Error) {
    throw new Error(`火山引擎错误: ${data.ResponseMetadata.Error.Code} - ${data.ResponseMetadata.Error.Message}`)
  }

  if (data.TranslationList?.[0]?.Translation) {
    return data.TranslationList[0].Translation
  }

  throw new Error('翻译结果为空')
}
