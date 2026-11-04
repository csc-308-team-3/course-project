import { request } from './api';

export function getProfile() {
  return request('/api/profile/me', {
    method: 'GET',
  });
}

export function updateProfile(details) {
  return request('/api/profile/me', {
    method: 'PATCH',
    body: JSON.stringify(details),
  });
}