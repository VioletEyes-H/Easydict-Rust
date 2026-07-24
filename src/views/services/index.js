import {markRaw} from 'vue'
import YoudaoService from './youdao/YoudaoService.vue'
import BaiduService from './baidu/BaiduService.vue'
import BingService from './bing/BingService.vue'
import GoogleService from './google/GoogleService.vue'
import TencentService from './tencent/TencentService.vue'
import AliService from './ali/AliService.vue'
import DeepLService from './deepl/DeepLService.vue'
import VolcanoService from './volcano/VolcanoService.vue'
import LLMService from "@/views/services/llm/LLMService.vue";
import baiduSvg from '@/assets/services/baidu.svg?raw'
import youdaoSvg from '@/assets/services/youdao.svg?raw'
import bingSvg from '@/assets/services/bing.svg?raw'
import googleSvg from '@/assets/services/google.svg?raw'
import tencentSvg from '@/assets/services/tencent.svg?raw'
import aliSvg from '@/assets/services/ali.svg?raw'
import deeplSvg from '@/assets/services/deepl.svg?raw'
import volcanoSvg from '@/assets/services/volcano.svg?raw'
import icon from '@/assets/services/icon.svg?raw'

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
    'deepl': {icon: sanitizeSvg(deeplSvg), color: '#FFF', component: markRaw(DeepLService)},
    'volcano': {icon: sanitizeSvg(volcanoSvg), color: '#FFF', component: markRaw(VolcanoService)},
    'llm': {icon: sanitizeSvg(icon),color:'#FFF', component: markRaw(LLMService)}
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
    {id: 'volcano', templateId: 'volcano', name: '火山翻译', enabled: false, panel: true, config: {}}
]

export function getTemplate(templateId) {
    return serviceTemplates[templateId]
}
