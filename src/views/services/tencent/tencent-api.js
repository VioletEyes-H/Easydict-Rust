import {invoke} from '@tauri-apps/api/core'
import CryptoJS from 'crypto-js'
import {toTencentLang} from './tencent-lang.js'

const API_HOST = 'tmt.tencentcloudapi.com'
const API_URL = `https://${API_HOST}`
const SERVICE = 'tmt'
const ACTION = 'TextTranslate'
const VERSION = '2018-03-21'
const REGION = 'ap-guangzhou'
const ALGORITHM = 'TC3-HMAC-SHA256'

function getTimestamp() {
  return Math.floor(Date.now() / 1000)
}

function getDate(timestamp) {
  return new Date(timestamp * 1000).toISOString().slice(0, 10)
}

function sha256Hex(message) {
  return CryptoJS.SHA256(message).toString(CryptoJS.enc.Hex)
}

function hmacSha256Hex(key, message) {
  return CryptoJS.HmacSHA256(message, key).toString(CryptoJS.enc.Hex)
}

function sign(secretId, secretKey, payload, timestamp) {
  const date = getDate(timestamp)

  const contentType = 'application/json; charset=utf-8'
  const canonicalHeaders = `content-type:${contentType}\nhost:${API_HOST}\nx-tc-action:${ACTION.toLowerCase()}\n`
  const signedHeaders = 'content-type;host;x-tc-action'
  const hashedPayload = sha256Hex(payload)
  const canonicalRequest = `POST\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${hashedPayload}`

  const credentialScope = `${date}/${SERVICE}/tc3_request`
  const hashedCanonicalRequest = sha256Hex(canonicalRequest)
  const stringToSign = `${ALGORITHM}\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`

  const secretDate = hmacSha256Hex(`TC3${secretKey}`, date)
  const secretService = hmacSha256Hex(secretDate, SERVICE)
  const secretSigning = hmacSha256Hex(secretService, 'tc3_request')
  const signature = hmacSha256Hex(secretSigning, stringToSign)

  return `${ALGORITHM} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
}

export async function fetchTencentTranslate(text, sourceLang, targetLang, secretId, secretKey, signal) {
  if (!secretId || !secretKey) {
    throw new Error('请先配置腾讯翻译 SecretId 和 SecretKey')
  }

  if (signal?.aborted) throw signal.reason

  const trimmed = text.slice(0, 5000)
  const fromLang = toTencentLang(sourceLang)
  const toLang = toTencentLang(targetLang)

  const payload = JSON.stringify({
    SourceText: trimmed,
    Source: fromLang,
    Target: toLang,
    ProjectId: 0,
  })

  const timestamp = getTimestamp()
  const authorization = sign(secretId, secretKey, payload, timestamp)

  const headers = {
    'Authorization': authorization,
    'Content-Type': 'application/json; charset=utf-8',
    'Host': API_HOST,
    'X-TC-Action': ACTION,
    'X-TC-Timestamp': timestamp.toString(),
    'X-TC-Version': VERSION,
    'X-TC-Region': REGION,
  }

  const response = await invoke('http_post', {
    url: API_URL,
    body: payload,
    headers,
  })

  if (signal?.aborted) throw signal.reason

  const data = JSON.parse(response)

  if (data.Response?.Error) {
    throw new Error(`腾讯翻译错误: ${data.Response.Error.Code} - ${data.Response.Error.Message}`)
  }

  if (data.Response?.TargetText) {
    return data.Response.TargetText
  }

  throw new Error('翻译结果为空')
}
