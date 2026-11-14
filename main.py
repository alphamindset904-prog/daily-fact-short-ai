
import asyncio
import subprocess
import textwrap
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import edge_tts

TITRE = "LE SOMMEIL DES CHEVAUX"

TEXTE = (
    "Savais-tu que les chevaux peuvent dormir debout ? "
    "C'est grâce à un mécanisme naturel qui bloque leurs "
    "articulations et leur permet de se reposer sans tomber. "
    "Mais voici le détail surprenant : pour atteindre le "
    "sommeil profond, ils doivent parfois s'allonger. "
    "La nature possède vraiment des secrets incroyables !"
)

DOSSIER = Path("videos")
DOSSIER.mkdir(exist_ok=True)

def police(taille):
    chemin = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    return ImageFont.truetype(chemin, taille)

async def creer_voix():
    voix = edge_tts.Communicate(TEXTE, "fr-FR-HenriNeural")
    await voix.save(str(DOSSIER / "voix.mp3"))

def creer_image():
    image = Image.new("RGB", (1080, 1920), "#10172A")
    dessin = ImageDraw.Draw(image)

    dessin.rectangle((65, 250, 1015, 265), fill="#FFD166")

    y = 500
    for ligne in textwrap.wrap(TITRE, width=18):
        dessin.text((80, y), ligne, font=police(76), fill="white")
        y += 105

    dessin.text((80, 1050), "LE SAVIEZ-VOUS ?", font=police(48), fill="#FFD166")
    dessin.text((80, 1150), "La nature est fascinante.", font=police(42), fill="white")

    image.save(DOSSIER / "fond.png")

def creer_sous_titres(duree):
    phrases = [
        "Savais-tu que les chevaux peuvent dormir debout ?",
        "C'est grâce à un mécanisme naturel qui bloque leurs articulations.",
        "Cela leur permet de se reposer sans tomber.",
        "Mais pour atteindre le sommeil profond, ils doivent parfois s'allonger.",
        "La nature possède vraiment des secrets incroyables !"
    ]

    poids = [len(p) for p in phrases]
    total = sum(poids)
    debut = 0
    lignes = []

    def horloge(secondes):
        heures = int(secondes // 3600)
        minutes = int((secondes % 3600) // 60)
        secondes_entieres = int(secondes % 60)
        millisecondes = int((secondes % 1) * 1000)
        return f"{heures:02}:{minutes:02}:{secondes_entieres:02},{millisecondes:03}"

    for i, phrase in enumerate(phrases, 1):
        fin = debut + duree * len(phrase) / total
        lignes.extend([
            str(i),
            f"{horloge(debut)} --> {horloge(fin)}",
            phrase,
            ""
        ])
        debut = fin

    (DOSSIER / "sous-titres.srt").write_text(
        "\n".join(lignes), encoding="utf-8"
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
        "force_style='FontName=DejaVu Sans,FontSize=22,"
        "PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,"
        "BorderStyle=1,Outline=3,Alignment=2,MarginV=160'"
    )

    subprocess.run([
        "ffmpeg", "-y",
        "-loop", "1", "-i", str(DOSSIER / "fond.png"),
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

    print("Nouvelle video creee avec succes !")

if __name__ == "__main__":
    asyncio.run(main())
