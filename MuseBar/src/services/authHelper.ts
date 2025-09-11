/**
 * Helper to ensure authentication token is set for API calls
 */
export function getAuthToken(): string | null {
  // Try to get token from localStorage
  const token = localStorage.getItem('auth_token');
  return token;
}

export function ensureAuthentication(): void {
  const token = getAuthToken();
  if (token) {
    // Import dynamically to avoid circular dependencies
    import('./apiService').then(({ ApiService }) => {
      ApiService.setToken(token);
    });
  }
}
