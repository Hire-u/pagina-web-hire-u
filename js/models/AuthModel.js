export class AuthModel {
  async request(path, method = 'GET', data = undefined) {
    const response = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: data ? { 'Content-Type': 'application/json' } : undefined,
      body: data ? JSON.stringify(data) : undefined
    });
    const payload = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.message || 'No se pudo completar la solicitud.');
    return payload;
  }

  register(profile) {
    return this.request('/api/auth/register', 'POST', profile);
  }

  login(credentials) {
    return this.request('/api/auth/login', 'POST', credentials);
  }

  async currentUser() {
    const response = await fetch('/api/auth/me', { credentials: 'same-origin' });
    if (response.status === 401) return null;
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.message || 'No se pudo verificar la sesión.');
    return payload.user;
  }

  logout() {
    return this.request('/api/auth/logout', 'POST', {});
  }
}