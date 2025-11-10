# Guide pour créer un GIF de démonstration

## Outils recommandés

### Option 1 : ScreenToGif (Windows - Gratuit)
- **Téléchargement** : https://www.screentogif.com/
- **Avantages** : Gratuit, open-source, léger, permet d'éditer les frames
- **Utilisation** :
  1. Ouvrez ScreenToGif
  2. Cliquez sur "Enregistreur"
  3. Sélectionnez la zone à enregistrer (ou tout l'écran)
  4. Cliquez sur "Enregistrer"
  5. Effectuez votre démonstration
  6. Cliquez sur "Arrêter"
  7. Éditez si nécessaire (supprimez les frames inutiles)
  8. Exportez en GIF

### Option 2 : OBS Studio + Convertir en GIF
- **Téléchargement** : https://obsproject.com/
- **Avantages** : Professionnel, permet d'enregistrer en haute qualité
- **Utilisation** :
  1. Enregistrez en MP4 avec OBS
  2. Convertissez en GIF avec un outil en ligne (ezgif.com) ou FFmpeg

### Option 3 : LICEcap (Windows/Mac - Gratuit)
- **Téléchargement** : https://www.cockos.com/licecap/
- **Avantages** : Simple, léger, export direct en GIF
- **Utilisation** :
  1. Ouvrez LICEcap
  2. Ajustez la fenêtre de capture
  3. Cliquez sur "Record"
  4. Effectuez votre démonstration
  5. Cliquez sur "Stop"
  6. Le GIF est automatiquement sauvegardé

## Scénario de démonstration recommandé

### 1. Préparation (avant l'enregistrement)
- Ouvrez Chrome
- Allez sur une page d'entreprise Pappers (ex: https://www.pappers.fr/entreprise/robphil-800332686)
- Assurez-vous que l'extension est installée et activée
- Réduisez la taille de la fenêtre du navigateur pour que le GIF ne soit pas trop grand

### 2. Script de démonstration (durée : 30-60 secondes)

#### Séquence 1 : Introduction (5 secondes)
- Montrez la page Pappers ouverte
- Montrez l'icône de l'extension dans la barre d'outils Chrome
- Cliquez sur l'icône pour ouvrir la popup

#### Séquence 2 : Extraction des données (10 secondes)
- Montrez la popup ouverte avec le bouton "Extraire les données"
- Cliquez sur "Extraire les données"
- Attendez que le statut change (peut prendre 2-3 secondes)
- Montrez le message de succès

#### Séquence 3 : Aperçu des données (10 secondes)
- Montrez l'aperçu JSON qui apparaît
- Faites défiler un peu pour montrer les différentes sections (activité, dirigeants, etc.)
- Montrez que les données sont bien structurées

#### Séquence 4 : Fonctionnalités (15 secondes)
- Cliquez sur "Copier JSON" (montrez brièvement le message de confirmation)
- Cliquez sur "Télécharger JSON" (montrez brièvement le téléchargement)
- Cliquez sur "Exporter OSINTracker" (montrez brièvement le téléchargement)

#### Séquence 5 : Conclusion (5 secondes)
- Montrez le lien GitHub en bas de la popup
- Fermez la popup
- Fin de la démonstration

### 3. Conseils pour un bon GIF

#### Taille et qualité
- **Résolution recommandée** : 800x600 ou 1024x768 pixels
- **Durée** : 30-60 secondes maximum
- **FPS** : 10-15 fps (suffisant pour une démo)
- **Taille du fichier** : Essayez de rester sous 5-10 MB

#### Optimisation
- Supprimez les pauses inutiles
- Accélérez les parties lentes (si votre outil le permet)
- Réduisez le nombre de couleurs si nécessaire (256 couleurs max pour GIF)
- Utilisez un fond simple (évitez les animations de page)

#### Accessibilité
- Ajoutez des annotations si nécessaire (flèches, texte)
- Assurez-vous que le texte est lisible
- Utilisez un curseur visible et animé

## Étapes détaillées avec ScreenToGif

### 1. Préparation
```
1. Ouvrez ScreenToGif
2. Cliquez sur "Enregistreur"
3. Ajustez la zone de capture pour inclure :
   - La page Pappers
   - La popup de l'extension
   - La barre d'outils Chrome (pour voir l'icône)
```

### 2. Enregistrement
```
1. Cliquez sur "Enregistrer"
2. Attendez 1 seconde (pour éviter le début brusque)
3. Suivez le script de démonstration ci-dessus
4. Cliquez sur "Arrêter" après avoir terminé
```

### 3. Édition
```
1. Dans l'éditeur ScreenToGif :
   - Supprimez les frames du début (avant le clic sur l'icône)
   - Supprimez les frames de fin (après la fermeture)
   - Supprimez les frames où vous attendez (gardez seulement l'essentiel)
   - Vérifiez que toutes les actions sont visibles
```

### 4. Export
```
1. Allez dans "Fichier" > "Exporter en tant que" > "GIF"
2. Options recommandées :
   - Qualité : 100%
   - Couleurs : 256 (ou moins si le fichier est trop gros)
   - Répéter : Infini
3. Choisissez un nom de fichier (ex: demo-extension.gif)
4. Cliquez sur "Exporter"
```

## Points clés à montrer

✅ **L'icône de l'extension** dans la barre d'outils
✅ **L'ouverture de la popup** avec le logo et les boutons
✅ **L'extraction des données** en un clic
✅ **L'aperçu JSON** avec les données structurées
✅ **Les fonctionnalités** : Copier, Télécharger, Exporter OSINTracker
✅ **Le lien GitHub** pour le code source

## Exemple de script narratif (optionnel)

Si vous ajoutez du texte dans le GIF ou une vidéo avec narration :

```
"Pappers OSINT Extractor - Une extension Chrome pour extraire 
automatiquement les données d'entreprises depuis Pappers.fr.

1. Cliquez sur l'icône de l'extension
2. Cliquez sur 'Extraire les données'
3. Les données sont extraites automatiquement
4. Vous pouvez copier, télécharger ou exporter au format OSINTracker
5. Toutes les données sont structurées en JSON prêt à l'emploi"
```

## Outils supplémentaires

### Pour optimiser le GIF après création
- **ezgif.com** : https://ezgif.com/optimize
  - Permet de réduire la taille du fichier
  - Permet d'ajuster la vitesse
  - Permet de rogner/couper

### Pour ajouter du texte/annotations
- **ScreenToGif** : Éditeur intégré avec outils de dessin
- **Photoshop/GIMP** : Pour des annotations plus avancées

## Checklist finale

Avant de publier votre GIF :
- [ ] Le GIF démarre au bon moment (pas de frames vides au début)
- [ ] Le GIF se termine proprement (pas de frames vides à la fin)
- [ ] Toutes les fonctionnalités principales sont montrées
- [ ] Le texte est lisible
- [ ] La taille du fichier est raisonnable (< 10 MB)
- [ ] Le GIF est optimisé pour le web
- [ ] Le lien GitHub est visible (si vous le montrez)

## Emplacements pour partager le GIF

- **README.md** du repository GitHub
- **GitHub Releases** (section assets)
- **Documentation** du projet
- **Issues/Pull Requests** (pour expliquer des fonctionnalités)

Bon enregistrement ! 🎬

