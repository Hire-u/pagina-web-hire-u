import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import MySQLStoreFactory from 'express-mysql-session';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import authRoutes from './routes/authRoutes.js';
import { pool } from './config/database.js';

const app = express();
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MySQLStore = MySQLStoreFactory(session);
const sessionStore = new MySQLStore({
  clearExpired: true,
  checkExpirationInterval: 15 * 60 * 1000,
  expiration: 24 * 60 * 60 * 1000,
  createDatabaseTable: true
}, pool);

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error('SESSION_SECRET debe tener al menos 32 caracteres.');
}

app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));
app.use(session({
  name: 'hireu.sid',
  secret: process.env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.get(['/', '/index.html'], (request, response) => response.sendFile(path.join(projectRoot, 'index.html')));
app.get('/registro-egresado.html', (request, response) => response.sendFile(path.join(projectRoot, 'registro-egresado.html')));
app.get('/styles.css', (request, response) => response.sendFile(path.join(projectRoot, 'styles.css')));
app.get('/script.js', (request, response) => response.sendFile(path.join(projectRoot, 'script.js')));
app.get('/profile.js', (request, response) => response.sendFile(path.join(projectRoot, 'profile.js')));
app.use('/assets', express.static(path.join(projectRoot, 'assets')));
app.use('/js', express.static(path.join(projectRoot, 'js')));

app.use('/api/auth', authRoutes);
app.use((request, response) => response.status(404).json({ message: 'Recurso no encontrado.' }));
app.use((error, request, response, next) => {
  if (response.headersSent) return next(error);
  console.error(error);
  const status = error.status || 500;
  return response.status(status).json({
    message: status >= 500 ? 'Ocurrió un error interno. Inténtalo más tarde.' : error.message
  });
});

const port = Number(process.env.PORT || 3000);
try {
  await pool.query('SELECT 1');
  await sessionStore.onReady();
  app.listen(port, () => console.log(`Hire-U disponible en http://localhost:${port}`));
} catch (error) {
  console.error('No se pudo conectar con MySQL. Revisa las variables DB_* de .env.', error.message);
  process.exitCode = 1;
  await sessionStore.close().catch(() => {});
  await pool.end();
}