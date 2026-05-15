export const API_BASE = '/api';

export function getToken() {
  return localStorage.getItem('nudgel_auth_token');
}

export function setToken(token: string) {
  localStorage.setItem('nudgel_auth_token', token);
}

export function clearToken() {
  localStorage.removeItem('nudgel_auth_token');
}

export function getCurrentUser() {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch(e) {
    return null;
  }
}

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  } as Record<string, string>;

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    clearToken();
    window.location.reload();
  }

  return response;
}
