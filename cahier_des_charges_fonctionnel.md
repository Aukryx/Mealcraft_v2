# Cahier des charges fonctionnel — MealCraft

## 1) Objet
Définir les fonctionnalités attendues pour l’application mobile MealCraft.

## 2) Périmètre

### Inclus (MVP)
- Recherche de recettes par ingrédients disponibles.
- Consultation d’une fiche recette détaillée.
- Planification hebdomadaire des repas (midi/soir).
- Gestion des favoris.

### Hors périmètre (phase ultérieure)
- Commande de courses en ligne.
- Synchronisation multi-appareils.
- Recommandations IA avancées.

## 3) Utilisateurs cibles
- Utilisateur particulier souhaitant cuisiner avec ce qu’il a déjà.
- Niveau débutant à intermédiaire en cuisine.

## 4) Exigences fonctionnelles

### F1 — Recherche par ingrédients
- Saisie de 1 à N ingrédients sous forme de tags.
- Affichage d’une liste de recettes triées par pertinence.
- Affichage du nombre d’ingrédients manquants par recette.

**Critères d’acceptation**
- Si l’utilisateur saisit au moins 1 ingrédient, une liste de recettes s’affiche.
- Chaque résultat indique les ingrédients utilisés/manquants.

### F2 — Consultation de recette
- Affichage du titre, image, durée de préparation, portions.
- Affichage des étapes de préparation.
- Affichage des informations nutritionnelles (kcal, protéines, glucides, lipides).

**Critères d’acceptation**
- La fiche recette est consultable depuis la recherche, le planning et les favoris.

### F3 — Planning de repas
- Vue hebdomadaire (lundi à dimanche).
- Deux créneaux par jour : midi, soir.
- Ajout/suppression d’une recette sur un créneau.
- Sélection du nombre de portions consommées lors de l’ajout au planning.
- Calcul du total nutritionnel journalier pondéré par les portions consommées.

**Critères d’acceptation**
- Un repas planifié reste visible après fermeture/réouverture de l’app.
- Le total nutritionnel du jour se met à jour après ajout/suppression.
- Le calcul nutritionnel applique la formule :
	- `Total consommé = Total recette × (Portions consommées / Portions recette)`.

### F4 — Favoris
- Ajout/retrait d’une recette en favoris.
- Liste dédiée des recettes favorites.

**Critères d’acceptation**
- Les favoris restent persistés localement.

### F5 — Liste de courses (optionnelle)
- Génération d’une liste d’ingrédients à partir des repas planifiés.

### F6 — États vides (Empty States)
- Si aucune donnée n’est disponible, afficher un écran vide pédagogique avec action principale.
- Cas minimum :
	- recherche sans ingrédient saisi,
	- planning sans repas,
	- favoris vides.

**Critères d’acceptation**
- Aucun écran métier ne doit afficher une zone vide sans message.
- Chaque état vide propose au moins un CTA explicite (ex. « Ajouter mon premier ingrédient »).

## 5) Parcours utilisateur (résumé)
1. L’utilisateur saisit ses ingrédients.
2. Il consulte les résultats et ouvre une recette.
3. Il ajoute la recette au planning (midi/soir).
4. Il consulte les apports nutritionnels journaliers.
5. Il enregistre ses recettes favorites.

## 6) Écrans
- **Accueil** : recherche ingrédients + résultats.
- **Recette** : détails, nutrition, action “Ajouter au planning”, “Favori”.
- **Planning** : semaine + créneaux + sélection des portions + total nutrition journalier.
- **Favoris** : liste des recettes enregistrées.

## 7) Exigences non fonctionnelles
- UX mobile fluide sur Android/iOS récents.
- Temps d’affichage cible d’une recette déjà chargée : < 2 s.
- Consultation du planning disponible hors ligne.