# 🃏 Blackjack Ultimate

> La version complète — insurance, surrender, multi-mains, comptage Hi-Lo, stratégie de base, jackpot, objectifs et plus.

---

## 🚀 Lancement

Ouvre `index.html` dans ton navigateur. Aucune installation.

```
blackjack-v2/
├── index.html  ← Structure HTML
├── style.css   ← 2 thèmes (nuit/jour), animations 3D
├── app.js      ← Logique complète
└── README.md
```

---

## 🎮 Actions disponibles

| Action | Description |
|--------|-------------|
| **TIRER** | Recevoir une carte |
| **RESTER** | Passer au croupier |
| **DOUBLER** | ×2 la mise + 1 seule carte |
| **SÉPARER** | 2 mains si même valeur |
| **ABANDONNER** | Récupérer 50% de la mise |
| **ASSURANCE** | Quand le croupier montre un As — parier sur son BJ |

---

## 💰 Économie

- **3 niveaux de table** : Bronze (5-100€), Silver (25-500€), Gold (100€+)
- **Jackpot progressif** — alimenté par 5€ optionnel/main, déclenché par un BJ suited (même couleur)
- **Solde de départ** : 5 000 €
- **Multi-mains** : joue 1, 2 ou 3 mains simultanément

---

## 🎯 Objectifs

| Objectif | Récompense |
|----------|-----------|
| 3 Blackjacks | +500 € |
| 5 victoires d'affilée | +300 € |
| 50 mains jouées | +1 000 € |
| 5 Doubles Down | +400 € |

---

## 🧠 Aide

- **Aide stratégie** — affiche le coup optimal (Basic Strategy) selon ta main et la carte visible du croupier
- **Comptage Hi-Lo** — indicateur discret (🔥 sabot chaud / ❄ sabot froid) basé sur le running count divisé par le nombre de decks restants

---

## 📊 Stats & graphiques

- Tableau complet : mains, victoires, défaites, BJ, DD, splits, série
- **Courbe de bankroll** — les 50 dernières mains en graphique canvas
- Meilleure série affichée sous l'historique

---

## 🎨 Design

- Thème nuit (feutrine sombre) et thème jour (feutrine verte classique)
- Cartes animées avec entrée en glissement + retournement 3D (flip) de la carte cachée
- Particules dorées/vertes à la victoire, explosions spéciales au Blackjack
- Jetons en dégradé radial avec bordure pointillée
- Indicateur de "réflexion" du croupier animé

---

## 🛠️ Stack

- HTML5 / CSS3 / JavaScript ES6+ vanilla
- Web Audio API — sons contextuels
- Canvas API — particules + graphiques
- Aucune dépendance externe — 6 jeux de 52 cartes mélangés
