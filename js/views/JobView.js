export class JobView {
  constructor(documentRef = document) {
    this.document = documentRef;
    this.toastTimer = null;
  }

  getElement(id) {
    return this.document.getElementById(id);
  }

  getFilters() {
    return {
      keyword: this.getElement('filterKeyword').value,
      location: this.getElement('filterLocation').value,
      modalities: [...this.document.querySelectorAll('input[name="modality"]:checked')].map(input => input.value),
      types: [...this.document.querySelectorAll('input[name="type"]:checked')].map(input => input.value),
      sort: this.getElement('sortJobs').value
    };
  }

  getHeroSearch() {
    return {
      keyword: this.getElement('heroKeyword').value,
      location: this.getElement('heroLocation').value.trim()
    };
  }

  setSearchInputs(keyword, location) {
    this.getElement('filterKeyword').value = keyword;
    this.getElement('filterLocation').value = location;
  }

  resetFilters() {
    this.getElement('filterKeyword').value = '';
    this.getElement('filterLocation').value = '';
    this.getElement('heroKeyword').value = '';
    this.getElement('heroLocation').value = '';
    this.document.querySelectorAll('.filters-panel input[type="checkbox"]').forEach(input => {
      input.checked = false;
    });
    this.getElement('sortJobs').value = 'recent';
  }

  renderJobs(jobs, savedJobs, totalJobs) {
    const grid = this.getElement('jobsGrid');
    this.getElement('resultsCount').textContent = jobs.length;
    this.getElement('jobCountStat').textContent = totalJobs;
    this.getElement('emptyState').hidden = jobs.length !== 0;
    grid.hidden = jobs.length === 0;
    grid.innerHTML = jobs.map(job => {
      const saved = savedJobs.has(job.id);
      const age = job.posted === 1 ? 'Publicado hoy' : `Hace ${job.posted} días`;
      return `
        <article class="job-card">
          <div class="job-logo ${job.tone}" aria-hidden="true">${job.logo}</div>
          <div class="job-main">
            <h3>${job.title}</h3>
            <p class="job-company">${job.company}</p>
            <div class="job-meta"><span>⌖ ${job.location}</span><span>◷ ${age}</span></div>
            <div class="job-tags"><span class="tag">${job.modality}</span><span class="tag green">${job.type}</span><span class="tag">${job.area}</span></div>
          </div>
          <div class="job-actions">
            <button class="save-button ${saved ? 'saved' : ''}" data-save="${job.id}" aria-label="Guardar ${job.title}" title="Guardar vacante">${saved ? '♥' : '♡'}</button>
            <button class="details-button" data-details="${job.id}">Ver oferta →</button>
          </div>
        </article>`;
    }).join('');
  }

  renderJobDetails(job, saved) {
    this.getElement('jobModalContent').innerHTML = `
      <div class="modal-body">
        <p class="modal-company">${job.company}</p>
        <h2>${job.title}</h2>
        <div class="modal-details"><span>⌖ ${job.location}</span><span>${job.modality}</span><span>${job.type}</span></div>
        <h3>Sobre la oportunidad</h3>
        <p>${job.description}</p>
        <h3>Lo que buscamos</h3>
        <ul>${job.requirements.map(requirement => `<li>${requirement}</li>`).join('')}</ul>
        <div class="modal-actions">
          <a class="button button-primary" href="registro-egresado.html">Postularme ahora</a>
          <button class="button button-ghost" type="button" data-modal-save="${job.id}">${saved ? 'Quitar de guardados' : 'Guardar vacante'}</button>
        </div>
      </div>`;
    this.getElement('jobModal').showModal();
  }

  closeJobModal() {
    this.getElement('jobModal').close();
  }

  showLoginModal() {
    this.getElement('loginModal').showModal();
  }

  closeLoginModal() {
    this.getElement('loginModal').close();
  }

  showLoginMessage(message) {
    this.getElement('loginMessage').textContent = message;
  }

  getLoginCredentials() {
    const formData = new FormData(this.getElement('loginForm'));
    return { email: formData.get('email'), password: formData.get('password') };
  }

  setLoginLoading(isLoading) {
    const button = this.getElement('loginForm').querySelector('[type="submit"]');
    button.disabled = isLoading;
    button.textContent = isLoading ? 'Verificando…' : 'Iniciar sesión';
  }

  setAuthenticatedUser(user) {
    const accountStatus = this.getElement('accountStatus');
    accountStatus.hidden = !user;
    accountStatus.replaceChildren();
    if (user) {
      const greeting = this.document.createElement('span');
      greeting.className = 'account-greeting';
      greeting.textContent = 'Hola';
      const name = this.document.createElement('strong');
      name.className = 'account-name';
      name.textContent = user.fullName;
      accountStatus.append(greeting, name);
    }
    this.document.querySelectorAll('[data-open-login]').forEach(button => {
      button.hidden = Boolean(user);
    });
    this.document.querySelectorAll('[data-auth-logout]').forEach(button => {
      button.hidden = !user;
    });
  }

  toggleMenu() {
    const nav = this.getElement('mainNav');
    const isOpen = nav.classList.toggle('open');
    this.getElement('menuButton').setAttribute('aria-expanded', isOpen);
  }

  toggleFilters() {
    const panel = this.getElement('filtersPanel');
    const isOpen = panel.classList.toggle('open');
    this.getElement('filterToggle').setAttribute('aria-expanded', isOpen);
  }

  closeFilters() {
    this.getElement('filtersPanel').classList.remove('open');
    this.getElement('filterToggle').setAttribute('aria-expanded', 'false');
  }

  isMobileLayout() {
    return window.innerWidth < 981;
  }

  scrollToJobs() {
    this.getElement('vacantes').scrollIntoView({ behavior: 'smooth' });
  }

  showToast(message) {
    const toast = this.getElement('toast');
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2400);
  }
}