# 🏐 Brainstorm — App de gestion de club de handball

---

## 1. Vision & positionnement

**Problème résolu :** Les apps existantes (SportEasy, TeamPulse) gèrent bien une équipe, mais deviennent inefficaces quand un club a plusieurs équipes dans la même catégorie d'âge. Cette app est conçue nativement pour le **multi-équipes et multi-catégories** au sein d'un même club.

**Cible :** Clubs de handball avec plusieurs équipes (seniors N équipes, + catégories jeunes). Joueurs, coachs, accompagnateurs, admin club.

**Plateformes :** Mobile (iOS + Android) + Web

---

## 2. Rôles & permissions

### Rôles structurels (dans l'app)

| Rôle | Description |
|---|---|
| **Admin club** | Droits étendus sur tout le club — gère toutes les catégories, tous les groupes, tous les utilisateurs |
| **Coach / Responsable de groupe** | Gère un ou plusieurs groupes, crée des événements, gère les convocations, les présences, le brûlage |
| **Joueur** | Répond aux convocations, remplit son profil, consulte son calendrier et ses stats |

> Un utilisateur peut cumuler plusieurs rôles structurels (ex : coach en équipe 1 ET joueur en équipe 2).

### Rôles de convocation (par événement)

Les rôles de convocation sont **distincts des rôles structurels** et sont définis librement par les coachs. Exemples : Joueur, Capitaine, Coach, Arbitre, Table de marque, Accompagnateur, Chauffeur, Soigneur…

- Un utilisateur peut être convoqué avec **un ou plusieurs rôles** pour un même événement
- N'importe quel membre (même blessé) peut être convoqué avec un rôle non-sportif
- Les rôles de convocation sont **personnalisables par le club** (liste gérée par l'admin)
- Le rôle de convocation est visible sur la liste des convoqués

---

## 3. Structure du club

```
Club
├── Catégorie (ex : Seniors, U18, U16…)
│   ├── Groupe / Équipe 1
│   ├── Groupe / Équipe 2
│   └── Groupe / Équipe N
└── Catégorie (ex : U14…)
    └── …
```

- Chaque **catégorie** regroupe plusieurs **groupes/équipes**
- Un joueur peut appartenir à **plusieurs groupes**
- Le brûlage s'applique à l'intérieur d'une catégorie
- Les **coachs d'une catégorie** ont accès en lecture aux matchs de toute la catégorie
- Vue catégorie : un coach peut consulter **tous les joueurs de la catégorie**, filtrés par poste, statut, groupe (ex : voir tous les gardiens disponibles de la catégorie seniors)

> **Multi-club :** techniquement prévu dans l'architecture mais non exposé dans l'UI v1. Un utilisateur aura un compte unique, rattachable à plusieurs clubs plus tard.

---

## 4. Gestion des saisons

- L'app gère des **saisons** (ex : 2024-2025)
- Chaque saison a une date de début et de fin
- À la création d'une nouvelle saison : **reset du brûlage** et des stats de présence
- L'historique des saisons précédentes reste consultable
- Les groupes et membres peuvent être reconduits d'une saison à l'autre

---

## 5. Gestion des utilisateurs & onboarding

- Accès uniquement par **invitation** (lien ou code unique)
- L'admin ou un coach génère l'invitation et l'envoie
- À l'inscription, l'utilisateur crée son compte et rejoint automatiquement le groupe lié à l'invitation
- Un utilisateur peut être invité dans plusieurs groupes

---

## 6. Événements & calendrier

### Types d'événements

- **Match** (visibilité élargie à toute la catégorie)
- **Entraînement** (privé aux invités)
- **Événement ponctuel** (privé aux invités)

### Création d'un événement

Champs : titre, type, date, heure de début, heure de RDV, lieu, description, convocations (groupe en 1 clic + ajout individuel), rôle de convocation par personne, heure de rappel (notification push)

### Séries d'événements (récurrence)

- Création d'une série (ex : entraînement chaque mardi à 20h)
- Modification **en série** (tous les événements futurs) ou **individuelle** (titre, heure, lieu, convoqués…)
- Annulation individuelle d'un événement dans une série

### Visibilité

- Joueur : voit uniquement ses événements + **les matchs de toute sa catégorie** (lecture seule s'il n'est pas convoqué)
- Coach : voit ses événements + **tous les matchs de sa catégorie**
- Entraînements & événements ponctuels : visibles uniquement par les invités

### Filtres calendrier

Par type d'événement (match / entraînement / ponctuel)

---

## 7. Convocations & présences

### Flux pour un match

1. Coach invite un groupe (1 clic) + ajout individuel au compte-goutte
2. Pour chaque convoqué : attribution d'un ou plusieurs **rôles de convocation**
3. Les convoqués répondent présent / absent (+ motif ou annotation)
4. Coach voit les réponses en temps réel
5. Coach constitue la **liste finale** (ex : 12 sur 15 disponibles)
6. Après le match : saisie du **score**, correction des présences réelles si besoin

### Export convocation

- Génération d'un **message texte formaté** (copier-coller) listant les convoqués, leurs rôles, le lieu, l'heure de RDV
- Destiné à être publié sur WhatsApp ou autre messagerie externe

### Modification des présences

- Les coachs peuvent modifier les présences **avant et après** l'événement
- Modification post-événement tracée (utilisée pour la stat de fiabilité)

### Absences & indisponibilités

- Motif prédéfini (blessure, vacances, travail…) ou annotation libre
- Plages d'absence (dates de début / fin)
- Un joueur avec une plage d'absence active **n'est plus automatiquement convoqué** (mais peut l'être manuellement avec un rôle non-sportif)

---

## 8. Résultat de match

- Saisie du **score final** (équipe domicile / extérieur) par le coach après le match
- Score visible sur la fiche de l'événement et dans le calendrier
- Architecture prévue pour une future intégration avec une app de stats en temps réel (API ouverte ou champ d'intégration)

---

## 9. Brûlage

**Règle métier :** Dans une catégorie avec N équipes, un joueur est "brûlé" dans une équipe inférieure s'il a joué plus de la moitié des matchs dans une ou des équipes supérieures (cumul inter-équipes).

**Exemples :**
- 22 matchs → seuil : 12 matchs joués en équipe 1 = brûlé pour équipe 2 et 3
- 9 matchs en équipe 1 + 3 matchs en équipe 2 = brûlé pour équipe 3

### Fonctionnement

- Comptabilisation **automatique** depuis les listes de convoqués finales
- **Correction manuelle** possible (avec historique des modifications)
- Vue dédiée : tableau des joueurs avec statut de brûlage par équipe
- **Alerte visuelle** lors de la constitution d'une liste si un joueur est brûlé pour cette équipe
- Reset à chaque nouvelle saison

---

## 10. Profils joueurs

**Infos sportives :**
- Prénom / Nom, date de naissance / âge
- Latéralité (droitier / gaucher)
- Poste(s) (plusieurs possibles : gardien, ailier, pivot, arrière, demi-centre…)
- Numéro de maillot

**Vue catégorie (coachs) :**
- Tous les joueurs de la catégorie, filtrables par poste, groupe, statut (blessé, disponible, brûlé…)
- Fiche individuelle accessible par tous les membres de la catégorie

---

## 11. Statistiques

### Accessibles à tous (sur soi-même) / aux coachs (sur tous les joueurs de leurs groupes)

| Stat | Description |
|---|---|
| **Taux de présence** | % présences / événements convoqué |
| **Taux d'absence** | % absences justifiées ou non |
| **Taux de réponse** | % de réponses données avant l'événement |
| **Temps de réponse moyen** | Délai moyen entre convocation et réponse |
| **Fiabilité** | % de fois où la réponse donnée = présence réelle |

### Filtres temporels

- Depuis le début de la saison
- Sur les 4 dernières semaines
- Sur la dernière semaine

---

## 12. Notifications (Push uniquement)

- Rappel avant un événement (délai configurable par événement)
- Nouvelle convocation reçue
- Modification d'un événement auquel on est invité
- Annulation d'un événement
- *(Optionnel)* Rappel si pas encore répondu à une convocation
