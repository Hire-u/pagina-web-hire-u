import bcrypt from 'bcryptjs';
import { EgresadoModel } from '../models/EgresadoModel.js';

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
  if (email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return response.status(400).json({ message: 'Ingresa un correo electrónico válido.' });
  }
  if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    return response.status(400).json({ message: 'La contraseña debe tener entre 8 y 72 bytes.' });
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
  if (!email || !password || email.length > 150 || Buffer.byteLength(password, 'utf8') > 72) {
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