import {invoke} from '@tauri-apps/api/core'

let isPlaying = false

function stopCurrentAudio() {
    isPlaying = false
}

export async function playBaiduTTS(text, lang) {
    stopCurrentAudio()

    const trimmed = text.slice(0, 1000)
    const spd = lang === 'zh' ? 5 : 3
    const url = `https://fanyi.baidu.com/gettts?text=${encodeURIComponent(trimmed)}&lan=${lang}&spd=${spd}&source=web`
    console.log('tts url=>', url, 'text=>', text)

    isPlaying = true
    try {
        await invoke('play_audio_stream', {url})
    } catch {
        console.log('catch=>', text)
        if (isPlaying) {
            await fallbackSystemTTS(text, lang)
        }
    }
}

export async function playGoogleTTS(text, lang) {
    stopCurrentAudio()

    const trimmed = text.slice(0, 200)
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(trimmed)}&tl=${lang}&total=1&idx=0&textlen=${trimmed.length}&client=webapp&prev=input`

    isPlaying = true
    try {
        await invoke('play_audio_stream', {url})
    } catch {
        if (isPlaying) {
            await fallbackSystemTTS(text, lang)
        }
    }
}

export async function playBingTTS(text, lang) {
    stopCurrentAudio()

    const {fetchBingTTS} = await import('@/views/services/bing/bing-api.js')

    isPlaying = true
    try {
        await fetchBingTTS(text, lang)
    } catch {
        if (isPlaying) {
            await fallbackSystemTTS(text, lang)
        }
    }
}

export async function playYoudaoTTS(text, lang, speechType = '2') {
    stopCurrentAudio()

    const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&le=${lang}&type=${speechType}`

    isPlaying = true
    try {
        await invoke('play_audio_stream', {url})
    } catch {
        if (isPlaying) {
            await fallbackSystemTTS(text, lang)
        }
    }
}

export async function fallbackSystemTTS(text, lang) {
    try {
        await invoke('play_system_tts', {text, lang})
    } catch (e) {
        console.error('[TTS] system TTS failed:', e)
    }
}
