import { ChatController } from './ChatController.js';
import { ChatModel } from '../models/ChatModel.js';
import { ChatView } from '../views/ChatView.js';

export class JobController {
  constructor(model, view, authModel) {
    this.model = model;
    this.view = view;
    this.authModel = authModel;
    this.visibleJobs = [];
    this.chatController = new ChatController(new ChatModel(), new ChatView(), {
      openLogin: () => {
        this.view.showLoginForm();
        this.view.showLoginModal();
      },
      performAction: message => this.handleChatCommand(message)
    });
  }

  start() {
    this.bindEvents();
    this.chatController.start();
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
    this.view.document.querySelectorAll('[data-toggle-password]').forEach(button => {
      button.addEventListener('click', () => this.view.togglePassword(button.dataset.togglePassword, button));
    });
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

  handleChatCommand(message) {
    const query = this.normalizeChatText(message);
    if (/mis vacantes guardadas|mis guardados|mis favoritos|vacantes favoritas/.test(query)) {
      const savedJobs = this.model.getSavedJobs();
        this.view.resetFilters();
      this.visibleJobs = this.model.jobs.filter(job => savedJobs.has(job.id));
      this.view.renderJobs(this.visibleJobs, savedJobs, this.model.jobs.length);
      this.view.scrollToJobs();
      return {
        reply: this.visibleJobs.length
          ? `Encontré ${this.visibleJobs.length} vacante${this.visibleJobs.length === 1 ? '' : 's'} guardada${this.visibleJobs.length === 1 ? '' : 's'}. Ya las mostré en la sección de empleos.`
          : 'Todavía no tienes vacantes guardadas. Puedes guardar una con el corazón que aparece junto a cada oferta.'
      };
    }

    if (/limpia los filtros|limpiar filtros|quita los filtros|borra los filtros/.test(query)) {
      this.clearFilters();
      return { reply: 'Listo, quité los filtros y mostré todas las vacantes.' };
    }

    const filters = this.getChatSearchFilters(message);
    const searchRequested = /busca|buscar|mu[eé]strame|encuentra|vacantes?|empleos?|trabajos?|ofertas?|oportunidades/.test(query)
        || Boolean(filters.location || filters.modalities.length || filters.types.length);
    const saveRequested = /guarda|guardar|a[nñ]ade.*guardad|agrega.*favorit/.test(query);
      const knownJobMention = this.model.jobs.some(job => [job.title, job.area, job.company]
        .some(term => query.includes(this.normalizeChatText(term))));
      const detailsRequested = /(?:abre|abrir|ver|muestra).*(?:detalle|oferta|vacante)|(?:detalle|informacion).*(?:vacante|oferta)/.test(query)
        && (knownJobMention || /vacante|oferta|empleo|trabajo/.test(query));
    if (!searchRequested && !saveRequested && !detailsRequested) return null;

    this.view.setChatFilters(filters);
    this.visibleJobs = this.model.getJobs(filters);
    this.view.renderJobs(this.visibleJobs, this.model.getSavedJobs(), this.model.jobs.length);
    this.view.scrollToJobs();

    if (saveRequested) {
      if (this.visibleJobs.length !== 1) {
        return {
          reply: this.visibleJobs.length
            ? `Encontré ${this.visibleJobs.length} ofertas. Dime el cargo o la empresa para saber cuál quieres guardar.`
            : 'No encontré una vacante con esos datos. Prueba con un cargo, área o empresa.'
        };
      }
      const [job] = this.visibleJobs;
      const isSaved = this.model.isSaved(job.id);
      if (!isSaved) this.model.toggleSaved(job.id);
      this.renderVisibleJobs();
      return { reply: `${job.title} ${isSaved ? 'ya estaba' : 'quedó'} en tus vacantes guardadas.` };
    }

    if (detailsRequested && this.visibleJobs.length === 1) {
      this.openJob(this.visibleJobs[0].id);
      this.chatController.closePanel();
      return { reply: `Abrí los detalles de ${this.visibleJobs[0].title}.` };
    }

    return {
      reply: this.visibleJobs.length
        ? `Encontré ${this.visibleJobs.length} vacante${this.visibleJobs.length === 1 ? '' : 's'} y actualicé los filtros. ${detailsRequested ? 'Dime el cargo o la empresa para abrir una oferta específica.' : ''}`.trim()
        : 'No encontré vacantes con esos filtros. Puedes probar con otro cargo, ciudad o modalidad.'
    };
  }

  getChatSearchFilters(message) {
    const query = this.normalizeChatText(message);
    const location = this.model.getLocations().find(option => query.includes(this.normalizeChatText(option))) || '';
    const modalities = [...new Set(this.model.jobs.map(job => job.modality))];
    const modality = modalities.find(option => {
      const normalized = this.normalizeChatText(option);
      return query.includes(normalized) || (normalized === 'remoto' && /remot/.test(query));
    });
    const types = [...new Set(this.model.jobs.map(job => job.type))];
    const type = types.find(option => query.includes(this.normalizeChatText(option))
      || (option === 'Prácticas' && /practic/.test(query)));
    const knownTerms = [...new Set(this.model.jobs.flatMap(job => [job.title, job.area, job.company]))]
      .sort((first, second) => second.length - first.length);
    let keyword = knownTerms.find(term => query.includes(this.normalizeChatText(term))) || '';

    if (!keyword) {
      keyword = query
        .replace(/\b(?:busca|buscar|busco|mu[eé]strame|muestra|encuentra|encontrar|quiero|necesito|dame|hay|ver|verme|abre|abrir|detalles|detalle|guarda|guardar|guardame|vacantes?|empleos?|trabajos?|ofertas?|oportunidades|disponibles?|guardadas?|favoritas?|por|para|de|del|en|la|el|las|los|una?|mis|me|que|tienes|tiene|con)\b/g, ' ')
        .replace(/\b(?:remot\w*|hibrid\w*|presencial\w*|practic\w*|primer empleo|tiempo completo)\b/g, ' ')
        .replace(/\b(?:bogota|medellin|cali|barranquilla|colombia)\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
    const knownTermFound = knownTerms.some(term => query.includes(this.normalizeChatText(term)));
    if (knownTermFound) keyword = knownTerms.find(term => query.includes(this.normalizeChatText(term))) || keyword;

    return {
      keyword,
      location,
      modalities: modality ? [modality] : [],
      types: type ? [type] : [],
      sort: 'recent'
    };
  }

  normalizeChatText(value) {
    return value.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
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
      this.chatController.setAuthenticatedUser(user);
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
      this.view.setAuthenticatedUser(user);
      this.chatController.setAuthenticatedUser(user);
    } catch {
      this.view.setAuthenticatedUser(null);
      this.chatController.setAuthenticatedUser(null);
    }
  }

  async handleLogout() {
    try {
      await this.authModel.logout();
      this.view.setAuthenticatedUser(null);
      this.chatController.setAuthenticatedUser(null);
      this.view.showToast('Sesión cerrada');
    } catch (error) {
      this.view.showToast(error.message);
    }
  }
}