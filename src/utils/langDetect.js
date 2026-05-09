/**
 * 基于 Unicode 字符范围和词频的轻量级语言检测
 */

// 字符范围到语言的映射
const CHAR_RANGE_MAP = [
  { range: /[一-鿿㐀-䶿]/, lang: 'zh' },
  { range: /[぀-ゟ゠-ヿ]/, lang: 'ja' },
  { range: /[가-힯ᄀ-ᇿ]/, lang: 'ko' },
  { range: /[؀-ۿݐ-ݿ]/, lang: 'ar' },
  { range: /[฀-๿]/, lang: 'th' },
  { range: /[Ѐ-ӿ]/, lang: 'ru' },
  { range: /[֐-׿]/, lang: 'he' },
  { range: /[Ͱ-Ͽ]/, lang: 'el' },
  { range: /[ऀ-ॿ]/, lang: 'hi' },
  { range: /[ঀ-৿]/, lang: 'bn' },
  { range: /[Ā-ɏ]/, lang: null }, // 拉丁扩展，需要进一步判断
]

// 拉丁字母语言的常见词汇
const LATIN_LANG_PATTERNS = {
  en: /\b(the|is|are|was|were|have|has|been|will|would|could|should|this|that|with|from|for|not|but|what|all|can|had|her|one|our|out|day|get|has|him|his|how|its|may|new|now|old|see|way|who|boy|did|let|put|say|she|too|use)\b/gi,
  fr: /\b(le|la|les|un|une|des|est|sont|avoir|être|dans|pour|pas|avec|ce|qui|que|sur|pas|tout|mais|comme|peut|fait|bien|aussi|très|encore|même|autre|avant|après)\b/gi,
  de: /\b(der|die|das|ein|eine|ist|sind|haben|werden|auf|mit|für|nicht|aber|auch|aus|nach|wie|oder|wenn|dass|kann|nur|wird|noch|dann|bei|vor|sehr|hier|nur)\b/gi,
  es: /\b(el|la|los|las|un|una|unos|unas|es|son|estar|haber|tener|hacer|poder|decir|ir|ver|dar|saber|querer|llegar|pasar|deber|poner|parecer|quedar|creer|hablar|llevar|dejar|seguir|encontrar|llamar|venir|pensar|salir|volver|tomar|conocer|vivir|sentir|tratar|mirar|contar|empezar|esperar|buscar|existir|entrar|trabajar|escribir|perder|producir|ocurrir|entender|pedir|recibir|recordar|terminar|permitir|aparecer|conseguir|comenzar|servir|sacar|necesitar|mantener|resultar|leer|caer|cambiar|presentar|crear|abrir|considerar|hablar|llegar|pasar|poner|parecer|quedar|creer|hablar|llevar|dejar|seguir)\b/gi,
  pt: /\b(o|a|os|as|um|uma|uns|umas|é|são|estar|ter|fazer|poder|dizer|ir|ver|dar|saber|querer|chegar|passar|dever|colocar|parecer|ficar|acreditar|falar|levar|deixar|seguir|encontrar|chamar|vir|pensar|sair|voltar|tomar|conhecer|viver|sentir|tentar|olhar|contar|começar|esperar|procurar|existir|entrar|trabalhar|escrever|perder|produzir|ocorrer|entender|pedir|receber|lembrar|terminar|permitir|aparecer|conseguir|começar|servir|tirar|precisar|manter|resultar|ler|cair|mudar|apresentar|criar|abrir|considerar)\b/gi,
  it: /\b(il|lo|la|gli|le|un|uno|una|è|sono|essere|avere|fare|potere|dire|andare|vedere|dare|sapere|volere|venire|dovere|uscire|stare|trovare|parlare|portare|lasciare|seguire|chiamare|pensare|credere|sentire|vivere|tenere|mettere|dare|prendere|riuscire|ricordare|cercare|passare|aspettare|cominciare|continuare|pagare|perdere|rientrare|accettare|considerare|leggere|scrivere|cadere|cambiare|presentare|creare|aprire)\b/gi,
  tr: /\b(bir|ve|bu|da|de|için|ile|var|olan|gibi|daha|çok|ama|olarak|sonra|kadar|ancak|her|hiç|veya|ne|nasıl|neden|böyle|şöyle|şimdi|burada|orada|nerede|zaman|gün|yıl|ay|saat|dakika|saniye|insan|adam|kadın|çocuk|ev|su|yemek|okul|iş|araba|kitap|para|zaman)\b/gi,
  nl: /\b(de|het|een|van|en|is|dat|in|op|te|zijn|voor|met|niet|aan|er|ook|maar|als|nog|bij|uit|dan|naar|wel|kan|moet|wil|zal|heb|had|ben|was|waren|heeft|worden|gaan|komen|zien|geven|staan|moeten|zeggen|doen|maken|lopen|nemen|werken|vinden|denken|leven|blijven|liggen|houden|dragen|sluiten|beginnen|kennen|spreken|schrijven|lezen|vergeten|kopen|verkopen)\b/gi,
}

/**
 * 检测文本语言
 * @param {string} text - 要检测的文本
 * @returns {string|null} - 检测到的语言代码，无法检测时返回 null
 */
export function detectLanguage(text) {
  if (!text || text.trim().length === 0) {
    return null
  }

  const cleaned = text.trim()

  // 1. 先通过 Unicode 字符范围检测
  for (const { range, lang } of CHAR_RANGE_MAP) {
    const matches = cleaned.match(new RegExp(range, 'g'))
    if (matches && matches.length > 0) {
      // 如果有明确的语言（非拉丁扩展）
      if (lang) {
        // 日文需要特殊处理：如果同时包含中文字符，需要判断比例
        if (lang === 'ja') {
          const hasHiraganaOrKatakana = /[぀-ゟ゠-ヿ]/.test(cleaned)
          const cjkMatches = cleaned.match(/[一-鿿]/g)
          // 如果有假名，优先判定为日文
          if (hasHiraganaOrKatakana) {
            return 'ja'
          }
          // 如果只有汉字，判定为中文
          if (cjkMatches && !hasHiraganaOrKatakana) {
            return 'zh'
          }
        }
        return lang
      }
      // 拉丁扩展字符，进入词频检测
      break
    }
  }

  // 2. 对于拉丁字母文本，使用词频匹配
  let bestMatch = null
  let bestScore = 0

  for (const [lang, pattern] of Object.entries(LATIN_LANG_PATTERNS)) {
    const matches = cleaned.match(pattern)
    const score = matches ? matches.length : 0
    if (score > bestScore) {
      bestScore = score
      bestMatch = lang
    }
  }

  // 只有当匹配度足够高时才返回结果
  if (bestScore >= 2) {
    return bestMatch
  }

  // 3. 如果文本全是 ASCII 且没有匹配到其他语言，默认英语
  if (/^[\x00-\x7F]+$/.test(cleaned) && cleaned.length > 0) {
    return 'en'
  }

  return null
}
