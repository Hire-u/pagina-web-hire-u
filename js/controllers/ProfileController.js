export class ProfileController {
  constructor(authModel, view) {
    this.authModel = authModel;
    this.view = view;
  }

  start() {
    this.view.getElement('profileForm').addEventListener('submit', event => this.handleSubmit(event));
  }

  async handleSubmit(event) {
    event.preventDefault();
    const profile = this.view.getFormData();
    if (profile.password !== profile.confirmPassword) {
      this.view.setMessage('Las contraseñas no coinciden.', true);
      return;
    }
    const { confirmPassword, ...account } = profile;

    this.view.setLoading(true);
    this.view.setMessage('');
    try {
      await this.authModel.register(account);
      this.view.setMessage('Perfil creado. Redirigiendo…');
      window.location.assign('/');
    } catch (error) {
      this.view.setMessage(error.message, true);
      this.view.setLoading(false);
    }
  }
}