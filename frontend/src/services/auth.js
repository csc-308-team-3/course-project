import { request } from './api';

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