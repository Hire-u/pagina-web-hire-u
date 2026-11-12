export class ChatController {
  constructor(model, view, { openLogin, performAction }) {
    this.model = model;
    this.view = view;
    this.openLogin = openLogin;
    this.performAction = performAction;
    this.messages = [];
    this.user = null;
  }

  start() {
    this.view.bind({
      toggle: () => this.view.togglePanel(),
      submit: event => this.handleSubmit(event),
      identity: event => this.handleIdentityChoice(event),
      messageAction: event => this.handleMessageAction(event),
      suggestion: event => this.handleSuggestion(event)
    });
  }

  setAuthenticatedUser(user) {
    const previousUser = this.user;
    this.user = user;
    this.view.setIdentityPromptVisible(!user);
    if (user && previousUser?.id !== user.id) {
      this.view.appendMessage('assistant', `¡Qué bueno tenerte de vuelta, ${user.fullName}! Soy Paco y tu sesión está verificada. ¿En qué te puedo orientar?`);
    } else if (!user && previousUser) {
      this.view.appendMessage('assistant', 'Tu sesión se cerró. Puedes seguir consultando información general o volver a iniciar sesión para recibir ayuda sobre tu cuenta.', 'login');
    }
  }

  handleIdentityChoice(event) {
    const choice = event.target.closest('[data-chat-identity]')?.dataset.chatIdentity;
    if (!choice) return;
    this.view.setIdentityPromptVisible(false);
    if (choice === 'new') {
      this.view.appendMessage('user', 'Aún no tengo cuenta.');
      this.view.appendMessage('assistant', '¡Te damos la bienvenida! Crea tu perfil de egresado con tu correo institucional para empezar.', 'register');
      return;
    }
    this.view.appendMessage('user', 'Ya tengo una cuenta.');
    if (this.user) {
      this.view.appendMessage('assistant', `Tu sesión ya está verificada, ${this.user.fullName}. Cuéntame qué necesitas.`);
    } else {
      this.view.appendMessage('assistant', 'Para proteger tus datos, verifica tu cuenta iniciando sesión. No escribas tu contraseña en este chat.', 'login');
    }
  }

  handleMessageAction(event) {
    if (event.target.closest('[data-chat-action="login"]')) this.openLogin();
  }

  handleSuggestion(event) {
    const question = event.target.closest('[data-chat-question]')?.dataset.chatQuestion;
    if (!question) return;
    this.view.getElement('chatInput').value = question;
    this.view.getElement('chatForm').requestSubmit();
  }

  async handleSubmit(event) {
    event.preventDefault();
    const message = this.view.getMessage();
    if (!message) return;
    this.view.appendMessage('user', message);
    this.view.clearInput();
    this.view.setSuggestionsVisible(false);
    this.messages.push({ role: 'user', content: message });
    this.messages = this.messages.slice(-8);
    this.view.setSending(true);
    try {
      const actionResult = this.performAction(message);
      if (actionResult) {
        this.view.appendMessage('assistant', actionResult.reply, actionResult.action);
        this.messages.push({ role: 'assistant', content: actionResult.reply });
        this.messages = this.messages.slice(-8);
        return;
      }
      const result = await this.model.send(this.messages);
      this.view.appendMessage('assistant', result.reply, result.action, result.supportEmail);
      this.messages.push({ role: 'assistant', content: result.reply });
      this.messages = this.messages.slice(-8);
    } catch (error) {
      this.view.appendMessage('assistant', error.message, 'support');
    } finally {
      this.view.setSending(false);
      this.view.getElement('chatInput').focus();
    }
  }
}