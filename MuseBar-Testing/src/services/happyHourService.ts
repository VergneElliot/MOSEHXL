import { HappyHourSettings } from '../types';

export class HappyHourService {
  private static instance: HappyHourService;
  private settings: HappyHourSettings = {
    isEnabled: true,
    startTime: "16:00",
    endTime: "19:00",
    isManuallyActivated: false,
    discountType: 'percentage',
    discountValue: 0.20,
    discountPercentage: 0.20 // Pour rétrocompatibilité
  };

  private constructor() {
    try {
      const saved = localStorage.getItem('musebar-happyhour-settings');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres Happy Hour:', error);
    }
  }

  public static getInstance(): HappyHourService {
    if (!HappyHourService.instance) {
      HappyHourService.instance = new HappyHourService();
    }
    return HappyHourService.instance;
  }

  public getSettings(): HappyHourSettings {
    // Rétrocompatibilité : si discountType absent, utiliser discountPercentage
    if (!this.settings.discountType) {
      return {
        ...this.settings,
        discountType: 'percentage',
        discountValue: typeof this.settings.discountPercentage === 'number' ? this.settings.discountPercentage : 0.20
      };
    }
    return { ...this.settings };
  }

  public updateSettings(settings: Partial<HappyHourSettings>): void {
    // Rétrocompatibilité : si discountType absent, utiliser discountPercentage
    if (settings.discountType && typeof settings.discountValue === 'number') {
      this.settings.discountType = settings.discountType;
      this.settings.discountValue = settings.discountValue;
      this.settings.discountPercentage = settings.discountType === 'percentage' ? settings.discountValue : undefined;
    }
    this.settings = { ...this.settings, ...settings };
    // Sauvegarde dans localStorage
    try {
      localStorage.setItem('musebar-happyhour-settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des paramètres Happy Hour:', error);
    }
  }

  public isHappyHourActive(): boolean {
    // Si l'Happy Hour est désactivé globalement
    if (!this.settings.isEnabled) {
      return false;
    }

    // Si l'Happy Hour est activé manuellement
    if (this.settings.isManuallyActivated) {
      return true;
    }

    // Vérification automatique basée sur l'heure
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // Format "HH:mm"
    
    return this.isTimeInRange(currentTime, this.settings.startTime, this.settings.endTime);
  }

  public toggleManualActivation(): void {
    this.settings.isManuallyActivated = !this.settings.isManuallyActivated;
  }

  public getDiscountPercentage(): number {
    if (!this.isHappyHourActive()) return 0;
    if (this.settings.discountType === 'percentage') {
      return typeof this.settings.discountValue === 'number' ? this.settings.discountValue : 0;
    }
    // fallback rétrocompatibilité
    return typeof this.settings.discountPercentage === 'number' ? this.settings.discountPercentage : 0;
  }

  private isTimeInRange(currentTime: string, startTime: string, endTime: string): boolean {
    const current = this.timeToMinutes(currentTime);
    const start = this.timeToMinutes(startTime);
    const end = this.timeToMinutes(endTime);

    if (start <= end) {
      // Cas normal (ex: 16:00 à 19:00)
      return current >= start && current <= end;
    } else {
      // Cas où l'heure de fin est le lendemain (ex: 22:00 à 02:00)
      return current >= start || current <= end;
    }
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  public getTimeUntilHappyHour(): string {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    const startMinutes = this.timeToMinutes(this.settings.startTime);
    const currentMinutes = this.timeToMinutes(currentTime);
    
    let minutesUntil = startMinutes - currentMinutes;
    
    if (minutesUntil <= 0) {
      minutesUntil += 24 * 60; // Ajouter 24h si c'est déjà passé aujourd'hui
    }
    
    const hours = Math.floor(minutesUntil / 60);
    const minutes = minutesUntil % 60;
    
    return `${hours < 10 ? '0' : ''}${hours}:${minutes < 10 ? '0' : ''}${minutes}`;
  }
} 