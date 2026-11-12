export class ProfileController {
  constructor(authModel, view) {
    this.authModel = authModel;
    this.view = view;
    this.currentStep = 0;
  }

  start() {
    this.view.getElement('profileForm').addEventListener('submit', event => this.handleSubmit(event));
    this.view.getElement('nextStep').addEventListener('click', () => this.nextStep());
    this.view.getElement('previousStep').addEventListener('click', () => this.previousStep());
    this.view.getElement('password').addEventListener('input', event => this.updatePasswordStrength(event.target.value));
    this.view.getElement('professionalProfile').addEventListener('input', event => {
      this.view.setCharacterCount(event.target.value);
    });
    this.view.document.querySelectorAll('[data-toggle-password]').forEach(button => {
      button.addEventListener('click', () => this.view.togglePassword(button.dataset.togglePassword, button));
    });
    this.view.getElement('backToHome').addEventListener('click', event => this.returnToPreviousPage(event));
    this.view.showStep(0);
    this.view.setPasswordStrength(0, 'Usa al menos 8 caracteres.');
  }

  nextStep() {
    const fields = this.view.getStepFields(this.currentStep);
    fields.forEach(field => field.setCustomValidity(''));
    const emptyRequiredField = fields.find(field => field.required && !field.value.trim());
    if (emptyRequiredField) {
      emptyRequiredField.setCustomValidity('Completa este campo.');
      emptyRequiredField.reportValidity();
      return;
    }
    const invalidField = fields.find(field => !field.checkValidity());
    if (invalidField) {
      invalidField.reportValidity();
      return;
    }
    this.currentStep = Math.min(this.currentStep + 1, 2);
    this.view.setMessage('');
    this.view.showStep(this.currentStep);
  }

  previousStep() {
    this.currentStep = Math.max(this.currentStep - 1, 0);
    this.view.setMessage('');
    this.view.showStep(this.currentStep);
  }

  updatePasswordStrength(password) {
    const checks = [
      password.length >= 8,
      password.length >= 12,
      /[a-z]/.test(password) && /[A-Z]/.test(password),
      /\d/.test(password),
      /[^A-Za-z0-9]/.test(password)
    ];
    const score = Math.min(checks.filter(Boolean).length, 4);
    const messages = ['Usa al menos 8 caracteres.', 'Débil: agrega más caracteres.', 'Regular: combina distintos tipos de caracteres.', 'Buena: añade un número o símbolo.', 'Fuerte: contraseña difícil de adivinar.'];
    this.view.setPasswordStrength(score, password ? messages[score] : messages[0]);
  }

  returnToPreviousPage(event) {
    if (window.history.length < 2 || !document.referrer) return;
    try {
      if (new URL(document.referrer).origin === window.location.origin) {
        event.preventDefault();
        window.history.back();
      }
    } catch {
      // Si el referrer no es una URL válida, se conserva el enlace de respaldo.
    }
  }

  async handleSubmit(event) {
    event.preventDefault();
    if (this.currentStep < 2) {
      this.nextStep();
      return;
    }
    if (!this.view.getElement('profileForm').reportValidity()) return;
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
      window.location.assign('./index.html');
    } catch (error) {
      this.view.setMessage(error.message, true);
      this.view.setLoading(false);
    }
  }
}