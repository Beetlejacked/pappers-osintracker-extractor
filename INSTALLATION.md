# Guide d'installation rapide

## Étapes d'installation

### 1. Générer les icônes

Avant d'installer l'extension, vous devez créer les fichiers d'icônes :

**Option A - Utiliser le générateur HTML :**
1. Ouvrez le fichier `create-icons.html` dans votre navigateur
2. Cliquez sur chaque bouton pour télécharger les icônes
3. Placez les fichiers `icon16.png`, `icon48.png`, et `icon128.png` dans le dossier de l'extension

**Option B - Créer manuellement :**
Créez trois fichiers PNG avec les dimensions suivantes :
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)  
- `icon128.png` (128x128 pixels)

Vous pouvez utiliser n'importe quel éditeur d'images ou générateur d'icônes en ligne.

### 2. Charger l'extension dans Chrome

1. Ouvrez Chrome et allez à l'adresse : `chrome://extensions/`
2. Activez le **Mode développeur** (toggle en haut à droite)
3. Cliquez sur **"Charger l'extension non empaquetée"**
4. Sélectionnez le dossier `pappers-infos` contenant tous les fichiers de l'extension
5. L'extension devrait maintenant apparaître dans la liste

### 3. Utiliser l'extension

1. Naviguez vers une page d'entreprise sur Pappers.fr, par exemple :
   - https://www.pappers.fr/entreprise/robphil-800332686
2. Cliquez sur l'icône de l'extension dans la barre d'outils Chrome
3. Cliquez sur **"Extraire les données"**
4. Un aperçu JSON s'affichera avec toutes les données extraites
5. Cliquez sur **"Télécharger JSON"** pour sauvegarder le fichier

## Dépannage

### L'extension ne s'affiche pas
- Vérifiez que les fichiers d'icônes sont présents
- Vérifiez la console d'erreurs dans `chrome://extensions/` (cliquez sur "Erreurs")

### Aucune donnée n'est extraite
- Assurez-vous d'être sur une page d'entreprise Pappers (URL contenant `/entreprise/`)
- Attendez que la page soit complètement chargée avant d'extraire
- Ouvrez la console du navigateur (F12) pour voir les erreurs éventuelles

### Les appels API ne sont pas interceptés
- Certains appels API peuvent être effectués avant le chargement du content script
- Rechargez la page et réessayez
- Vérifiez dans l'onglet Network de la console si des appels API sont effectués

## Structure des fichiers

Assurez-vous que tous ces fichiers sont présents :
```
pappers-infos/
├── manifest.json
├── content.js
├── popup.html
├── popup.css
├── popup.js
├── background.js
├── icon16.png
├── icon48.png
├── icon128.png
└── README.md
```

