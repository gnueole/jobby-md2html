# 1.10.4 - Mise à jour Jobby
Mise à jour Jobby du 24/06/2026 · Téléchargements PDF Gotenberg, contrôles de taille de police dans l'éditeur, positionnement dynamique des menus déroulants/infobulles et synchronisation des langues.
[CONTACT : hi@eole.me | [cv.eole.me](https://cv.eole.me)]

## 📥 TÉLÉCHARGEMENT DIRECT DE PDF VIA GOTENBERG
* **Génération de PDF propre et dynamique** : Remplacement des astuces d'impression externes par un pipeline de génération et de téléchargement de PDF directement géré par Gotenberg, résolvant entièrement les bugs d'impression d'arrière-plan et les décalages de mise en page.

## 🔎 CONTRÔLES DE TAILLE DE POLICE DANS L'ÉDITEUR
* **Ajustement dynamique** : Ajout de boutons de réglage de taille de police interactifs dans le conteneur de l'éditeur Markdown pour adapter votre espace de travail selon vos préférences.

## 🧭 POSITIONNEMENT DYNAMIQUE DES MENUS ET INFOBULLES
* **Popups adaptatives** : Implémentation d'un système intelligent de vérification de l'espace d'affichage pour positionner les menus déroulants et infobulles de façon dynamique, évitant tout dépassement des limites de l'écran.

## 🌐 SYNCHRONISATION MULTILINGUE
* **Interface et ressources robustes** : Synchronisation et mise à jour des ressources de traduction, des presets de style et des configurations d'impression personnalisées pour l'ensemble des 7 langues prises en charge.

---

# 1.10.1 - Mise à jour Jobby
Mise à jour Jobby du 21/06/2026 · Correction du lien d'aide de la modale À propos & Affinements graphiques.
[CONTACT : hi@eole.me | [cv.eole.me](https://cv.eole.me)]

## 🐛 CORRECTION DU LIEN D'AIDE
* **Résolution du bug de navigation** : Correction d'un bug où le lien « Guide d'Aide & Syntaxe Markdown » dans la modale À propos était cassé après un changement de langue. Nous utilisons désormais la délégation d'événements pour préserver les écouteurs de clics à travers les mises à jour dynamiques du DOM.

## 🎨 AFFINEMENTS DE LA MODALE À PROPOS
* **Polish visuel** : Suppression des emojis redondants des en-têtes, élargissement de la disposition pour éviter les barres de défilement, et habillage avec une barre latérale glassmorphic premium.

---

# 1.10.0 - Mise à jour Jobby
Mise à jour Jobby du 21/06/2026 · Support multilingue, Accent d'en-tête statique, Sélecteur de thème visuel, Modales réactives & Toasts agrandis.
[CONTACT : hi@eole.me | [cv.eole.me](https://cv.eole.me)]

## 🌐 SUPPORT MULTILINGUE (i18n)
* **Nouvelles Langues**: Ajout du support pour 5 nouvelles langues : Tchèque (`cs`), Espagnol (`es`), Italien (`it`), Allemand (`de`) et Roumain (`ro`). Vous pouvez basculer entre les 7 langues prises en charge via le sélecteur dans l'en-tête !
* **Modèles d'exemples localisés**: Charger l'exemple dans votre langue active affiche désormais un toast localisé `"Exemple chargé !"`.

## 🌈 ACCENT D'EN-TÊTE STATIQUE
* **Touche Premium**: Ajout d'une ligne fine de dégradé statique (hauteur 2,5 px) tout en haut de la barre d'en-tête, présentant un superbe mélange de bleu, de violet et de rose.

## 🌗 SÉLECTEUR DE THÈME VISUEL
* **En-tête plus propre**: Suppression du texte répétitif "Theme : ..." du bouton de changement de thème pour n'afficher que l'icône, optimisant ainsi l'espace horizontal.
* **Nouvelle icône pour Auto**: Remplacement de l'icône automatique par l'icône classique du cercle de contraste (`lucide-contrast`), permettant d'identifier l'état du thème.

## 🥞 MODALES RÉACTIVES & TOASTS AGRANDIS
* **Modales défilantes**: Limitation de la hauteur de toutes les cartes modales à `90vh` et activation du défilement vertical sur les corps de modales, résolvant les problèmes de lecture sur petits écrans.
* **Toasters deux fois plus grands**: Doublement de la taille de police de toutes les notifications à `26px` (et icônes/boutons à `32px`) pour améliorer la lisibilité.
* **Toast de mise à jour**: Affiche une notification de bienvenue et de mise à jour localisée aux utilisateurs de retour lorsqu'une version plus récente est déployée.

---

# 1.9.2 - Mise à jour Jobby
Mise à jour Jobby du 21/06/2026 · Notifications empilables et icône de balai affinée.
[CONTACT : hi@eole.me | [cv.eole.me](https://cv.eole.me)]

## 🥞 SYSTÈME DE NOTIFICATIONS EMPILABLES (TOASTER)
* **Notifications fluides** : Les alertes s'affichent désormais dans le coin inférieur droit sous forme de cartes empilables. Elles se ferment automatiquement ou manuellement et s'adaptent dynamiquement (Succès, Erreur, Avertissement, Info) avec des couleurs et emojis dédiés.
* **Compatibilité des tests** : L'intégration respecte parfaitement les tests automatisés de non-régression.

## 🧹 ICÔNE DE BALAI AFFINÉE
* **Design moderne** : L'icône de nettoyage de l'éditeur a été redessinée sous forme de balai vertical épuré avec des scintillements, remplaçant l'ancien visuel moins lisible.

---

# 1.9.1 - Mise à jour Jobby
Mise à jour Jobby du 20/06/2026 · Métriques de télémétrie avancées.
[CONTACT : hi@eole.me | [cv.eole.me](https://cv.eole.me)]

## 📊 STATISTIQUES DE PERFORMANCE ET D'USAGE
* **Métriques avancées** : Nous suivons désormais de manière anonyme l'évolution de votre score ATS (score initial, amélioration du score, nombre de règles corrigées), les presets de design testés, les actions d'annulation (Undo/Redo), le thème actif (sombre/clair) et le temps de rendu Markdown en millisecondes pour optimiser les performances.

---

# 1.9.0 - Mise à jour Jobby
Mise à jour Jobby du 20/06/2026 · Formulaire de feedback utilisateur et intégration n8n.
[CONTACT : hi@eole.me | [cv.eole.me](https://cv.eole.me)]

## 💬 FORMULAIRE DE RETOURS UTILISATEUR (FEEDBACK)
* **Formulaire interactif** : Un nouveau bouton "Feedback" fait son apparition dans l'en-tête de l'éditeur. Il ouvre un formulaire élégant vous permettant de noter l'application (étoiles interactives), de catégoriser votre retour (Commentaire, Suggestion, Bug) et de décrire votre avis.
* **Traitement sécurisé** : Les retours sont transmis de manière asynchrone à notre base de données Notion via un proxy sécurisé et un workflow n8n dédié, garantissant la sécurité des clés d'API.

---

# 1.8.2 - Mise à jour Jobby
Mise à jour Jobby du 20/06/2026 · Masquage du menu flottant à l'impression.
[CONTACT : hi@eole.me | [cv.eole.me](https://cv.eole.me)]

## 🖨️ IMPRESSION PROPRE ET SANS ARTEFACTS
* **Masquage du menu flottant** : Le menu flottant latéral (folded controls dock), le bouton d'ouverture ("Design"), et les fenêtres modales superposées sont désormais masqués automatiquement lors de l'impression ou de l'export PDF. Votre CV s'imprime de façon parfaitement propre.

---

# 1.8.1 - Mise à jour Jobby
Mise à jour Jobby du 19/06/2026 · Mode glassmorphic, accessibilité améliorée et actions fluides.
[CONTACT : hi@eole.me | [cv.eole.me](https://cv.eole.me)]

## 🌌 EFFETS GLASSMORPHIC ET POLISH VISUEL
* **Menu flottant translucide** : Le panneau de raccourcis replié s'habille d'un superbe effet de verre dépoli (glassmorphism) en modes sombre et clair. Ses boutons s'adaptent dynamiquement pour une intégration visuelle parfaite.
* **Propreté de l'interface** : Le conteneur vide des contrôles de prévisualisation disparaît complètement une fois replié, éliminant tout artefact graphique.

## 👁️ ACCESSIBILITÉ ET LISIBILITÉ SOMBRE
* **Lien d'aide "What is markdown?"** : Le lien d'aide de l'éditeur Markdown s'illumine en violet clair en mode sombre pour garantir un contraste et une lisibilité parfaits.

## 🚀 ACTIONS FLUIDES ET ANNULABLES
* **Suppression des alertes bloquantes** : Les boutons :accent[Sample], :accent[What's New], :accent[Clear], et :accent[Load] chargent désormais instantanément leur contenu sans popups de confirmation intrusives.
* **Droit à l'erreur garanti** : Avant chaque action d'écrasement, votre travail est automatiquement enregistré dans l'historique de l'éditeur. Un simple :accent[Ctrl + Z] (ou le bouton Undo) vous permet de revenir en arrière immédiatement !

---

# 1.8.0 - Mise à jour Jobby
Mise à jour Jobby du 19/06/2026 · Mode focalisé, barre de style riche, historique et synergie IA.
[CONTACT : hi@eole.me | [cv.eole.me](https://cv.eole.me)]

## 🔍 COLLAPSER LE PANNEAU DE DESIGN
* **Focalisation maximale** : Un nouveau bouton de fermeture (croix SVG) a été ajouté dans l'en-tête du panneau de design. Cliquez dessus pour replier complètement le customizer et libérer tout l'espace pour la prévisualisation !
* **Bouton flottant interactif** : Un bouton flottant "Design" moderne et glassmorphic apparaît au bas de l'écran lorsque le panneau est masqué, vous permettant de le déplier à tout moment d'un simple clic.
* *Un grand merci à Maround Boutanos pour le tooltip des raccourcis et la suggestion de masquage du panneau !*

## 🛠️ BARRE D'OUTILS D'ÉDITION RICHE (TOOLBAR)
* **Accès rapide au style** : Le bouton :accent[Format] est désormais placé avant :accent[Save] et permet de déplier une barre d'outils riche juste au-dessus de la zone d'écriture.
* **Visibilité accrue** : Le bouton :accent[Format] s'illumine en violet lorsque la barre d'outils est masquée pour attirer votre attention, puis redevient discret et régulier une fois la barre d'outils affichée.
* **Toutes vos actions en 1 clic** : Insérez des titres (H1, H2, H3), du gras, de l'italique, des liens, des listes à puces, appliquez vos couleurs d'accentuation ou discrètes (muted), ou déplacez vos lignes sans effort.

## 🔄 HISTORIQUE UNDO / REDO INTÉGRÉ
* **Droit à l'erreur** : Un historique d'actions (Undo/Redo) personnalisé a été intégré au traitement de texte. Annulez et rétablissez vos frappes et modifications à l'aide des nouveaux boutons de la barre d'outils ou via les raccourcis classiques :accent[Ctrl + Z] et :accent[Ctrl + Y] / :accent[Ctrl + Shift + Z].

## 🤖 COMPATIBILITÉ ET CONSEILS IA
* **Modifiez votre CV avec l'IA** : Le Markdown est le format idéal pour travailler avec l'IA (Gemini, ChatGPT, Claude...). Pour simplifier le copier-coller sans pertes de style, manipulez votre CV dans votre IA préférée et n'oubliez pas de lui demander : :accent["generate in MD format"].

---

# 1.7.0 - Mise à jour Jobby
Mise à jour Jobby du 16/06/2026 · Nouveautés simples & intelligentes.
[CONTACT : hi@eole.me | [cv.eole.me](https://cv.eole.me)]

## 💾 SAUVEGARDE ET CHARGEMENT LOCAUX
* **Sauvegarde de brouillon** : Enregistrez instantanément une copie de votre travail dans le coffre local sécurisé de votre navigateur grâce au nouveau bouton :accent[Save].
* **Chargement rapide** : Restaurez votre version sauvegardée à tout moment d'un simple clic sur le bouton :accent[Load] (avec demande de confirmation pour éviter toute perte accidentelle).

## 🎨 PRESETS ET CUSTOMISATION FLEXIBLES
* **Renommage universel** : Tous les boutons de presets de couleurs (B&W, Dark, Corporate Blue, Soft Blue, Soft Green, Soft Red, Custom, etc.) peuvent désormais être :accent[renommés par double-clic] ! Vos noms personnalisés sont conservés automatiquement dans votre stockage local.
* **Import/Export de configurations** : Exportez votre configuration de style au format JSON et réimportez-la en un clin d'œil depuis le menu des outils de développement (Developer Tools).

## 🖨️ IMPRESSION SANS BORDURES (FULL-BLEED)
* **Bordures blanches éliminées** : Les marges d'impression ont été déplacées à l'intérieur du document sous forme de marges internes (paddings). Cela permet aux couleurs de fond (barre latérale, thèmes sombres) de s'imprimer :accent[jusqu'au bord de la feuille] sans bordure blanche disgracieuse !
* **Format de page dynamique** : Prise en charge dynamique du format de page d'impression (A4 ou US Letter) pour correspondre exactement à votre choix de mise en page.

## ✍️ ÉDITION SIMPLIFIÉE
* **Coloration Syntaxique** : Votre texte se colore en :accent[temps réel] pour vous aider à visualiser la structure de votre document sans effort.
* **Raccourcis Clavier** : Modifiez votre texte comme dans un traitement de texte classique sans avoir besoin de connaître le Markdown :
  * :accent[Ctrl + B] : Mettre en gras
  * :accent[Ctrl + I] : Mettre en italique
  * :accent[Ctrl + K] : Insérer un lien Internet
  * :accent[Ctrl + E] : Appliquer la couleur d'accentuation (`:accent[]`)
  * :accent[Ctrl + M] : Rendre le texte discret/gris (`:muted[]`)
  * :accent[Ctrl + 1 / 2 / 3] : Créer un titre (Titre principal / Titre de colonne)
  * :accent[Ctrl + ▲ / ▼] : Déplacer une ligne ou une section entière vers le haut ou le bas

## 🎨 APPARENCE DE LA BARRE LATÉRALE
* **Position Ajustable** : Votre barre latérale peut désormais passer :accent[à gauche ou à droite] selon vos préférences esthétiques.
* **Largeur sur Mesure** : Ajustez facilement la taille de votre barre latérale à l'aide d'un curseur dédié pour équilibrer parfaitement votre mise en page.
* **Finitions Premium** : Personnalisez les bordures, ajoutez des ombres élégantes ou appliquez des dégradés de couleurs modernes sur la barre latérale pour la rendre unique.

## 🚀 MODE EXPERT
* **Puissant mais Simple** : Activez le mode expert pour débloquer des contrôles avancés de conception tout en conservant une interface propre et accessible pour vos modifications rapides.

### 📑 VERSIONING GARANTI
* **Dernière Version Assurée** : Un système de numérotation intelligent s'affiche sur votre CV.
* **Zéro Oubli** : Le numéro s'incrémente automatiquement à chaque téléchargement ou impression, garantissant que vos recruteurs consultent toujours la :accent[version la plus récente].
* **Compteur Quotidien** : Le compteur se réinitialise automatiquement chaque matin.

### ⚡ SUPER-PERFORMANCES
* **Mise à Jour Instantanée** : Les modifications s'affichent instantanément à l'écran sans aucun temps d'attente.
* **Plus de Cache** : Plus besoin de vider l'historique ou de rafraîchir la page, les nouveautés se chargent :accent[immédiatement].

## 🔗 EN SAVOIR PLUS
* **Code Source & Documentation** : Découvrez les détails techniques et le fonctionnement du projet sur le [README Jobby sur GitHub](https://github.com/gnueole/jobby-md2html#readme).
* **Historique Complet** : Retrouvez l'historique complet de toutes les versions précédentes dans le [CHANGELOG officiel sur GitHub](https://github.com/gnueole/jobby-md2html/blob/main/CHANGELOG.md).
