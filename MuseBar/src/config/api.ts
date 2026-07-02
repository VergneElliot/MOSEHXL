// API Configuration for MuseBar
// Automatically detects the appropriate backend URL for local and network access

class ApiConfig {
  private static instance: ApiConfig;
  /** Single shared init promise so concurrent callers await the same run (avoids 429 from health-check burst) */
  private static initPromise: Promise<void> | null = null;
  private baseURL: string;
  private isInitialized: boolean = false;

  private constructor() {
    this.baseURL = 'http://localhost:3001';
  }

  public static getInstance(): ApiConfig {
    if (!ApiConfig.instance) {
      ApiConfig.instance = new ApiConfig();
    }
    return ApiConfig.instance;
  }

  /**
   * Initialize API configuration
   * Attempts to detect the best backend URL to use.
   * Concurrent callers await the same run so only one health-probe loop executes.
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (ApiConfig.initPromise) {
      await ApiConfig.initPromise;
      return;
    }
    ApiConfig.initPromise = this.runInitialize();
    await ApiConfig.initPromise;
  }

  /**
   * Performs the actual health probes and sets baseURL.
   * Called at most once per app load via shared initPromise.
   */
  private async runInitialize(): Promise<void> {
    const currentHost = window.location.hostname;
    const currentOrigin = window.location.origin;
    const isBrowserHttps = window.location.protocol === 'https:';
    const isLocalHost = currentHost === 'localhost' || currentHost === '127.0.0.1';
    const possibleUrls = [
      ...(isBrowserHttps && !isLocalHost ? [currentOrigin] : []),
      `http://${currentHost}:3001`,
      'http://localhost:3001',
      'http://127.0.0.1:3001',
    ];
    if (import.meta.env.VITE_API_URL) {
      possibleUrls.unshift(import.meta.env.VITE_API_URL);
    }

    for (const url of possibleUrls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const response = await fetch(`${url}/api/health`, {
          method: 'GET',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'OK') {
            this.baseURL = url;
            this.isInitialized = true;
            return;
          }
        }
      } catch {
        continue;
      }
    }
    this.baseURL = 'http://localhost:3001';
    this.isInitialized = true;
  }

  /**
   * Get the base URL for API requests
   */
  public getBaseURL(): string {
    return this.baseURL;
  }

  /**
   * Get the full URL for an API endpoint
   */
  public getEndpoint(path: string): string {
    // Ensure path starts with /
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseURL}${cleanPath}`;
  }

  /**
   * Set a custom base URL (for manual configuration)
   */
  public setBaseURL(url: string): void {
    this.baseURL = url;
    this.isInitialized = true;
    // API URL manually configured
  }

  /**
   * Check if the API configuration is ready
   */
  public isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get connection info for debugging
   */
  public getConnectionInfo(): {
    baseURL: string;
    isInitialized: boolean;
    currentHost: string;
  } {
    return {
      baseURL: this.baseURL,
      isInitialized: this.isInitialized,
      currentHost: window.location.hostname,
    };
  }
}

export const apiConfig = ApiConfig.getInstance();
