# Pappers Info Extractor - Extension Chrome

Extension Chrome pour extraire automatiquement les informations des entreprises depuis le site Pappers.fr et les exporter au format JSON.

## 🚀 Fonctionnalités

- ✅ Extraction automatique des données d'entreprise depuis Pappers.fr
- ✅ Interception des appels API (notamment pour la cartographie)
- ✅ Export des données au format JSON
- ✅ Interface utilisateur simple et intuitive
- ✅ Aperçu des données avant téléchargement

## 📦 Installation

### Mode développeur

1. Clonez ou téléchargez ce repository
2. Ouvrez Chrome et allez dans `chrome://extensions/`
3. Activez le "Mode développeur" en haut à droite
4. Cliquez sur "Charger l'extension non empaquetée"
5. Sélectionnez le dossier contenant les fichiers de l'extension

### Création des icônes

L'extension nécessite des icônes. Créez trois fichiers PNG :
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

Ou utilisez un générateur d'icônes en ligne pour créer ces fichiers.

## 🎯 Utilisation

1. Naviguez vers une page d'entreprise sur Pappers.fr (ex: https://www.pappers.fr/entreprise/test-XXXXXXX)
2. Cliquez sur l'icône de l'extension dans la barre d'outils Chrome
3. Cliquez sur le bouton "Extraire les données"
4. Un aperçu JSON s'affichera
5. Cliquez sur "Télécharger JSON" pour sauvegarder les données

## 📋 Données extraites

L'extension extrait les informations suivantes de manière structurée :

1. **Activité** : Code APE/NAF et description de l'activité
2. **Informations juridiques** : Forme juridique, capital, date de création, etc.
3. **Liste des établissements** : Tous les établissements avec SIRET, adresses, etc.
4. **Dirigeants** : Liste des dirigeants avec nom, prénom, fonction, date de naissance
5. **Actionnaires** : Liste des actionnaires avec pourcentages et montants
6. **Documents juridiques** : Liste des documents avec leurs liens de téléchargement
7. **Annonces BODACC** : Toutes les annonces BODACC avec dates et types
8. **Cartographie** : Données de géolocalisation (JSON intercepté depuis l'API)
9. **Biens immobiliers** : Liste des biens immobiliers avec adresses, surfaces, valeurs

Toutes les données sont exportées dans un fichier JSON structuré.

## 🔧 Structure du projet

```
pappers-infos/
├── manifest.json       # Configuration de l'extension
├── content.js          # Script d'extraction des données
├── popup.html          # Interface utilisateur
├── popup.css           # Styles de l'interface
├── popup.js            # Logique du popup
├── background.js       # Service worker en arrière-plan
├── icon16.png          # Icône 16x16
├── icon48.png          # Icône 48x48
├── icon128.png         # Icône 128x128
└── README.md           # Documentation
```

## 🛠️ Développement

### Modifier l'extraction de données

Éditez le fichier `content.js` pour personnaliser les sélecteurs CSS et la logique d'extraction selon la structure actuelle du site Pappers.

### Personnaliser l'interface

Modifiez `popup.html` et `popup.css` pour adapter l'apparence de l'extension.

## 📝 Notes

- L'extension fonctionne uniquement sur les pages du domaine `pappers.fr`
- Les données sont extraites depuis le DOM de la page
- Les appels API sont interceptés via l'API Fetch
- Les données sont stockées localement dans le navigateur

## ⚠️ Limitations

- L'extraction dépend de la structure HTML du site Pappers
- Si Pappers modifie leur structure, l'extension devra être mise à jour
- Certaines données peuvent nécessiter une connexion API officielle

## 📄 Licence

Ce projet est fourni tel quel, sans garantie.

