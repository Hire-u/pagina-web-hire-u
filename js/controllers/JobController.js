export class JobController {
  constructor(model, view, authModel) {
    this.model = model;
    this.view = view;
    this.authModel = authModel;
    this.visibleJobs = [];
  }

  start() {
    this.bindEvents();
    this.applyFilters();
    this.restoreSession();
    this.handlePasswordResetLink();
  }

  bindEvents() {
    this.view.getElement('applyFilters').addEventListener('click', () => this.applyFilters());
    this.view.getElement('clearFilters').addEventListener('click', () => this.clearFilters());
    this.view.getElement('emptyClear').addEventListener('click', () => this.clearFilters());
    this.view.getElement('sortJobs').addEventListener('change', () => this.applyFilters());
    this.view.getElement('filterKeyword').addEventListener('keydown', event => {
      if (event.key === 'Enter') this.applyFilters();
    });
    this.view.getElement('heroSearch').addEventListener('submit', event => this.handleHeroSearch(event));
    this.view.getElement('jobsGrid').addEventListener('click', event => this.handleJobGridClick(event));
    this.view.getElement('jobModal').addEventListener('click', event => this.handleJobModalClick(event));
    this.view.getElement('loginForm').addEventListener('submit', event => this.handleLoginSubmit(event));
    this.view.getElement('forgotPasswordForm').addEventListener('submit', event => this.handleForgotPasswordSubmit(event));
    this.view.getElement('resetPasswordForm').addEventListener('submit', event => this.handleResetPasswordSubmit(event));
    this.view.getElement('showForgotPassword').addEventListener('click', () => this.view.showForgotPasswordForm());
    this.view.document.querySelectorAll('[data-show-login]').forEach(button => {
      button.addEventListener('click', () => this.view.showLoginForm());
    });
    this.view.document.querySelectorAll('[data-auth-logout]').forEach(button => {
      button.addEventListener('click', () => this.handleLogout());
    });
    this.view.getElement('menuButton').addEventListener('click', () => this.view.toggleMenu());
    this.view.getElement('filterToggle').addEventListener('click', () => this.view.toggleFilters());

    this.view.document.querySelectorAll('[data-quick-search]').forEach(button => {
      button.addEventListener('click', () => this.handleQuickSearch(button.dataset.quickSearch));
    });
    this.view.document.querySelectorAll('[data-open-login]').forEach(button => {
      button.addEventListener('click', () => {
        this.view.showLoginForm();
        this.view.showLoginModal();
      });
    });
    this.view.document.querySelector('[data-close-modal]').addEventListener('click', () => this.view.closeJobModal());
    this.view.document.querySelector('[data-close-login]').addEventListener('click', () => this.view.closeLoginModal());
  }

  applyFilters() {
    this.visibleJobs = this.model.getJobs(this.view.getFilters());
    this.view.renderJobs(this.visibleJobs, this.model.getSavedJobs(), this.model.jobs.length);
    if (this.view.isMobileLayout()) this.view.closeFilters();
  }

  clearFilters() {
    this.view.resetFilters();
    this.applyFilters();
  }

  handleHeroSearch(event) {
    event.preventDefault();
    const search = this.view.getHeroSearch();
    const location = this.model.getLocations().find(option => option.toLowerCase() === search.location.toLowerCase());
    const keyword = search.location && !location
      ? `${search.keyword} ${search.location}`.trim()
      : search.keyword;
    this.view.setSearchInputs(keyword, location || '');
    this.applyFilters();
    this.view.scrollToJobs();
  }

  handleQuickSearch(query) {
    this.view.getElement('heroKeyword').value = query;
    this.view.getElement('filterKeyword').value = query;
    this.applyFilters();
    this.view.scrollToJobs();
  }

  handleJobGridClick(event) {
    const saveButton = event.target.closest('[data-save]');
    if (saveButton) {
      const id = Number(saveButton.dataset.save);
      const saved = this.model.toggleSaved(id);
      this.renderVisibleJobs();
      this.view.showToast(saved ? 'Vacante guardada' : 'Vacante eliminada de guardados');
      return;
    }

    const detailsButton = event.target.closest('[data-details]');
    if (detailsButton) this.openJob(Number(detailsButton.dataset.details));
  }

  handleJobModalClick(event) {
    const modal = this.view.getElement('jobModal');
    if (event.target === modal) {
      this.view.closeJobModal();
      return;
    }

    const saveButton = event.target.closest('[data-modal-save]');
    if (!saveButton) return;
    this.model.toggleSaved(Number(saveButton.dataset.modalSave));
    this.view.closeJobModal();
    this.renderVisibleJobs();
    this.view.showToast('Lista de guardados actualizada');
  }

  openJob(id) {
    const job = this.model.getJob(id);
    if (job) this.view.renderJobDetails(job, this.model.isSaved(id));
  }

  renderVisibleJobs() {
    this.view.renderJobs(this.visibleJobs, this.model.getSavedJobs(), this.model.jobs.length);
  }

  async handleLoginSubmit(event) {
    event.preventDefault();
    this.view.setLoginLoading(true);
    this.view.showLoginMessage('');
    try {
      const { user } = await this.authModel.login(this.view.getLoginCredentials());
      this.view.setAuthenticatedUser(user);
      this.view.closeLoginModal();
      this.view.showToast(`Bienvenido, ${user.fullName}`);
      this.view.getElement('loginForm').reset();
    } catch (error) {
      this.view.showLoginMessage(error.message);
    } finally {
      this.view.setLoginLoading(false);
    }
  }

  handlePasswordResetLink() {
    const url = new URL(this.view.document.location.href);
    const token = url.searchParams.get('resetToken');
    if (!token) return;
    this.view.showResetPasswordForm(token);
    url.searchParams.delete('resetToken');
    this.view.document.defaultView.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }

  async handleForgotPasswordSubmit(event) {
    event.preventDefault();
    const formId = 'forgotPasswordForm';
    this.view.showFormMessage(formId, '');
    this.view.setFormLoading(formId, true, 'Enviando…', 'Enviar enlace de recuperación');
    try {
      const { message } = await this.authModel.requestPasswordReset(this.view.getForgotPasswordEmail());
      this.view.showFormMessage(formId, message);
    } catch (error) {
      this.view.showFormMessage(formId, error.message);
    } finally {
      this.view.setFormLoading(formId, false, '', 'Enviar enlace de recuperación');
    }
  }

  async handleResetPasswordSubmit(event) {
    event.preventDefault();
    const formId = 'resetPasswordForm';
    const credentials = this.view.getResetPasswordCredentials();
    if (credentials.password !== credentials.confirmPassword) {
      this.view.showFormMessage(formId, 'Las contraseñas no coinciden.');
      return;
    }

    this.view.showFormMessage(formId, '');
    this.view.setFormLoading(formId, true, 'Actualizando…', 'Actualizar contraseña');
    try {
      const { message } = await this.authModel.resetPassword(credentials);
      this.view.showFormMessage(formId, message);
      this.view.getElement(formId).reset();
    } catch (error) {
      this.view.showFormMessage(formId, error.message);
    } finally {
      this.view.setFormLoading(formId, false, '', 'Actualizar contraseña');
    }
  }

  async restoreSession() {
    try {
      const user = await this.authModel.currentUser();
      if (user) this.view.setAuthenticatedUser(user);
    } catch {
      this.view.setAuthenticatedUser(null);
    }
  }

  async handleLogout() {
    try {
      await this.authModel.logout();
      this.view.setAuthenticatedUser(null);
      this.view.showToast('Sesión cerrada');
    } catch (error) {
      this.view.showToast(error.message);
    }
  }
}