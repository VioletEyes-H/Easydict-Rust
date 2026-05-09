use std::collections::HashMap;
use std::io::Cursor;
use tracing::{error, info};

#[tauri::command]
pub async fn play_audio_stream(url: String) -> Result<(), String> {
    info!("[play_audio_stream] fetching audio from: {}", url);

    let client = reqwest::Client::new();
    let resp = client.get(&url).send().await.map_err(|e| {
        error!("[play_audio_stream] request error: {}", e);
        e.to_string()
    })?;

    let bytes = resp.bytes().await.map_err(|e| {
        error!("[play_audio_stream] read body error: {}", e);
        e.to_string()
    })?;

    info!("[play_audio_stream] received {} bytes", bytes.len());

    let cursor = Cursor::new(bytes.to_vec());

    let (_stream, stream_handle) = rodio::OutputStream::try_default().map_err(|e| {
        error!("[play_audio_stream] output stream error: {}", e);
        e.to_string()
    })?;

    let sink = rodio::Sink::try_new(&stream_handle).map_err(|e| {
        error!("[play_audio_stream] sink error: {}", e);
        e.to_string()
    })?;

    let source = rodio::Decoder::new(cursor).map_err(|e| {
        error!("[play_audio_stream] decoder error: {}", e);
        e.to_string()
    })?;

    sink.append(source);
    sink.sleep_until_end();

    info!("[play_audio_stream] playback finished");
    Ok(())
}

#[tauri::command]
pub async fn play_system_tts(text: String, lang: String) -> Result<(), String> {
    info!("[play_system_tts] text: {}, lang: {}", text, lang);

    #[cfg(target_os = "macos")]
    {
        let voice = match lang.as_str() {
            "zh" => Some("Ting-Ting"),
            "en" => Some("Samantha"),
            "ja" => Some("Kyoko"),
            "ko" => Some("Yuna"),
            "fr" => Some("Thomas"),
            "de" => Some("Anna"),
            "es" => Some("Monica"),
            _ => None,
        };
        let mut cmd = std::process::Command::new("say");
        if let Some(v) = voice {
            cmd.args(["-v", v]);
        }
        cmd.arg(&text);
        let status = cmd.status().map_err(|e| {
            error!("[play_system_tts] error: {}", e);
            e.to_string()
        })?;
        if !status.success() {
            return Err("系统 TTS 播放失败".to_string());
        }
        return Ok(());
    }

    #[cfg(target_os = "windows")]
    {
        let escaped = text.replace('\'', "''");
        let ps_script = format!(
            "Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Speak('{}')",
            escaped
        );
        let status = std::process::Command::new("powershell")
            .args(["-c", &ps_script])
            .status()
            .map_err(|e| {
                error!("[play_system_tts] error: {}", e);
                e.to_string()
            })?;
        if !status.success() {
            return Err("系统 TTS 播放失败".to_string());
        }
        return Ok(());
    }

    #[cfg(target_os = "linux")]
    {
        let status = std::process::Command::new("espeak")
            .arg(&text)
            .status();
        match status {
            Ok(s) if s.success() => return Ok(()),
            _ => {
                let status = std::process::Command::new("spd-say")
                    .arg(&text)
                    .status()
                    .map_err(|e| {
                        error!("[play_system_tts] error: {}", e);
                        e.to_string()
                    })?;
                if !status.success() {
                    return Err("系统 TTS 播放失败".to_string());
                }
                return Ok(());
            }
        }
    }
}

#[tauri::command]
pub async fn http_get(url: String, headers: Option<HashMap<String, String>>) -> Result<String, String> {
    info!("[http_get] url: {}, headers: {:?}", url, headers);

    let client = reqwest::Client::new();
    let mut req = client.get(&url);

    if let Some(h) = headers {
        for (key, value) in h {
            req = req.header(&key, &value);
        }
    }

    let resp = req.send().await.map_err(|e| {
        error!("[http_get] request error: {}", e);
        e.to_string()
    })?;
    let text = resp.text().await.map_err(|e| {
        error!("[http_get] read body error: {}", e);
        e.to_string()
    })?;

    info!("[http_get] response: {}", text);
    Ok(text)
}

#[tauri::command]
pub async fn http_post(url: String, body: String, headers: Option<HashMap<String, String>>) -> Result<String, String> {
    info!("[http_post] url: {}, body: {}, headers: {:?}", url, body, headers);

    let client = reqwest::Client::new();
    let mut req = client.post(&url).body(body);

    if let Some(h) = headers {
        for (key, value) in h {
            req = req.header(&key, &value);
        }
    }

    let resp = req.send().await.map_err(|e| {
        error!("[http_post] request error: {}", e);
        e.to_string()
    })?;
    let text = resp.text().await.map_err(|e| {
        error!("[http_post] read body error: {}", e);
        e.to_string()
    })?;

    info!("[http_post] response: {}", text);
    Ok(text)
}
