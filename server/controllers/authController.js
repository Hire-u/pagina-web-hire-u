import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import nodemailer from 'nodemailer';
import { EgresadoModel } from '../models/EgresadoModel.js';

const passwordResetMessage = 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.';
const academicEmailPattern = /^[^\s@]+@academia\.usbbog\.edu\.co$/i;
const academicEmailMessage = 'Usa un correo terminado en @academia.usbbog.edu.co.';

const createResetMailer = () => {
  const { SMTP_HOST, SMTP_FROM } = process.env;
  const port = Number(process.env.SMTP_PORT || 587);
  if (!SMTP_HOST || !SMTP_FROM || !Number.isInteger(port) || port < 1 || port > 65535) {
    const error = new Error('El servicio de correo no está configurado.');
    error.status = 503;
    throw error;
  }
  if (Boolean(process.env.SMTP_USER) !== Boolean(process.env.SMTP_PASSWORD)) {
    const error = new Error('La autenticación SMTP está incompleta.');
    error.status = 503;
    throw error;
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined
  });
};

const createResetUrl = token => {
  const url = new URL('/', process.env.APP_BASE_URL || 'http://localhost:3000');
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')) {
    const error = new Error('APP_BASE_URL no es válida o debe usar HTTPS en producción.');
    error.status = 503;
    throw error;
  }
  url.searchParams.set('resetToken', token);
  return url.toString();
};

const publicUser = egresado => ({
  id: egresado.id,
  fullName: [egresado.firstName, egresado.lastName].filter(Boolean).join(' '),
  email: egresado.email,
  institution: egresado.institution,
  academicLevel: egresado.academicLevel,
  career: egresado.career,
  graduationYear: egresado.graduationYear,
  professionalProfile: egresado.professionalProfile
});

const regenerateSession = request => new Promise((resolve, reject) => {
  request.session.regenerate(error => error ? reject(error) : resolve());
});

const saveSession = request => new Promise((resolve, reject) => {
  request.session.save(error => error ? reject(error) : resolve());
});

export const register = async (request, response) => {
  const body = request.body || {};
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const institution = typeof body.institution === 'string' ? body.institution.trim() : '';
  const academicLevel = typeof body.academicLevel === 'string' ? body.academicLevel.trim() : '';
  const career = typeof body.career === 'string' ? body.career.trim() : '';
  const professionalProfile = typeof body.professionalProfile === 'string' ? body.professionalProfile.trim() : '';
  const graduationYear = body.graduationYear ? Number(body.graduationYear) : null;
  const currentYear = new Date().getFullYear();

  if (firstName.length < 1 || firstName.length > 100 || lastName.length < 1 || lastName.length > 100) {
    return response.status(400).json({ message: 'Ingresa nombres y apellidos de hasta 100 caracteres cada uno.' });
  }
  if (email.length > 150 || !academicEmailPattern.test(email)) {
    return response.status(400).json({ message: academicEmailMessage });
  }
  if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    return response.status(400).json({ message: 'La contraseña debe tener entre 8 y 72 bytes.' });
  }
  if (!institution || !academicLevel || !career || graduationYear === null || !professionalProfile) {
    return response.status(400).json({ message: 'Completa todos los campos del perfil antes de continuar.' });
  }
  if (institution.length > 150 || academicLevel.length > 50 || career.length > 100 || professionalProfile.length > 2000) {
    return response.status(400).json({ message: 'Uno de los campos supera la longitud permitida.' });
  }
  if (graduationYear !== null && (!Number.isInteger(graduationYear) || graduationYear < 1950 || graduationYear > currentYear + 10)) {
    return response.status(400).json({ message: 'El año de grado no es válido.' });
  }

  try {
    const existing = await EgresadoModel.findByEmail(email);
    if (existing) return response.status(409).json({ message: 'Ya existe una cuenta con ese correo.' });

    const passwordHash = await bcrypt.hash(password, 12);
    const egresado = await EgresadoModel.create({
      firstName,
      lastName,
      email,
      passwordHash,
      institution,
      academicLevel,
      career,
      graduationYear,
      professionalProfile
    });

    await regenerateSession(request);
    request.session.userId = egresado.id;
    await saveSession(request);
    return response.status(201).json({ user: publicUser(egresado) });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return response.status(409).json({ message: 'Ya existe una cuenta con ese correo.' });
    }
    throw error;
  }
};

export const login = async (request, response) => {
  const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : '';
  const password = typeof request.body?.password === 'string' ? request.body.password : '';
  if (!academicEmailPattern.test(email)) {
    return response.status(400).json({ message: academicEmailMessage });
  }
  if (!password || email.length > 150 || Buffer.byteLength(password, 'utf8') > 72) {
    return response.status(400).json({ message: 'Ingresa un correo y una contraseña válidos.' });
  }

  const egresado = await EgresadoModel.findByEmail(email);
  const validPassword = egresado?.passwordHash && await bcrypt.compare(password, egresado.passwordHash);
  if (!validPassword) {
    return response.status(401).json({ message: 'Correo o contraseña incorrectos.' });
  }

  await regenerateSession(request);
  request.session.userId = egresado.id;
  await saveSession(request);
  return response.json({ user: publicUser(egresado) });
};

export const requestPasswordReset = async (request, response) => {
  const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : '';
  const mailer = createResetMailer();
  if (!email || email.length > 150 || !academicEmailPattern.test(email)) {
    return response.json({ message: passwordResetMessage });
  }

  const token = randomBytes(32).toString('hex');
  const resetUrl = createResetUrl(token);
  const egresado = await EgresadoModel.findByEmail(email);
  if (!egresado) return response.json({ message: passwordResetMessage });

  const tokenHash = createHash('sha256').update(token).digest('hex');
  await EgresadoModel.savePasswordResetToken(email, tokenHash);
  try {
    await mailer.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Restablece tu contraseña de Hire-U',
      text: `Recibimos una solicitud para cambiar la contraseña de tu cuenta. Abre este enlace antes de una hora:\n\n${resetUrl}\n\nSi no solicitaste este cambio, ignora este mensaje.`
    });
  } catch (error) {
    await EgresadoModel.clearPasswordResetToken(email);
    console.error('No se pudo enviar el correo de restablecimiento:', error.message);
  }
  return response.json({ message: passwordResetMessage });
};

export const resetPassword = async (request, response) => {
  const token = typeof request.body?.token === 'string' ? request.body.token : '';
  const password = typeof request.body?.password === 'string' ? request.body.password : '';
  if (!/^[a-f0-9]{64}$/i.test(token) || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    return response.status(400).json({ message: 'El enlace no es válido o la contraseña no cumple los requisitos.' });
  }

  const tokenHash = createHash('sha256').update(token).digest('hex');
  const passwordHash = await bcrypt.hash(password, 12);
  const updated = await EgresadoModel.updatePasswordWithResetToken(tokenHash, passwordHash);
  if (!updated) {
    return response.status(400).json({ message: 'El enlace ha vencido o ya fue utilizado. Solicita uno nuevo.' });
  }
  return response.json({ message: 'Contraseña actualizada. Ya puedes iniciar sesión.' });
};

export const currentUser = async (request, response) => {
  if (!request.session.userId) return response.status(401).json({ message: 'No has iniciado sesión.' });
  const egresado = await EgresadoModel.findById(request.session.userId);
  if (!egresado) {
    request.session.destroy(() => {});
    return response.status(401).json({ message: 'La sesión ya no es válida.' });
  }
  return response.json({ user: publicUser(egresado) });
};

export const logout = (request, response, next) => {
  request.session.destroy(error => {
    if (error) return next(error);
    response.clearCookie('hireu.sid', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });
    return response.status(204).end();
  });
};