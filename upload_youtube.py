#!/usr/bin/env python3
"""Publie out/final.mp4 sur YouTube (API officielle, gratuite).

Secrets requis (variables d'environnement) : YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN
Optionnel : YT_PRIVACY = public | unlisted | private  (défaut : public)
"""
import json, os, sys

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
need = ["YT_CLIENT_ID", "YT_CLIENT_SECRET", "YT_REFRESH_TOKEN"]
if any(not os.environ.get(k) for k in need):
    print("Secrets YouTube absents : publication ignorée (la vidéo reste téléchargeable dans l'onglet Actions).")
    sys.exit(0)

story = json.load(open(f"{ROOT}/src/data/story.json", encoding="utf-8"))
creds = Credentials(None, refresh_token=os.environ["YT_REFRESH_TOKEN"], token_uri="https://oauth2.googleapis.com/token",
                    client_id=os.environ["YT_CLIENT_ID"], client_secret=os.environ["YT_CLIENT_SECRET"], scopes=["https://www.googleapis.com/auth/youtube.upload"])
yt = build("youtube", "v3", credentials=creds, cache_discovery=False)

title = (story["title"][:88] + " #Shorts")[:100]
desc = story.get("description", "") + "\n\nHistoire fictive. Animation et voix générées par ordinateur.\n#Shorts #minidrame #histoire"
body = {
    "snippet": {"title": title, "description": desc, "tags": story.get("tags", [])[:10] + ["Shorts"], "categoryId": "24", "defaultLanguage": "fr", "defaultAudioLanguage": "fr"},
    "status": {"privacyStatus": os.environ.get("YT_PRIVACY", "public"), "selfDeclaredMadeForKids": False, "embeddable": True},
}
media = MediaFileUpload(f"{ROOT}/out/final.mp4", mimetype="video/mp4", chunksize=8 * 1024 * 1024, resumable=True)
req = yt.videos().insert(part="snippet,status", body=body, media_body=media)
resp = None
while resp is None:
    status, resp = req.next_chunk()
    if status:
        print(f"  envoi {int(status.progress() * 100)}%")
print("Publié :", f"https://youtube.com/shorts/{resp['id']}", "| statut:", resp.get("status", {}).get("privacyStatus"))

# mémoriser le titre pour ne pas répéter l'histoire
hp = f"{ROOT}/history.json"
try:
    h = json.load(open(hp, encoding="utf-8"))
except Exception:
    h = []
h.append({"title": story["title"], "id": resp["id"]})
json.dump(h[-200:], open(hp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
