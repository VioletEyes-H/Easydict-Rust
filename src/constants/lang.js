// 动态导入所有国旗 SVG
const flagSvgModules = import.meta.glob('/node_modules/country-flag-icons/string/3x2/[A-Z][A-Z].js', {eager: true, import: 'default'});
const FLAG_SVG_MAP = Object.fromEntries(
  Object.entries(flagSvgModules).map(([path, svg]) => [path.match(/([A-Z]{2})\.js$/)[1], svg])
);

export const LANGUAGES = [
  {code: 'auto', name: '自动检测', flag: 'auto'},
  {code: 'zh', name: '中文', flag: 'CN'},
  {code: 'en', name: '英文', flag: 'US'},
  {code: 'ja', name: '日文', flag: 'JP'},
  {code: 'ko', name: '韩文', flag: 'KR'},
  {code: 'fr', name: '法文', flag: 'FR'},
  {code: 'de', name: '德文', flag: 'DE'},
  {code: 'es', name: '西班牙文', flag: 'ES'},
  {code: 'pt', name: '葡萄牙文', flag: 'PT'},
  {code: 'ru', name: '俄文', flag: 'RU'},
  {code: 'ar', name: '阿拉伯文', flag: 'SA'},
  {code: 'it', name: '意大利文', flag: 'IT'},
  {code: 'th', name: '泰文', flag: 'TH'},
  {code: 'vi', name: '越南文', flag: 'VN'},
  {code: 'id', name: '印尼文', flag: 'ID'},
  {code: 'ms', name: '马来文', flag: 'MY'},
  {code: 'tr', name: '土耳其文', flag: 'TR'},
  {code: 'nl', name: '荷兰文', flag: 'NL'},
  {code: 'pl', name: '波兰文', flag: 'PL'},
  {code: 'sv', name: '瑞典文', flag: 'SE'},
  {code: 'da', name: '丹麦文', flag: 'DK'},
  {code: 'fi', name: '芬兰文', flag: 'FI'},
  {code: 'nb', name: '挪威文', flag: 'NO'},
  {code: 'cs', name: '捷克文', flag: 'CZ'},
  {code: 'el', name: '希腊文', flag: 'GR'},
  {code: 'he', name: '希伯来文', flag: 'IL'},
  {code: 'hi', name: '印地文', flag: 'IN'},
  {code: 'bn', name: '孟加拉文', flag: 'BD'},
  {code: 'uk', name: '乌克兰文', flag: 'UA'},
  {code: 'ro', name: '罗马尼亚文', flag: 'RO'},
  {code: 'hu', name: '匈牙利文', flag: 'HU'},
  {code: 'sk', name: '斯洛伐克文', flag: 'SK'},
  {code: 'bg', name: '保加利亚文', flag: 'BG'},
  {code: 'hr', name: '克罗地亚文', flag: 'HR'},
  {code: 'lt', name: '立陶宛文', flag: 'LT'},
  {code: 'lv', name: '拉脱维亚文', flag: 'LV'},
  {code: 'et', name: '爱沙尼亚文', flag: 'EE'},
  {code: 'sl', name: '斯洛文尼亚文', flag: 'SI'},
]

export function getFlagSvg(flag) {
  return FLAG_SVG_MAP[flag] || '';
}

export function getLangName(code) {
  const lang = LANGUAGES.find(l => l.code === code)
  return lang ? lang.name : code
}
