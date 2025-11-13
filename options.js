// Options page script
(function() {
  'use strict';

  // IDs des checkboxes correspondant aux types de données
  const DATA_TYPES = [
    'activite',
    'informations_juridiques',
    'etablissements',
    'dirigeants',
    'actionnaires',
    'documents_juridiques',
    'annonces_bodacc',
    'cartographie',
    'biens_immobiliers'
  ];

  // Valeurs par défaut (tous activés)
  const DEFAULT_SETTINGS = {
    export_activite: true,
    export_informations_juridiques: true,
    export_etablissements: true,
    export_dirigeants: true,
    export_actionnaires: true,
    export_documents_juridiques: true,
    export_annonces_bodacc: true,
    export_cartographie: true,
    export_biens_immobiliers: true
  };

  // Éléments DOM
  const saveBtn = document.getElementById('saveBtn');
  const resetBtn = document.getElementById('resetBtn');
  const status = document.getElementById('status');
  const statusText = document.getElementById('statusText');

  // Charger les paramètres sauvegardés
  function loadSettings() {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (result) => {
      DATA_TYPES.forEach(type => {
        const checkbox = document.getElementById(`export_${type}`);
        if (checkbox) {
          checkbox.checked = result[`export_${type}`] !== false;
        }
      });
    });
  }

  // Sauvegarder les paramètres
  function saveSettings() {
    const settings = {};
    DATA_TYPES.forEach(type => {
      const checkbox = document.getElementById(`export_${type}`);
      if (checkbox) {
        settings[`export_${type}`] = checkbox.checked;
      }
    });

    chrome.storage.sync.set(settings, () => {
      showStatus('Paramètres enregistrés avec succès', 'success');
      
      // Masquer le message après 3 secondes
      setTimeout(() => {
        status.style.display = 'none';
      }, 3000);
    });
  }

  // Réinitialiser les paramètres
  function resetSettings() {
    DATA_TYPES.forEach(type => {
      const checkbox = document.getElementById(`export_${type}`);
      if (checkbox) {
        checkbox.checked = DEFAULT_SETTINGS[`export_${type}`] !== false;
      }
    });
    saveSettings();
    showStatus('Paramètres réinitialisés', 'success');
  }

  // Afficher un message de statut
  function showStatus(message, type = 'success') {
    statusText.textContent = message;
    status.className = `status ${type}`;
    status.style.display = 'block';
  }

  // Sauvegarder automatiquement lors du changement d'une checkbox
  DATA_TYPES.forEach(type => {
    const checkbox = document.getElementById(`export_${type}`);
    if (checkbox) {
      checkbox.addEventListener('change', () => {
        saveSettings();
      });
    }
  });

  // Événements
  saveBtn.addEventListener('click', saveSettings);
  resetBtn.addEventListener('click', resetSettings);

  // Charger les paramètres au chargement de la page
  loadSettings();
})();

