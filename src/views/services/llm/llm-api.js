import {invoke} from '@tauri-apps/api/core'
import {DEFAULT_SYSTEM_PROMPT, DEFAULT_USER_PROMPT} from './llm-prompts.js'

const DEFAULT_ENDPOINT = 'https://api.openai.com/v1/chat/completions'
const DEFAULT_MODEL = 'gpt-4o-mini'
const DEFAULT_TEMPERATURE = 0.3
const DEFAULT_MAX_TOKENS = 4096
const MAX_INPUT_LENGTH = 10000

/**
 * 通用 OpenAI-compatible 大模型翻译接口
 * @param {string} text 输入文本
 * @param {string} sourceLang 源语言代码（可能为 'auto'）
 * @param {string} targetLang 目标语言代码
 * @param {string} detectedLang 检测到的源语言代码（auto 时有效）
 * @param {Object} config 服务配置
 * @param {AbortSignal} [signal] 取消信号
 */
export async function fetchLLMTranslate(text, sourceLang, targetLang, detectedLang, config, signal) {
  const apiKey = config.apiKey
  if (!apiKey) {
    throw new Error('请先配置 API Key')
  }

  if (signal?.aborted) throw signal.reason

  const actualSourceLang = sourceLang === 'auto' && detectedLang ? detectedLang : sourceLang

  const payload = buildPayload(text, actualSourceLang, targetLang, config)

  const response = await invoke('http_post', {
    url: config.endpoint || DEFAULT_ENDPOINT,
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
  })

  if (signal?.aborted) throw signal.reason

  const data = JSON.parse(response)

  if (data.choices?.[0]?.message?.content) {
    return data.choices[0].message.content.trim()
  }

  if (data.error) {
    throw new Error(typeof data.error === 'string' ? data.error : data.error.message || JSON.stringify(data.error))
  }

  throw new Error('翻译结果为空')
}

function buildPayload(text, sourceLang, targetLang, config) {
  const systemPrompt = (config.systemPrompt || DEFAULT_SYSTEM_PROMPT).trim()
  const userPrompt = (config.userPrompt || DEFAULT_USER_PROMPT).trim()
  const variables = buildVariables(text, sourceLang, targetLang)

  const messages = []
  if (systemPrompt) {
    messages.push({role: 'system', content: replacePlaceholders(systemPrompt, variables)})
  }
  messages.push({role: 'user', content: replacePlaceholders(userPrompt, variables)})

  return {
    model: config.model || DEFAULT_MODEL,
    messages,
    temperature: Number.isFinite(config.temperature) ? config.temperature : DEFAULT_TEMPERATURE,
    max_tokens: Number.isFinite(config.maxTokens) ? config.maxTokens : DEFAULT_MAX_TOKENS,
  }
}

function buildVariables(text, sourceLang, targetLang) {
  const trimmed = text.slice(0, MAX_INPUT_LENGTH)
  return {
    sourceLang,
    sourceLangName: getLangName(sourceLang),
    targetLang,
    targetLangName: getLangName(targetLang),
    inputText: trimmed,
  }
}

function replacePlaceholders(template, variables) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(variables, key)) {
      return variables[key]
    }
    return match
  })
}

function getLangName(code) {
  const names = {
    auto: 'auto-detected language',
    zh: 'Chinese',
    en: 'English',
    ja: 'Japanese',
    ko: 'Korean',
    fr: 'French',
    de: 'German',
    es: 'Spanish',
    pt: 'Portuguese',
    ru: 'Russian',
    ar: 'Arabic',
    it: 'Italian',
    th: 'Thai',
    vi: 'Vietnamese',
    id: 'Indonesian',
    ms: 'Malay',
    tr: 'Turkish',
    nl: 'Dutch',
    pl: 'Polish',
    sv: 'Swedish',
    da: 'Danish',
    fi: 'Finnish',
    nb: 'Norwegian',
    cs: 'Czech',
    el: 'Greek',
    he: 'Hebrew',
    hi: 'Hindi',
    bn: 'Bengali',
    uk: 'Ukrainian',
    ro: 'Romanian',
    hu: 'Hungarian',
    sk: 'Slovak',
    bg: 'Bulgarian',
    hr: 'Croatian',
    lt: 'Lithuanian',
    lv: 'Latvian',
    et: 'Estonian',
    sl: 'Slovenian',
  }
  return names[code] || code
}
