import {markRaw} from 'vue'
import YoudaoService from './youdao/YoudaoService.vue'
import BaiduService from './baidu/BaiduService.vue'
import BingService from './bing/BingService.vue'
import GoogleService from './google/GoogleService.vue'
import TencentService from './tencent/TencentService.vue'
import AliService from './ali/AliService.vue'
import DeepLService from './deepl/DeepLService.vue'
import VolcanoService from './volcano/VolcanoService.vue'
import CaiyunService from './caiyun/CaiyunService.vue'
import NiuTransService from './niutrans/NiuTransService.vue'
import OpenAIService from './openai/OpenAIService.vue'
import DeepSeekService from './deepseek/DeepSeekService.vue'
import GeminiService from './gemini/GeminiService.vue'
import CustomService from "@/views/services/CustomService.vue";
import baiduSvg from '@/assets/services/baidu.svg?raw'
import youdaoSvg from '@/assets/services/youdao.svg?raw'
import bingSvg from '@/assets/services/bing.svg?raw'
import googleSvg from '@/assets/services/google.svg?raw'
import tencentSvg from '@/assets/services/tencent.svg?raw'
import aliSvg from '@/assets/services/ali.svg?raw'
import deeplSvg from '@/assets/services/deepl.svg?raw'
import volcanoSvg from '@/assets/services/volcano.svg?raw'
import caiyunSvg from '@/assets/services/caiyun.svg?raw'
import niutransSvg from '@/assets/services/niutrans.svg?raw'
import openaiSvg from '@/assets/services/openai.svg?raw'
import deepseekSvg from '@/assets/services/deepseek.svg?raw'
import geminiSvg from '@/assets/services/gemini.svg?raw'

function sanitizeSvg(svg) {
  return svg.replace(/(<svg\b[^>]*?)\swidth="[^"]*"/g, '$1')
            .replace(/(<svg\b[^>]*?)\sheight="[^"]*"/g, '$1')
            .replace(/<svg\b/, '<svg width="16" height="16"')
}

// 根据 componentName 选择模板（icon 和 component）
export const serviceTemplates = {
    'youdao': {icon: sanitizeSvg(youdaoSvg), color: '#ef362a', component: markRaw(YoudaoService)},
    'baidu': {icon: sanitizeSvg(baiduSvg), color: '#FFF', component: markRaw(BaiduService)},
    'bing': {icon: sanitizeSvg(bingSvg), color: '#FFF', component: markRaw(BingService)},
    'google': {icon: sanitizeSvg(googleSvg), color: '#FFF', component: markRaw(GoogleService)},
    'tencent': {icon: sanitizeSvg(tencentSvg), color: '#FFF', component: markRaw(TencentService)},
    'ali': {icon: sanitizeSvg(aliSvg), color: '#FFF', component: markRaw(AliService)},
    'deepl': {icon: sanitizeSvg(deeplSvg), color: '#0F2B46', component: markRaw(DeepLService)},
    'volcano': {icon: sanitizeSvg(volcanoSvg), color: '#FF6A00', component: markRaw(VolcanoService)},
    'caiyun': {icon: sanitizeSvg(caiyunSvg), color: '#4A90D9', component: markRaw(CaiyunService)},
    'niutrans': {icon: sanitizeSvg(niutransSvg), color: '#2DB55D', component: markRaw(NiuTransService)},
    'openai': {icon: sanitizeSvg(openaiSvg), color: '#10A37F', component: markRaw(OpenAIService)},
    'deepseek': {icon: sanitizeSvg(deepseekSvg), color: '#4D6BFE', component: markRaw(DeepSeekService)},
    'gemini': {icon: sanitizeSvg(geminiSvg), color: '#4285F4', component: markRaw(GeminiService)},
    'custom': {icon: 'AI',color:'#1677ff', component: markRaw(CustomService)}
}

// 预设配置
export const defaultServices = [
    {id: 'youdao', templateId: 'youdao', name: '有道词典', enabled: false, panel: true, config: {}},
    {id: 'baidu', templateId: 'baidu', name: '百度翻译', enabled: false, panel: true, config: {}},
    {id: 'bing', templateId: 'bing', name: 'Bing 翻译', enabled: false, panel: true, config: {}},
    {id: 'google', templateId: 'google', name: '谷歌翻译', enabled: false, panel: true, config: {}},
    {id: 'tencent', templateId: 'tencent', name: '腾讯翻译君', enabled: false, panel: true, config: {}},
    {id: 'ali', templateId: 'ali', name: '阿里翻译', enabled: false, panel: true, config: {}},
    {id: 'deepl', templateId: 'deepl', name: 'DeepL 翻译', enabled: false, panel: true, config: {}},
    {id: 'volcano', templateId: 'volcano', name: '火山翻译', enabled: false, panel: true, config: {}},
    {id: 'caiyun', templateId: 'caiyun', name: '彩云小译', enabled: false, panel: true, config: {}},
    {id: 'niutrans', templateId: 'niutrans', name: '小牛翻译', enabled: false, panel: true, config: {}},
    {id: 'openai', templateId: 'openai', name: 'OpenAI', enabled: false, panel: true, config: {}},
    {id: 'deepseek', templateId: 'deepseek', name: 'DeepSeek', enabled: false, panel: true, config: {}},
    {id: 'gemini', templateId: 'gemini', name: 'Gemini', enabled: false, panel: true, config: {}},
]

export function getTemplate(templateId) {
    return serviceTemplates[templateId]
}
