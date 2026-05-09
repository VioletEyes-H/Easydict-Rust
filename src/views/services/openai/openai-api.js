import {invoke} from '@tauri-apps/api/core'

const DEFAULT_ENDPOINT = 'https://api.openai.com/v1/chat/completions'
const DEFAULT_MODEL = 'gpt-4o-mini'

const SYSTEM_PROMPT = `You are a professional translator. Translate the user's text from the source language to the target language.
Rules:
- Output ONLY the translated text, nothing else
- Preserve the original formatting (line breaks, paragraphs)
- If the source language is "auto", detect it automatically
- Be accurate and natural in the translation
- Do not add explanations, notes, or any extra text`

/**
 * OpenAI-compatible Chat Completions API
 * Works with OpenAI, DeepSeek, Groq, Ollama, and any compatible endpoint
 * @param {string} apiKey
 * @param {string} endpoint - API endpoint URL
 * @param {string} model - Model name
 */
export async function fetchOpenAITranslate(text, sourceLang, targetLang, apiKey, endpoint, model, signal) {
  if (!apiKey) {
    throw new Error('请先配置 API Key')
  }

  if (signal?.aborted) throw signal.reason

  const trimmed = text.slice(0, 10000)
  const url = endpoint || DEFAULT_ENDPOINT
  const useModel = model || DEFAULT_MODEL

  const langName = getLangName(sourceLang)
  const targetLangName = getLangName(targetLang)

  const userMessage = sourceLang === 'auto'
    ? `Translate the following text to ${targetLangName}:\n\n${trimmed}`
    : `Translate the following text from ${langName} to ${targetLangName}:\n\n${trimmed}`

  const payload = JSON.stringify({
    model: useModel,
    messages: [
      {role: 'system', content: SYSTEM_PROMPT},
      {role: 'user', content: userMessage},
    ],
    temperature: 0.3,
    max_tokens: 4096,
  })

  const response = await invoke('http_post', {
    url,
    body: payload,
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
