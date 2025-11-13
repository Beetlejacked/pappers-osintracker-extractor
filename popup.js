// Popup script pour l'extension Pappers
document.addEventListener('DOMContentLoaded', () => {
  const extractBtn = document.getElementById('extractBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const copyBtn = document.getElementById('copyBtn');
  const exportOsintBtn = document.getElementById('exportOsintBtn');
  const status = document.getElementById('status');
  const preview = document.getElementById('preview');
  const jsonPreview = document.getElementById('jsonPreview');
  const updateNotification = document.getElementById('updateNotification');
  const latestVersionSpan = document.getElementById('latestVersion');
  const currentVersionSpan = document.getElementById('currentVersion');
  const updateBtn = document.getElementById('updateBtn');
  const dismissUpdateBtn = document.getElementById('dismissUpdateBtn');
  const versionElement = document.getElementById('version');
  
  let extractedData = null;
  let updateInfo = null;

  // Afficher la version actuelle
  if (versionElement) {
    const manifest = chrome.runtime.getManifest();
    versionElement.textContent = `v${manifest.version}`;
  }

  // Fonction pour mettre à jour le statut
  function updateStatus(message, type = 'default') {
    status.className = `status ${type}`;
    status.querySelector('p').textContent = message;
  }

  // Fonction pour formater le JSON
  function formatJSON(data) {
    return JSON.stringify(data, null, 2);
  }

  // Fonction pour normaliser un nom de fichier (enlever caractères spéciaux, espaces, etc.)
  function sanitizeFilename(name) {
    if (!name) return '';
    return name
      .replace(/[<>:"/\\|?*]/g, '') // Enlever les caractères interdits dans les noms de fichiers
      .replace(/\s+/g, '-') // Remplacer les espaces par des tirets
      .replace(/-+/g, '-') // Remplacer les tirets multiples par un seul
      .replace(/^-+|-+$/g, '') // Enlever les tirets en début/fin
      .substring(0, 50); // Limiter la longueur
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

  // Fonction pour normaliser un nom (enlever accents, espaces, mettre en minuscule)
  function normalizeName(name) {
    if (!name) return '';
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Enlever les accents
      .replace(/\s+/g, ' ') // Normaliser les espaces
      .trim();
  }

  // Fonction pour comparer deux noms (gère les variations de format)
  function isSamePerson(name1, name2) {
    if (!name1 || !name2) return false;
    const norm1 = normalizeName(name1);
    const norm2 = normalizeName(name2);
    
    // Comparaison exacte
    if (norm1 === norm2) return true;
    
    // Extraire les parties du nom (prénom, nom, etc.)
    const parts1 = norm1.split(' ').filter(p => p.length > 0);
    const parts2 = norm2.split(' ').filter(p => p.length > 0);
    
    // Si les deux noms ont le même nombre de parties
    if (parts1.length === parts2.length && parts1.length >= 2) {
      // Comparaison avec inversion prénom/nom (ex: "Rivat Philippe" vs "Philippe Rivat")
      if (parts1.length === 2) {
        if ((parts1[0] === parts2[1] && parts1[1] === parts2[0]) ||
            (parts1[0] === parts2[0] && parts1[1] === parts2[1])) {
          return true;
        }
      }
      
      // Pour les noms avec plusieurs parties, vérifier si toutes les parties sont présentes
      // (peut gérer les cas avec prénom composé ou nom composé)
      const allPartsMatch = parts1.every(p => parts2.includes(p)) && 
                           parts2.every(p => parts1.includes(p));
      if (allPartsMatch && parts1.length === parts2.length) {
        return true;
      }
    }
    
    // Comparaison partielle : si un nom contient toutes les parties de l'autre
    // (ex: "Philippe Rivat" vs "Rivat Philippe" ou "Philippe Jean Rivat")
    if (parts1.length >= 2 && parts2.length >= 2) {
      // Vérifier si les deux premiers mots (prénom) ou les deux derniers (nom) correspondent
      const firstParts1 = parts1.slice(0, 2).sort().join(' ');
      const firstParts2 = parts2.slice(0, 2).sort().join(' ');
      const lastParts1 = parts1.slice(-2).sort().join(' ');
      const lastParts2 = parts2.slice(-2).sort().join(' ');
      
      if (firstParts1 === firstParts2 || lastParts1 === lastParts2) {
        // Vérifier que les autres parties correspondent aussi
        const remaining1 = parts1.filter(p => !parts2.slice(0, 2).includes(p) && !parts2.slice(-2).includes(p));
        const remaining2 = parts2.filter(p => !parts1.slice(0, 2).includes(p) && !parts1.slice(-2).includes(p));
        if (remaining1.length === 0 && remaining2.length === 0) {
          return true;
        }
      }
    }
    
    return false;
  }

  // Fonction pour convertir les données Pappers au format OSINTracker
  function convertToOSINTracker(pappersData) {
    const entities = [];
    const relations = [];
    const entityMap = new Map(); // Pour stocker les IDs des entités créées
    const personneMap = new Map(); // Pour stocker les personnes déjà créées (clé: nom normalisé, valeur: UUID)
    const entrepriseMap = new Map(); // Pour stocker les entreprises déjà créées (clé: SIREN, valeur: UUID)
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
      entrepriseMap.set(pappersData.siren, entrepriseMainId); // Enregistrer le SIREN pour éviter les doublons
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
          const nomNormalise = normalizeName(dirigeant.nom_complet);
          
          // Vérifier si cette personne existe déjà
          let dirigeantId = personneMap.get(nomNormalise);
          let isNewPerson = false;
          
          if (!dirigeantId) {
            // Créer une nouvelle entité
            dirigeantId = generateUUID();
            personneMap.set(nomNormalise, dirigeantId);
            isNewPerson = true;
            
            let comments = '';
            if (dirigeant.fonction) comments += `Fonction: ${dirigeant.fonction}\n`;
            if (dirigeant.date_debut) comments += `Depuis: ${dirigeant.date_debut}\n`;
            if (dirigeant.date_fin) comments += `Jusqu'à: ${dirigeant.date_fin}\n`;
            if (dirigeant.ancien) comments += 'Ancien dirigeant\n';
            if (dirigeant.age) comments += `Âge: ${dirigeant.age} ans\n`;
            if (dirigeant.date_naissance) comments += `Naissance: ${dirigeant.date_naissance}\n`;

            entities.push({
              id: dirigeantId,
              value: dirigeant.nom_complet,
              typeId: TYPE_IDS.PERSONNE,
              creationDate: now,
              critical: false,
              comments: comments.trim() || undefined,
              url: dirigeant.url || undefined
            });
          } else {
            // Personne existe déjà, mettre à jour les commentaires si nécessaire
            const existingEntity = entities.find(e => e.id === dirigeantId);
            if (existingEntity) {
              let existingComments = existingEntity.comments || '';
              if (dirigeant.fonction && !existingComments.includes('Fonction:')) {
                existingComments += `\nFonction: ${dirigeant.fonction}`;
              }
              if (dirigeant.date_debut && !existingComments.includes('Depuis:')) {
                existingComments += `\nDepuis: ${dirigeant.date_debut}`;
              }
              if (existingComments.trim()) {
                existingEntity.comments = existingComments.trim();
              }
            }
          }

          // Créer la relation entreprise -> dirigeant (même si la personne existe déjà)
          if (entityMap.has('entreprise')) {
            // Vérifier si la relation n'existe pas déjà
            const relationExists = relations.some(r => 
              r.originId === entityMap.get('entreprise') && 
              r.targetId === dirigeantId &&
              (r.label === (dirigeant.fonction || 'Dirigeant'))
            );
            
            if (!relationExists) {
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
        }
      });
    }

    // 3. Créer les entités pour les actionnaires
    if (pappersData.actionnaires && !pappersData.actionnaires.disponible && Array.isArray(pappersData.actionnaires)) {
      pappersData.actionnaires.forEach(actionnaire => {
        if (actionnaire.nom_complet) {
          const nomNormalise = normalizeName(actionnaire.nom_complet);
          
          // Vérifier si cette personne existe déjà
          let actionnaireId = personneMap.get(nomNormalise);
          
          if (!actionnaireId) {
            // Vérifier aussi avec les variations de format
            for (const [existingNormName, existingId] of personneMap.entries()) {
              if (isSamePerson(actionnaire.nom_complet, existingNormName)) {
                actionnaireId = existingId;
                break;
              }
            }
          }
          
          if (!actionnaireId) {
            // Créer une nouvelle entité
            actionnaireId = generateUUID();
            personneMap.set(nomNormalise, actionnaireId);
            
            entities.push({
              id: actionnaireId,
              value: actionnaire.nom_complet,
              typeId: TYPE_IDS.PERSONNE,
              creationDate: now,
              critical: false,
              comments: actionnaire.pourcentage ? `Part: ${actionnaire.pourcentage}` : undefined
            });
          } else {
            // Personne existe déjà, mettre à jour les commentaires
            const existingEntity = entities.find(e => e.id === actionnaireId);
            if (existingEntity) {
              let existingComments = existingEntity.comments || '';
              if (actionnaire.pourcentage && !existingComments.includes('Part:')) {
                existingComments += `\nPart: ${actionnaire.pourcentage}`;
              }
              if (existingComments.trim()) {
                existingEntity.comments = existingComments.trim();
              }
            }
          }

          // Créer la relation entreprise -> actionnaire (même si la personne existe déjà)
          if (entityMap.has('entreprise')) {
            // Vérifier si la relation n'existe pas déjà
            const relationExists = relations.some(r => 
              r.originId === entityMap.get('entreprise') && 
              r.targetId === actionnaireId &&
              r.label === 'Actionnaire'
            );
            
            if (!relationExists) {
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
      if (pappersData.cartographie.entreprises && Array.isArray(pappersData.cartographie.entreprises)) {
        pappersData.cartographie.entreprises.forEach(entreprise => {
          if (entreprise.nom_entreprise && entreprise.siren && entreprise.id) {
            // Vérifier si cette entreprise existe déjà (même SIREN que l'entreprise principale)
            const existingEntId = entrepriseMap.get(entreprise.siren);
            
            if (existingEntId) {
              // L'entreprise existe déjà, utiliser son ID au lieu d'en créer une nouvelle
              cartoEntMap.set(entreprise.id, existingEntId);
              
              // Si c'est l'entreprise principale, noter son ID cartographie
              if (existingEntId === entrepriseMainId) {
                entrepriseCartoId = entreprise.id;
              }
              
              // Mettre à jour les commentaires de l'entreprise existante
              const existingEntity = entities.find(e => e.id === existingEntId);
              if (existingEntity && !existingEntity.comments?.includes('Cartographie')) {
                const existingComments = existingEntity.comments || '';
                existingEntity.comments = existingComments + '\nSource: Cartographie Pappers';
              }
            } else {
              // Créer une nouvelle entité entreprise
              const cartoEntId = generateUUID();
              cartoEntMap.set(entreprise.id, cartoEntId);
              entrepriseMap.set(entreprise.siren, cartoEntId); // Enregistrer pour éviter les doublons futurs
              
              entities.push({
                id: cartoEntId,
                value: `${entreprise.nom_entreprise} (${entreprise.siren})`,
                typeId: TYPE_IDS.ENTREPRISE,
                creationDate: now,
                critical: false,
                comments: `SIREN: ${entreprise.siren}\nSource: Cartographie Pappers`
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
            const nomComplet = `${personne.prenom} ${personne.nom}`;
            const nomNormalise = normalizeName(nomComplet);
            
            // Vérifier si cette personne existe déjà (dirigeant, actionnaire, etc.)
            let cartoPersId = personneMap.get(nomNormalise);
            let isNewPerson = false;
            
            if (!cartoPersId) {
              // Vérifier aussi avec les variations de format (prénom nom vs nom prénom)
              for (const [existingNormName, existingId] of personneMap.entries()) {
                if (isSamePerson(nomComplet, existingNormName)) {
                  cartoPersId = existingId;
                  break;
                }
              }
            }
            
            if (!cartoPersId) {
              // Créer une nouvelle entité
              cartoPersId = generateUUID();
              personneMap.set(nomNormalise, cartoPersId);
              isNewPerson = true;
              
              let comments = '';
              if (personne.niveau) comments += `Niveau: ${personne.niveau}\n`;
              if (personne.date_naissance) comments += `Naissance: ${personne.date_naissance}\n`;
              comments += 'Source: Cartographie Pappers';

              entities.push({
                id: cartoPersId,
                value: nomComplet,
                typeId: TYPE_IDS.PERSONNE,
                creationDate: now,
                critical: false,
                comments: comments.trim() || undefined
              });
            } else {
              // Personne existe déjà, mettre à jour les commentaires et le nom si nécessaire
              const existingEntity = entities.find(e => e.id === cartoPersId);
              if (existingEntity) {
                // Utiliser le format le plus complet pour le nom (prénom + nom)
                if (nomComplet.includes(' ') && !existingEntity.value.includes(' ')) {
                  existingEntity.value = nomComplet;
                }
                
                let existingComments = existingEntity.comments || '';
                if (personne.niveau && !existingComments.includes('Niveau:')) {
                  existingComments += `\nNiveau: ${personne.niveau}`;
                }
                if (personne.date_naissance && !existingComments.includes('Naissance:')) {
                  existingComments += `\nNaissance: ${personne.date_naissance}`;
                }
                if (!existingComments.includes('Cartographie')) {
                  existingComments += '\nSource: Cartographie Pappers';
                }
                if (existingComments.trim()) {
                  existingEntity.comments = existingComments.trim();
                }
              }
            }
            
            cartoPersMap.set(personne.id, cartoPersId);
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
      
      // Construire le nom de fichier avec le nom de la société
      let filename = '';
      if (extractedData.nom) {
        const nomNormalise = sanitizeFilename(extractedData.nom);
        if (nomNormalise) {
          filename = `${nomNormalise}-osintracker`;
        } else {
          filename = 'osintracker';
        }
      } else {
        filename = 'osintracker';
      }
      
      // Ajouter le SIREN si disponible
      if (extractedData.siren) {
        filename += `-${extractedData.siren}`;
      }
      
      // Ajouter le timestamp
      filename += `-${Date.now()}.json`;
      
      downloadJSON(osintData, filename);
      updateStatus('📊 Exporté au format OSINTracker!', 'success');
      setTimeout(() => {
        updateStatus('✅ Données extraites avec succès!', 'success');
      }, 2000);
    }
  });

  // Lien vers les paramètres
  const optionsLink = document.getElementById('optionsLink');
  if (optionsLink) {
    optionsLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
  }

  // Fonction pour vérifier les mises à jour
  async function checkForUpdates() {
    try {
      // Récupérer les informations de mise à jour stockées
      const storedInfo = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'GET_UPDATE_INFO' }, (response) => {
          resolve(response);
        });
      });

      if (storedInfo && storedInfo.hasUpdate) {
        showUpdateNotification(storedInfo);
        updateInfo = storedInfo;
      } else {
        // Vérifier manuellement si pas de données stockées
        const result = await new Promise((resolve) => {
          chrome.runtime.sendMessage({ type: 'CHECK_UPDATE' }, (response) => {
            resolve(response);
          });
        });

        if (result && result.hasUpdate) {
          showUpdateNotification(result);
          updateInfo = result;
        }
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des mises à jour:', error);
    }
  }

  // Fonction pour afficher la notification de mise à jour
  function showUpdateNotification(info) {
    if (!updateNotification || !latestVersionSpan || !currentVersionSpan) {
      return;
    }

    latestVersionSpan.textContent = info.latestVersion;
    currentVersionSpan.textContent = info.currentVersion;
    updateNotification.style.display = 'block';
  }

  // Fonction pour masquer la notification
  function hideUpdateNotification() {
    if (updateNotification) {
      updateNotification.style.display = 'none';
    }
  }

  // Gestionnaire pour le bouton de téléchargement
  if (updateBtn) {
    updateBtn.addEventListener('click', () => {
      if (updateInfo && updateInfo.downloadUrl) {
        chrome.tabs.create({ url: updateInfo.downloadUrl });
        hideUpdateNotification();
        updateStatus('📥 Redirection vers GitHub...', 'success');
      } else {
        // Fallback vers le repository GitHub
        chrome.tabs.create({ url: 'https://github.com/Beetlejacked/pappers-osintracker-extractor' });
        hideUpdateNotification();
      }
    });
  }

  // Gestionnaire pour le bouton "Plus tard"
  if (dismissUpdateBtn) {
    dismissUpdateBtn.addEventListener('click', () => {
      hideUpdateNotification();
      // Masquer la notification pendant 24 heures
      chrome.storage.local.set({
        updateDismissed: {
          timestamp: new Date().toISOString(),
          version: updateInfo?.latestVersion
        }
      });
    });
  }

  // Vérifier les mises à jour au chargement du popup
  // Mais seulement si la notification n'a pas été masquée récemment
  chrome.storage.local.get(['updateDismissed'], async (result) => {
    const dismissed = result.updateDismissed;
    
    // Vérifier d'abord les mises à jour pour obtenir la version actuelle
    const updateResult = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_UPDATE_INFO' }, (response) => {
        resolve(response);
      });
    });
    
    const shouldCheck = !dismissed || 
                       !updateResult ||
                       (dismissed.version !== updateResult.latestVersion) ||
                       (new Date() - new Date(dismissed.timestamp) > 24 * 60 * 60 * 1000);
    
    if (shouldCheck) {
      checkForUpdates();
    } else if (updateResult && updateResult.hasUpdate) {
      // Afficher la notification si une mise à jour est disponible et n'a pas été masquée pour cette version
      showUpdateNotification(updateResult);
      updateInfo = updateResult;
    }
  });
});

