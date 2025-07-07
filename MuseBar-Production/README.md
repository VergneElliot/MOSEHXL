# MuseBar - Système de Caisse

Un système de management complet pour bar avec gestion de caisse, menu, Happy Hour et paramètres.

## 🍺 Fonctionnalités

### 💰 Système de Caisse
- Interface de vente intuitive
- Calcul automatique des taxes (20% alcool, 10% softs)
- Gestion des commandes en temps réel
- Calcul automatique du rendu

### 📋 Gestion du Menu
- **Catégories** : Création, modification, suppression
- **Produits** : Ajout, édition, suppression avec prix et taxes
- Interface simple et rapide pour modifier l'offre
- Gestion de l'état actif/inactif des produits

### 🎉 Système Happy Hour
- **Activation automatique** : 16h-19h par défaut (configurable)
- **Activation manuelle** : Contrôle à la demande
- **Produits éligibles** : Configuration par produit
- **Réductions personnalisées** : Différents pourcentages par produit

### ⚙️ Paramètres
- Informations du bar
- Configuration système
- Gestion des devises et langues

## 🚀 Installation

1. **Cloner le projet**
```bash
git clone <url-du-repo>
cd MuseBar
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Lancer l'application**
```bash
npm start
```

L'application sera accessible sur `http://localhost:3000`

## 📱 Utilisation

### Onglet Caisse
- Sélectionnez une catégorie ou "Tout" pour voir les produits
- Cliquez sur un produit pour l'ajouter à la commande
- Ajustez les quantités avec les boutons +/-
- Le système calcule automatiquement les taxes et réductions Happy Hour
- Cliquez sur "Payer" pour finaliser la transaction

### Onglet Gestion Menu
- **Nouvelle Catégorie** : Créez des catégories (bières, cocktails, etc.)
- **Nouveau Produit** : Ajoutez des produits avec prix, taxes et éligibilité Happy Hour
- **Modification** : Cliquez sur les icônes d'édition pour modifier
- **Suppression** : Utilisez les icônes de suppression (attention : impossible de supprimer une catégorie avec des produits)

### Onglet Happy Hour
- **Statut** : Voir si l'Happy Hour est actif
- **Contrôle manuel** : Activer/désactiver manuellement
- **Paramètres** : Modifier les heures et la réduction par défaut
- **Produits éligibles** : Voir tous les produits qui bénéficient de l'Happy Hour

### Onglet Paramètres
- Configurez les informations de votre bar
- Ajustez les paramètres système
- Consultez les informations sur le système

## 🎯 Fonctionnalités Clés

### Gestion des Taxes Françaises
- **20%** : Tous les produits contenant de l'alcool
- **10%** : Boissons non alcoolisées et snacks
- Calcul automatique intégré dans le système de caisse

### Happy Hour Intelligent
- **Automatique** : S'active de 16h à 19h (configurable)
- **Manuel** : Contrôle à la demande
- **Produits éligibles** : Seuls les produits marqués bénéficient de la réduction
- **Réductions personnalisées** : Chaque produit peut avoir sa propre réduction

### Interface Intuitive
- Design moderne avec Material-UI
- Navigation par onglets claire
- Responsive design pour tablettes et ordinateurs
- Notifications en temps réel

## 💾 Stockage des Données

Actuellement, l'application utilise le **localStorage** du navigateur pour stocker :
- Catégories et produits
- Paramètres Happy Hour
- Configuration générale

**Note** : Pour une utilisation en production, il est recommandé d'implémenter une base de données et un système de sauvegarde.

## 🔧 Développement

### Structure du Projet
```
src/
├── components/          # Composants React
│   ├── POS.tsx         # Interface de caisse
│   ├── MenuManagement.tsx # Gestion du menu
│   ├── HappyHourControl.tsx # Contrôle Happy Hour
│   └── Settings.tsx    # Paramètres
├── services/           # Services métier
│   ├── dataService.ts  # Gestion des données
│   └── happyHourService.ts # Logique Happy Hour
├── types/              # Types TypeScript
│   └── index.ts        # Définitions des interfaces
├── App.tsx             # Composant principal
└── index.tsx           # Point d'entrée
```

### Technologies Utilisées
- **React 18** avec TypeScript
- **Material-UI** pour l'interface
- **LocalStorage** pour la persistance
- **UUID** pour les identifiants uniques

## 🚀 Prochaines Étapes

- [ ] Base de données (SQLite/PostgreSQL)
- [ ] Système d'authentification
- [ ] Gestion des employés et horaires
- [ ] Gestion du stock
- [ ] Rapports et statistiques
- [ ] Impression de tickets
- [ ] Mode hors ligne
- [ ] Application mobile

## 📞 Support

Pour toute question ou suggestion, n'hésitez pas à ouvrir une issue sur le repository.

---

**MuseBar** - Votre partenaire pour une gestion de bar moderne et efficace ! 🍻 