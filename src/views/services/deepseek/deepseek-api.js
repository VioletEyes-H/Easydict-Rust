import {fetchOpenAITranslate} from '../openai/openai-api.js'

const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/v1/chat/completions'
const DEFAULT_MODEL = 'deepseek-chat'

/**
 * DeepSeek Translate (OpenAI-compatible API)
 * @param {string} apiKey
 * @param {string} model - Model name (default: deepseek-chat)
 */
export async function fetchDeepSeekTranslate(text, sourceLang, targetLang, apiKey, model, signal) {
  return fetchOpenAITranslate(
    text, sourceLang, targetLang,
    apiKey, DEEPSEEK_ENDPOINT, model || DEFAULT_MODEL, signal
  )
}
