/**
 * API utility functions for making requests to the server
 */

// Check if the user is authenticated
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('token');
};

// Get the authentication token
export const getToken = (): string | null => {
  return localStorage.getItem('token');
};

// Set the authentication token
export const setToken = (token: string): void => {
  localStorage.setItem('token', token);
};

// Remove the authentication token
export const removeToken = (): void => {
  localStorage.removeItem('token');
};

// API request function
export const apiRequest = async <T>(
  endpoint: string,
  options?: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    data?: any;
    headers?: Record<string, string>;
  }
): Promise<T> => {
  const url = endpoint.startsWith('http') ? endpoint : endpoint;

  const fetchOptions: RequestInit = {
    method: options?.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include', // Include cookies in the request
  };

  if (options?.data) {
    fetchOptions.body = JSON.stringify(options.data);
  }

  try {
    const response = await fetch(url, fetchOptions);

    // Handle unauthorized responses
    if (response.status === 401) {
      // Redirect to login page if unauthorized
      window.location.href = '/auth';
      throw new Error('Unauthorized');
    }

    // Handle other error responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'An error occurred');
    }

    // For 204 No Content responses, return an empty object
    if (response.status === 204) {
      return {} as T;
    }

    // Parse JSON response for other successful responses
    const data = await response.json();
    return data as T;
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
};
