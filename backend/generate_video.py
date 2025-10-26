# -*- coding: utf-8 -*-
from pathlib import Path
import os, random, requests, io, json
from typing import Optional

# MoviePy
from moviepy.editor import (
    AudioFileClip, VideoFileClip, ColorClip, CompositeVideoClip
)

# TTS: 优先 ElevenLabs，失败回退 gTTS
def synth_tts(script: str, language: str, out_mp3: str) -> str:
    eleven_key = os.getenv("ELEVENLABS_API_KEY", "").strip()
    if eleven_key:
        try:
            voice_id = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")  # 可改
            url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
            payload = {
                "text": script,
                "model_id": os.getenv("ELEVENLABS_MODEL", "eleven_multilingual_v2"),
                "voice_settings": {"stability": 0.5, "similarity_boost": 0.7}
            }
            headers = {
                "xi-api-key": eleven_key,
                "Content-Type": "application/json"
            }
            r = requests.post(url, headers=headers, data=json.dumps(payload), timeout=120)
            r.raise_for_status()
            Path(out_mp3).write_bytes(r.content)
            return out_mp3
        except Exception as e:
            print("[TTS] ElevenLabs failed, fallback to gTTS:", e)

    # --- gTTS 回退 ---
    from gtts import gTTS
    tts = gTTS(script, lang=("zh" if language.startswith("zh") else language))
    tts.save(out_mp3)
    return out_mp3


# B-roll：有 PEXELS_API_KEY 则搜索视频；没有就返回 None（用纯色）
def fetch_broll(query: str, duration: float) -> Optional[str]:
    api_key = os.getenv("PEXELS_API_KEY", "").strip()
    if not api_key:
        return None
    try:
        # 简单截取 1-3 个关键词
        q = " ".join(query.split()[:3]) or "abstract background"
        url = f"https://api.pexels.com/videos/search?query={q}&per_page=1&orientation=portrait"
        r = requests.get(url, headers={"Authorization": api_key}, timeout=30)
        r.raise_for_status()
        data = r.json()
        videos = data.get("videos", [])
        if not videos:
            return None
        files = videos[0].get("video_files", [])
        # 选一个分辨率较高的
        files = sorted(files, key=lambda f: f.get("height", 0), reverse=True)
        link = files[0]["link"]
        vr = requests.get(link, timeout=60)
        vr.raise_for_status()
        tmp_path = f"outputs/broll_{random.randint(1000,9999)}.mp4"
        Path(tmp_path).write_bytes(vr.content)
        return tmp_path
    except Exception as e:
        print("[BROLL] fetch failed:", e)
        return None


# === 生成视频主函数 ===
def generate_video(
    script: str,
    language: str = "zh",
    use_broll: bool = True,
    style: str = "vlog",
    **kwargs,
) -> str:
    Path("outputs").mkdir(exist_ok=True)

    # 1) 语音
    audio_path = f"outputs/tts_{random.randint(1000,9999)}.mp3"
    audio_path = synth_tts(script, language, audio_path)
    audio_clip = AudioFileClip(audio_path)
    duration = float(audio_clip.duration)

    # 2) 背景（B-roll 或 纯色）
    video_path = f"outputs/aiclipx_{random.randint(1000,9999)}.mp4"
    clip = None
    broll_path = None

    if use_broll:
        broll_path = fetch_broll(script, duration)

    if broll_path and Path(broll_path).exists():
        clip = VideoFileClip(broll_path).without_audio()
        # 竖屏 720x1280
        clip = clip.fx(lambda c: c.resize(height=1280)).crop(x_center=clip.w/2, y_center=clip.h/2, width=720, height=1280)
        # 对齐时长
        if clip.duration > duration:
            clip = clip.subclip(0, duration)
        else:
            # 时长不足时循环填充
            loops = int(duration // clip.duration) + 1
            parts = []
            for i in range(loops):
                start = 0
                end = min(clip.duration, duration - sum(p.duration for p in parts))
                if end <= 0: break
                parts.append(clip.subclip(start, end))
            from moviepy.editor import concatenate_videoclips
            clip = concatenate_videoclips(parts)
    else:
        # 纯色背景（避免依赖图片/素材）
        clip = ColorClip(size=(720,1280), color=(0,0,0), duration=duration)

    # 3)（可选）字幕叠加——TextClip 在 macOS 可能需要 ImageMagick；失败就跳过
    try:
        from moviepy.editor import TextClip
        txt = TextClip(
            script, fontsize=40, color="white",
            size=(700, None), method="caption"
        ).set_position(("center", "bottom")).set_duration(duration)
        final = CompositeVideoClip([clip, txt]).set_audio(audio_clip)
    except Exception as e:
        print("[Caption] skipped:", e)
        final = CompositeVideoClip([clip]).set_audio(audio_clip)

    # 4) 输出
    final.write_videofile(
        video_path, fps=24, codec="libx264", audio_codec="aac",
        threads=os.cpu_count() or 2, preset="medium"
    )

    # 清理
    try:
        audio_clip.close()
        if broll_path and Path(broll_path).exists():
            Path(broll_path).unlink(missing_ok=True)
        Path(audio_path).unlink(missing_ok=True)
    except Exception:
        pass

    return video_path
# 真正生成视频
def generate_video(script: str, language: str = "zh") -> str:
    from datetime import datetime

    # 输出文件名
    output_dir = Path("outputs")
    output_dir.mkdir(exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_mp3 = output_dir / f"speech_{timestamp}.mp3"
    out_mp4 = output_dir / f"video_{timestamp}.mp4"

    # 1️⃣ 语音合成
    synth_tts(script, language, str(out_mp3))

    # 2️⃣ 制作纯色背景
    color_clip = ColorClip(size=(1280, 720), color=(0, 0, 0), duration=10)

    # 3️⃣ 加入语音
    audio_clip = AudioFileClip(str(out_mp3))
    color_clip = color_clip.set_audio(audio_clip).set_duration(audio_clip.duration)

    # 4️⃣ 输出视频
    color_clip.write_videofile(str(out_mp4), fps=24, codec="libx264", audio_codec="aac")

    return str(out_mp4)
