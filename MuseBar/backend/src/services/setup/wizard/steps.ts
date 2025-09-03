import { SetupStep } from '../types';

export function getSetupSteps(): SetupStep[] {
  return [
    {
      id: 'invitation',
      name: "Validation de l'invitation",
      description: "Vérification du token d'invitation",
      required: true,
      completed: false,
      order: 1
    },
    {
      id: 'user_info',
      name: 'Informations utilisateur',
      description: 'Création du compte administrateur',
      required: true,
      completed: false,
      order: 2
    },
    {
      id: 'business_info',
      name: "Informations établissement",
      description: "Configuration des données de l'entreprise",
      required: true,
      completed: false,
      order: 3
    },
    {
      id: 'schema_setup',
      name: 'Initialisation base de données',
      description: "Création du schéma établissement",
      required: true,
      completed: false,
      order: 4
    },
    {
      id: 'default_data',
      name: 'Données par défaut',
      description: 'Création des catégories et produits de base',
      required: true,
      completed: false,
      order: 5
    },
    {
      id: 'finalization',
      name: 'Finalisation',
      description: 'Finalisation de la configuration',
      required: true,
      completed: false,
      order: 6
    }
  ];
}


