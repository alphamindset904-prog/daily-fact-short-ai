
import asyncio
import subprocess
import textwrap
from pathlib import Path
from PIL import Image, ImageDraw
import edge_tts

TITRE = "LE SECRET DES CHEVAUX"

TEXTE = (
    "Imagine un cheval dans un pré, les yeux fermés. "
    "Il semble dormir profondément, mais il est debout ! "
    "Comment est-ce possible ? Les chevaux possèdent "
    "un mécanisme naturel étonnant. Certaines articulations "
    "peuvent se bloquer pour leur permettre de rester debout "
    "sans dépenser beaucoup d'énergie. Cela leur permet de "
    "se reposer tout en restant attentifs à leur environnement. "
    "Mais voici le détail le plus surprenant : dormir debout "
    "ne suffit pas. Pour atteindre le sommeil profond, les "
    "chevaux doivent aussi s'allonger. Ils alternent donc "
    "plusieurs positions pendant leur repos. La nature a "
    "vraiment inventé des mécanismes fascinants !"
)

PHRASES = [
    "Imagine un cheval dans un pré, les yeux fermés.",
    "Il semble dormir profondément, mais il est debout !",
    "Comment est-ce possible ?",
    "Les chevaux possèdent un mécanisme naturel étonnant.",
    "Certaines articulations peuvent se bloquer.",
    "Cela leur permet de rester debout sans trop d'effort.",
    "Ils peuvent ainsi se reposer tout en restant attentifs.",
    "Mais voici le détail le plus surprenant :",
    "Pour atteindre le sommeil profond, ils doivent aussi s'allonger.",
    "Ils alternent donc plusieurs positions pendant leur repos.",
    "La nature a vraiment inventé des mécanismes fascinants !"
]

DOSSIER = Path("videos")
DOSSIER.mkdir(exist_ok=True)

def horloge(secondes):
    heures = int(secondes // 3600)
    minutes = int((secondes % 3600) // 60)
    secs = int(secondes % 60)
    ms = int((secondes % 1) * 1000)
    return f"{heures:02}:{minutes:02}:{secs:02},{ms:03}"

async def creer_voix():
    voix = edge_tts.Communicate(
        TEXTE,
        "fr-FR-HenriNeural"
    )
    await voix.save(str(DOSSIER / "voix.mp3"))

def creer_image():
    image = Image.new("RGB", (1080, 1920), "#10172A")
    dessin = ImageDraw.Draw(image)

    dessin.rectangle((0, 0, 1080, 18), fill="#FFD166")
    dessin.ellipse((650, 280, 1250, 880), fill="#243B61")
    dessin.ellipse((-250, 1100, 500, 1850), fill="#1D3150")

    chemin = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    police = ImageFont.truetype(chemin, 76)

    dessin.text(
        (80, 430),
        "LE SECRET",
        font=police,
        fill="white"
    )
    dessin.text(
        (80, 530),
        "DES CHEVAUX",
        font=police,
        fill="#FFD166"
    )

    image.save(DOSSIER / "fond.png")

def creer_sous_titres(duree):
    total = sum(len(p) for p in PHRASES)
    debut = 0
    lignes = []

    for numero, phrase in enumerate(PHRASES, 1):
        fin = debut + duree * len(phrase) / total

        lignes.extend([
            str(numero),
            f"{horloge(debut)} --> {horloge(fin)}",
            "\n".join(textwrap.wrap(phrase, width=42)),
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
        "FontSize=16,PrimaryColour=&H00FFFFFF,"
        "OutlineColour=&H00000000,BorderStyle=1,"
        "Outline=3,Alignment=2,MarginV=100'"
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
        "-movflags", "+faststart",
        str(DOSSIER / "daily-fact-short.mp4")
    ], check=True)

    print("Video creee avec succes !")
    print("Duree :", round(duree, 1), "secondes")

if __name__ == "__main__":
    asyncio.run(main())
