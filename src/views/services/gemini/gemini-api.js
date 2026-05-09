import {invoke} from '@tauri-apps/api/core'

const DEFAULT_MODEL = 'gemini-2.0-flash'

const SYSTEM_PROMPT = `You are a professional translator. Translate the user's text from the source language to the target language.
Rules:
- Output ONLY the translated text, nothing else
- Preserve the original formatting (line breaks, paragraphs)
- If the source language is "auto", detect it automatically
- Be accurate and natural in the translation
- Do not add explanations, notes, or any extra text`

/**
 * Google Gemini API (Generative Language API)
 * @param {string} apiKey
 * @param {string} model - Model name
 */
export async function fetchGeminiTranslate(text, sourceLang, targetLang, apiKey, model, signal) {
  if (!apiKey) {
    throw new Error('请先配置 Gemini API Key')
  }

  if (signal?.aborted) throw signal.reason

  const trimmed = text.slice(0, 10000)
  const useModel = model || DEFAULT_MODEL
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${useModel}:generateContent?key=${apiKey}`

  const langName = getLangName(sourceLang)
  const targetLangName = getLangName(targetLang)

  const userMessage = sourceLang === 'auto'
    ? `Translate the following text to ${targetLangName}:\n\n${trimmed}`
    : `Translate the following text from ${langName} to ${targetLangName}:\n\n${trimmed}`

  const payload = JSON.stringify({
    system_instruction: {
      parts: [{text: SYSTEM_PROMPT}],
    },
    contents: [
      {
        parts: [{text: userMessage}],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 4096,
    },
    safetySettings: [
      {category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE'},
      {category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE'},
      {category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE'},
      {category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE'},
    ],
  })

  const response = await invoke('http_post', {
    url,
    body: payload,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (signal?.aborted) throw signal.reason

  const data = JSON.parse(response)

  if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
    return data.candidates[0].content.parts[0].text.trim()
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
