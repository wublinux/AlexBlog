import { cmsRequest } from './api';

export interface UserInfo {
  login: string;
  avatar: string;
  permission: 'write' | 'maintain' | 'admin';
}

export async function fetchCurrentUser(): Promise<UserInfo | null> {
  const response = await cmsRequest<{ user: UserInfo | null }>('/admin/api/auth/me');
  return response.user;
}

export function beginLogin(): void {
  window.location.assign('/admin/api/auth/login');
}

export async function logout(): Promise<void> {
  await cmsRequest<{ success: true }>('/admin/api/auth/logout', { method: 'POST' });
  window.location.assign('/admin/');
}
