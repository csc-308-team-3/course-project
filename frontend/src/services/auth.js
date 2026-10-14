const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

async function request(path, options) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = response.status === 204 ? null : await response.json();

  if (!response.ok) {
    throw new Error(data?.message ?? 'Something went wrong. Please try again.');
  }

  return data;
}

export function login(credentials) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

export function register(details) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(details),
  });
}

export function getSession() {
  return request('/auth/session', { method: 'GET' });
}

export function logout() {
  return request('/auth/logout', { method: 'POST' });
}
