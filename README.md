# Usine à mini-dramas — guide pas à pas

Ce dépôt fabrique **tout seul**, chaque jour, un Short YouTube de 60 secondes : une petite histoire émouvante avec un retournement final, animée en 3D, racontée par une voix française, avec sous-titres mot par mot. **Tout est gratuit.**

```
Gemini (IA gratuite)  →  histoire     edge-tts (gratuit)  →  voix off
Remotion + three.js   →  animation    ffmpeg              →  montage
GitHub Actions        →  fait tout ça chaque jour, sans ton ordinateur
API YouTube           →  publication
```

Aucune compétence en code n'est nécessaire : tu copies des clés et tu cliques sur des boutons.

---

## Étape 1 — Créer le dépôt GitHub (5 min)

1. Crée un compte gratuit sur **github.com**.
2. Clique sur **+** (en haut à droite) → **New repository**.
3. Nom : par exemple `mes-shorts`. Choisis **Public** (important : c'est ce qui rend GitHub Actions gratuit et illimité). Clique **Create repository**.
4. Dézippe le dossier que je t'ai donné sur ton ordinateur.
5. Dans ton dépôt : **Add file → Upload files**, puis glisse **tout le contenu** du dossier dézippé (pas le dossier lui-même). Clique **Commit changes**.
6. **Vérifie le dossier caché `.github`** : ouvre ton dépôt, tu dois voir `.github/workflows/daily.yml`. S'il n'y est pas (les dossiers cachés ne s'envoient pas toujours) :
   - **Add file → Create new file**
   - Dans le nom, tape exactement : `.github/workflows/daily.yml`
   - Colle le contenu du fichier `workflow-a-copier.txt` puis **Commit changes**.
7. **Settings → Actions → General → Workflow permissions** → coche **Read and write permissions** → **Save**.

## Étape 2 — La clé gratuite de l'IA (3 min)

1. Va sur **aistudio.google.com** → connecte-toi avec Google → **Get API key** → **Create API key**. Copie la clé.
2. Dans ton dépôt : **Settings → Secrets and variables → Actions → New repository secret**.
   - Name : `GEMINI_API_KEY`
   - Secret : colle la clé → **Add secret**.

## Étape 3 — Premier essai SANS YouTube (recommandé)

1. Onglet **Actions** → à gauche **Video du jour** → **Run workflow** → **Run workflow**.
2. Attends **30 à 90 minutes** (l'animation 3D est lente sur des machines gratuites, c'est normal).
3. Quand c'est vert : clique sur l'exécution → en bas, **Artifacts → video-du-jour** → télécharge, dézippe, regarde `final.mp4`.

> Si l'IA gratuite est indisponible ce jour-là, le système prend automatiquement une des 3 histoires de secours du dossier `stories/`. Rien ne plante.

## Étape 4 — Brancher YouTube (une seule fois, ~20 min)

C'est l'étape la plus longue, mais on ne la fait qu'une fois.

**A. Activer l'API**
1. Va sur **console.cloud.google.com** → en haut, **Nouveau projet** (nom libre) → Créer.
2. Menu ☰ → **API et services → Bibliothèque** → cherche **YouTube Data API v3** → **Activer**.

**B. Écran de consentement**
1. **API et services → Écran de consentement OAuth** → Type **Externe** → Créer.
2. Nom de l'application (libre), ton e-mail partout → Enregistrer.
3. Ajouter un **champ d'application (scope)** : `https://www.googleapis.com/auth/youtube.upload`.
4. Ajoute ton adresse Gmail dans **Utilisateurs tests**.
5. ⚠️ **Clique sur « Publier l'application » (passer en Production).** Sinon le jeton expire au bout de 7 jours et ça s'arrête.

**C. Identifiants**
1. **Identifiants → Créer des identifiants → ID client OAuth**.
2. Type : **Application Web**.
3. **URI de redirection autorisés** → ajoute exactement : `https://developers.google.com/oauthplayground`
4. Créer. Note l'**ID client** et le **Code secret du client**.

**D. Obtenir le « refresh token »**
1. Ouvre **developers.google.com/oauthplayground**.
2. Clique la roue dentée ⚙ (en haut à droite) → coche **Use your own OAuth credentials** → colle ton ID client et ton secret.
3. Dans la case de gauche « Input your own scopes », colle : `https://www.googleapis.com/auth/youtube.upload` → **Authorize APIs**.
4. Choisis le compte de ta chaîne. Si Google dit « application non vérifiée » : **Paramètres avancés → Accéder à… (non sécurisé)** (c'est ton propre projet, c'est normal).
5. Clique **Exchange authorization code for tokens** → copie le **Refresh token**.

**E. Les 3 secrets dans GitHub** (comme à l'étape 2)
- `YT_CLIENT_ID` = ton ID client
- `YT_CLIENT_SECRET` = ton secret
- `YT_REFRESH_TOKEN` = le refresh token

Relance **Run workflow** : la vidéo part sur ta chaîne.

### ⚠️ Limite importante de YouTube
Les projets API **non audités** publient les vidéos en **privé** (c'est une règle de YouTube pour les projets créés après juillet 2020). Deux solutions, toutes deux gratuites :
- **Au début** : tu ouvres *YouTube Studio* et tu passes la vidéo en **Public** d'un clic (30 secondes par jour).
- **Ensuite** : tu remplis le formulaire officiel *« YouTube API Services – Audit and Quota Extension Form »* pour lever la restriction (réponse en quelques semaines).

---

## Personnaliser (tout se fait en modifiant un fichier sur GitHub : crayon ✏ → Commit)

| Je veux… | Je modifie… |
|---|---|
| Changer les thèmes d'histoires, les prénoms, le public | `config.json` |
| Changer l'heure de publication | `daily.yml`, ligne `cron` (ex. `"0 18 * * *"` = 18h UTC ; 2 vidéos/jour : ajoute une 2ᵉ ligne `- cron`) |
| Imposer un thème un jour précis | Run workflow → champ **theme** |
| Changer la voix | dans `daily.yml`, sous l'étape « Voix off », ajoute `env:` puis `VOICE: fr-FR-HenriNeural` (autres : `fr-FR-DeniseNeural`, `fr-FR-VivienneMultilingualNeural`, `fr-FR-RemyMultilingualNeural`, `fr-CA-…`, `fr-BE-…`) |
| Ajouter de la musique | dépose des `.mp3` **libres de droits** dans `assets/music/` (YouTube Audio Library, Pixabay Music) |
| Ajouter mes propres histoires de secours | un fichier `.json` dans `stories/` (copie-en un comme modèle) |

## Ce qui te différencie de la chaîne d'origine
- **Histoires 100 % originales** (aucun texte ni personnage copié) : c'est aussi ce qui protège ta chaîne.
- **Personnages dessinés à la main en code**, un look unique (pas du Roblox), avec émotions, gestes et bulles.
- **Sous-titres colorés mot par mot**, retournement final, ton émotion/humour africain francophone.
- Pense à **varier** les thèmes dans `config.json` : YouTube pénalise le contenu répétitif.

## Dépannage rapide
- **Croix rouge dans Actions** : clique l'étape en rouge et lis le message. Les plus fréquents :
  - `GEMINI_API_KEY` mal collée → l'histoire de secours est utilisée (pas bloquant).
  - `Resource not accessible by integration` → refais l'étape 1.7 (permissions).
  - `quotaExceeded` YouTube → limite de ~6 envois par jour ; ne lance pas plus de vidéos.
- **Dépôt privé** : seulement 2 000 min/mois gratuites (≈ 25 vidéos). Garde-le **public**.
- **Rendu trop long ?** C'est normal : 30 à 90 min par vidéo.

## Mentions utiles
- Les histoires sont **fictives**. La description publiée le précise. La voix et les images sont générées par ordinateur : si YouTube te demande de le signaler dans Studio, coche l'option « contenu modifié ou synthétique ».
- Respecte les règles de monétisation de YouTube (contenu original, pas de répétition en masse) : relis régulièrement les vidéos produites.
