# SpyPiece

Première ébauche de **Spy-Piece**, un jeu navigateur multijoueur en temps réel inspiré de Codenames x One Piece.

## Stack

- Front-end : React (Vite)
- Back-end : Node.js + Express
- Temps réel : Socket.io
- Données : `server/data/characters.json`

## Démarrage

### 1) Lancer le serveur

```bash
cd /home/runner/work/SpyPiece/SpyPiece/server
npm install
npm start
```

Serveur Socket.io disponible sur `http://localhost:3001`.

### 2) Lancer le client React

```bash
cd /home/runner/work/SpyPiece/SpyPiece/client
npm install
npm run dev
```

Client disponible sur `http://localhost:5173`.

## Première itération livrée

- Serveur Express + Socket.io qui génère une grille factice de 25 cartes
- Composant React `GameBoard` connecté au serveur via Socket.io
- Affichage des 25 cartes dans une grille CSS 5x5
