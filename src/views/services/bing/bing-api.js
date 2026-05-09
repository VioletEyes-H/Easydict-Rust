import {invoke} from '@tauri-apps/api/core'
import {toBingLang, bingVoiceMap} from './bing-lang.js'

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
const CHINA_HOST = 'cn.bing.com'

// Cached Bing config (persisted across calls)
let bingConfig = {
  host: null,
  IG: null,
  IID: null,
  key: null,
  token: null,
  expirationInterval: null,
  timestamp: 0,
}

function isTokenExpired() {
  if (!bingConfig.key) return true
  const tokenStart = parseInt(bingConfig.key, 10) || 0
  const now = Date.now()
  const interval = parseInt(bingConfig.expirationInterval, 10) || 3600000
  return (now - tokenStart) > interval / 2
}

async function ensureHost(signal) {
  if (bingConfig.host) return
  if (signal?.aborted) throw signal.reason

  try {
    // Follow redirect from cn.bing.com to get actual host
    const resp = await invoke('http_get', {
      url: `http://${CHINA_HOST}`,
      headers: {'User-Agent': USER_AGENT},
    })
    // The response comes from the redirected host, but we can't easily detect it
    // from the body. Just use cn.bing.com as default.
    bingConfig.host = CHINA_HOST
  } catch {
    bingConfig.host = CHINA_HOST
  }
}

async function ensureConfig(signal) {
  if (!isTokenExpired()) return
  if (signal?.aborted) throw signal.reason

  await ensureHost(signal)

  const url = `https://${bingConfig.host}/translator`
  const html = await invoke('http_get', {
    url,
    headers: {'User-Agent': USER_AGENT},
  })

  if (signal?.aborted) throw signal.reason

  // Parse IG
  const igMatch = html.match(/IG:\s*"([^"]+)"/)
  if (!igMatch) throw new Error('Bing IG 解析失败')
  bingConfig.IG = igMatch[1]

  // Parse IID
  const iidMatch = html.match(/data-iid\s*=\s*"([^"]+)"/)
  if (!iidMatch) throw new Error('Bing IID 解析失败')
  bingConfig.IID = iidMatch[1]

  // Parse params_AbusePreventionHelper
  const helperMatch = html.match(/params_AbusePreventionHelper\s*=\s*\[([^\]]+)\]/)
  if (!helperMatch) throw new Error('Bing token 解析失败')
  const parts = helperMatch[1].replace(/"/g, '').split(',')
  if (parts.length < 3) throw new Error('Bing token 格式错误')

  bingConfig.key = parts[0].trim()
  bingConfig.token = parts[1].trim()
  bingConfig.expirationInterval = parts[2].trim()
  bingConfig.timestamp = Date.now()
}

function buildURL(path) {
  return `https://${bingConfig.host}/${path}?isVertical=1&IG=${bingConfig.IG}&IID=${bingConfig.IID}`
}

/**
 * Bing translate - uses ttranslatev3 endpoint
 */
export async function fetchBingTranslate(text, sourceLang, targetLang, signal) {
  if (signal?.aborted) throw signal.reason

  const trimmed = text.slice(0, 5000)
  const fromLang = toBingLang(sourceLang)
  const toLang = toBingLang(targetLang)

  await ensureConfig(signal)

  const params = new URLSearchParams({
    text: trimmed,
    to: toLang,
    token: bingConfig.token,
    key: bingConfig.key,
    fromLang: fromLang,
    tryFetchingGenderDebiasedTranslations: 'true',
  })

  const url = buildURL('ttranslatev3')
  const body = params.toString()

  const response = await invoke('http_post', {
    url,
    body,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
  })

  if (signal?.aborted) throw signal.reason

  const data = JSON.parse(response)

  // Check for 205 status (token expired)
  if (data.statusCode === 205) {
    bingConfig.key = null
    bingConfig.token = null
    await ensureConfig(signal)

    const retryParams = new URLSearchParams({
      text: trimmed,
      to: toLang,
      token: bingConfig.token,
      key: bingConfig.key,
      fromLang: fromLang,
      tryFetchingGenderDebiasedTranslations: 'true',
    })

    const retryResponse = await invoke('http_post', {
      url: buildURL('ttranslatev3'),
      body: retryParams.toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': USER_AGENT,
      },
    })

    const retryData = JSON.parse(retryResponse)
    if (Array.isArray(retryData) && retryData[0]?.translations?.[0]?.text) {
      return retryData[0].translations[0].text
    }
    throw new Error('翻译失败，请重试')
  }

  if (Array.isArray(data) && data[0]?.translations?.[0]?.text) {
    return data[0].translations[0].text
  }

  throw new Error('翻译结果为空')
}

/**
 * Bing TTS - uses tfettts endpoint with SSML
 */
export async function fetchBingTTS(text, lang) {
  const voiceInfo = bingVoiceMap[lang] || bingVoiceMap['en']
  const trimmed = text.slice(0, 2000)
  const escapedText = trimmed
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&apos;')
    .replace(/"/g, '&quot;')

  const ssml = `<speak version='1.0' xml:lang='${voiceInfo.lang}'><voice name='${voiceInfo.voice}'><prosody rate='-10%'>${escapedText}</prosody></voice></speak>`

  await ensureConfig()

  const params = new URLSearchParams({
    ssml,
    token: bingConfig.token,
    key: bingConfig.key,
  })

  const url = buildURL('tfettts')

  try {
    await invoke('play_audio_stream', {url: `${url}&${params.toString()}`})
  } catch {
    // Fallback: POST request for TTS
    try {
      const response = await invoke('http_post', {
        url,
        body: params.toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': USER_AGENT,
        },
      })
      // response is base64 audio data
      if (response) {
        const audioUrl = `data:audio/mpeg;base64,${response}`
        await invoke('play_audio_stream', {url: audioUrl})
      }
    } catch (e) {
      console.error('[BingTTS] error:', e)
      throw e
    }
  }
}
