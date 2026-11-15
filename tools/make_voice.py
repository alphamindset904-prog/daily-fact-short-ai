#!/usr/bin/env python3
"""Crée la voix off (edge-tts, gratuit) et le timing mot par mot.

Entrée : src/data/story.json
Sorties: out/voiceover.wav et src/data/timing.json
Usage: python tools/make_voice.py
"""
import asyncio, json, os, re, subprocess, sys, tempfile

import edge_tts

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STORY = os.path.join(ROOT, "src", "data", "story.json")
TIMING = os.path.join(ROOT, "src", "data", "timing.json")
OUT = os.path.join(ROOT, "out")

VOICES = {"f": ["fr-FR-DeniseNeural", "fr-FR-VivienneMultilingualNeural", "fr-FR-EloiseNeural"], "m": ["fr-FR-HenriNeural", "fr-FR-RemyMultilingualNeural"]}
RATE = os.environ.get("VOICE_RATE", "+6%")
PITCH = os.environ.get("VOICE_PITCH", "+0Hz")


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def dur(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", path], capture_output=True, text=True, check=True)
    return float(r.stdout.strip())


async def synth(text, voice, mp3):
    words = []
    comm = edge_tts.Communicate(text, voice, rate=RATE, pitch=PITCH, boundary="WordBoundary")
    with open(mp3, "wb") as f:
        async for ch in comm.stream():
            if ch["type"] == "audio":
                f.write(ch["data"])
            elif ch["type"] == "WordBoundary":
                words.append((ch["offset"] / 1e7, (ch["offset"] + ch["duration"]) / 1e7, ch["text"]))
    return words


def synth_retry(text, voices, mp3):
    last = None
    for v in voices:
        for _ in range(3):
            try:
                w = asyncio.run(synth(text, v, mp3))
                if os.path.getsize(mp3) > 1000:
                    return w, v
            except Exception as e:
                last = e
    raise RuntimeError(f"edge-tts a échoué: {last}")


def align(display_words, ev, total):
    """Associe les mots affichés (avec ponctuation) aux instants de la voix."""
    n = len(display_words)
    if len(ev) == n and n > 0:
        return [(a, b) for a, b, _ in ev]
    if len(ev) > 0 and abs(len(ev) - n) <= 3:  # petit écart (nombres, apostrophes) : répartition proportionnelle sur la plage parlée
        start, end = ev[0][0], ev[-1][1]
    else:
        start, end = 0.0, total
    wts = [len(re.sub(r"\W", "", w)) + 2 for w in display_words]; tot = sum(wts); acc = 0; out = []
    for w in wts:
        out.append((start + (end - start) * acc / tot, start + (end - start) * (acc + w) / tot)); acc += w
    return out


def main():
    story = json.load(open(STORY, encoding="utf-8"))
    os.makedirs(OUT, exist_ok=True)
    voices = VOICES["m" if story.get("narrateur") == "m" else "f"]
    if os.environ.get("VOICE"):
        voices = [os.environ["VOICE"]] + voices
    tmp = tempfile.mkdtemp()
    parts = []; shots = []; t = 0.35
    # silence de départ
    run(["ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-t", "0.35", f"{tmp}/s0.wav"]); parts.append(f"{tmp}/s0.wav")
    used_voice = None
    for i, s in enumerate(story["shots"]):
        mp3 = f"{tmp}/v{i}.mp3"; wav = f"{tmp}/v{i}.wav"
        ev, used_voice = synth_retry(s["text"], ([used_voice] if used_voice else []) + voices, mp3)
        run(["ffmpeg", "-y", "-i", mp3, "-ar", "44100", "-ac", "1", wav])
        d = dur(wav)
        dw = s["text"].split()
        times = align(dw, ev, d)
        words = [{"w": w, "a": round(t + a, 3), "b": round(t + b, 3)} for w, (a, b) in zip(dw, times)]
        shots.append({"text": s["text"], "start": round(t + (ev[0][0] if ev else 0), 3), "end": round(t + (ev[-1][1] if ev else d), 3), "words": words})
        parts.append(wav); t += d
        gap = 0.55 if re.search(r"[.!?…]$", s["text"]) else 0.35
        gp = f"{tmp}/g{i}.wav"; run(["ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-t", str(gap), gp]); parts.append(gp); t += gap
        print(f"  plan {i + 1}/{len(story['shots'])}  {d:.1f}s  ({used_voice})")
    listf = f"{tmp}/list.txt"
    open(listf, "w").write("\n".join(f"file '{p}'" for p in parts))
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", listf, "-c", "pcm_s16le", f"{OUT}/voiceover.wav"])
    total = dur(f"{OUT}/voiceover.wav")
    json.dump({"fps": 30, "duration": round(total, 2), "shots": shots}, open(TIMING, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"OK: voix {total:.1f}s -> out/voiceover.wav + src/data/timing.json")
    if total > 175:
        print("ATTENTION: plus de 2 min 55, trop long pour un Short.", file=sys.stderr)


if __name__ == "__main__":
    main()
