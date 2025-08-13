// API Configuration for MuseBar
// Automatically detects the appropriate backend URL for local and network access

class ApiConfig {
  private static instance: ApiConfig;
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
   * Attempts to detect the best backend URL to use
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Get the current host (works for both localhost and network IPs)
    const currentHost = window.location.hostname;

    // Define possible backend URLs to test
    const possibleUrls = [
      `http://${currentHost}:3001`, // Same host as frontend
      'http://localhost:3001', // Local fallback
      'http://127.0.0.1:3001', // IP fallback
    ];

    // Add custom backend URL from environment if available
    if (process.env.REACT_APP_API_URL) {
      possibleUrls.unshift(process.env.REACT_APP_API_URL);
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Testing backend connectivity...');
    }

    for (const url of possibleUrls) {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log(`Testing: ${url}`);
        }

        // Create AbortController for timeout
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
            if (process.env.NODE_ENV === 'development') {
              console.log(`✅ Backend connected: ${url}`);
            }
            return;
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`❌ Failed to connect to: ${url}`);
        }
        continue;
      }
    }

    // If no backend is reachable, use localhost as fallback
    console.warn('⚠️ No backend reachable, using localhost fallback');
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
