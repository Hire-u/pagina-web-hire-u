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

  getStepFields(index) {
    return [...this.getElement('profileForm').querySelector(`[data-profile-step="${index}"]`)
      .querySelectorAll('input, select, textarea')];
  }

  showStep(index) {
    const steps = [...this.getElement('profileForm').querySelectorAll('[data-profile-step]')];
    const titles = ['Datos personales', 'Formación académica', 'Seguridad de la cuenta'];
    steps.forEach((step, stepIndex) => {
      step.hidden = stepIndex !== index;
    });
    this.document.querySelectorAll('[data-step-indicator]').forEach((indicator, stepIndex) => {
      indicator.classList.toggle('active', stepIndex === index);
      indicator.classList.toggle('completed', stepIndex < index);
      if (stepIndex === index) indicator.setAttribute('aria-current', 'step');
      else indicator.removeAttribute('aria-current');
    });

    const stepNumber = index + 1;
    const progressTrack = this.document.querySelector('.profile-progress-track');
    this.getElement('stepCaption').textContent = `ETAPA ${stepNumber} DE ${steps.length}`;
    this.getElement('stepTitle').textContent = titles[index];
    this.getElement('profileProgress').style.width = `${(stepNumber / steps.length) * 100}%`;
    progressTrack.setAttribute('aria-valuenow', stepNumber);
    this.getElement('previousStep').hidden = index === 0;
    this.getElement('nextStep').hidden = index === steps.length - 1;
    this.getElement('submitProfile').hidden = index !== steps.length - 1;
    steps[index].querySelector('input, select, textarea')?.focus({ preventScroll: true });
  }

  setMessage(message, isError = false) {
    const status = this.getElement('profileMessage');
    status.textContent = message;
    status.classList.toggle('error', isError);
  }

  setLoading(isLoading) {
    const button = this.getElement('submitProfile');
    button.disabled = isLoading;
    button.querySelector('span').textContent = isLoading ? '…' : '✓';
    button.firstChild.textContent = isLoading ? 'Creando perfil ' : 'Crear perfil ';
  }

  setPasswordStrength(score, message) {
    const strengthBar = this.getElement('passwordStrengthBar');
    strengthBar.style.width = `${score * 25}%`;
    strengthBar.dataset.strength = score;
    this.getElement('passwordStrengthText').textContent = message;
  }

  togglePassword(inputId, button) {
    const input = this.getElement(inputId);
    const showPassword = input.type === 'password';
    input.type = showPassword ? 'text' : 'password';
    button.setAttribute('aria-label', showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña');
    button.title = showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña';
  }

  setCharacterCount(value) {
    this.getElement('profileCharacterCount').textContent = value.length;
  }
}