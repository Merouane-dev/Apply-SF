sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
    "use strict";

    return Controller.extend("vignette.controller.View1", {

        onInit: function () {
       
        var oODataModel = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/sap/ZDA_SERVICE_2_SRV/");

        // Important : Indiquer à la requête OData que l’on souhaite étendre ("expand") le DetailSet.
        oODataModel.read("/HeaderSet", {
            urlParameters: {
                "$expand": "DetailSet"
            },
            success: function(oData) {
      
                // On mappe ensuite en un format local plus simple (par exemple "postes")
                var aDemandes = oData.results.map(function(header) {
                    // Récupération des lignes de détail
                    var aPostes = header.DetailSet && header.DetailSet.results
                        ? header.DetailSet.results.map(function(item) {
                              return {
                                  posteId        : item.PosteId,
                                  Article        : item.Article,
                                  NomSite        : item.NomSite,
                                  DatePrevue     : item.DatePrevue,
                                  QteAttendue    : item.QteAttendue,
                                  QteLivree      : item.QteLivree,
                                  LivraisonCompl : item.LivraisonCompl,
                                  bonLivraison   : item.BonLivraison,
                                  texteEntete    : item.TexteEntete
                              };
                          })
                        : [];
        
                    return {
                        demandeAchatId  : header.DemandeAchat,
                        commandeAchatId : header.CommandeAchat,
                        demandeur       : header.Demandeur,
                        fournisseur     : header.Fournisseur,
                        dateLivraison   : header.DateLivraison,
                        montantTotal    : header.MontantTotal,
        
                        // Pour la sélection
                        selected : false,
        
                        // Petit exemple : on récupère le premier bon de livraison
                        // (si besoin de l’afficher au niveau "Header" dans la vue)
                        details: {
                            nomFournisseur  : header.Fournisseur,
                            demandeur       : header.Demandeur,
                            montantCommande : header.MontantTotal,
                            bonLivraison    : aPostes[0] ? aPostes[0].bonLivraison : "",
                            texteEntete     : aPostes[0] ? aPostes[0].texteEntete : "",
        
                            // On stocke le tableau complet des lignes
                            postes          : aPostes
                        }
                    };
                });
        
                // Création d’un JSONModel local
                var oJsonModel = new sap.ui.model.json.JSONModel({
                    demandes: aDemandes,            // liste pour la Table
                    allDemandes: aDemandes.slice(), // copie pour filtrer
                    filters: {},
                    selectedDA: []
                });
        
                // On l’assigne à la vue (alias "myModel")
                this.getView().setModel(oJsonModel, "myModel");
            }.bind(this),
            error: function(oError) {
                sap.m.MessageToast.show("Erreur lors de la lecture OData");
                console.error("Erreur détail =", oError);
            }
        });
        },

        /**
         * Bouton "Select All" : 
         * - Si au moins un item n'est pas coché => cocher tout 
         * - Sinon, décocher tout
         */
        onSelectAll: function(oEvent) {
            const oModel = this.getView().getModel("myModel");
            const oData = oModel.getData();
            const aDemandes = oData.demandes || [];

            // Vérifier s'il existe un item non sélectionné
            const bShouldSelectAll = aDemandes.some(item => !item.selected);

            // Mettre à jour "selected" pour chaque demande
            aDemandes.forEach(dem => dem.selected = bShouldSelectAll);

            // Maj du modèle
            oModel.setProperty("/demandes", aDemandes);
            // Forcer le rafraîchissement UI
            oModel.updateBindings(true);

            // Maj de selectedDA
            this._refreshSelectedDA();
        },

         /**
         * Même principe pour "onSelectAllLivraison", 
         * mais appliqué à la propriété 'livraisonComplete' 
         * dans le tableau de postes, pour chaque DA sélectionnée.
         */
         onSelectAllLivraison: function(oEvent) {
            // 1. Récupérer la table sur laquelle on a cliqué.
            //    Le bouton est dans la <Column>, donc on remonte
            //    au parent (la colonne), puis au parent de la colonne (la Table).
            const oTable = oEvent.getSource().getParent().getParent();

            // 2. Récupérer le contexte de binding de cette table
            //    (chaque Table est répétée pour chaque DA dans /selectedDA).
            const oCtx = oTable.getBindingContext("myModel");
            if (!oCtx) return;

            const sPath = oCtx.getPath(); // ex: "/selectedDA/0"
            const oModel = this.getView().getModel("myModel");

            // 3. Récupérer le tableau des postes (details/postes) de la DA en question.
            let aPostes = oModel.getProperty(sPath + "/details/postes") || [];

            // 4. Vérifier s'il existe au moins un poste pas encore livré (livraisonComplete = false)
            const bShouldSelectAll = aPostes.some(item => item.livraisonComplete === false);

            // 5. Mettre à jour la propriété 'livraisonComplete' de tous les postes
            aPostes.forEach(item => item.livraisonComplete = bShouldSelectAll);

            // 6. Mettre à jour le modèle
            oModel.setProperty(sPath + "/details/postes", aPostes);
            oModel.updateBindings(true);
        },


        /**
         * Event press sur la ligne (type="Active").
         * Par défaut, ça ne coche pas la checkbox => 
         * on peut décider de basculer selected ou 
         * d'afficher autre chose.
         */
        onSelectDemande: function(oEvent) {
            // 1. Récupérer la ligne (ColumnListItem)
            const oItem = oEvent.getSource();
            // 2. Récupérer le contexte
            const oCtx = oItem.getBindingContext("myModel");
            if (!oCtx) return;

            // 3. Inverser la propriété "selected"
            const sPath = oCtx.getPath(); // ex. "/demandes/2"
            const oModel = this.getView().getModel("myModel");
            const bOldVal = oModel.getProperty(sPath + "/selected");
            oModel.setProperty(sPath + "/selected", !bOldVal);

            // 4. Mettre à jour selectedDA
            this._refreshSelectedDA();
        },

        /**
         * Méthode appelée quand l'utilisateur 
         * coche ou décoche la CheckBox
         */
        onCheckBoxSelect: function(oEvent) {
            console.log("onCheckBoxSelect : clic sur la checkbox");
            const oCheckBox = oEvent.getSource();
            const oModel = this.getView().getModel("myModel");
            // Récupérer le contexte
            const oCtx = oCheckBox.getBindingContext("myModel");
            if (!oCtx) return;

            // Est-ce coché ?
            const bSelected = oEvent.getParameter("selected");
            
            // On met à jour la propriété "selected" dans l'objet
            const sPath = oCtx.getPath(); // ex: "/demandes/0"
            oModel.setProperty(sPath + "/selected", bSelected);

            // Puis on refresh
            this._refreshSelectedDA();
        },

        /**
         * Reconstruit le tableau /selectedDA à partir 
         * de toutes les demandes cochées
         */
        _refreshSelectedDA: function() {
            const oModel = this.getView().getModel("myModel");
            const aDemandes = oModel.getProperty("/demandes") || [];

            // Filtrer pour ne garder que ceux qui ont selected = true
            const aSelected = aDemandes.filter(item => item.selected);

            // Mettre à jour la propriété "/selectedDA"
            oModel.setProperty("/selectedDA", aSelected);
        
         
       
        },
        
        /**
         * Ouvre l'URL PDF dans un nouvel onglet
         */
        onOpenPdf: function(oEvent) {
            const sUrlPdf = oEvent.getSource().data("pdfUrl");
            if (sUrlPdf) {
                window.open(sUrlPdf, "_blank");
            } else {
                MessageToast.show("Pas de PDF associé");
            }
        //  // Scroll
        
        },

       
        onFilterApply: function() {
            // Récupération du modèle JSON local
            const oModel = this.getView().getModel("myModel");
        
            // Lire les champs de filtre depuis /filters
            const oFilters = oModel.getProperty("/filters") || {};
            const sFournisseur   = oFilters.fournisseur      || "";
            const sDemandeur     = oFilters.demandeur        || "";
            const sDemandeAchat  = oFilters.demande_achat    || "";
            const sCommandeAchat = oFilters.commande_achat   || "";
        
            const sDateLivraison = oFilters.date_livraison   || "";
        
            // Récupérer la liste *complète* (non filtrée)
            const aAllDemandes = oModel.getProperty("/allDemandes") || [];
        
            // Filtrer localement
            let aFiltered = aAllDemandes.filter(dem => {
                let bKeep = true;
        
                // 1) Filtre sur fournisseur
                if (sFournisseur) {
                    let sFourn = (dem.fournisseur || "").toLowerCase();
                    if (!sFourn.includes(sFournisseur.toLowerCase())) {
                        bKeep = false;
                    }
                }
        
                // 2) Filtre sur demandeur
                if (bKeep && sDemandeur) {
                    let sDem = (dem.demandeur || "").toLowerCase();
                    if (!sDem.includes(sDemandeur.toLowerCase())) {
                        bKeep = false;
                    }
                }
        
                // 3) Filtre sur demande d'achat
                if (bKeep && sDemandeAchat) {
                    let sDa = (dem.demandeAchatId || "").toLowerCase();
                    if (!sDa.includes(sDemandeAchat.toLowerCase())) {
                        bKeep = false;
                    }
                }
        
                // 4) Filtre sur commande d'achat
                if (bKeep && sCommandeAchat) {
                    let sCa = (dem.commandeAchatId || "").toLowerCase();
                    if (!sCa.includes(sCommandeAchat.toLowerCase())) {
                        bKeep = false;
                    }
                }
        
                // 5) Filtre sur la date de livraison
                
                if (bKeep && sDateLivraison) {
                    // 1) Convertir la date saisie (sDateLivraison) en "YYYY-MM-DD"
                    let sUserDate = "";
                    if (sDateLivraison instanceof Date) {
                      const iDay   = sDateLivraison.getDate();
                      const iMonth = sDateLivraison.getMonth() + 1;
                      const iYear  = sDateLivraison.getFullYear();
                      sUserDate = `${iYear}-${String(iMonth).padStart(2,"0")}-${String(iDay).padStart(2,"0")}`;
                    }
                  
                    // 2) Extraire la date de dem.dateLivraison
                    let sDataDate = "";
                    if (typeof dem.dateLivraison === "string") {
                      // ex: "2025-01-24T00:00:00"
                      sDataDate = dem.dateLivraison.substring(0, 10); // => "2025-01-24"
                    } else if (dem.dateLivraison instanceof Date) {
                      // ex: objet Date
                      let d = dem.dateLivraison;
                      const iDay   = d.getDate();
                      const iMonth = d.getMonth() + 1;
                      const iYear  = d.getFullYear();
                      sDataDate = `${iYear}-${String(iMonth).padStart(2,"0")}-${String(iDay).padStart(2,"0")}`;
                    }
                  
                    // 3) Comparaison
                    if (sUserDate && sDataDate && sDataDate !== sUserDate) {
                      bKeep = false;
                    }
                  }
        
                return bKeep;
            });
        
            // Assigner le résultat filtré à /demandes
            oModel.setProperty("/demandes", aFiltered);
        
            // Log le résultat
            console.log("Filter result =>", aFiltered);
        },


        /* 
         * Méthode onResetFilters
         * Appelée lorsque l'utilisateur clique sur "Effacer" / "Réinitialiser".
         * Objectif : vider les champs de filtre ET rétablir la liste originelle.
          */
        onResetFilters: function() {
            const oModel = this.getView().getModel("myModel");

            // 1. Vider les champs /filters
            oModel.setProperty("/filters/fournisseur",    "");
            oModel.setProperty("/filters/demandeur",      "");
            oModel.setProperty("/filters/demande_achat",  "");
            oModel.setProperty("/filters/commande_achat", "");
            oModel.setProperty("/filters/date_livraison", "");

            // 2. Récupérer la liste initiale (allDemandes) 
            const aAll = oModel.getProperty("/allDemandes") || [];

            // 3. Rétablir la liste
            oModel.setProperty("/demandes", aAll);
     },
       /**
         * Méthode appelée lorsque l’on clique sur le bouton "Approuver".
         * On vérifie quelles DA sélectionnées sont "complètes" et on agit en conséquence.
         */
       onApprove: function() {
        const oModel = this.getView().getModel("myModel");
        const aSelectedDA = oModel.getProperty("/selectedDA") || [];

        
    },
          
    });
});
