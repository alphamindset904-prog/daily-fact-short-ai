
import asyncio
import os
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import edge_tts

# Exemple de première vidéo
TITRE = "UN FAIT INCROYABLE"
TEXTE = (
    "Imagine un animal capable de dormir "
    "tout en restant debout. Certains chevaux "
    "peuvent le faire grâce à un système "
    "spécial de verrouillage de leurs jambes. "
    "Mais pour dormir profondément, ils doivent "
    "tout de même s'allonger. La nature est fascinante !"
)

DOSSIER = Path("videos")
DOSSIER.mkdir(exist_ok=True)

async def creer_voix():
    communication = edge_tts.Communicate(
        TEXTE,
        "fr-FR-HenriNeural"
    )
    await communication.save(str(DOSSIER / "voix.mp3"))

def creer_image():
    image = Image.new("RGB", (1080, 1920), "#10172A")
    dessin = ImageDraw.Draw(image)

    police_path = (
        "/usr/share/fonts/truetype/dejavu/"
        "DejaVuSans-Bold.ttf"
    )
    police = ImageFont.truetype(police_path, 82)

    dessin.text((90, 400), TITRE, font=police, fill="white")

    police_texte = ImageFont.truetype(police_path, 48)
    lignes = [
        "Un animal peut dormir",
        "debout !",
        "",
        "Découvre ce secret",
        "étonnant de la nature."
    ]

    y = 800
    for ligne in lignes:
        dessin.text((90, y), ligne, font=police_texte, fill="#FFD166")
        y += 95

    image.save(DOSSIER / "fond.png")

async def main():
    await creer_voix()
    creer_image()

    commande = [
        "ffmpeg", "-y",
        "-loop", "1",
        "-i", str(DOSSIER / "fond.png"),
        "-i", str(DOSSIER / "voix.mp3"),
        "-c:v", "libx264",
        "-tune", "stillimage",
        "-c:a", "aac",
        "-b:a", "192k",
        "-pix_fmt", "yuv420p",
        "-shortest",
        str(DOSSIER / "daily-fact-short.mp4")
    ]

    subprocess.run(commande, check=True)
    print("Premiere video creee avec succes !")

if __name__ == "__main__":
    asyncio.run(main())
