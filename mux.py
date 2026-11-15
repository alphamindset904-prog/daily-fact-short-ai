#!/usr/bin/env python3
"""Assemble la vidéo muette + la voix (+ musique libre de droits si présente) -> out/final.mp4.

Musique : déposez un ou plusieurs .mp3 libres de droits dans assets/music/ ; un morceau est choisi
au hasard, mixé très bas sous la voix, avec fondu final.
"""
import glob, os, random, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "out")
vid, voice, final = f"{OUT}/silent.mp4", f"{OUT}/voiceover.wav", f"{OUT}/final.mp4"
for p in (vid, voice):
    if not os.path.exists(p):
        sys.exit(f"manquant: {p}")

dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", voice], capture_output=True, text=True).stdout)
music = sorted(glob.glob(f"{ROOT}/assets/music/*.mp3") + glob.glob(f"{ROOT}/assets/music/*.wav"))
cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", vid, "-i", voice]
if music:
    m = random.choice(music); print("musique:", os.path.basename(m))
    cmd += ["-stream_loop", "-1", "-i", m, "-filter_complex",
            f"[1:a]volume=1.0[v];[2:a]volume=0.13,afade=t=in:d=1.5,afade=t=out:st={max(0, dur - 2.5):.2f}:d=2.5[m];[v][m]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[a]"]
else:
    cmd += ["-filter_complex", "[1:a]loudnorm=I=-16:TP=-1.5:LRA=11[a]"]
cmd += ["-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", final]
subprocess.run(cmd, check=True)
print("OK ->", final)
