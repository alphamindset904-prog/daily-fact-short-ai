#!/usr/bin/env python3
"""Fabrique un timing.json factice (sans voix) pour tester le rendu. Usage: fake_timing.py story.json"""
import json, re, sys
story = json.load(open(sys.argv[1], encoding="utf-8"))
t = 0.3; shots = []
for s in story["shots"]:
    ws = s["text"].split()
    words = []; a = t
    for w in ws:
        d = 0.14 + 0.05 * len(re.sub(r"\W", "", w)) ; words.append({"w": w, "a": round(a, 3), "b": round(a + d, 3)}); a += d
    shots.append({"text": s["text"], "start": round(t, 3), "end": round(a, 3), "words": words})
    t = a + 0.45
json.dump({"fps": 30, "duration": round(t, 2), "shots": shots}, open("src/data/timing.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("duration", round(t, 1))
