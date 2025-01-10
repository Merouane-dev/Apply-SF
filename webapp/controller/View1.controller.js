sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
    "use strict";

    return Controller.extend("vignette.controller.View1", {

        onInit: function () {
            // Création du modèle JSON
            var oModel = new JSONModel();

            // Chargement du fichier mockData.json (asynchrone)
            let oPromise = oModel.loadData("/model/mockData.json");

            // On affecte ce modèle à la vue, avec l'alias "myModel"
            this.getView().setModel(oModel, "myModel");

            // Quand le chargement est terminé, on affiche un console.log
            oPromise.then(function () {
            // On récupère la liste initiale des demandes
               let aDemandes = oModel.getProperty("/demandes") || [];
            // On la copie dans /allDemandes
                oModel.setProperty("/allDemandes", aDemandes);


           // Optionnel re-setter le modèle 
                this.getView().setModel(oModel, "myModel");
            }.bind(this));
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
        
         
        //  // (1) Vérifier s’il y a au moins une DA sélectionnée
        //  // (2) Parmi celles-ci, au moins une doit avoir tous ses postes "livraisonComplete" = true
         
        //  let bCanApprove = false;

        // if (aSelected.length > 0) {
        //  bCanApprove = aSelected.some(function (da) {
        //     // Récupérer les postes de cette DA
        //     const aPostes = da.details && da.details.postes || [];
        //     // Vérifier que *tous* les postes sont cochés
        //     return aPostes.length > 0 && aPostes.every(p => p.livraisonComplete === true);
        //  });
        // }

        //  // Activer / désactiver le bouton "Approuver"
        //  this.getView().byId("_IDGenButton3").setEnabled(bCanApprove);
           
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
            // Récupération du modèle
            const oModel = this.getView().getModel("myModel");
        
            // Lire les champs de filtre
            const oFilters = oModel.getProperty("/filters") || {};
            const sFournisseur = oFilters.fournisseur || "";
            const sDemandeur = oFilters.demandeur || "";
            const sDemandeAchat = oFilters.demande_achat || "";
            const sCommandeAchat = oFilters.commande_achat || "";
            // (on ignore date_livraison pour l’exemple ou on la traite si besoin)
        
            // Récupérer la liste originale
            const aAllDemandes = oModel.getProperty("/allDemandes") || [];
        
            // Filtrer localement
            let aFiltered = aAllDemandes.filter(dem => {
                
                // On décide si on veut filtrer en *substring* (inclus)
                // ou *exact match*.
                // Exemple simple : substring case-insensitive.
        
                let bKeep = true;
        
                // Fournisseur
                if (sFournisseur) {
                    // On compare en lowerCase
                    let sFourn = dem.fournisseur ? dem.fournisseur.toLowerCase() : "";
                    if (!sFourn.includes(sFournisseur.toLowerCase())) {
                        bKeep = false;
                    }
                }
        
                // Demandeur
                if (bKeep && sDemandeur) {
                    let sDem = dem.demandeur ? dem.demandeur.toLowerCase() : "";
                    if (!sDem.includes(sDemandeur.toLowerCase())) {
                        bKeep = false;
                    }
                }
        
                // Demande d'achat
                if (bKeep && sDemandeAchat) {
                    let sDa = dem.demandeAchatId ? dem.demandeAchatId.toLowerCase() : "";
                    // ou if (sDa !== sDemandeAchat) pour un match exact
                    if (!sDa.includes(sDemandeAchat.toLowerCase())) {
                        bKeep = false;
                    }
                }
        
                // Commande d'achat
                if (bKeep && sCommandeAchat) {
                    let sCa = dem.commandeAchatId ? dem.commandeAchatId.toLowerCase() : "";
                    if (!sCa.includes(sCommandeAchat.toLowerCase())) {
                        bKeep = false;
                    }
                }
        
                return bKeep;
            });
        
            // On assigne le résultat filtré à /demandes
            oModel.setProperty("/demandes", aFiltered);
        
            // On peut log le résultat
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
    //    onApprove: function() {
    //     const oModel = this.getView().getModel("myModel");
    //     const aSelectedDA = oModel.getProperty("/selectedDA") || [];

        
    // },
          
    });
});
