import { HappyHourSettings } from '../types';
import * as settingsApi from './api/settings';

export class HappyHourService {
  private static instance: HappyHourService;
  private settings: HappyHourSettings = {
    isEnabled: true,
    startTime: '16:00',
    endTime: '19:00',
    manualOverride: 'auto',
    discountType: 'percentage',
    discountValue: 0.2,
    discountPercentage: 0.2, // Pour rétrocompatibilité
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

  /**
   * Load Happy Hour settings from the server (establishment-scoped).
   * Call when the user is authenticated so all devices see the same settings.
   * On failure (e.g. not logged in), keeps current in-memory/localStorage state.
   */
  public async loadFromApi(): Promise<void> {
    try {
      const serverSettings = await settingsApi.getHappyHourSettings();
      // Migrate legacy isManuallyActivated → manualOverride
      const legacyOverride = serverSettings.isManuallyActivated === true ? 'on' : undefined;
      this.settings = {
        ...this.settings,
        ...serverSettings,
        manualOverride: serverSettings.manualOverride ?? legacyOverride ?? 'auto',
        discountValue: typeof serverSettings.discountValue === 'number'
          ? serverSettings.discountValue
          : Number(serverSettings.discountValue) || 0.2,
      };
      try {
        localStorage.setItem('musebar-happyhour-settings', JSON.stringify(this.settings));
      } catch {
        // ignore
      }
    } catch (error) {
      // Not authenticated or network error: keep current state
    }
  }

  /**
   * Persist current settings to the server so they sync across devices.
   * Call after updateSettings or toggleManualActivation when user is authenticated.
   */
  private async persistToApi(): Promise<void> {
    try {
      const serverSettings = await settingsApi.updateHappyHourSettings(this.settings);
      this.settings = { ...this.settings, ...serverSettings };
    } catch (error) {
      // Keep local state; next loadFromApi will retry sync
    }
  }

  public getSettings(): HappyHourSettings {
    // Rétrocompatibilité : si discountType absent, utiliser discountPercentage
    const base = !this.settings.discountType
      ? {
          ...this.settings,
          discountType: 'percentage' as const,
          discountValue:
            typeof this.settings.discountPercentage === 'number'
              ? this.settings.discountPercentage
              : 0.2,
        }
      : { ...this.settings };
    // Ensure discountValue is always a number (localStorage/form may have stored string)
    const raw = base.discountValue;
    const discountValue =
      typeof raw === 'number' && !Number.isNaN(raw)
        ? raw
        : (() => {
            const n = Number(raw);
            return Number.isNaN(n) ? 0 : n;
          })();
    return { ...base, discountValue };
  }

  public updateSettings(settings: Partial<HappyHourSettings>): void {
    // Rétrocompatibilité : si discountType absent, utiliser discountPercentage
    if (settings.discountType != null && settings.discountValue !== undefined) {
      const numVal = typeof settings.discountValue === 'number'
        ? settings.discountValue
        : Number(settings.discountValue);
      this.settings.discountType = settings.discountType;
      this.settings.discountValue = Number.isNaN(numVal) ? 0 : numVal;
      this.settings.discountPercentage =
        settings.discountType === 'percentage' ? this.settings.discountValue : undefined;
    }
    this.settings = { ...this.settings, ...settings };
    // Normalize discountValue to number (form may send string)
    if (this.settings.discountValue !== undefined) {
      const n = Number(this.settings.discountValue);
      this.settings.discountValue = Number.isNaN(n) ? 0 : n;
    }
    try {
      localStorage.setItem('musebar-happyhour-settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des paramètres Happy Hour:', error);
    }
    void this.persistToApi();
  }

  public isHappyHourActive(): boolean {
    // Resolve manual override (support legacy isManuallyActivated field)
    const override = this.settings.manualOverride
      ?? (this.settings.isManuallyActivated === true ? 'on' : 'auto');

    if (override === 'on') return true;   // forced ON
    if (override === 'off') return false; // forced OFF

    // 'auto': follow the schedule only when enabled
    if (!this.settings.isEnabled) return false;
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    return this.isTimeInRange(currentTime, this.settings.startTime, this.settings.endTime);
  }

  /**
   * Toggle the manual override based on the *current* active status.
   * - If HH is currently active  → force OFF  ('off')
   * - If HH is currently inactive → force ON   ('on')
   * Pressing again when already in a forced state reverses the force,
   * giving the user a clean way to override in either direction.
   */
  public toggleManualActivation(): void {
    const currentlyActive = this.isHappyHourActive();
    this.settings.manualOverride = currentlyActive ? 'off' : 'on';
    // Keep legacy field in sync for any old code that may still read it
    this.settings.isManuallyActivated = this.settings.manualOverride === 'on';
    try {
      localStorage.setItem('musebar-happyhour-settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'activation manuelle Happy Hour:', error);
    }
    void this.persistToApi();
  }

  public getDiscountPercentage(): number {
    if (!this.isHappyHourActive()) return 0;
    if (this.settings.discountType === 'percentage') {
      return typeof this.settings.discountValue === 'number' ? this.settings.discountValue : 0;
    }
    // fallback rétrocompatibilité
    return typeof this.settings.discountPercentage === 'number'
      ? this.settings.discountPercentage
      : 0;
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
