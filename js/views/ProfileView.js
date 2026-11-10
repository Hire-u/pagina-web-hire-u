export class ProfileView {
  constructor(documentRef = document) {
    this.document = documentRef;
  }

  getElement(id) {
    return this.document.getElementById(id);
  }

  getFormData() {
    return Object.fromEntries(new FormData(this.getElement('profileForm')));
  }

  setMessage(message, isError = false) {
    const status = this.getElement('profileMessage');
    status.textContent = message;
    status.classList.toggle('error', isError);
  }

  setLoading(isLoading) {
    const button = this.getElement('profileForm').querySelector('[type="submit"]');
    button.disabled = isLoading;
    button.textContent = isLoading ? 'Creando perfil…' : 'Crear perfil';
  }
}