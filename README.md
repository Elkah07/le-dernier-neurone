# Le Dernier Neurone

Jeu de culture générale jouable en solo ou en multijoueur sur plusieurs téléphones.

## Installation

Prérequis : Node.js 22 ou plus récent.

```bash
npm install
npm run dev
```

## Firebase

Le projet utilise :

- Firebase Authentication en mode anonyme ;
- Firebase Realtime Database pour les salons et les parties ;
- Firebase Hosting pour la PWA publique.

Les règles de la base sont dans `database.rules.json`. La configuration du projet et de Hosting est déjà présente dans `.firebaserc` et `firebase.json`.

## Vérification et déploiement

```bash
npm run build
firebase deploy --only hosting,database
```

La compilation crée le dossier `dist`, exécute les tests des 1 000 QCM et vérifie la génération de la PWA. Après le déploiement, l'adresse publique attendue est `https://le-dernier-neurone.web.app`.

## Fichiers principaux

- `app/firebase-room.ts` : synchronisation multijoueur Firebase ;
- `app/game.tsx` : écrans du jeu ;
- `app/multiplayer-game.tsx` : partie synchronisée ;
- `data/question-bank.json` : base des 1 000 QCM ;
- `public/manifest.webmanifest` et `public/sw.js` : installation PWA.
