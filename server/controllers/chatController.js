import { EgresadoModel } from '../models/EgresadoModel.js';

const defaultSupportEmail = 'soportehireu@gmail.com';

const getSupportEmail = () => {
  const email = process.env.SUPPORT_EMAIL || defaultSupportEmail;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : defaultSupportEmail;
};

const getIntegratedAnswer = (message, isRegistered) => {
  const query = message.toLocaleLowerCase('es');

  if (/mi cuenta|mi perfil|mis datos|mis postulaciones|mi postulación|mi informacion/.test(query) && !isRegistered) {
    return {
      reply: 'Para orientarte sobre una cuenta, primero necesitamos verificar que eres su titular. Inicia sesión; no compartas tu contraseña ni datos sensibles por el chat.',
      action: 'login'
    };
  }
  if (/contraseña|contrasena|olvide|olvidé|recuper|restable/.test(query)) {
    return {
      reply: 'Abre “Iniciar sesión” y selecciona “¿Olvidaste tu contraseña?”. Te enviaremos un enlace al correo institucional registrado. El enlace vence en una hora. Si no llega, revisa spam o escribe a soporte.',
      action: 'login'
    };
  }
  if (/registr|crear.*perfil|nuevo.*perfil|cuenta nueva/.test(query)) {
    return {
      reply: 'Puedes crear tu perfil desde “Crear perfil”. Completa tus datos personales, formación académica y contraseña. Usa tu correo terminado en @academia.usbbog.edu.co.',
      action: 'register'
    };
  }
  if (/correo|email|dominio|institucional/.test(query)) {
    return {
      reply: 'Para crear la cuenta y acceder, usa tu correo institucional terminado en @academia.usbbog.edu.co. No compartas tu contraseña por este chat.'
    };
  }
  if (/buscar|vacante|empleo|trabajo|oferta|filtro/.test(query)) {
    return {
      reply: 'En “Buscar empleos” puedes escribir un cargo o palabra clave, filtrar por ubicación, modalidad o tipo de oportunidad, y ordenar los resultados. Abre “Ver oferta” para consultar los detalles.'
    };
  }
  if (/guardar|favorit/.test(query)) {
    return {
      reply: 'Usa el icono de corazón en una vacante para guardarla o quitarla de tu lista. En este momento los guardados se conservan en este navegador.'
    };
  }
  if (/postul|aplic/.test(query)) {
    return {
      reply: 'Puedes revisar la descripción y los requisitos de cada vacante con “Ver oferta”. Algunas oportunidades son demostrativas y el envío de postulaciones aún no se gestiona desde Hire-U. Para una oferta específica, contacta a soporte.',
      action: 'support'
    };
  }
  if (/contact|soporte|ayuda humana|asesor/.test(query)) {
    return {
      reply: 'Claro, el equipo de soporte puede revisar tu caso directamente.',
      action: 'support'
    };
  }
  return null;
};

const getAiAnswer = async (messages, isRegistered) => {
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: AbortSignal.timeout(12000),
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        max_tokens: 350,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: `Eres Paco, el asistente de Hire-U, una plataforma colombiana que conecta estudiantes y egresados con oportunidades laborales. Responde siempre en español, con claridad, amabilidad y brevedad. Puedes orientar sobre perfiles, registro con correo terminado en @academia.usbbog.edu.co, acceso, recuperación de contraseña, búsqueda de vacantes, filtros y guardados. Las postulaciones y el catálogo son demostrativos y no se envían desde la plataforma. No inventes políticas, vacantes, estados de cuenta ni acciones que no puedes realizar. No solicites ni reveles contraseñas, documentos, teléfonos u otros datos sensibles. Estado verificado de sesión: ${isRegistered ? 'iniciada' : 'no iniciada'}. Para consultas de cuenta exige inicio de sesión; nunca confirmes si un correo está registrado. Si no tienes certeza o no puedes resolverlo, dilo y ofrece contactar al soporte humano.`
          },
          ...messages
        ]
      })
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const reply = payload.choices?.[0]?.message?.content?.trim();
    return reply ? {
      reply,
      action: /soporte|no puedo (?:responder|ayudarte|resolver)|no tengo certeza/i.test(reply) ? 'support' : null
    } : null;
  } catch {
    return null;
  }
};

const containsSensitiveData = messages => messages.some(({ role, content }) => role === 'user' && (
  /[^\s@]+@[^\s@]+\.[^\s@]+/.test(content)
  || /\b(?:c[eé]dula|documento|tel[eé]fono|celular|contrase[nñ]a\s*(?:es|:)|clave\s*(?:es|:))\b/i.test(content)
));

export const chat = async (request, response) => {
  const messages = request.body?.messages;
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > 8
    || messages.some(message => !['user', 'assistant'].includes(message?.role)
      || typeof message.content !== 'string' || message.content.trim().length < 1 || message.content.length > 1000)
    || messages.at(-1)?.role !== 'user') {
    return response.status(400).json({ message: 'Escribe una pregunta de hasta 1000 caracteres.' });
  }
  if (containsSensitiveData(messages)) {
    return response.json({
      reply: 'Por tu seguridad, no envíes correos, números de documento, teléfonos ni contraseñas por el chat. Para una consulta personal, inicia sesión o contacta al equipo de soporte.',
      action: request.session.userId ? 'support' : 'login',
      supportEmail: getSupportEmail()
    });
  }

  const lastMessage = messages.at(-1).content.trim();
  let isRegistered = false;
  if (request.session.userId) {
    isRegistered = Boolean(await EgresadoModel.findById(request.session.userId));
  }

  const answer = getIntegratedAnswer(lastMessage, isRegistered)
    || await getAiAnswer(messages, isRegistered)
    || {
      reply: 'No encuentro una respuesta confiable para esa consulta. El equipo de soporte puede ayudarte directamente.',
      action: 'support'
    };

  return response.json({ ...answer, supportEmail: getSupportEmail() });
};