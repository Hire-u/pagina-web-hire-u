export class ChatModel {
  async send(messages) {
    let response;
    try {
      response = await fetch('/api/chat', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages })
      });
    } catch {
      throw new Error('No pudimos conectar con el asistente. Inténtalo de nuevo o escribe a soportehireu@gmail.com.');
    }
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.message || 'No pudimos responder ahora.');
    return payload;
  }
}