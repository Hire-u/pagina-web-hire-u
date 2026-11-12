export class ChatView {
  constructor(documentRef = document) {
    this.document = documentRef;
  }

  getElement(id) {
    return this.document.getElementById(id);
  }

  bind(handlers) {
    this.getElement('chatLauncher').addEventListener('click', handlers.toggle);
    this.getElement('chatClose').addEventListener('click', handlers.toggle);
    this.getElement('chatForm').addEventListener('submit', handlers.submit);
    this.getElement('chatIdentityPrompt').addEventListener('click', handlers.identity);
    this.getElement('chatMessages').addEventListener('click', handlers.messageAction);
    this.getElement('chatSuggestions').addEventListener('click', handlers.suggestion);
  }

  togglePanel() {
    const panel = this.getElement('chatPanel');
    panel.hidden = !panel.hidden;
    this.getElement('chatLauncher').setAttribute('aria-expanded', String(!panel.hidden));
    if (!panel.hidden) this.getElement('chatInput').focus();
  }

  closePanel() {
    this.getElement('chatPanel').hidden = true;
    this.getElement('chatLauncher').setAttribute('aria-expanded', 'false');
  }

  setIdentityPromptVisible(visible) {
    this.getElement('chatIdentityPrompt').hidden = !visible;
  }

  setSuggestionsVisible(visible) {
    this.getElement('chatSuggestions').hidden = !visible;
  }

  appendMessage(role, text, action = null, supportEmail = 'soportehireu@gmail.com') {
    const message = this.document.createElement('div');
    message.className = `chat-message ${role}`;
    message.textContent = text;
    this.getElement('chatMessages').append(message);

    if (action) {
      const actions = this.document.createElement('div');
      actions.className = 'chat-actions';
      if (action === 'register') {
        const link = this.document.createElement('a');
        link.href = 'registro-egresado.html';
        link.textContent = 'Crear perfil';
        actions.append(link);
      } else if (action === 'login') {
        const button = this.document.createElement('button');
        button.type = 'button';
        button.dataset.chatAction = 'login';
        button.textContent = 'Iniciar sesión';
        actions.append(button);
      } else if (action === 'support') {
        const link = this.document.createElement('a');
        link.href = `mailto:${supportEmail}?subject=Ayuda%20con%20Hire-U`;
        link.textContent = `Escribir a ${supportEmail}`;
        actions.append(link);
      }
      if (actions.childElementCount) this.getElement('chatMessages').append(actions);
    }
    const messages = this.getElement('chatMessages');
    messages.scrollTop = messages.scrollHeight;
  }

  getMessage() {
    return this.getElement('chatInput').value.trim();
  }

  clearInput() {
    this.getElement('chatInput').value = '';
  }

  setSending(isSending) {
    this.getElement('chatInput').disabled = isSending;
    this.getElement('chatSend').disabled = isSending;
    this.getElement('chatSend').textContent = isSending ? '…' : '↑';
  }
}