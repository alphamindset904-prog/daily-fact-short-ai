
import asyncio
import subprocess
import textwrap
from pathlib import Path
from PIL import Image, ImageDraw
import edge_tts

TITRE = "LE SOMMEIL DES CHEVAUX"

TEXTE = (
    "Imagine un cheval dans un pré, les yeux fermés. "
    "Il semble dormir profondément, mais il est debout ! "
    "Comment est-ce possible ? Les chevaux possèdent "
    "un mécanisme naturel qui leur permet de bloquer "
    "certaines articulations et de rester debout sans "
    "faire d'effort musculaire important. Cela leur permet "
    "de se reposer tout en restant prêts à réagir au danger. "
    "Mais attention, il y a une surprise : pour atteindre "
    "les phases de sommeil profond, ils doivent aussi "
    "s'allonger. Ils ne dorment donc pas toujours debout. "
    "Un incroyable mécanisme imaginé par la nature !"
)

DOSSIER = Path("videos")
DOSSIER.mkdir(exist_ok=True)

def creer_image():
    image = Image.new("RGB", (1080, 1920), "#10172A")
    dessin = ImageDraw.Draw(image)

    dessin.ellipse((650, 250, 1250, 850), fill="#243B61")
    dessin.ellipse((-250, 1100, 500, 1850), fill="#1D3150")
    dessin.rectangle((0, 0, 1080, 18), fill="#FFD166")

    image.save(DOSSIER / "fond.png")

async def creer_voix():
    voix = edge_tts.Communicate(
        TEXTE,
        "fr-FR-HenriNeural"
    )
    await voix.save(str(DOSSIER / "voix.mp3"))

def horloge(secondes):
    heures = int(secondes // 3600)
    minutes = int((secondes % 3600) // 60)
    secondes_entieres = int(secondes % 60)
    millisecondes = int((secondes % 1) * 1000)

    return (
        f"{heures:02}:{minutes:02}:"
        f"{secondes_entieres:02},{millisecondes:03}"
    )

def creer_sous_titres(duree):
    phrases = [
        "Imagine un cheval dans un pré, les yeux fermés.",
        "Il semble dormir profondément, mais il est debout !",
        "Comment est-ce possible ?",
        "Les chevaux possèdent un mécanisme naturel.",
        "Il leur permet de rester debout sans effort important.",
        "Ils peuvent ainsi se reposer tout en restant vigilants.",
        "Mais voici la surprise :",
        "Pour dormir profondément, ils doivent aussi s'allonger.",
        "Ils ne dorment donc pas toujours debout.",
        "Un incroyable mécanisme imaginé par la nature !"
    ]

    total = sum(len(p) for p in phrases)
    debut = 0
    lignes = []

    for numero, phrase in enumerate(phrases, 1):
        fin = debut + duree * len(phrase) / total

        lignes.extend([
            str(numero),
            f"{horloge(debut)} --> {horloge(fin)}",
            phrase,
            ""
        ])

        debut = fin

    (DOSSIER / "sous-titres.srt").write_text(
        "\n".join(lignes),
        encoding="utf-8"
    )

async def main():
    await creer_voix()
    creer_image()

    resultat = subprocess.run([
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        str(DOSSIER / "voix.mp3")
    ], capture_output=True, text=True, check=True)

    duree = float(resultat.stdout.strip())

    creer_sous_titres(duree)

    filtre = (
        "zoompan=z='min(zoom+0.0005,1.08)':"
        "x='iw/2-(iw/zoom/2)':"
        "y='ih/2-(ih/zoom/2)':"
        "d=1:s=1080x1920:fps=25,"
        "subtitles=videos/sous-titres.srt:"
        "force_style='FontName=DejaVu Sans,"
        "FontSize=20,PrimaryColour=&H00FFFFFF,"
        "OutlineColour=&H00000000,BorderStyle=1,"
        "Outline=3,Alignment=2,MarginV=230'"
    )

    subprocess.run([
        "ffmpeg", "-y",
        "-loop", "1",
        "-i", str(DOSSIER / "fond.png"),
        "-i", str(DOSSIER / "voix.mp3"),
        "-vf", filtre,
        "-c:v", "libx264",
        "-tune", "stillimage",
        "-c:a", "aac",
        "-b:a", "192k",
        "-pix_fmt", "yuv420p",
        "-shortest",
        str(DOSSIER / "daily-fact-short.mp4")
    ], check=True)

    print("Video Daily Fact Short creee !")
    print("Duree :", round(duree, 1), "secondes")

if __name__ == "__main__":
    asyncio.run(main())
