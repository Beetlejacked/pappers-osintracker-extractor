// Popup script pour l'extension Pappers
document.addEventListener('DOMContentLoaded', () => {
  const extractBtn = document.getElementById('extractBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const copyBtn = document.getElementById('copyBtn');
  const exportOsintBtn = document.getElementById('exportOsintBtn');
  const status = document.getElementById('status');
  const preview = document.getElementById('preview');
  const jsonPreview = document.getElementById('jsonPreview');
  
  let extractedData = null;

  // Fonction pour mettre à jour le statut
  function updateStatus(message, type = 'default') {
    status.className = `status ${type}`;
    status.querySelector('p').textContent = message;
  }

  // Fonction pour formater le JSON
  function formatJSON(data) {
    return JSON.stringify(data, null, 2);
  }

  // Fonction pour télécharger le JSON
  function downloadJSON(data, filename = 'pappers-data.json') {
    const jsonStr = formatJSON(data);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Fonction pour copier le JSON dans le presse-papier
  async function copyJSONToClipboard(data) {
    const jsonStr = formatJSON(data);
    try {
      await navigator.clipboard.writeText(jsonStr);
      return true;
    } catch (err) {
      // Fallback pour les navigateurs qui ne supportent pas l'API Clipboard
      const textArea = document.createElement('textarea');
      textArea.value = jsonStr;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return true;
      } catch (err) {
        document.body.removeChild(textArea);
        return false;
      }
    }
  }

  // Fonction pour générer un UUID v4
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Fonction pour convertir les données Pappers au format OSINTracker
  function convertToOSINTracker(pappersData) {
    const entities = [];
    const relations = [];
    const entityMap = new Map(); // Pour stocker les IDs des entités créées
    const now = Date.now();

    // Type IDs OSINTracker (à adapter selon votre configuration)
    // Pour l'instant, on utilise des IDs génériques
    const TYPE_IDS = {
      ENTREPRISE: 'clh3s7j5i80es0buufreodcj2', // Société/Entreprise
      PERSONNE: 'clh6rcu0jtw4n0bujt1zdz84r', // Personne
      DOCUMENT: 'clh7j08iov9zr0bujfjxlbvnk', // Document/Article
      ETABLISSEMENT: 'clh6r39u3tvw30bw11ey6rdwk', // Localisation/Établissement
      URL: 'clh6sl88qtzf60bt9matmv1sm' // URL/Lien
    };

    // 1. Créer l'entité principale (Entreprise)
    let entrepriseMainId = null;
    let entrepriseCartoId = null; // ID de l'entreprise dans la cartographie si elle y est
    if (pappersData.nom && pappersData.siren) {
      entrepriseMainId = generateUUID();
      entityMap.set('entreprise', entrepriseMainId);
      entities.push({
        id: entrepriseMainId,
        value: `${pappersData.nom} (${pappersData.siren})`,
        typeId: TYPE_IDS.ENTREPRISE,
        creationDate: now,
        critical: false,
        comments: `SIREN: ${pappersData.siren}\nURL: ${pappersData.url}\n${pappersData.activite?.description || ''}`,
        url: pappersData.url
      });
    }

    // 2. Créer les entités pour les dirigeants
    if (pappersData.dirigeants && Array.isArray(pappersData.dirigeants)) {
      pappersData.dirigeants.forEach(dirigeant => {
        if (dirigeant.nom_complet && !dirigeant.nom_complet.includes('Nos') && !dirigeant.nom_complet.includes('Entreprises')) {
          const dirigeantId = generateUUID();
          const key = `dirigeant_${dirigeant.nom_complet}`;
          entityMap.set(key, dirigeantId);
          
          let comments = '';
          if (dirigeant.fonction) comments += `Fonction: ${dirigeant.fonction}\n`;
          if (dirigeant.date_debut) comments += `Depuis: ${dirigeant.date_debut}\n`;
          if (dirigeant.date_fin) comments += `Jusqu'à: ${dirigeant.date_fin}\n`;
          if (dirigeant.ancien) comments += 'Ancien dirigeant\n';

          entities.push({
            id: dirigeantId,
            value: dirigeant.nom_complet,
            typeId: TYPE_IDS.PERSONNE,
            creationDate: now,
            critical: false,
            comments: comments.trim() || undefined,
            url: dirigeant.url || undefined
          });

          // Créer la relation entreprise -> dirigeant
          if (entityMap.has('entreprise')) {
            relations.push({
              id: generateUUID(),
              originId: entityMap.get('entreprise'),
              targetId: dirigeantId,
              bidirectional: false,
              label: dirigeant.fonction || 'Dirigeant',
              comments: dirigeant.ancien ? 'Ancien dirigeant' : '',
              rating: 2,
              critical: false,
              creationDate: now
            });
          }
        }
      });
    }

    // 3. Créer les entités pour les actionnaires
    if (pappersData.actionnaires && !pappersData.actionnaires.disponible && Array.isArray(pappersData.actionnaires)) {
      pappersData.actionnaires.forEach(actionnaire => {
        if (actionnaire.nom_complet) {
          const actionnaireId = generateUUID();
          const key = `actionnaire_${actionnaire.nom_complet}`;
          entityMap.set(key, actionnaireId);
          
          entities.push({
            id: actionnaireId,
            value: actionnaire.nom_complet,
            typeId: TYPE_IDS.PERSONNE,
            creationDate: now,
            critical: false,
            comments: actionnaire.pourcentage ? `Part: ${actionnaire.pourcentage}` : undefined
          });

          // Créer la relation entreprise -> actionnaire
          if (entityMap.has('entreprise')) {
            relations.push({
              id: generateUUID(),
              originId: entityMap.get('entreprise'),
              targetId: actionnaireId,
              bidirectional: false,
              label: 'Actionnaire',
              comments: actionnaire.pourcentage ? `${actionnaire.pourcentage}%` : '',
              rating: 2,
              critical: false,
              creationDate: now
            });
          }
        }
      });
    }

    // 4. Créer les entités pour les établissements
    if (pappersData.etablissements && Array.isArray(pappersData.etablissements)) {
      pappersData.etablissements.forEach(etablissement => {
        if (etablissement.siret || etablissement.adresse) {
          const etablissementId = generateUUID();
          const key = `etablissement_${etablissement.siret || etablissement.adresse}`;
          entityMap.set(key, etablissementId);
          
          let value = etablissement.nom || 'Établissement';
          if (etablissement.siret) value += ` (${etablissement.siret})`;
          
          let comments = '';
          if (etablissement.adresse) comments += `Adresse: ${etablissement.adresse}\n`;
          if (etablissement.statut) comments += `Statut: ${etablissement.statut}\n`;
          if (etablissement.date_creation) comments += `Création: ${etablissement.date_creation}\n`;

          entities.push({
            id: etablissementId,
            value: value,
            typeId: TYPE_IDS.ETABLISSEMENT,
            creationDate: now,
            critical: false,
            comments: comments.trim() || undefined
          });

          // Créer la relation entreprise -> établissement
          if (entityMap.has('entreprise')) {
            relations.push({
              id: generateUUID(),
              originId: entityMap.get('entreprise'),
              targetId: etablissementId,
              bidirectional: false,
              label: 'Établissement',
              comments: etablissement.statut || '',
              rating: 2,
              critical: false,
              creationDate: now
            });
          }
        }
      });
    }

    // 5. Créer les entités pour les documents juridiques
    if (pappersData.documents_juridiques && Array.isArray(pappersData.documents_juridiques)) {
      pappersData.documents_juridiques.forEach(doc => {
        if (doc.url || doc.types?.length > 0) {
          const docId = generateUUID();
          const key = `doc_${doc.url || doc.date || doc.types?.[0]}`;
          entityMap.set(key, docId);
          
          const value = doc.types?.join(', ') || 'Document juridique';
          let comments = '';
          if (doc.date) comments += `Date: ${doc.date}\n`;
          if (doc.description) comments += `Description: ${doc.description}\n`;

          entities.push({
            id: docId,
            value: value,
            typeId: TYPE_IDS.DOCUMENT,
            creationDate: now,
            critical: false,
            comments: comments.trim() || undefined,
            url: doc.url || undefined
          });

          // Créer la relation entreprise -> document
          if (entityMap.has('entreprise')) {
            relations.push({
              id: generateUUID(),
              originId: entityMap.get('entreprise'),
              targetId: docId,
              bidirectional: false,
              label: 'Document',
              comments: doc.date || '',
              rating: 2,
              critical: false,
              creationDate: now
            });
          }
        }
      });
    }

    // 6. Créer les entités pour les annonces BODACC
    if (pappersData.annonces_bodacc && Array.isArray(pappersData.annonces_bodacc)) {
      pappersData.annonces_bodacc.forEach(annonce => {
        if (annonce.type || annonce.lien) {
          const annonceId = generateUUID();
          const key = `bodacc_${annonce.date || annonce.type}`;
          entityMap.set(key, annonceId);
          
          const value = `BODACC - ${annonce.type || 'Annonce'}${annonce.date ? ` (${annonce.date})` : ''}`;
          let comments = '';
          if (annonce.denomination) comments += `Dénomination: ${annonce.denomination}\n`;
          if (annonce.capital) comments += `Capital: ${annonce.capital}\n`;
          if (annonce.adresse) comments += `Adresse: ${annonce.adresse}\n`;

          entities.push({
            id: annonceId,
            value: value,
            typeId: TYPE_IDS.DOCUMENT,
            creationDate: now,
            critical: false,
            comments: comments.trim() || undefined,
            url: annonce.lien || undefined
          });

          // Créer la relation entreprise -> annonce BODACC
          if (entityMap.has('entreprise')) {
            relations.push({
              id: generateUUID(),
              originId: entityMap.get('entreprise'),
              targetId: annonceId,
              bidirectional: false,
              label: 'Annonce BODACC',
              comments: annonce.type || '',
              rating: 2,
              critical: false,
              creationDate: now
            });
          }
        }
      });
    }

    // 7. Créer les entités pour la cartographie (entreprises et personnes)
    if (pappersData.cartographie) {
      // Entreprises de la cartographie
      const cartoEntMap = new Map(); // Map des IDs cartographie (e1, e2...) vers UUIDs
      const cartoSirenMap = new Map(); // Map des SIREN vers UUIDs pour lier à l'entreprise principale
      if (pappersData.cartographie.entreprises && Array.isArray(pappersData.cartographie.entreprises)) {
        pappersData.cartographie.entreprises.forEach(entreprise => {
          if (entreprise.nom_entreprise && entreprise.siren && entreprise.id) {
            const cartoEntId = generateUUID();
            cartoEntMap.set(entreprise.id, cartoEntId);
            cartoSirenMap.set(entreprise.siren, cartoEntId);
            
            entities.push({
              id: cartoEntId,
              value: `${entreprise.nom_entreprise} (${entreprise.siren})`,
              typeId: TYPE_IDS.ENTREPRISE,
              creationDate: now,
              critical: false,
              comments: `SIREN: ${entreprise.siren}\nSource: Cartographie Pappers`
            });

            // Si cette entreprise de la cartographie correspond à l'entreprise principale, noter l'ID
            if (entrepriseMainId && pappersData.siren === entreprise.siren) {
              entrepriseCartoId = entreprise.id; // Stocker l'ID cartographie de l'entreprise principale
              // Créer une relation bidirectionnelle entre l'entreprise principale et sa version cartographie
              relations.push({
                id: generateUUID(),
                originId: entrepriseMainId,
                targetId: cartoEntId,
                bidirectional: false,
                label: 'Même entreprise',
                comments: 'Entreprise principale dans la cartographie',
                rating: 2,
                critical: false,
                creationDate: now
              });
            }
          }
        });
      }

      // Personnes de la cartographie
      const cartoPersMap = new Map(); // Map des IDs cartographie (p1, p2...) vers UUIDs
      if (pappersData.cartographie.personnes && Array.isArray(pappersData.cartographie.personnes)) {
        pappersData.cartographie.personnes.forEach(personne => {
          if (personne.nom && personne.prenom && personne.id) {
            const cartoPersId = generateUUID();
            cartoPersMap.set(personne.id, cartoPersId);
            
            let comments = '';
            if (personne.niveau) comments += `Niveau: ${personne.niveau}\n`;
            if (personne.date_naissance) comments += `Naissance: ${personne.date_naissance}\n`;

            entities.push({
              id: cartoPersId,
              value: `${personne.prenom} ${personne.nom}`,
              typeId: TYPE_IDS.PERSONNE,
              creationDate: now,
              critical: false,
              comments: comments.trim() || undefined
            });
          }
        });
      }

      // Relations entreprises-personnes de la cartographie
      if (pappersData.cartographie.liens_entreprises_personnes && Array.isArray(pappersData.cartographie.liens_entreprises_personnes)) {
        pappersData.cartographie.liens_entreprises_personnes.forEach(lien => {
          if (Array.isArray(lien) && lien.length === 2) {
            const [entId, persId] = lien;
            const realEntId = cartoEntMap.get(entId);
            const realPersId = cartoPersMap.get(persId);
            
            if (realEntId && realPersId) {
              relations.push({
                id: generateUUID(),
                originId: realEntId,
                targetId: realPersId,
                bidirectional: false,
                label: 'Lien cartographie',
                comments: 'Relation entreprise-personne depuis cartographie Pappers',
                rating: 2,
                critical: false,
                creationDate: now
              });
            } else if (!realEntId && realPersId) {
              // Si l'entreprise n'est pas trouvée dans cartoEntMap, vérifier si c'est l'entreprise principale
              if (entId === entrepriseCartoId && entrepriseMainId) {
                // C'est l'entreprise principale, utiliser son ID
                relations.push({
                  id: generateUUID(),
                  originId: entrepriseMainId,
                  targetId: realPersId,
                  bidirectional: false,
                  label: 'Lien cartographie',
                  comments: 'Relation entreprise-personne depuis cartographie Pappers',
                  rating: 2,
                  critical: false,
                  creationDate: now
                });
              }
            }
          }
        });
      }

      // Relations entre entreprises de la cartographie
      if (pappersData.cartographie.liens_entreprises_entreprises && Array.isArray(pappersData.cartographie.liens_entreprises_entreprises)) {
        pappersData.cartographie.liens_entreprises_entreprises.forEach(lien => {
          if (Array.isArray(lien) && lien.length === 2) {
            const [entId1, entId2] = lien;
            let realEntId1 = cartoEntMap.get(entId1);
            let realEntId2 = cartoEntMap.get(entId2);
            
            // Si l'entreprise n'est pas dans la cartographie mais correspond à l'entreprise principale
            if (!realEntId1 && entId1 === entrepriseCartoId && entrepriseMainId) {
              realEntId1 = entrepriseMainId;
            }
            if (!realEntId2 && entId2 === entrepriseCartoId && entrepriseMainId) {
              realEntId2 = entrepriseMainId;
            }
            
            if (realEntId1 && realEntId2) {
              relations.push({
                id: generateUUID(),
                originId: realEntId1,
                targetId: realEntId2,
                bidirectional: false,
                label: 'Lien entreprise',
                comments: 'Relation entre entreprises depuis cartographie Pappers',
                rating: 2,
                critical: false,
                creationDate: now
              });
            }
          }
        });
      }
    }

    return {
      entities: entities,
      relations: relations
    };
  }

  // Vérifier si on est sur une page Pappers
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    if (!currentTab.url.includes('pappers.fr')) {
      updateStatus('⚠️ Veuillez ouvrir une page Pappers', 'error');
      extractBtn.disabled = true;
    }
  });

  // Fonction pour envoyer un message avec retry
  function sendMessageWithRetry(tabId, message, maxRetries = 3) {
    return new Promise((resolve, reject) => {
      let retries = 0;
      
      function attemptSend() {
        chrome.tabs.sendMessage(tabId, message, (response) => {
          if (chrome.runtime.lastError) {
            const error = chrome.runtime.lastError.message;
            // Si le content script n'est pas encore chargé, réessayer
            if (error.includes('Could not establish connection') && retries < maxRetries) {
              retries++;
              setTimeout(attemptSend, 500); // Attendre 500ms avant de réessayer
              return;
            }
            reject(new Error(error));
            return;
          }
          if (response && response.success) {
            resolve(response.data);
          } else {
            reject(new Error(response?.error || 'Échec de l\'extraction'));
          }
        });
      }
      
      attemptSend();
    });
  }

  // Bouton d'extraction
  extractBtn.addEventListener('click', async () => {
    updateStatus('⏳ Extraction en cours...', 'loading');
    extractBtn.disabled = true;

    try {
      // Récupérer l'onglet actif
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.includes('pappers.fr')) {
        updateStatus('❌ Veuillez ouvrir une page Pappers', 'error');
        extractBtn.disabled = false;
        return;
      }

      // Attendre un peu pour que le content script se charge si nécessaire
      await new Promise(resolve => setTimeout(resolve, 200));

      // Envoyer un message au content script pour extraire les données
      const data = await sendMessageWithRetry(tab.id, { action: 'extract' });
      
      extractedData = data;
      
      // Afficher l'aperçu
      jsonPreview.textContent = formatJSON(extractedData);
      preview.style.display = 'block';
      downloadBtn.disabled = false;
      copyBtn.disabled = false;
      exportOsintBtn.disabled = false;
      updateStatus('✅ Données extraites avec succès!', 'success');
      extractBtn.disabled = false;
      
    } catch (error) {
      updateStatus('❌ Erreur: ' + error.message, 'error');
      extractBtn.disabled = false;
      console.error('Erreur d\'extraction:', error);
    }
  });

  // Bouton de téléchargement
  downloadBtn.addEventListener('click', () => {
    if (extractedData) {
      // Générer un nom de fichier avec le SIREN si disponible
      const filename = extractedData.siren 
        ? `pappers-${extractedData.siren}-${Date.now()}.json`
        : `pappers-data-${Date.now()}.json`;
      
      downloadJSON(extractedData, filename);
      updateStatus('💾 Fichier téléchargé!', 'success');
    }
  });

  // Bouton de copie
  copyBtn.addEventListener('click', async () => {
    if (extractedData) {
      const success = await copyJSONToClipboard(extractedData);
      if (success) {
        updateStatus('📋 JSON copié dans le presse-papier!', 'success');
        // Remettre le message normal après 2 secondes
        setTimeout(() => {
          updateStatus('✅ Données extraites avec succès!', 'success');
        }, 2000);
      } else {
        updateStatus('❌ Erreur lors de la copie', 'error');
      }
    }
  });

  // Bouton d'export OSINTracker
  exportOsintBtn.addEventListener('click', () => {
    if (extractedData) {
      const osintData = convertToOSINTracker(extractedData);
      const filename = extractedData.siren 
        ? `osintracker-${extractedData.siren}-${Date.now()}.json`
        : `osintracker-data-${Date.now()}.json`;
      
      downloadJSON(osintData, filename);
      updateStatus('📊 Exporté au format OSINTracker!', 'success');
      setTimeout(() => {
        updateStatus('✅ Données extraites avec succès!', 'success');
      }, 2000);
    }
  });
});

