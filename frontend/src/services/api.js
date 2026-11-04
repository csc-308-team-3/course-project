const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export async function request(path, options = {}) {
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