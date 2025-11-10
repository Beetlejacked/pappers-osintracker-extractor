// Content script pour extraire les données de Pappers
(function() {
  'use strict';

  // Intercepter IMMÉDIATEMENT, avant même que le DOM soit prêt
  // Fonction pour intercepter les appels API
  const originalFetch = window.fetch;
  const apiCalls = [];

  // Stocker spécifiquement les données de cartographie
  let cartographieData = null;
  
  // Stocker le token API si on le trouve dans un appel intercepté
  let apiToken = null;
  
  // Marquer que le content script est chargé
  window.pappersExtractorLoaded = true;
  
  // Attendre que le DOM soit prêt pour les logs
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('🔧 Content script Pappers Extractor chargé');
      console.log('🔍 Interception des appels API activée');
    });
  } else {
    console.log('🔧 Content script Pappers Extractor chargé');
    console.log('🔍 Interception des appels API activée');
  }

  window.fetch = function(...args) {
    const url = args[0];
    const urlString = typeof url === 'string' ? url : (url instanceof Request ? url.url : String(url));
    
    // Vérifier spécifiquement l'URL de cartographie
    // Détecter aussi les URLs avec les paramètres complets
    const isCartographieAPI = urlString.includes('/v2/entreprise/cartographie') || 
                               urlString.includes('api.pappers.fr/v2/entreprise/cartographie') ||
                               (urlString.includes('cartographie') && urlString.includes('siren='));
    
    // Intercepter les appels API de cartographie et autres API
    if (typeof urlString === 'string' && (
      urlString.includes('api') || 
      isCartographieAPI ||
      urlString.includes('geocod') ||
      urlString.includes('map') ||
      urlString.includes('coordinate') ||
      urlString.includes('geoloc') ||
      urlString.includes('location')
    )) {
      console.log('🔍 Appel API détecté:', urlString);
      return originalFetch.apply(this, args)
        .then(response => {
          const clonedResponse = response.clone();
          clonedResponse.json().then(data => {
            const apiCall = {
              url: urlString,
              data: data,
              timestamp: new Date().toISOString(),
              method: args[1]?.method || 'GET'
            };
            apiCalls.push(apiCall);
            
            // Extraire le token API si présent dans l'URL
            const tokenMatch = urlString.match(/api_token=([^&]+)/);
            if (tokenMatch && !apiToken) {
              apiToken = tokenMatch[1];
              console.log('🔑 Token API extrait depuis l\'appel intercepté');
            }
            
            // Si c'est un appel de cartographie (URL spécifique ou données de cartographie), le stocker séparément
            // Vérifier la structure des données : entreprises, personnes, liens_entreprises_personnes
            const isCartographieStructure = data.entreprises && Array.isArray(data.entreprises) &&
                                           (data.personnes && Array.isArray(data.personnes) || 
                                            data.liens_entreprises_personnes && Array.isArray(data.liens_entreprises_personnes));
            
            if (isCartographieAPI || 
                urlString.includes('cartographie') || 
                urlString.includes('geocod') || 
                urlString.includes('map') || 
                isCartographieStructure ||
                (data.latitude && data.longitude) || 
                (data.lat && data.lng) ||
                (data.coordinates && Array.isArray(data.coordinates)) ||
                (data.etablissements && Array.isArray(data.etablissements)) ||
                (data.resultats && Array.isArray(data.resultats)) ||
                (data.etablissement && typeof data.etablissement === 'object')) {
              cartographieData = {
                url: urlString,
                data: data, // Stocker les données telles quelles, sans transformation
                timestamp: new Date().toISOString(),
                method: apiCall.method
              };
              console.log('✅ Données de cartographie interceptées depuis:', urlString);
              console.log('Structure détectée:', {
                hasEntreprises: Array.isArray(data.entreprises),
                hasPersonnes: Array.isArray(data.personnes),
                hasLiens: Array.isArray(data.liens_entreprises_personnes),
                nbEntreprises: data.entreprises?.length || 0,
                nbPersonnes: data.personnes?.length || 0
              });
              console.log('Données complètes (premiers 500 caractères):', JSON.stringify(cartographieData, null, 2).substring(0, 500));
            }
            
            // Envoyer les données au background script
            chrome.runtime.sendMessage({
              type: 'API_CALL',
              url: urlString,
              data: data,
              method: apiCall.method
            });
          }).catch(() => {
            // Si ce n'est pas du JSON, essayer de récupérer le texte
            clonedResponse.text().then(text => {
              if (text) {
                const apiCall = {
                  url: urlString,
                  data: text,
                  timestamp: new Date().toISOString(),
                  method: args[1]?.method || 'GET',
                  format: 'text'
                };
                apiCalls.push(apiCall);
                
                // Si c'est une URL de cartographie, essayer de parser le texte comme JSON
                if (isCartographieAPI || urlString.includes('cartographie')) {
                  try {
                    const parsedData = JSON.parse(text);
                    cartographieData = {
                      url: urlString,
                      data: parsedData,
                      timestamp: new Date().toISOString(),
                      method: apiCall.method
                    };
                    console.log('✅ Données de cartographie interceptées (format texte):', cartographieData);
                  } catch (e) {
                    console.log('Impossible de parser les données de cartographie comme JSON');
                  }
                }
                
                chrome.runtime.sendMessage({
                  type: 'API_CALL',
                  url: urlString,
                  data: text,
                  method: apiCall.method,
                  format: 'text'
                });
              }
            }).catch(() => {});
          });
          return response;
        });
    }
    
    return originalFetch.apply(this, args);
  };

  // Intercepter aussi XMLHttpRequest pour les anciennes méthodes
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._method = method;
    this._url = url;
    return originalXHROpen.apply(this, [method, url, ...rest]);
  };
  
  XMLHttpRequest.prototype.send = function(...args) {
    const urlString = this._url;
    const isCartographieAPI = urlString && (
      urlString.includes('/v2/entreprise/cartographie') || 
      urlString.includes('api.pappers.fr/v2/entreprise/cartographie') ||
      urlString.includes('cartographie')
    );
    
    if (urlString && (
      urlString.includes('api') || 
      isCartographieAPI ||
      urlString.includes('geocod') ||
      urlString.includes('map') ||
      urlString.includes('coordinate') ||
      urlString.includes('geoloc') ||
      urlString.includes('location')
    )) {
      this.addEventListener('load', function() {
        try {
          const data = JSON.parse(this.responseText);
          const apiCall = {
            url: urlString,
            data: data,
            timestamp: new Date().toISOString(),
            method: this._method || 'GET',
            type: 'XHR'
          };
          apiCalls.push(apiCall);
          
          // Si c'est un appel de cartographie, le stocker séparément
          // Vérifier la structure des données : entreprises, personnes, liens_entreprises_personnes
          const isCartographieStructure = data.entreprises && Array.isArray(data.entreprises) &&
                                         (data.personnes && Array.isArray(data.personnes) || 
                                          data.liens_entreprises_personnes && Array.isArray(data.liens_entreprises_personnes));
          
          if (isCartographieAPI || 
              urlString.includes('cartographie') || 
              urlString.includes('geocod') || 
              urlString.includes('map') ||
              isCartographieStructure ||
              (data.latitude && data.longitude) || 
              (data.lat && data.lng) ||
              (data.coordinates && Array.isArray(data.coordinates)) ||
              (data.etablissements && Array.isArray(data.etablissements)) ||
              (data.resultats && Array.isArray(data.resultats)) ||
              (data.etablissement && typeof data.etablissement === 'object')) {
            cartographieData = {
              url: urlString,
              data: data, // Stocker les données telles quelles, sans transformation
              timestamp: new Date().toISOString(),
              method: this._method || 'GET'
            };
            console.log('✅ Données de cartographie interceptées (XHR) depuis:', urlString);
            console.log('Structure détectée:', {
              hasEntreprises: Array.isArray(data.entreprises),
              hasPersonnes: Array.isArray(data.personnes),
              hasLiens: Array.isArray(data.liens_entreprises_personnes)
            });
            console.log('Données complètes:', JSON.stringify(cartographieData, null, 2));
          }
          
          chrome.runtime.sendMessage({
            type: 'API_CALL',
            url: urlString,
            data: data,
            method: this._method || 'GET'
          });
        } catch (e) {
          // Pas du JSON
          console.log('Erreur parsing XHR response:', e);
        }
      });
    }
    return originalXHRSend.apply(this, args);
  };

  // Fonction pour extraire les données de la page
  function extractPageData() {
    const data = {
      url: window.location.href,
      siren: null,
      nom: null,
      activite: null,
      informations_juridiques: {},
      etablissements: [],
      dirigeants: [],
      actionnaires: [],
      documents_juridiques: [],
      annonces_bodacc: [],
      cartographie: null,
      biens_immobiliers: [],
      extractedAt: new Date().toISOString()
    };

    // Extraire le SIREN depuis l'URL
    // Format: /entreprise/nom-entreprise-123456789 ou /entreprise/nom-avec-plusieurs-tirets-123456789
    const urlMatch = window.location.href.match(/entreprise\/[^/]+-(\d{9})/);
    if (urlMatch) {
      data.siren = urlMatch[1];
    } else {
      // Essayer un autre format si le premier ne fonctionne pas
      const urlMatch2 = window.location.href.match(/-(\d{9})(?:\?|$)/);
      if (urlMatch2) {
        data.siren = urlMatch2[1];
      }
    }

    // Extraire le nom de l'entreprise
    const nomElement = document.querySelector('h1, .nom-entreprise, [data-testid="nom-entreprise"], [class*="nom-entreprise"]');
    if (nomElement) {
      data.nom = nomElement.textContent.trim();
    }

    // Fonction helper pour trouver une section par son titre
    function findSectionByTitle(titleText) {
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      for (const heading of headings) {
        const headingText = heading.textContent.trim().toLowerCase();
        const searchText = titleText.toLowerCase();
        
        // Recherche plus flexible
        if (headingText.includes(searchText) || searchText.includes(headingText.split(' ')[0])) {
          // Chercher la section parente
          let parent = heading.parentElement;
          let depth = 0;
          while (parent && depth < 10) {
            if (parent.tagName === 'SECTION' || 
                parent.classList.contains('section') ||
                parent.getAttribute('class')?.includes('section')) {
              return parent;
            }
            parent = parent.parentElement;
          }
          // Si pas de section trouvée, retourner le parent le plus proche
          return heading.closest('section') || 
                 heading.closest('div[class*="section"]') ||
                 heading.parentElement?.parentElement || 
                 heading.parentElement;
        }
      }
      return null;
    }
    
    // Fonction de debug pour voir ce qui est trouvé
    function debugSection(title) {
      const section = findSectionByTitle(title);
      if (section) {
        console.log(`Section "${title}" trouvée:`, section);
        console.log('Contenu:', section.textContent.substring(0, 200));
      } else {
        console.log(`Section "${title}" NON trouvée`);
        // Lister tous les h2 pour debug
        const allH2 = Array.from(document.querySelectorAll('h2')).map(h => h.textContent.trim());
        console.log('Tous les h2 disponibles:', allH2);
      }
      return section;
    }

    // 1. Extraire l'ACTIVITÉ
    let activiteSection = findSectionByTitle('Activité');
    if (!activiteSection) {
      activiteSection = findSectionByTitle('Activité de');
    }
    if (!activiteSection) {
      // Méthode alternative : chercher directement les h2 contenant "Activité"
      const h2Activite = Array.from(document.querySelectorAll('h2')).find(h => 
        h.textContent.toLowerCase().includes('activité')
      );
      if (h2Activite) {
        activiteSection = h2Activite.closest('section') || h2Activite.parentElement?.parentElement || h2Activite.parentElement;
      }
    }
    
    if (activiteSection) {
      console.log('Section Activité trouvée');
      // Chercher dans les tableaux de la section
      const tables = activiteSection.querySelectorAll('table');
      if (tables.length > 0) {
        tables.forEach(table => {
          const rows = table.querySelectorAll('tbody tr, tr');
          rows.forEach(row => {
            const cells = row.querySelectorAll('td, th');
            if (cells.length >= 2) {
              const label = cells[0].textContent.trim().toLowerCase();
              const value = cells[1].textContent.trim();
              
              if (label.includes('activité principale') || label.includes('activité déclarée')) {
                if (!data.activite || typeof data.activite !== 'object') data.activite = {};
                data.activite.description = value;
              } else if (label.includes('code naf') || label.includes('code ape') || label.includes('naf')) {
                if (!data.activite || typeof data.activite !== 'object') data.activite = {};
                data.activite.code = value;
              } else if (label.includes('domaine')) {
                if (!data.activite || typeof data.activite !== 'object') data.activite = {};
                data.activite.domaine = value;
              }
            }
          });
        });
      }
      
      // Si pas de structure trouvée, extraire depuis le texte
      if (!data.activite || (typeof data.activite === 'object' && Object.keys(data.activite).length === 0)) {
        const fullText = activiteSection.textContent;
        
        // Extraire activité principale
        const activiteMatch = fullText.match(/Activité principale déclarée\s*:\s*(.+?)(?:\n|Code|$)/i);
        if (activiteMatch) {
          if (!data.activite || typeof data.activite !== 'object') data.activite = {};
          data.activite.description = activiteMatch[1].trim();
        }
        
        // Extraire code NAF/APE
        const codeMatch = fullText.match(/Code NAF ou APE\s*:\s*(.+?)(?:\s*\(|Domaine|$)/i);
        if (codeMatch) {
          if (!data.activite || typeof data.activite !== 'object') data.activite = {};
          data.activite.code = codeMatch[1].trim();
        }
        
        // Extraire domaine
        const domaineMatch = fullText.match(/Domaine d'activité\s*:\s*(.+?)(?:\n|$)/i);
        if (domaineMatch) {
          if (!data.activite || typeof data.activite !== 'object') data.activite = {};
          data.activite.domaine = domaineMatch[1].trim();
        }
        
        // Si toujours rien, prendre le texte complet
        if (!data.activite || (typeof data.activite === 'object' && Object.keys(data.activite).length === 0)) {
          const activiteText = activiteSection.textContent.trim();
          if (activiteText && activiteText.length > 10) {
            data.activite = activiteText;
          }
        }
      }
    } else {
      console.log('Section Activité NON trouvée');
    }

    // 2. Extraire les INFORMATIONS JURIDIQUES
    let juridiqueSection = findSectionByTitle('Informations juridiques');
    if (!juridiqueSection) {
      juridiqueSection = findSectionByTitle('Informations juridiques de');
    }
    if (!juridiqueSection) {
      const h2Juridique = Array.from(document.querySelectorAll('h2')).find(h => 
        h.textContent.toLowerCase().includes('informations juridiques')
      );
      if (h2Juridique) {
        juridiqueSection = h2Juridique.closest('section') || h2Juridique.parentElement?.parentElement || h2Juridique.parentElement;
      }
    }
    
    if (juridiqueSection) {
      console.log('Section Informations juridiques trouvée');
      // Extraire depuis les tableaux
      const tables = juridiqueSection.querySelectorAll('table');
      if (tables.length > 0) {
        tables.forEach(table => {
          const rows = table.querySelectorAll('tbody tr, tr');
          rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 2) {
              const label = cells[0].textContent.trim();
              const value = cells[1].textContent.trim();
              
              if (label && value) {
                const key = label.toLowerCase()
                  .replace(/\s+/g, '_')
                  .replace(/[^a-z0-9_]/g, '')
                  .replace(/^_+|_+$/g, '');
                
                if (key) {
                  data.informations_juridiques[key] = value;
                }
              }
            }
          });
        });
      }
      
      // Extraire depuis le texte complet de la section
      const fullText = juridiqueSection.textContent;
      
      // SIREN
      const sirenMatch = fullText.match(/SIREN\s*:\s*([\d\s]+)/i);
      if (sirenMatch && !data.informations_juridiques.siren) {
        data.informations_juridiques.siren = sirenMatch[1].replace(/\s+/g, '');
      }
      
      // SIRET
      const siretMatch = fullText.match(/SIRET[^:]*:\s*([\d\s]+)/i);
      if (siretMatch && !data.informations_juridiques.siret) {
        data.informations_juridiques.siret = siretMatch[1].replace(/\s+/g, '');
      }
      
      // Forme juridique
      const formeMatch = fullText.match(/Forme juridique\s*:\s*(.+?)(?:\n|Numéro|Inscription|$)/i);
      if (formeMatch && !data.informations_juridiques.forme_juridique) {
        data.informations_juridiques.forme_juridique = formeMatch[1].trim();
      }
      
      // Numéro de TVA
      const tvaMatch = fullText.match(/Numéro de TVA\s*:\s*(.+?)(?:\n|Inscription|$)/i);
      if (tvaMatch && !data.informations_juridiques.numero_tva) {
        data.informations_juridiques.numero_tva = tvaMatch[1].trim();
      }
      
      // Inscription au RCS
      const rcsMatch = fullText.match(/Inscription au RCS\s*:\s*(.+?)(?:\n|$)/i);
      if (rcsMatch && !data.informations_juridiques.inscription_rcs) {
        data.informations_juridiques.inscription_rcs = rcsMatch[1].trim();
      }
    } else {
      console.log('Section Informations juridiques NON trouvée');
    }

    // 3. Extraire la LISTE DES ÉTABLISSEMENTS
    let etablissementsSection = findSectionByTitle('Etablissements');
    if (!etablissementsSection) {
      etablissementsSection = findSectionByTitle('Etablissements de');
    }
    if (!etablissementsSection) {
      etablissementsSection = findSectionByTitle('Établissements');
    }
    if (!etablissementsSection) {
      const h2Etablissements = Array.from(document.querySelectorAll('h2')).find(h => 
        h.textContent.toLowerCase().includes('etablissements') || h.textContent.toLowerCase().includes('établissements')
      );
      if (h2Etablissements) {
        etablissementsSection = h2Etablissements.closest('section') || h2Etablissements.parentElement?.parentElement || h2Etablissements.parentElement;
      }
    }
    
    if (etablissementsSection) {
      console.log('Section Établissements trouvée');
      // Les établissements sont dans des <ul><li>
      const etablissementItems = etablissementsSection.querySelectorAll('ul li');
      console.log('Nombre d\'établissements trouvés:', etablissementItems.length);
      etablissementItems.forEach((item) => {
        const etablissement = {
          nom: null,
          siret: null,
          adresse: null,
          code_postal: null,
          ville: null,
          statut: null,
          date_creation: null
        };
        
        const fullText = item.textContent;
        
        // Extraire le SIRET (format: 800 332 686 00016)
        const siretMatch = fullText.match(/(\d{3}\s+\d{3}\s+\d{3}\s+\d{5})/);
        if (siretMatch) {
          etablissement.siret = siretMatch[1].replace(/\s+/g, '');
        }
        
        // Extraire le statut (En activité, Fermé, etc.)
        if (fullText.includes('En activité')) {
          etablissement.statut = 'En activité';
        } else if (fullText.includes('Fermé')) {
          etablissement.statut = 'Fermé';
        }
        
        // Extraire le type (Siège, établissement principal, etc.)
        if (fullText.includes('Siège')) {
          etablissement.nom = 'Siège et établissement principal';
        }
        
        // Extraire l'adresse
        const adresseMatch = fullText.match(/Adresse\s*:\s*(.+?)(?:\n|Date|$)/i);
        if (adresseMatch) {
          const adresseFull = adresseMatch[1].trim();
          etablissement.adresse = adresseFull;
          
          // Extraire code postal et ville
          const cpVilleMatch = adresseFull.match(/(\d{5})\s+(.+)$/);
          if (cpVilleMatch) {
            etablissement.code_postal = cpVilleMatch[1];
            etablissement.ville = cpVilleMatch[2].trim();
          }
        }
        
        // Extraire la date de création
        const dateMatch = fullText.match(/Date de création\s*:\s*(\d{2}\/\d{2}\/\d{4})/i);
        if (dateMatch) {
          etablissement.date_creation = dateMatch[1];
        }
        
        if (etablissement.siret || etablissement.nom || etablissement.adresse) {
          data.etablissements.push(etablissement);
        }
      });
    }

    // 4. Extraire les DIRIGEANTS
    let dirigeantsSection = findSectionByTitle('Dirigeants');
    if (!dirigeantsSection) {
      dirigeantsSection = findSectionByTitle('Dirigeants et représentants');
    }
    if (!dirigeantsSection) {
      dirigeantsSection = findSectionByTitle('Dirigeants de');
    }
    if (!dirigeantsSection) {
      const h2Dirigeants = Array.from(document.querySelectorAll('h2')).find(h => 
        h.textContent.toLowerCase().includes('dirigeants')
      );
      if (h2Dirigeants) {
        dirigeantsSection = h2Dirigeants.closest('section') || h2Dirigeants.parentElement?.parentElement || h2Dirigeants.parentElement;
      }
    }
    
    if (dirigeantsSection) {
      console.log('Section Dirigeants trouvée');
      // Les dirigeants sont dans des <ul><li>
      const dirigeantItems = dirigeantsSection.querySelectorAll('ul li');
      console.log('Nombre de dirigeants trouvés:', dirigeantItems.length);
      dirigeantItems.forEach((item) => {
        const dirigeant = {
          nom: null,
          prenom: null,
          nom_complet: null,
          fonction: null,
          age: null,
          date_naissance: null,
          date_debut: null,
          date_fin: null,
          ancien: false
        };
        
        const fullText = item.textContent;
        
        // Extraire le nom complet depuis le lien <a>
        const nomLink = item.querySelector('a');
        if (nomLink) {
          dirigeant.nom_complet = nomLink.textContent.trim();
          const parts = dirigeant.nom_complet.split(/\s+/);
          if (parts.length >= 2) {
            dirigeant.prenom = parts[0];
            dirigeant.nom = parts.slice(1).join(' ');
          } else {
            dirigeant.nom = dirigeant.nom_complet;
          }
        }
        
        // Extraire la fonction
        const fonctionMatch = fullText.match(/(Gérant|Président|Directeur|Associé[^,]*)/i);
        if (fonctionMatch) {
          dirigeant.fonction = fonctionMatch[1].trim();
        }
        
        // Extraire l'âge et date de naissance (format: "45 ans - 06/1980")
        const ageMatch = fullText.match(/(\d+)\s+ans\s+-\s+(\d{2}\/\d{4})/);
        if (ageMatch) {
          dirigeant.age = parseInt(ageMatch[1]);
          dirigeant.date_naissance = ageMatch[2];
        }
        
        // Extraire les dates de mandat
        if (fullText.includes('Depuis le')) {
          const depuisMatch = fullText.match(/Depuis le\s+(\d{2}\/\d{2}\/\d{4})/);
          if (depuisMatch) {
            dirigeant.date_debut = depuisMatch[1];
          }
        } else if (fullText.includes('Du')) {
          const duMatch = fullText.match(/Du\s+(\d{2}\/\d{2}\/\d{4})\s+au\s+(\d{2}\/\d{2}\/\d{4})/);
          if (duMatch) {
            dirigeant.date_debut = duMatch[1];
            dirigeant.date_fin = duMatch[2];
            dirigeant.ancien = true;
          }
        }
        
        // Vérifier si c'est un ancien dirigeant
        if (fullText.includes('Ancien') || fullText.includes('ancien')) {
          dirigeant.ancien = true;
        }
        
        if (dirigeant.nom || dirigeant.nom_complet) {
          data.dirigeants.push(dirigeant);
        }
      });
    }

    // 5. Extraire les ACTIONNAIRES
    let actionnairesSection = findSectionByTitle('Actionnaires');
    if (!actionnairesSection) {
      actionnairesSection = findSectionByTitle('Actionnaires et bénéficiaires');
    }
    if (!actionnairesSection) {
      actionnairesSection = findSectionByTitle('bénéficiaires effectifs');
    }
    if (actionnairesSection) {
      console.log('Section Actionnaires trouvée');
      // Note: Les données d'actionnaires peuvent être protégées
      const message = actionnairesSection.textContent.trim();
      if (message.includes('réservé') || message.includes('habilitation')) {
        data.actionnaires = {
          note: message,
          disponible: false
        };
      } else {
        // Si les données sont disponibles, les extraire
        const actionnaireItems = actionnairesSection.querySelectorAll('tr, ul li, .item');
        actionnaireItems.forEach((item) => {
          const actionnaire = {
            nom: null,
            pourcentage: null,
            montant: null,
            type: null
          };
          
          const fullText = item.textContent;
          
          // Extraire le nom
          const nomLink = item.querySelector('a');
          if (nomLink) {
            actionnaire.nom = nomLink.textContent.trim();
          }
          
          // Extraire le pourcentage
          const pourcentageMatch = fullText.match(/(\d+(?:[.,]\d+)?)\s*%/);
          if (pourcentageMatch) {
            actionnaire.pourcentage = pourcentageMatch[1];
          }
          
          // Extraire le montant
          const montantMatch = fullText.match(/(\d+(?:\s+\d{3})*(?:[.,]\d{2})?)\s*€/);
          if (montantMatch) {
            actionnaire.montant = montantMatch[1].replace(/\s+/g, '');
          }
          
          if (actionnaire.nom || actionnaire.pourcentage) {
            if (Array.isArray(data.actionnaires)) {
              data.actionnaires.push(actionnaire);
            } else {
              data.actionnaires = [actionnaire];
            }
          }
        });
      }
    }

    // 6. Extraire les DOCUMENTS JURIDIQUES avec leurs liens
    let documentsSection = findSectionByTitle('Documents juridiques');
    if (!documentsSection) {
      documentsSection = findSectionByTitle('Documents juridiques de');
    }
    if (!documentsSection) {
      const h2Documents = Array.from(document.querySelectorAll('h2')).find(h => 
        h.textContent.toLowerCase().includes('documents juridiques')
      );
      if (h2Documents) {
        documentsSection = h2Documents.closest('section') || h2Documents.parentElement?.parentElement || h2Documents.parentElement;
      }
    }
    
    if (documentsSection) {
      console.log('Section Documents juridiques trouvée');
      // Les documents sont dans des <ul><li>
      const documentItems = documentsSection.querySelectorAll('ul li');
      console.log('Nombre de documents trouvés:', documentItems.length);
      documentItems.forEach((item) => {
        const document = {
          types: [],
          date: null,
          description: null,
          url: null
        };
        
        // Extraire les types de documents (Acte sous seing privé, Procès-verbal, etc.)
        const typeSpans = item.querySelectorAll('span');
        typeSpans.forEach(span => {
          const text = span.textContent.trim();
          if (text && !text.match(/^\d{2}\/\d{2}\/\d{4}$/) && text.length > 3) {
            document.types.push(text);
          }
        });
        
        // Extraire la date
        const dateMatch = item.textContent.match(/(\d{2}\/\d{2}\/\d{4})/);
        if (dateMatch) {
          document.date = dateMatch[1];
        }
        
        // Extraire la description (texte dans les <ul> imbriqués)
        const nestedUl = item.querySelector('ul');
        if (nestedUl && document) {
          const descriptions = Array.from(nestedUl.querySelectorAll('li')).map(li => li.textContent.trim());
          if (descriptions.length > 0) {
            document.description = descriptions.join(' ; ');
          }
        }
        
        // Extraire le lien de téléchargement
        const downloadLink = item.querySelector('a[href*="telecharger"], a[href*="download"], a[href*="document"]');
        if (downloadLink) {
          const href = downloadLink.getAttribute('href');
          if (href) {
            document.url = href.startsWith('http') ? href : new URL(href, window.location.origin).href;
            document.type = href.match(/\.(pdf|doc|docx|xls|xlsx)$/i)?.[1]?.toLowerCase() || null;
          }
        }
        
        if (document.types.length > 0 || document.date || document.url) {
          data.documents_juridiques.push(document);
        }
      });
    }

    // 7. Extraire les ANNONCES BODACC
    let bodaccSection = findSectionByTitle('BODACC');
    if (!bodaccSection) {
      bodaccSection = findSectionByTitle('Annonces BODACC');
    }
    if (!bodaccSection) {
      bodaccSection = findSectionByTitle('Annonces BODACC de');
    }
    if (!bodaccSection) {
      const h2Bodacc = Array.from(document.querySelectorAll('h2')).find(h => 
        h.textContent.toLowerCase().includes('bodacc')
      );
      if (h2Bodacc) {
        bodaccSection = h2Bodacc.closest('section') || h2Bodacc.parentElement?.parentElement || h2Bodacc.parentElement;
      }
    }
    
    if (bodaccSection) {
      console.log('Section BODACC trouvée');
      // Les annonces sont dans des <ul><li>
      const bodaccItems = bodaccSection.querySelectorAll('ul li');
      console.log('Nombre d\'annonces BODACC trouvées:', bodaccItems.length);
      bodaccItems.forEach((item) => {
        const annonce = {
          date: null,
          type: null,
          rcs: null,
          denomination: null,
          capital: null,
          adresse: null,
          activite: null,
          administration: null,
          lien: null
        };
        
        const fullText = item.textContent;
        
        // Extraire le type (CRÉATION, MODIFICATION, etc.)
        const typeMatch = fullText.match(/^(CRÉATION|MODIFICATION|DISSOLUTION|CESSATION|TRANSFORMATION)/i);
        if (typeMatch) {
          annonce.type = typeMatch[1].trim();
        }
        
        // Extraire la date (format: 25/02/2014)
        const dateMatch = fullText.match(/(\d{2}\/\d{2}\/\d{4})/);
        if (dateMatch) {
          annonce.date = dateMatch[1];
        }
        
        // Extraire le RCS
        const rcsMatch = fullText.match(/RCS de\s+(.+?)(?:\n|Dénomination|$)/i);
        if (rcsMatch) {
          annonce.rcs = rcsMatch[1].trim();
        }
        
        // Extraire la dénomination
        const denomMatch = fullText.match(/Dénomination\s*:\s*(.+?)(?:\n|Capital|$)/i);
        if (denomMatch) {
          annonce.denomination = denomMatch[1].trim();
        }
        
        // Extraire le capital
        const capitalMatch = fullText.match(/Capital\s*:\s*(.+?)(?:\n|Adresse|$)/i);
        if (capitalMatch) {
          annonce.capital = capitalMatch[1].trim();
        }
        
        // Extraire l'adresse
        const adresseMatch = fullText.match(/Adresse\s*:\s*(.+?)(?:\n|Activité|$)/i);
        if (adresseMatch) {
          annonce.adresse = adresseMatch[1].trim();
        }
        
        // Extraire l'activité
        const activiteMatch = fullText.match(/Activité\s*:\s*(.+?)(?:\n|Administration|$)/i);
        if (activiteMatch) {
          annonce.activite = activiteMatch[1].trim();
        }
        
        // Extraire l'administration
        const adminMatch = fullText.match(/Administration\s*:\s*(.+?)(?:\n|$)/i);
        if (adminMatch) {
          annonce.administration = adminMatch[1].trim();
        }
        
        // Extraire le lien
        const link = item.querySelector('a[href]');
        if (link) {
          const href = link.getAttribute('href');
          if (href) {
            annonce.lien = href.startsWith('http') ? href : new URL(href, window.location.origin).href;
          }
        }
        
        if (annonce.date || annonce.type) {
          data.annonces_bodacc.push(annonce);
        }
      });
    }

    // 8. CARTographie - sera rempli depuis les appels API interceptés
    // L'API de cartographie est appelée via: /v2/entreprise/cartographie
    // Les données seront interceptées automatiquement par le code d'interception des API
    // Chercher aussi dans les données de la page si disponibles
    let cartographieSection = findSectionByTitle('Cartographie');
    if (!cartographieSection) {
      cartographieSection = findSectionByTitle('Cartographie de');
    }
    if (cartographieSection) {
      console.log('Section Cartographie trouvée');
      // La carte peut être dans un canvas ou iframe
      const mapCanvas = cartographieSection.querySelector('canvas');
      if (mapCanvas) {
        // Essayer d'extraire les données du canvas si possible
        try {
          const mapData = {
            canvas_width: mapCanvas.width,
            canvas_height: mapCanvas.height,
            source: 'canvas'
          };
          // Note: Les coordonnées réelles viennent de l'API
          data.cartographie = mapData;
        } catch (e) {
          console.log('Impossible d\'extraire les données du canvas:', e);
        }
      }
    }

    // 9. Extraire les BIENS IMMOBILIERS
    let biensSection = findSectionByTitle('Biens immobiliers');
    if (!biensSection) {
      biensSection = findSectionByTitle('Biens immobiliers de');
    }
    if (biensSection) {
      console.log('Section Biens immobiliers trouvée');
      // Vérifier si les données sont protégées
      const message = biensSection.textContent.trim();
      if (message.includes('réservé') || message.includes('connectés')) {
        data.biens_immobiliers = {
          note: message,
          disponible: false,
          lien_inscription: null
        };
        
        // Extraire le lien vers Pappers Immobilier si disponible
        const lienImmobilier = biensSection.querySelector('a[href*="immobilier"]');
        if (lienImmobilier) {
          const href = lienImmobilier.getAttribute('href');
          if (href) {
            data.biens_immobiliers.lien_inscription = href.startsWith('http') ? href : new URL(href, window.location.origin).href;
          }
        }
      } else {
        // Si les données sont disponibles, les extraire
        const bienItems = biensSection.querySelectorAll('tr, ul li, .item');
        bienItems.forEach((item) => {
          const bien = {
            adresse: null,
            type: null,
            surface: null,
            valeur: null,
            date_acquisition: null
          };
          
          const fullText = item.textContent;
          
          // Extraire l'adresse
          const adresseMatch = fullText.match(/Adresse\s*:\s*(.+?)(?:\n|Type|$)/i);
          if (adresseMatch) {
            bien.adresse = adresseMatch[1].trim();
          }
          
          // Extraire le type
          const typeMatch = fullText.match(/Type\s*:\s*(.+?)(?:\n|Surface|$)/i);
          if (typeMatch) {
            bien.type = typeMatch[1].trim();
          }
          
          // Extraire la surface
          const surfaceMatch = fullText.match(/Surface\s*:\s*(.+?)(?:\n|Valeur|$)/i);
          if (surfaceMatch) {
            bien.surface = surfaceMatch[1].trim();
          }
          
          // Extraire la valeur
          const valeurMatch = fullText.match(/Valeur\s*:\s*(.+?)(?:\n|Date|$)/i);
          if (valeurMatch) {
            bien.valeur = valeurMatch[1].trim();
          }
          
          // Extraire la date d'acquisition
          const dateMatch = fullText.match(/Date d'acquisition\s*:\s*(.+?)(?:\n|$)/i);
          if (dateMatch) {
            bien.date_acquisition = dateMatch[1].trim();
          }
          
          if (bien.adresse || bien.type) {
            data.biens_immobiliers.push(bien);
          }
        });
      }
    }

    // Extraction directe depuis tous les tableaux de la page (méthode universelle)
    const allTables = document.querySelectorAll('table');
    console.log('Nombre de tableaux trouvés:', allTables.length);
    allTables.forEach(table => {
      const rows = table.querySelectorAll('tbody tr, tr');
      rows.forEach(row => {
        const cells = row.querySelectorAll('td, th');
        if (cells.length >= 2) {
          const label = cells[0].textContent.trim().toLowerCase();
          const value = cells[1].textContent.trim();
          
          // Informations juridiques
          if (label.includes('siren') && !label.includes('siret')) {
            data.informations_juridiques.siren = value.replace(/\s+/g, '');
          } else if (label.includes('siret')) {
            data.informations_juridiques.siret = value.replace(/\s+/g, '');
          } else if (label.includes('forme juridique')) {
            data.informations_juridiques.forme_juridique = value;
          } else if (label.includes('numéro de tva') || label.includes('tva')) {
            data.informations_juridiques.numero_tva = value;
          } else if (label.includes('inscription') && label.includes('rcs')) {
            data.informations_juridiques.inscription_rcs = value;
          }
          
          // Activité
          if (label.includes('activité principale') || label.includes('activité déclarée')) {
            if (!data.activite || typeof data.activite !== 'object') data.activite = {};
            data.activite.description = value;
          } else if (label.includes('code naf') || label.includes('code ape') || label.includes('naf')) {
            if (!data.activite || typeof data.activite !== 'object') data.activite = {};
            data.activite.code = value;
          } else if (label.includes('domaine')) {
            if (!data.activite || typeof data.activite !== 'object') data.activite = {};
            data.activite.domaine = value;
          }
        }
      });
    });
    
    // Extraction directe depuis toutes les listes <ul><li> de la page
    const allLists = document.querySelectorAll('ul');
    console.log('Nombre de listes trouvées:', allLists.length);
    allLists.forEach(ul => {
      const parentText = ul.closest('section, div')?.textContent?.toLowerCase() || '';
      const listItems = ul.querySelectorAll('li');
      
      listItems.forEach(li => {
        const itemText = li.textContent;
        
        // Établissements
        if (parentText.includes('etablissement') || parentText.includes('établissement')) {
          if (data.etablissements.length === 0 || !data.etablissements.some(e => e.siret)) {
            const siretMatch = itemText.match(/(\d{3}\s+\d{3}\s+\d{3}\s+\d{5})/);
            if (siretMatch) {
              const siret = siretMatch[1].replace(/\s+/g, '');
              if (siret !== data.siren) {
                const etablissement = {
                  siret: siret,
                  nom: itemText.includes('Siège') ? 'Siège et établissement principal' : null,
                  statut: itemText.includes('En activité') ? 'En activité' : null
                };
                
                const adresseMatch = itemText.match(/Adresse\s*:\s*(.+?)(?:\n|Date|$)/i);
                if (adresseMatch) {
                  etablissement.adresse = adresseMatch[1].trim();
                  const cpVilleMatch = adresseMatch[1].match(/(\d{5})\s+(.+)$/);
                  if (cpVilleMatch) {
                    etablissement.code_postal = cpVilleMatch[1];
                    etablissement.ville = cpVilleMatch[2].trim();
                  }
                }
                
                if (!data.etablissements.some(e => e.siret === etablissement.siret)) {
                  data.etablissements.push(etablissement);
                }
              }
            }
          }
        }
        
        // Dirigeants
        if (parentText.includes('dirigeant')) {
          const nomLink = li.querySelector('a');
          if (nomLink) {
            const nomComplet = nomLink.textContent.trim();
            if (nomComplet && !data.dirigeants.some(d => d.nom_complet === nomComplet)) {
              const parts = nomComplet.split(/\s+/);
              const dirigeant = {
                nom_complet: nomComplet,
                prenom: parts[0] || null,
                nom: parts.slice(1).join(' ') || null
              };
              
              const fonctionMatch = itemText.match(/(Gérant|Président|Directeur|Associé[^,]*)/i);
              if (fonctionMatch) dirigeant.fonction = fonctionMatch[1].trim();
              
              const ageMatch = itemText.match(/(\d+)\s+ans\s+-\s+(\d{2}\/\d{4})/);
              if (ageMatch) {
                dirigeant.age = parseInt(ageMatch[1]);
                dirigeant.date_naissance = ageMatch[2];
              }
              
              const depuisMatch = itemText.match(/Depuis le\s+(\d{2}\/\d{2}\/\d{4})/);
              if (depuisMatch) dirigeant.date_debut = depuisMatch[1];
              
              data.dirigeants.push(dirigeant);
            }
          }
        }
        
        // Documents juridiques
        if (parentText.includes('document')) {
          const downloadLink = li.querySelector('a[href*="telecharger"], a[href*="download"]');
          if (downloadLink) {
            const href = downloadLink.getAttribute('href');
            if (href) {
              const url = href.startsWith('http') ? href : new URL(href, window.location.origin).href;
              const dateMatch = itemText.match(/(\d{2}\/\d{2}\/\d{4})/);
              
              const doc = {
                date: dateMatch ? dateMatch[1] : null,
                url: url,
                type: href.match(/\.(pdf|doc|docx|xls|xlsx)$/i)?.[1]?.toLowerCase() || null
              };
              
              // Extraire les types depuis les spans
              const types = Array.from(li.querySelectorAll('span')).map(s => s.textContent.trim()).filter(t => t && !t.match(/^\d{2}\/\d{2}\/\d{4}$/));
              if (types.length > 0) doc.types = types;
              
              if (!data.documents_juridiques.some(d => d.url === url)) {
                data.documents_juridiques.push(doc);
              }
            }
          }
        }
        
        // BODACC
        if (parentText.includes('bodacc')) {
          const typeMatch = itemText.match(/^(CRÉATION|MODIFICATION|DISSOLUTION|CESSATION|TRANSFORMATION)/i);
          if (typeMatch) {
            const annonce = {
              type: typeMatch[1].trim(),
              date: itemText.match(/(\d{2}\/\d{2}\/\d{4})/)?.[1] || null
            };
            
            const link = li.querySelector('a[href]');
            if (link) {
              const href = link.getAttribute('href');
              if (href) {
                annonce.lien = href.startsWith('http') ? href : new URL(href, window.location.origin).href;
              }
            }
            
            // Extraire autres infos depuis le texte
            const denomMatch = itemText.match(/Dénomination\s*:\s*(.+?)(?:\n|Capital|$)/i);
            if (denomMatch) annonce.denomination = denomMatch[1].trim();
            
            const capitalMatch = itemText.match(/Capital\s*:\s*(.+?)(?:\n|Adresse|$)/i);
            if (capitalMatch) annonce.capital = capitalMatch[1].trim();
            
            if (!data.annonces_bodacc.some(a => a.date === annonce.date && a.type === annonce.type)) {
              data.annonces_bodacc.push(annonce);
            }
          }
        }
      });
    });
    
    // Extraction de secours : si les sections ne sont pas trouvées, chercher dans toute la page
    if (data.informations_juridiques && Object.keys(data.informations_juridiques).length === 0) {
      console.log('Extraction de secours pour informations juridiques');
      const allText = document.body.textContent;
      
      // SIREN
      const sirenMatch = allText.match(/SIREN\s*:\s*([\d\s]+)/i);
      if (sirenMatch) {
        data.informations_juridiques.siren = sirenMatch[1].replace(/\s+/g, '');
      }
      
      // SIRET
      const siretMatch = allText.match(/SIRET[^:]*:\s*([\d\s]+)/i);
      if (siretMatch) {
        data.informations_juridiques.siret = siretMatch[1].replace(/\s+/g, '');
      }
      
      // Forme juridique
      const formeMatch = allText.match(/Forme juridique\s*:\s*(.+?)(?:\n|Numéro|Inscription|$)/i);
      if (formeMatch) {
        data.informations_juridiques.forme_juridique = formeMatch[1].trim();
      }
    }
    
    // Extraction de secours pour l'activité
    if (!data.activite || (typeof data.activite === 'string' && data.activite === 'Activité de ROBPHIL')) {
      console.log('Extraction de secours pour activité');
      const allText = document.body.textContent;
      
      const activiteMatch = allText.match(/Activité principale déclarée\s*:\s*(.+?)(?:\n|Code|$)/i);
      if (activiteMatch) {
        if (!data.activite || typeof data.activite !== 'object') data.activite = {};
        data.activite.description = activiteMatch[1].trim();
      }
      
      const codeMatch = allText.match(/Code NAF ou APE\s*:\s*(.+?)(?:\s*\(|Domaine|$)/i);
      if (codeMatch) {
        if (!data.activite || typeof data.activite !== 'object') data.activite = {};
        data.activite.code = codeMatch[1].trim();
      }
    }
    
    // Extraction de secours pour les établissements
    if (data.etablissements.length === 0) {
      console.log('Extraction de secours pour établissements');
      // Chercher tous les SIRET dans la page
      const siretMatches = document.body.textContent.matchAll(/(\d{3}\s+\d{3}\s+\d{3}\s+\d{5})/g);
      for (const match of siretMatches) {
        const siret = match[1].replace(/\s+/g, '');
        // Vérifier que ce n'est pas le SIREN
        if (siret !== data.siren) {
          data.etablissements.push({
            siret: siret,
            source: 'extraction_secours'
          });
        }
      }
    }
    
    // Extraction de secours pour les dirigeants
    if (data.dirigeants.length === 0) {
      console.log('Extraction de secours pour dirigeants');
      // Chercher dans le tableau de la page principale
      const mainTable = document.querySelector('table');
      if (mainTable) {
        const rows = mainTable.querySelectorAll('tr');
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 2) {
            const label = cells[0].textContent.trim().toLowerCase();
            if (label.includes('dirigeant')) {
              const dirigeantsLinks = cells[1].querySelectorAll('a');
              dirigeantsLinks.forEach(link => {
                const nomComplet = link.textContent.trim();
                if (nomComplet) {
                  const parts = nomComplet.split(/\s+/);
                  data.dirigeants.push({
                    nom_complet: nomComplet,
                    prenom: parts[0] || null,
                    nom: parts.slice(1).join(' ') || null,
                    source: 'tableau_principal'
                  });
                }
              });
            }
          }
        });
      }
    }
    
    // Extraction de secours pour les documents
    if (data.documents_juridiques.length === 0) {
      console.log('Extraction de secours pour documents');
      // Chercher tous les liens de téléchargement
      const downloadLinks = document.querySelectorAll('a[href*="telecharger"], a[href*="download"], a[href*="document"]');
      downloadLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href) {
          const url = href.startsWith('http') ? href : new URL(href, window.location.origin).href;
          data.documents_juridiques.push({
            nom: link.textContent.trim() || link.getAttribute('title') || 'Document',
            url: url,
            type: href.match(/\.(pdf|doc|docx|xls|xlsx)$/i)?.[1]?.toLowerCase() || null,
            source: 'extraction_secours'
          });
        }
      });
    }
    
    // Extraction de secours pour BODACC
    if (data.annonces_bodacc.length === 0) {
      console.log('Extraction de secours pour BODACC');
      // Chercher les liens BODACC
      const bodaccLinks = Array.from(document.querySelectorAll('a')).filter(a => 
        a.textContent.includes('Bodacc') || a.href.includes('bodacc')
      );
      bodaccLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href) {
          data.annonces_bodacc.push({
            lien: href.startsWith('http') ? href : new URL(href, window.location.origin).href,
            description: link.textContent.trim(),
            source: 'extraction_secours'
          });
        }
      });
    }

    return data;
  }

  // Fonction pour attendre que l'API de cartographie soit appelée
  async function waitForCartographieAPI(maxWait = 5000) {
    const startTime = Date.now();
    let waited = 0;
    
    // Vérifier d'abord si les données sont déjà disponibles
    if (cartographieData) {
      console.log('✅ Données de cartographie déjà disponibles');
      return true;
    }
    
    console.log(`⏳ Attente de l'appel API de cartographie (max ${maxWait}ms)...`);
    
    while (!cartographieData && (Date.now() - startTime) < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 200));
      waited += 200;
      
      // Afficher un log toutes les secondes
      if (waited % 1000 === 0) {
        console.log(`⏳ Attente... (${waited}ms écoulées)`);
      }
    }
    
    if (cartographieData) {
      console.log(`✅ Données de cartographie trouvées après ${waited}ms`);
      return true;
    } else {
      console.log(`⚠️ Aucune donnée de cartographie après ${maxWait}ms d'attente`);
      console.log('💡 Vérifiez dans l\'onglet Network de Chrome DevTools si l\'appel à /v2/entreprise/cartographie apparaît');
      return false;
    }
  }
  
  // Fonction pour essayer de déclencher manuellement l'appel API
  function tryTriggerCartographieAPI() {
    // Extraire le SIREN de l'URL
    // Format: /entreprise/nom-entreprise-123456789 ou /entreprise/nom-avec-plusieurs-tirets-123456789
    let siren = null;
    const urlMatch = window.location.href.match(/entreprise\/[^/]+-(\d{9})/);
    if (urlMatch) {
      siren = urlMatch[1];
    } else {
      // Essayer un autre format si le premier ne fonctionne pas
      const urlMatch2 = window.location.href.match(/-(\d{9})(?:\?|$)/);
      if (urlMatch2) {
        siren = urlMatch2[1];
      }
    }
    
    // Si l'extraction depuis l'URL échoue, essayer d'extraire depuis le DOM
    if (!siren) {
      console.log('⚠️ SIREN non trouvé dans l\'URL, tentative d\'extraction depuis le DOM...');
      
      // Chercher le SIREN dans les informations juridiques déjà extraites
      const juridiqueSection = document.querySelector('section, div, [class*="juridique"], [class*="information"]');
      if (juridiqueSection) {
        const sirenMatch = juridiqueSection.textContent.match(/SIREN\s*:\s*(\d{9})/i);
        if (sirenMatch) {
          siren = sirenMatch[1];
          console.log('✅ SIREN trouvé dans le DOM:', siren);
        }
      }
      
      // Si toujours pas trouvé, chercher dans tout le document
      if (!siren) {
        const allText = document.body.textContent;
        const sirenMatch = allText.match(/SIREN\s*:\s*(\d{9})/i);
        if (sirenMatch) {
          siren = sirenMatch[1];
          console.log('✅ SIREN trouvé dans le document:', siren);
        }
      }
    }
    
    if (!siren) {
      console.log('❌ Impossible d\'extraire le SIREN');
      return;
    }
    
    // Utiliser le token API intercepté ou le token par défaut
    const token = apiToken || '97a405f1664a83329a7d89ebf51dc227b90633c4ba4a2575';
    
    // Construire l'URL complète avec tous les paramètres nécessaires
    const apiUrl = `https://api.pappers.fr/v2/entreprise/cartographie?api_token=${token}&siren=${siren}&inclure_entreprises_dirigees=true&inclure_entreprises_citees=false&inclure_sci=true&autoriser_modifications=true`;
    
    console.log('🔄 Tentative de déclenchement manuel de l\'API de cartographie');
    console.log('URL:', apiUrl.replace(/api_token=[^&]+/, 'api_token=***'));
    
    // Essayer de faire l'appel nous-mêmes
    originalFetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }).then(response => {
      if (response.ok) {
        return response.json();
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }).then(data => {
      console.log('✅ Appel API de cartographie réussi manuellement');
      console.log('Données reçues:', {
        hasEntreprises: Array.isArray(data.entreprises),
        hasPersonnes: Array.isArray(data.personnes),
        hasLiens: Array.isArray(data.liens_entreprises_personnes),
        nbEntreprises: data.entreprises?.length || 0,
        nbPersonnes: data.personnes?.length || 0
      });
      
      cartographieData = {
        url: apiUrl,
        data: data,
        timestamp: new Date().toISOString(),
        method: 'GET',
        triggered_manually: true
      };
    }).catch(error => {
      console.log('❌ Échec de l\'appel API manuel:', error.message);
      console.log('💡 L\'API peut nécessiter une authentification ou avoir des restrictions CORS');
    });
  }

  // Fonction pour écouter les messages depuis le popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Utiliser une fonction async pour gérer l'attente
    (async () => {
      try {
        if (request.action === 'extract') {
          console.log('=== DÉBUT EXTRACTION ===');
          
          // Si les données de cartographie ne sont pas encore disponibles, attendre un peu
          if (!cartographieData) {
            // Attendre un peu pour voir si l'API est appelée automatiquement
            const found = await waitForCartographieAPI(3000);
            
            // Si toujours pas de données, essayer de déclencher manuellement
            if (!found) {
              console.log('🔄 Tentative de déclenchement manuel de l\'API...');
              tryTriggerCartographieAPI();
              
              // Attendre encore un peu pour que l'appel manuel se termine
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
          
          const pageData = extractPageData();
          
          // Si le SIREN n'a pas été extrait depuis l'URL mais est disponible dans informations_juridiques, l'utiliser
          if (!pageData.siren && pageData.informations_juridiques && pageData.informations_juridiques.siren) {
            pageData.siren = pageData.informations_juridiques.siren;
            console.log('✅ SIREN récupéré depuis informations_juridiques:', pageData.siren);
          }
          
          // Si les données de cartographie ne sont pas disponibles et qu'on a un SIREN, essayer de déclencher l'API manuellement
          const hasCartographieData = cartographieData && cartographieData.data && 
                                      (Array.isArray(cartographieData.data.entreprises) || 
                                       Array.isArray(cartographieData.data.personnes));
          if (!hasCartographieData && pageData.siren) {
            console.log('🔄 Tentative de déclenchement manuel de l\'API avec SIREN:', pageData.siren);
            // Utiliser le SIREN extrait pour déclencher l'API
            const token = apiToken || '97a405f1664a83329a7d89ebf51dc227b90633c4ba4a2575';
            const apiUrl = `https://api.pappers.fr/v2/entreprise/cartographie?api_token=${token}&siren=${pageData.siren}&inclure_entreprises_dirigees=true&inclure_entreprises_citees=false&inclure_sci=true&autoriser_modifications=true`;
            
            try {
              const response = await originalFetch(apiUrl, {
                method: 'GET',
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json'
                }
              });
              
              if (response.ok) {
                const data = await response.json();
                cartographieData = {
                  url: apiUrl,
                  data: data,
                  timestamp: new Date().toISOString(),
                  method: 'GET',
                  triggered_manually: true
                };
                console.log('✅ Appel API de cartographie réussi avec SIREN extrait');
              }
            } catch (error) {
              console.log('❌ Échec de l\'appel API manuel avec SIREN extrait:', error.message);
            }
          }
          
          console.log('=== FIN EXTRACTION ===');
          console.log('Données extraites:', pageData);
          
          // Ajouter les données de cartographie si disponibles
          // Les données doivent être stockées telles quelles, sans transformation
          if (cartographieData && cartographieData.data) {
            // Copier les données telles quelles (structure complète de l'API)
            pageData.cartographie = JSON.parse(JSON.stringify(cartographieData.data));
            pageData.cartographie_source = cartographieData.url;
            pageData.cartographie_timestamp = cartographieData.timestamp;
            console.log('✅ Données de cartographie ajoutées au JSON final');
            console.log('Structure:', {
              hasEntreprises: Array.isArray(pageData.cartographie.entreprises),
              hasPersonnes: Array.isArray(pageData.cartographie.personnes),
              hasLiens: Array.isArray(pageData.cartographie.liens_entreprises_personnes),
              nbEntreprises: pageData.cartographie.entreprises?.length || 0,
              nbPersonnes: pageData.cartographie.personnes?.length || 0
            });
          } else {
            console.log('⚠️ Aucune donnée de cartographie disponible');
            pageData.cartographie = null;
          }
          
          // Ajouter aussi tous les appels API
          pageData.apiCalls = apiCalls;
          console.log('Nombre d\'appels API interceptés:', apiCalls.length);
          
          sendResponse({ success: true, data: pageData });
        } else if (request.action === 'getApiCalls') {
          sendResponse({ success: true, apiCalls: apiCalls, cartographie: cartographieData });
        } else {
          sendResponse({ success: false, error: 'Action non reconnue' });
        }
      } catch (error) {
        console.error('Erreur dans le content script:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    
    return true; // Indique qu'on répondra de manière asynchrone
  });

  // Observer les changements de la page pour détecter les appels API dynamiques
  const observer = new MutationObserver(() => {
    // Vérifier s'il y a des scripts qui chargent des données de cartographie
    const scripts = document.querySelectorAll('script[src*="api"], script[src*="cartographie"]');
    scripts.forEach(script => {
      if (script.src && !script.dataset.observed) {
        script.dataset.observed = 'true';
        // Intercepter le chargement si possible
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  console.log('Pappers Info Extractor: Content script chargé');
})();

