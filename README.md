# Truchet hexagonal

Un petit atelier, dans le navigateur, pour composer des images à partir de **tuiles hexagonales de Truchet** : chaque tuile relie les milieux de ses arêtes par des arcs ou des droites, et comme ces tracés arrivent toujours perpendiculairement au milieu de l'arête, ils se raccordent avec la tuile voisine quelle que soit son orientation.

**▶ Essayer : https://pmousse.github.io/truchet-hexagon/**

## Ce qu'on peut faire

- **Dessiner ses tuiles** : cliquer deux points pour les relier (petit arc, grand arc ou droite selon l'écart entre les arêtes), activer ou non chaque tuile, régler sa fréquence. « Formes de base » ajoute d'un coup toutes les formes possibles.
- **Styler les rubans** : nombre de bandes, épaisseur, écart, profil, opacité, contour, ombre portée, relief des bandes.
- **Sélection de tuiles** : clic pour en choisir une, <kbd>Ctrl</kbd> clic pour en ajouter ou retirer, <kbd>Maj</kbd> clic pour une plage. Activer, fréquence, dupliquer et supprimer s'appliquent à toute la sélection.
- **Style par tuile** : dans Style, « Appliquer à : Sélection » donne aux tuiles sélectionnées leurs propres couleurs ou bandes ; les autres réglages restent communs.
- **Couleurs** : palettes prêtes à l'emploi, palettes enregistrées, import d'un JSON (`{"colors": ["#…", …]}`) ou d'une simple liste de codes hex.
- **Cadre** : le format se choisit dans les pastilles au-dessus de l'image (1:1, 4:5, 16:9… ou taille libre). La fenêtre **Exporter** règle le côté long (1K à 8K), la marge et le fond transparent. Densité, cadrage (bord à bord ou hexagones entiers) et couleur de fond sont dans « Grille & cadre ».
- **Retoucher la grille** : clic sur une case pour la pivoter, ⇧ clic pour changer de tuile, Ctrl clic pour éditer sa tuile, Alt clic (ou clic droit) pour la rétablir.
- **Projets** : enregistrer l'état complet sous un nom (tuiles, style, couleurs, cadre, cases retouchées), le rouvrir plus tard, et exporter / importer tous les projets dans un fichier `.json`.
- **Exporter** en PNG pleine définition ou en **SVG** vectoriel ; **copier un lien de partage** qui contient tout le projet.

Raccourcis : <kbd>N</kbd> nouvelle grille, <kbd>Échap</kbd> annuler une liaison.

## Organisation du code

Aucune dépendance ni étape de construction : on peut aussi ouvrir `index.html` directement depuis le disque.

| Fichier | Rôle |
| --- | --- |
| `index.html` | structure de la page |
| `css/app.css` | présentation (thème clair / sombre automatique, mise en page mobile) |
| `js/core.js` | géométrie d'une tuile, appariements, hasard reproductible, couleurs |
| `js/render.js` | cadrage, enchaînement des connexions en courbes, bandes, peinture canvas et SVG |
| `js/app.js` | état du projet, interface, sauvegarde locale, export, partage |

Toute la géométrie est calculée dans un repère où le rayon d'un hexagone vaut 1 : l'aperçu et l'export pleine définition partagent exactement le même dessin.
