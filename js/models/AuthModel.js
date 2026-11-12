export class AuthModel {
  async request(path, method = 'GET', data = undefined) {
    let response;
    try {
      response = await fetch(path, {
        method,
        credentials: 'same-origin',
        headers: data ? { 'Content-Type': 'application/json' } : undefined,
        body: data ? JSON.stringify(data) : undefined
      });
    } catch {
      throw new Error('No se pudo conectar con la API. Inicia MySQL y el backend con «npm run dev».');
    }

    const contentType = response.headers.get('content-type') || '';
    if (response.status !== 204 && !contentType.includes('application/json')) {
      throw new Error('Estás usando la vista previa estática. Inicia «npm run dev» y abre Hire-U en http://localhost:3000.');
    }
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

  requestPasswordReset(email) {
    return this.request('/api/auth/forgot-password', 'POST', { email });
  }

  resetPassword(credentials) {
    return this.request('/api/auth/reset-password', 'POST', credentials);
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