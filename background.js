// Background service worker pour l'extension Pappers
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

