# Truchet hexagonal

Un petit atelier, dans le navigateur, pour composer des images à partir de **tuiles hexagonales de Truchet** : chaque tuile relie les milieux de ses arêtes par des arcs ou des droites, et comme ces tracés arrivent toujours perpendiculairement au milieu de l'arête, ils se raccordent avec la tuile voisine quelle que soit son orientation.

**▶ Essayer : https://pmousse.github.io/truchet-hexagon/**

## Ce qu'on peut faire

- **Dessiner ses tuiles** : cliquer deux points pour les relier (petit arc, grand arc ou droite selon l'écart entre les arêtes), activer ou non chaque tuile, régler sa fréquence. « Formes de base » ajoute d'un coup toutes les formes possibles.
- **Styler les rubans** : nombre de bandes, épaisseur, écart, profil, opacité, contour, ombre portée, motif rayé ou pointillé (animable).
- **Style par tuile** : choisir « Réglages de : Tuile … » pour qu'une tuile ait ses propres couleurs ou bandes ; les autres réglages restent communs.
- **Couleurs** : palettes prêtes à l'emploi, palettes enregistrées, import d'un JSON (`{"colors": ["#…", …]}`) ou d'une simple liste de codes hex.
- **Cadre** : formats réseaux sociaux / écran / impression ou taille libre, définition jusqu'à 8K, densité, bord à bord ou hexagones entiers, marge, fond.
- **Retoucher la grille** : clic sur une case pour la pivoter, ⇧ clic pour changer de tuile, Ctrl clic pour éditer sa tuile, Alt clic (ou clic droit) pour la rétablir.
- **Exporter** en PNG pleine définition ou en **SVG** vectoriel ; enregistrer / ouvrir le projet en `.json` ; **copier un lien de partage** qui contient tout le projet.

Raccourcis : <kbd>N</kbd> nouvelle grille, <kbd>Espace</kbd> animer, <kbd>Échap</kbd> annuler une liaison.

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
