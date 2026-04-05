# Digipad → 1cours1bot

Transforme un export Digipad en base de connaissances pour 1cours1bot.  
Le serveur lit le contenu réel de chaque URL — aucune clé API requise.

## Déploiement sur Vercel (5 minutes, gratuit)

### Étape 1 — Créer un compte GitHub
1. Allez sur [github.com](https://github.com)
2. Cliquez "Sign up" → créez un compte gratuit

### Étape 2 — Uploader le projet sur GitHub
1. Sur GitHub, cliquez le "+" en haut → "New repository"
2. Nom : `digipad-1cours1bot` → "Create repository"
3. Cliquez "uploading an existing file"
4. Glissez-déposez **tous les fichiers** de ce dossier
5. Cliquez "Commit changes"

### Étape 3 — Déployer sur Vercel
1. Allez sur [vercel.com](https://vercel.com)
2. Cliquez "Sign up" → "Continue with GitHub"
3. Cliquez "Add New Project"
4. Choisissez votre repo `digipad-1cours1bot`
5. Cliquez "Deploy" — c'est tout !

**Votre app est disponible à l'URL fournie par Vercel.**  
Partagez cette URL avec tous vos collègues enseignants.

## Structure du projet

```
digipad-bot/
├── vercel.json          → Configuration Vercel
├── package.json         → Dépendances Node.js
├── api/
│   └── fetch-url.js     → Fonction serverless (lit les URLs)
└── public/
    └── index.html       → Application frontend
```

## Comment ça fonctionne

1. L'enseignant dépose son export JSON Digipad
2. L'app détecte toutes les URLs dans les cartes
3. Pour chaque URL, la **fonction serverless** (`api/fetch-url.js`) :
   - Fetche la page depuis le serveur Vercel (pas de problème CORS)
   - Extrait le texte principal (titre, paragraphes, listes)
   - Renvoie le contenu nettoyé
4. L'app génère un fichier `.txt` structuré
5. L'enseignant dépose ce fichier dans 1cours1bot

## Licence

MIT — Libre d'utilisation, modification et redistribution.
