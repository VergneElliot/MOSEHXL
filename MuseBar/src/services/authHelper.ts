/**
 * Helper to ensure authentication token is set for API calls
 */

// Store a reference to the setToken function to avoid circular dependencies
let setTokenFunction: ((token: string | null) => void) | null = null;

export function registerSetTokenFunction(setToken: (token: string | null) => void) {
  setTokenFunction = setToken;
}

export function getAuthToken(): string | null {
  // Try to get token from localStorage
  const token = localStorage.getItem('auth_token');
  return token;
}

export function ensureAuthentication(): void {
  const token = getAuthToken();
  console.log('🔐 ensureAuthentication: Token from localStorage:', token ? 'Present' : 'Missing');
  console.log('🔐 ensureAuthentication: setTokenFunction available:', !!setTokenFunction);
  
  if (token && setTokenFunction) {
    // Set token synchronously to avoid race conditions
    setTokenFunction(token);
    console.log('🔐 ensureAuthentication: Token set successfully');
  } else {
    console.log('🔐 ensureAuthentication: Cannot set token - missing token or setTokenFunction');
  }
}
