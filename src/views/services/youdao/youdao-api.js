import {invoke} from '@tauri-apps/api/core'
import {md5, aesDecryptBase64} from '@/utils/crypto.js'
import {toYoudaoLang} from './youdao-lang.js'

// ============ WebTranslate API ============

const WEBTRANSLATE_KEY = 'asdjnjfenknafdfsdfsd'
const WEBTRANSLATE_SECRET = 'Ygy_4c=r#e#4JhTlPgT@Ku0X'

const YOUDAO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  'Referer': 'https://fanyi.youdao.com',
  'Cookie': 'OUTFOX_SEARCH_USER_ID=1796239350@10.110.96.157;',
}

export async function fetchWebTranslate(text, sourceLang, targetLang, signal) {
  text = text.trim()
  if (signal?.aborted) throw signal.reason

  const mysticTime = Date.now().toString()
  const signStr = `client=fanyideskweb&mysticTime=${mysticTime}&product=webfanyi&key=${WEBTRANSLATE_SECRET}`
  const sign = md5(signStr)

  // Step 1: 获取密钥
  const keyParams = new URLSearchParams({
    keyid: 'webfanyi-key-getter',
    client: 'fanyideskweb',
    product: 'webfanyi',
    appVersion: '1.0.0',
    vendor: 'web',
    pointParam: 'client,mysticTime,product',
    mysticTime,
    keyfrom: 'fanyi.web',
    sign: md5(`client=fanyideskweb&mysticTime=${mysticTime}&product=webfanyi&key=${WEBTRANSLATE_KEY}`),
  })

  if (signal?.aborted) throw signal.reason
  const keyRespText = await invoke('http_get', {
    url: `https://dict.youdao.com/webtranslate/key?${keyParams}`,
    headers: YOUDAO_HEADERS,
  })
  const keyData = JSON.parse(keyRespText)
  const aesKey = keyData?.data?.aesKey || WEBTRANSLATE_KEY
  const aesIv = keyData?.data?.aesIv || WEBTRANSLATE_KEY
  const secretKey = keyData?.data?.secretKey || WEBTRANSLATE_SECRET

  // Step 2: 翻译请求
  const translateSign = md5(`client=fanyideskweb&mysticTime=${mysticTime}&product=webfanyi&key=${secretKey}`)

  const body = new URLSearchParams({
    i: text,
    from: toYoudaoLang(sourceLang),
    to: toYoudaoLang(targetLang),
    dictResult: 'false',
    keyid: 'webfanyi',
    sign: translateSign,
    client: 'fanyideskweb',
    product: 'webfanyi',
    appVersion: '1.0.0',
    vendor: 'web',
    pointParam: 'client,mysticTime,product',
    mysticTime,
    keyfrom: 'fanyi.web',
  })

  if (signal?.aborted) throw signal.reason
  const respText = await invoke('http_post', {
    url: 'https://dict.youdao.com/webtranslate',
    body: body.toString(),
    headers: {...YOUDAO_HEADERS, 'Content-Type': 'application/x-www-form-urlencoded'},
  })

  // Step 3: AES 解密（整个响应 body 就是加密的 Base64 字符串）
  try {
    const decrypted = await aesDecryptBase64(respText, aesKey, aesIv)
    const result = JSON.parse(decrypted)
    if (result.translateResult) {
      return result.translateResult
        .map(segment => segment.map(s => s.tgt).join(''))
        .join('')
    }
    // API 返回了错误（如不支持 auto 语言）
    console.error('[YoudaoService] API 返回:', result)
    throw new Error(result.msg || `翻译失败 (code: ${result.code})`)
  } catch (e) {
    // 解密失败，尝试直接作为 JSON 解析
    console.error('[YoudaoService] 解密失败:', e)
    try {
      const rawData = JSON.parse(respText)
      if (rawData.translateResult) {
        return rawData.translateResult
          .map(segment => segment.map(s => s.tgt).join(''))
          .join('')
      }
      throw new Error(rawData.msg || `翻译失败 (code: ${rawData.code})`)
    } catch {
      console.error('[YoudaoService] 响应不是有效 JSON，原始响应:', respText.substring(0, 100))
      throw new Error('翻译结果解析失败')
    }
  }
}

// ============ Dict API ============

export async function fetchDictQuery(text, sourceLang, targetLang, signal) {
  text = text.trim()
  if (signal?.aborted) throw signal.reason
  const dictLang = sourceLang === 'zh' ? targetLang : sourceLang

  const ww = text + 'webdict'
  const t = ww.length % 10
  const salt = md5(ww)
  const key = 'Mk6hqtUp33DGGtoS63tTJbMUYjRrG1Lu'
  const sign = md5('web' + text + t + key + salt)

  const body = new URLSearchParams({
    q: text,
    t: t.toString(),
    sign,
    le: dictLang,
    client: 'web',
    keyfrom: 'webdict',
  })

  if (signal?.aborted) throw signal.reason
  const respText = await invoke('http_post', {
    url: 'https://dict.youdao.com/jsonapi_s?doctype=json&jsonversion=4',
    body: body.toString(),
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
  })
  const data = JSON.parse(respText)
  return parseDictResponse(data, sourceLang)
}

function parseDictResponse(data, sourceLang) {
  const result = {
    phonetics: [],
    posTranslations: [],
    webTranslations: [],
    similar: [],
  }

  // ec (English-Chinese)
  const ec = data.ec
  const ecWord = Array.isArray(ec?.word) ? ec.word[0] : ec?.word
  if (ecWord) {
    if (ecWord.usphone) result.phonetics.push({type: 'us', value: `/${ecWord.usphone}/`, speech: ecWord.usspeech})
    if (ecWord.ukphone) result.phonetics.push({type: 'uk', value: `/${ecWord.ukphone}/`, speech: ecWord.ukspeech})
    if (ecWord.phone && !ecWord.usphone) result.phonetics.push({type: 'general', value: `/${ecWord.phone}/`})

    if (ecWord.trs) {
      for (const tr of ecWord.trs) {
        const text = tr.tr?.[0]?.l?.i?.join('') || ''
        if (text) {
          const match = text.match(/^([a-z]+\.)\s*(.*)/)
          if (match) {
            result.posTranslations.push({pos: match[1], translations: [match[2]]})
          } else {
            result.posTranslations.push({pos: '', translations: [text]})
          }
        }
      }
    }

    if (ecWord.wfs) {
      for (const wf of ecWord.wfs) {
        if (wf.wf) {
          result.similar.push({pos: wf.wf.name, translations: wf.wf.value})
          // result.similar.push(`${wf.wf.name}: ${wf.wf.value}`)
        }
      }
    }
  }

  // ce (Chinese-English)
  const ce = data.ce
  const ceWord = Array.isArray(ce?.word) ? ce.word[0] : ce?.word
  if (ceWord) {
    if (ceWord.phone) result.phonetics.push({type: 'general', value: `/${ceWord.phone}/`})
    if (ceWord.trs) {
      for (const tr of ceWord.trs) {
        // ce 的 trs 格式: {"#text": "hello", "#tran": "你好；..."}
        const text = tr['#tran'] || tr.tr?.[0]?.l?.i?.join('') || ''
        const trans = tr['#text'] || tr.tr?.[0]?.l?.i?.join('') || ''
        if (text) {
          result.posTranslations.push({pos: trans, translations: [text]})
        }
      }
    }
  }

  // 网络释义（可能在 web_trans 或 web-translation 下）
  const webTrans = data.web_trans?.['web-translation'] || data['web-translation']
  if (webTrans) {
    for (const item of webTrans) {
      if (item.trans?.length > 0) {
        result.webTranslations.push({
          key: item.key || '',
          value: item.trans.map(t => t.value).join('; '),
        })
      }
    }
  }

  return result
}
