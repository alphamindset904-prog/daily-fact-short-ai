#!/usr/bin/env python3
"""Génère l'histoire du jour avec l'API Gemini (gratuite) et l'écrit dans src/data/story.json.

- Lit config.json (thèmes, public, voix) et history.json (titres déjà faits).
- Si l'IA échoue (quota, réseau, JSON invalide), prend une histoire de secours dans stories/.
Usage: python tools/generate_story.py [--fallback]
"""
import json, os, random, re, sys, glob, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "src", "data", "story.json")

LOCS = ["classroom", "hallway", "bedroom", "livingroom", "street_day", "street_night", "park_day", "park_sunset"]
CAMS = ["close", "medium", "two", "wide", "low"]
MOVES = ["in", "out", "left", "right", "up"]
SLOTS = ["L", "C", "R", "FL", "FR", "BL", "BR"]
EMOS = ["neutral", "happy", "sad", "cry", "angry", "surprised", "scared", "shy", "smirk", "love", "tired"]
GESTS = ["none", "wave", "up", "point", "face", "cross", "shrug", "hold"]
EMOTES = ["none", "exclaim", "question", "heart", "dots", "anger", "sweat", "sparkle"]
PROPS = ["none", "phone", "letter", "flowers", "gift", "book"]
PALETTES = ["blue", "orange", "green", "purple", "red", "teal", "yellow", "pink", "navy", "gray", "black"]
HAIRS = ["fringe", "spiky", "long", "bun", "curly", "bald"]
HAIRC = ["black", "brown", "blond", "red", "gray", "blue", "green", "pink", "white"]
SKINS = ["light", "tan", "brown", "dark"]
HATS = ["none", "cap", "beanie"]

PROMPT = """Tu es scénariste de mini-dramas animés pour YouTube Shorts, en français.
Écris UNE histoire originale, émouvante, avec un retournement final (twist) qui donne envie de revoir la vidéo.

RÈGLES D'HISTOIRE
- Durée : 12 à 14 plans, 140 à 175 mots au total (environ 60 secondes parlées).
- Plan 1 = accroche : une situation intrigante dite sans introduction ("Chaque matin...", "Le jour de mes 16 ans...").
- Montée de tension, puis révélation qui change le sens de tout, puis fin courte et forte (émotion ou chute drôle).
- Phrases courtes, mots simples, une idée par plan (1 à 2 phrases, maximum 20 mots par plan).
- Narration à la première personne ("je") ou à la troisième, au choix. Ne mets PAS de dialogues entre guillemets longs.
- Tout public : pas de violence explicite, pas de contenu sexuel, pas de vraie personne ni marque réelle, pas de conseils médicaux.
- Public visé : {audience}. Prénoms conseillés : {noms}.
- Thème de départ (adapte-le librement) : {theme}
- Ne répète pas ces histoires déjà faites : {deja}

FORMAT : réponds UNIQUEMENT avec un JSON valide, sans texte autour, de cette forme :
{{
 "title": "titre YouTube accrocheur, 60 caractères max, sans #",
 "description": "2 phrases de description",
 "tags": ["5 à 8 mots-clés"],
 "narrateur": "f" ou "m",
 "characters": {{ "id_court": {{"palette": ..., "hair": ..., "hairColor": ..., "skin": ..., "glasses": true/false, "hat": ...}} }},
 "shots": [
  {{"loc": ..., "cam": ..., "move": ..., "focus": "id_court", "text": "phrase dite par le narrateur",
    "cast": [{{"id": "id_court", "slot": ..., "emo": ..., "gesture": ..., "emote": ..., "prop": ...}}] }}
 ]
}}

VALEURS AUTORISÉES (n'utilise rien d'autre)
- loc : {locs}   (classroom=salle de classe, hallway=couloir d'école, bedroom=chambre la nuit, livingroom=salon, street_day=rue de jour, street_night=rue de nuit, park_day=parc de jour, park_sunset=parc au coucher du soleil)
- cam : close (gros plan visage), medium (plan moyen), two (deux personnages), wide (plan large, jusqu'à 3 personnages), low (contre-plongée dramatique)
- move : in (avance), out (recule), left, right, up
- slot : L (gauche), C (centre), R (droite) — pour deux personnages utilise L et R ; pour trois, L, C, R. FL, FR, BL, BR = arrière-plan
- emo : {emos}
- gesture : {gests}   (wave=salue, up=bras en l'air, point=montre du doigt, face=mains sur le visage, cross=bras croisés, shrug=ne sait pas, hold=tient un objet)
- emote (bulle au-dessus de la tête) : {emotes}
- prop (objet en main) : {props}
- palette : {palettes} ; hair : {hairs} ; hairColor : {hairc} ; skin : {skins} ; hat : {hats}
- Maximum 4 personnages différents dans l'histoire, 1 à 3 par plan. "focus" = personnage sur lequel la caméra se centre.
- Varie les plans (ne mets jamais deux "close" d'affilée), varie les lieux, change les émotions d'un plan à l'autre.
- Les émotions doivent suivre l'histoire : triste -> "sad"/"cry", surpris -> "surprised"+emote "exclaim", amoureux -> "love"+emote "heart".
"""

DEFAULT_CFG = {
    "audience": "jeunes francophones (Afrique de l'Ouest, France)",
    "noms": "Aïssatou, Mamadou, Fatoumata, Ibrahima, Mariam, Sékou, Kadiatou, Alpha, Aminata, Moussa",
    "themes": [
        "un geste de gentillesse répété en secret, dont on découvre la vraie raison",
        "une lettre jamais envoyée retrouvée des années plus tard",
        "un nouvel élève moqué qui cache un grand secret",
        "un meilleur ami qui s'éloigne sans explication",
        "un parent qui se prive pour payer l'école de son enfant",
        "un voisin que tout le monde croit méchant",
        "une rumeur injuste dans une classe, puis la vérité",
        "un cadeau anonyme qui arrive chaque semaine",
        "un grand frère qui semble indifférent mais veille sur sa sœur",
        "une compétition perdue qui mène à une belle surprise",
        "un vieux professeur que personne n'écoute, jusqu'au jour où...",
        "un enfant qui garde sa place dans la file pour quelqu'un d'absent",
    ],
}


def load_json(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default


def http_json(url, payload=None, headers=None, timeout=90):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, headers=headers or {"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8"))


def pick_models(key):
    """Liste de modèles Gemini à essayer. GEMINI_MODEL force un modèle ; sinon on découvre les modèles 'flash' disponibles."""
    forced = os.environ.get("GEMINI_MODEL")
    out = [forced] if forced else []
    try:
        d = http_json(f"https://generativelanguage.googleapis.com/v1beta/models?key={key}&pageSize=200", headers={})
        names = [m["name"].split("/")[-1] for m in d.get("models", []) if "generateContent" in m.get("supportedGenerationMethods", [])]
        flash = [n for n in names if "flash" in n and not any(x in n for x in ("image", "tts", "live", "audio", "thinking", "exp", "preview-"))]
        flash.sort(key=lambda n: (("lite" in n), n), reverse=False)
        # préférer les versions les plus récentes (numéro le plus haut) puis non-lite
        def ver(n):
            m = re.search(r"(\d+(?:\.\d+)?)", n); return -float(m.group(1)) if m else 0
        flash.sort(key=lambda n: (ver(n), "lite" in n))
        out += flash
    except Exception as e:
        print("  (liste des modèles indisponible:", e, ")")
    out += ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-flash-lite"]
    seen = []; [seen.append(x) for x in out if x and x not in seen]
    return seen[:6]


def call_gemini(key, prompt):
    last = None
    for model in pick_models(key):
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
        body = {"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"temperature": 1.0, "responseMimeType": "application/json"}}
        try:
            d = http_json(url, body)
            txt = d["candidates"][0]["content"]["parts"][0]["text"]
            print("  modèle utilisé:", model)
            return txt
        except urllib.error.HTTPError as e:
            last = f"{model}: HTTP {e.code} {e.read().decode('utf-8', 'ignore')[:200]}"
        except Exception as e:
            last = f"{model}: {e}"
        print("  échec", last)
    raise RuntimeError(last or "aucun modèle")


def pick(v, allowed, default):
    return v if v in allowed else default


def sanitize(st):
    """Corrige tout ce que l'IA aurait mal écrit pour que le rendu ne plante jamais."""
    if not isinstance(st, dict) or not isinstance(st.get("shots"), list) or len(st["shots"]) < 6:
        raise ValueError("histoire trop courte ou format invalide")
    chars = {}
    for cid, c in (st.get("characters") or {}).items():
        c = c or {}
        chars[str(cid)] = {
            "palette": pick(c.get("palette"), PALETTES, random.choice(PALETTES)),
            "hair": pick(c.get("hair"), HAIRS, "fringe"),
            "hairColor": pick(c.get("hairColor"), HAIRC, "black"),
            "skin": pick(c.get("skin"), SKINS, "brown"),
            "glasses": bool(c.get("glasses", False)),
            "hat": pick(c.get("hat"), HATS, "none"),
        }
        try:
            sc = float(c.get("scale", 1))
            if 0.7 <= sc <= 1.2 and sc != 1:
                chars[str(cid)]["scale"] = sc
        except (TypeError, ValueError):
            pass
    shots = []; prev_cam = None
    for s in st["shots"][:16]:
        text = re.sub(r"\s+", " ", str(s.get("text", ""))).strip()
        if not text:
            continue
        cast = []; used = set()
        for c in (s.get("cast") or [])[:3]:
            cid = str(c.get("id", ""))
            if cid not in chars:
                chars[cid] = {"palette": random.choice(PALETTES), "hair": "fringe", "hairColor": "black", "skin": "brown", "glasses": False, "hat": "none"}
            slot = pick(c.get("slot"), SLOTS, "C")
            if slot in used:
                slot = next((x for x in ["L", "R", "C"] if x not in used), "C")
            used.add(slot)
            cast.append({"id": cid, "slot": slot, "emo": pick(c.get("emo"), EMOS, "neutral"), "gesture": pick(c.get("gesture"), GESTS, "none"),
                         "emote": pick(c.get("emote"), EMOTES, "none"), "prop": pick(c.get("prop"), PROPS, "none")})
        if not cast:
            cid = next(iter(chars)); cast = [{"id": cid, "slot": "C", "emo": "neutral", "gesture": "none", "emote": "none", "prop": "none"}]
        if len(cast) == 1 and cast[0]["slot"] in ("L", "R"):
            cast[0]["slot"] = "C"
        cam = pick(s.get("cam"), CAMS, "medium")
        if len(cast) >= 3 and cam in ("close", "medium"):
            cam = "wide"
        if len(cast) == 2 and cam == "close":
            cam = "two"
        if cam == "close" and prev_cam == "close":
            cam = "medium"
        prev_cam = cam
        focus = s.get("focus") if s.get("focus") in [c["id"] for c in cast] else cast[0]["id"]
        shots.append({"loc": pick(s.get("loc"), LOCS, "street_day"), "cam": cam, "move": pick(s.get("move"), MOVES, "in"), "focus": focus, "text": text, "cast": cast})
    words = sum(len(s["text"].split()) for s in shots)
    if not (95 <= words <= 230):
        raise ValueError(f"longueur hors limites: {words} mots")
    title = re.sub(r"[#\n]", " ", str(st.get("title", "Mini drame"))).strip()[:95]
    return {"title": title, "description": str(st.get("description", ""))[:900], "tags": [str(t)[:30] for t in (st.get("tags") or [])][:10],
            "narrateur": "m" if st.get("narrateur") == "m" else "f", "characters": chars, "shots": shots}


def fallback(history):
    files = sorted(f for f in glob.glob(os.path.join(ROOT, "stories", "*.json")) if not os.path.basename(f).startswith("_"))
    unused = [f for f in files if load_json(f, {}).get("title") not in history] or files
    f = random.choice(unused)
    print("  histoire de secours:", os.path.basename(f))
    return load_json(f, {})


def main():
    cfg = {**DEFAULT_CFG, **load_json(os.path.join(ROOT, "config.json"), {})}
    history = [h.get("title") if isinstance(h, dict) else h for h in load_json(os.path.join(ROOT, "history.json"), [])]
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    story = None
    if key and "--fallback" not in sys.argv:
        theme = os.environ.get("STORY_THEME") or random.choice(cfg["themes"])
        prompt = PROMPT.format(audience=cfg["audience"], noms=cfg["noms"], theme=theme, deja="; ".join(history[-25:]) or "aucune",
                               locs=", ".join(LOCS), emos=", ".join(EMOS), gests=", ".join(GESTS), emotes=", ".join(EMOTES), props=", ".join(PROPS),
                               palettes=", ".join(PALETTES), hairs=", ".join(HAIRS), hairc=", ".join(HAIRC), skins=", ".join(SKINS), hats=", ".join(HATS))
        print("Thème:", theme)
        for attempt in range(1, 5):
            try:
                raw = call_gemini(key, prompt)
                raw = re.sub(r"^```(?:json)?|```$", "", raw.strip(), flags=re.M).strip()
                story = sanitize(json.loads(raw))
                break
            except Exception as e:
                print(f"  essai {attempt} raté: {e}")
    else:
        print("Pas de GEMINI_API_KEY (ou --fallback) : histoire de secours.")
    if story is None:
        story = sanitize(fallback(history))
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(story, f, ensure_ascii=False, indent=1)
    print("OK:", story["title"], "-", len(story["shots"]), "plans,", sum(len(s["text"].split()) for s in story["shots"]), "mots")


if __name__ == "__main__":
    main()
