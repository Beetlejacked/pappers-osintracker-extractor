// Background service worker pour l'extension Pappers
const GITHUB_REPO = 'Beetlejacked/pappers-osintracker-extractor';
const GITHUB_BRANCH = 'main';
const GITHUB_API_BASE = 'https://api.github.com/repos';

// Version actuelle de l'extension
const CURRENT_VERSION = chrome.runtime.getManifest().version;

// Fonction pour comparer deux versions (format semver: x.y.z)
function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;
    
    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }
  
  return 0;
}

// Fonction pour récupérer la version depuis GitHub
async function checkForUpdates() {
  try {
    // Récupérer le manifest.json depuis la branche main
    const manifestUrl = `${GITHUB_API_BASE}/${GITHUB_REPO}/contents/manifest.json?ref=${GITHUB_BRANCH}`;
    
    const response = await fetch(manifestUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Décoder le contenu base64
    const manifestContent = atob(data.content.replace(/\s/g, ''));
    const manifest = JSON.parse(manifestContent);
    
    const latestVersion = manifest.version;
    const hasUpdate = compareVersions(latestVersion, CURRENT_VERSION) > 0;
    
    // Sauvegarder les informations de mise à jour
    await chrome.storage.local.set({
      updateCheck: {
        lastCheck: new Date().toISOString(),
        currentVersion: CURRENT_VERSION,
        latestVersion: latestVersion,
        hasUpdate: hasUpdate,
        downloadUrl: `https://github.com/${GITHUB_REPO}/archive/refs/heads/${GITHUB_BRANCH}.zip`
      }
    });
    
    console.log('Vérification de mise à jour:', {
      current: CURRENT_VERSION,
      latest: latestVersion,
      hasUpdate: hasUpdate
    });
    
    return {
      hasUpdate,
      currentVersion: CURRENT_VERSION,
      latestVersion,
      downloadUrl: `https://github.com/${GITHUB_REPO}/archive/refs/heads/${GITHUB_BRANCH}.zip`
    };
  } catch (error) {
    console.error('Erreur lors de la vérification des mises à jour:', error);
    return {
      hasUpdate: false,
      error: error.message,
      currentVersion: CURRENT_VERSION
    };
  }
}

// Vérifier les mises à jour au démarrage de l'extension
chrome.runtime.onStartup.addListener(() => {
  checkForUpdates();
});

// Vérifier les mises à jour lors de l'installation
chrome.runtime.onInstalled.addListener(() => {
  checkForUpdates();
});

// Vérifier périodiquement (toutes les 24 heures)
chrome.alarms.create('checkUpdates', { periodInMinutes: 24 * 60 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkUpdates') {
    checkForUpdates();
  }
});

// Écouter les messages depuis le popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'API_CALL') {
    // Stocker les appels API pour référence future
    chrome.storage.local.get(['apiCalls'], (result) => {
      const apiCalls = result.apiCalls || [];
      apiCalls.push({
        url: request.url,
        data: request.data,
        timestamp: new Date().toISOString()
      });
      chrome.storage.local.set({ apiCalls: apiCalls.slice(-50) }); // Garder les 50 derniers
    });
  } else if (request.type === 'CHECK_UPDATE') {
    // Vérifier manuellement les mises à jour
    checkForUpdates().then(result => {
      sendResponse(result);
    }).catch(error => {
      sendResponse({ hasUpdate: false, error: error.message });
    });
    return true; // Indique une réponse asynchrone
  } else if (request.type === 'GET_UPDATE_INFO') {
    // Récupérer les informations de mise à jour stockées
    chrome.storage.local.get(['updateCheck'], (result) => {
      sendResponse(result.updateCheck || null);
    });
    return true;
  }
  return true;
});

// Écouter les changements d'onglets pour nettoyer les données si nécessaire
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('pappers.fr')) {
    // La page a fini de charger, le content script va s'activer
    console.log('Page Pappers chargée:', tab.url);
  }
});

// Vérifier les mises à jour au chargement
checkForUpdates();

