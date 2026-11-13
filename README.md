# Hire-U

Hire-U es una aplicación web para conectar estudiantes y egresados con oportunidades laborales. El frontend permite explorar vacantes y crear una cuenta. El backend guarda perfiles y sesiones en MySQL y verifica las credenciales al iniciar sesión.

## Arquitectura

El proyecto separa el sitio, el servidor y la base de datos. Para explicarlo, puedes recorrerlo en este orden:

1. **Sitio web** (`public/`): contiene las páginas, estilos, imágenes y módulos JavaScript que se ejecutan en el navegador.
   - `public/index.html` y `public/registro-egresado.html` son las páginas principales.
   - `public/styles.css` define su presentación.
   - `public/script.js` y `public/profile.js` conectan cada página con los módulos del frontend.
   - `public/js/models/`, `public/js/views/` y `public/js/controllers/` separan datos y API, interfaz y coordinación de eventos.
2. **Servidor** (`server/`): `server/app.js` inicia Express, configura sesiones, sirve `public/` y conecta las rutas de la API. `server/routes/` declara los endpoints; `server/controllers/` implementa sus operaciones; `server/models/` consulta MySQL y `server/config/` configura la conexión.
3. **Base de datos** (`database/migrations/`): contiene las migraciones para autenticación y recuperación de contraseñas.
4. **Configuración del proyecto**: `package.json` define dependencias y comandos; `.env.example` muestra las variables esperadas; `.devcontainer/devcontainer.json` configura Codespaces.

### Flujo de registro e inicio de sesión

1. El formulario HTML de registro envía nombre, correo, contraseña y datos académicos a `AuthModel`.
2. `ProfileController` comprueba que las contraseñas coincidan; el servidor vuelve a validar los datos.
3. El controlador de autenticación convierte el correo a minúsculas, rechaza cuentas duplicadas y guarda la contraseña como hash bcrypt. Las consultas SQL son parametrizadas.
4. Después de crear la cuenta, el servidor abre una sesión guardada en MySQL y devuelve solo los datos públicos del perfil.
5. Al iniciar sesión, el servidor busca el correo y compara la contraseña con el hash. Si coinciden, regenera la sesión y responde con el perfil.
6. La cookie de sesión es `HttpOnly` y `SameSite=Lax`; al volver a cargar la página, `/api/auth/me` permite reconocer al usuario sin guardar la contraseña ni el token en `localStorage`.

### Estructura

```text
.
├── public/
│   ├── assets/
│   │   ├── imagen.png
│   │   ├── logo-hire-u.png
│   │   └── paco-asistente.svg
│   ├── js/
│   │   ├── controllers/
│   │   │   ├── ChatController.js
│   │   │   ├── JobController.js
│   │   │   └── ProfileController.js
│   │   ├── models/
│   │   │   ├── AuthModel.js
│   │   │   ├── ChatModel.js
│   │   │   └── JobModel.js
│   │   └── views/
│   │       ├── ChatView.js
│   │       ├── JobView.js
│   │       └── ProfileView.js
│   ├── index.html
│   ├── profile.js
│   ├── registro-egresado.html
│   ├── script.js
│   └── styles.css
├── server/
│   ├── config/
│   │   └── database.js
│   ├── controllers/
│   │   ├── authController.js
│   │   └── chatController.js
│   ├── models/
│   │   └── EgresadoModel.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   └── chatRoutes.js
│   └── app.js
├── database/
│   └── migrations/
│       ├── 001_add_auth_to_egresado.sql
│       └── 002_add_password_reset.sql
├── .devcontainer/
│   └── devcontainer.json
├── .env.example
├── .gitignore
├── package-lock.json
├── package.json
└── README.md
```

## Configuración local

Requisitos: Node.js 20 o posterior y MySQL 8.0.13 o posterior (o una versión compatible con `utf8mb4`). No se debe conectar MySQL directamente desde el navegador.

1. Prepara la base `Hireu` con el esquema SQL que compartiste. **Ese archivo comienza con `DROP DATABASE IF EXISTS Hireu`; no lo ejecutes sobre una base que quieras conservar**, porque borrará todos sus datos. Si la base ya existe, omite la importación completa y continúa con la migración de autenticación. Si estás creando una base vacía, créala primero, quita esa línea `DROP DATABASE` del archivo y luego importa el resto del esquema.

2. Ejecuta una sola vez la migración, después de que existan las tablas `Egresado` y `Estudios`:

   ```bash
   mysql -u root -p < database/migrations/001_add_auth_to_egresado.sql
   ```

   La migración agrega `ContrasenaHash` y un índice único para `CorreoInstitucional`; no elimina ni recrea la base. Antes de ejecutarla, asegúrate de que no existan correos duplicados en `Egresado` (la consulta de comprobación está comentada al inicio del archivo).

   Ejecuta también la migración de recuperación de contraseña:

   ```bash
   mysql -u root -p < database/migrations/002_add_password_reset.sql
   ```

3. Agrega los índices y el registro básico de cambios:

   ```bash
   mysql -u root -p -D Hireu < database/migrations/003_database_safety_and_audit.sql
   ```

   Esta migración no borra perfiles y conserva la tabla de sesiones si ya existe. Acelera búsquedas de correo y recuperación de contraseña, y crea `EgresadoDatosBasicos`, una vista sin campos de acceso. El esquema base ya incluye la tabla `Auditoria` y registros de cambios.

4. Crea el archivo local de configuración y edita los valores para tu instalación:

   ```bash
   cp .env.example .env
   ```

   Configura `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` y `DB_NAME=Hireu`. Para recuperar contraseñas, configura `APP_BASE_URL` y las variables `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` y `SMTP_FROM` con los datos de tu proveedor de correo. El asistente responde preguntas frecuentes sin servicios externos; para habilitar respuestas generativas, configura `OPENAI_API_KEY` y opcionalmente `OPENAI_MODEL`. Configura `SUPPORT_EMAIL` para cambiar el correo de soporte. Cambia `SESSION_SECRET` por una cadena aleatoria de al menos 32 caracteres. No compartas ni subas `.env` al repositorio; está excluido por `.gitignore`.

   Puedes generar el secreto de sesión con `openssl rand -hex 48` y pegar el resultado en `.env`. Para desarrollo, crea un usuario MySQL dedicado en vez de usar `root`. Dale acceso solo a las tablas que necesita la aplicación:

   ```sql
   CREATE USER 'hire_u_app'@'localhost' IDENTIFIED BY 'elige-una-contrasena';
   GRANT SELECT, INSERT, UPDATE ON Hireu.Egresado TO 'hire_u_app'@'localhost';
   GRANT SELECT, INSERT ON Hireu.Estudios TO 'hire_u_app'@'localhost';
   GRANT SELECT, INSERT, UPDATE, DELETE ON Hireu.sessions TO 'hire_u_app'@'localhost';
   ```

5. Instala dependencias e inicia el backend desde la raíz del proyecto:

   ```bash
   npm install
   npm run dev
   ```

6. Abre `http://localhost:3000`. Express sirve el HTML, CSS, módulos frontend y endpoints API desde el mismo origen. No uses `file://`, Live Server ni `python -m http.server` para este flujo, porque esos servidores no ejecutan la API.

Si aparece el aviso de vista previa estática o no se puede conectar con la API, confirma que MySQL está activo, que existe `.env` con sus datos de conexión y que abriste `http://localhost:3000` después de ejecutar `npm run dev`. El puerto `8000` solo sirve para revisar el diseño y no guarda registros.

## Cuidados sencillos de la base de datos

- **Rendimiento:** los índices nuevos ayudan a encontrar cuentas y enlaces de recuperación más rápido. Si la aplicación se siente lenta, revisa primero si el servidor tiene memoria y espacio disponibles y si MySQL está usando mucha CPU o disco.
- **Seguimiento:** los cambios y eliminaciones de perfiles quedan registrados con fecha, cuenta de MySQL, origen de la conexión y nombres de los campos modificados. No se guardan nombres, correos, contraseñas ni tokens. Si toda la aplicación usa una sola cuenta de MySQL, el registro identifica esa cuenta técnica, no a cada persona que inició sesión.
- **Respaldos:** el script `database/backup.sh` crea una copia comprimida. Configura `~/.my.cnf` fuera del proyecto para no guardar la contraseña en el repositorio:

  ```ini
  [client]
  host=servidor
  port=3306
  user=usuario_respaldo
  password=tu-contrasena
  ```

  Protege ese archivo y ejecuta `chmod 600 ~/.my.cnf`. Crea la copia manualmente con `DB_NAME=Hireu BACKUP_DIR=/ruta/segura bash database/backup.sh`. Para programarla cada día a las 2:00 a. m., agrega una tarea cron y reemplaza las rutas de ejemplo:

  ```bash
  0 2 * * * DB_NAME=Hireu BACKUP_DIR=/ruta/segura MYSQL_CNF=/home/usuario/.my.cnf bash /ruta/al/proyecto/database/backup.sh
  ```

  Las copias quedan fuera de la carpeta pública por defecto; guárdalas fuera del servidor MySQL y protégelas. Para recuperar una copia en una base de pruebas, ejecuta `gzip -dc /ruta/segura/Hireu_fecha.sql.gz | mysql --defaults-extra-file="$HOME/.my.cnf" Hireu`. Prueba la restauración de vez en cuando; tener un archivo no garantiza que pueda recuperarse. Para volver a un momento exacto entre respaldos, el administrador del servidor debe habilitar y conservar los registros binarios de MySQL.
- **Privacidad en pruebas:** usa perfiles inventados. Si necesitas una copia de producción, anonimízala antes de permitir el acceso al equipo de pruebas.
- **Disponibilidad:** una réplica y la promoción automática de otro servidor requieren infraestructura y configuración del proveedor donde se aloje MySQL; no se pueden activar solo con una migración de este proyecto.

Hire-U usa MySQL relacional porque sus perfiles y estudios tienen datos organizados y relacionados. Para cambiar el esquema en el futuro, agrega primero lo nuevo, adapta la aplicación y retira lo anterior en un cambio posterior; así evitas borrar datos mientras la aplicación todavía los necesita. Las contraseñas y los enlaces de recuperación se guardan como hashes; para proteger los demás datos personales, configura el cifrado de conexión y almacenamiento en el proveedor de MySQL. La aplicación no necesita guardar datos de tarjetas.

### GitHub Codespaces

En **Settings → Codespaces → Codespaces secrets**, configura `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` y `SESSION_SECRET` con acceso al repositorio. Codespaces los proporciona al entorno como variables de entorno; no se deben incluir sus valores en el repositorio ni en el frontend. El servidor ya las lee desde `process.env`.

La configuración de `.devcontainer/devcontainer.json` instala dependencias al crear el contenedor, ejecuta `npm run dev` al conectarse y reenvía el puerto 3000 para abrir el sitio. Para aplicar esta configuración a un Codespace existente, guarda y sube los cambios al repositorio, luego usa **Codespaces: Rebuild Container**. Para que los secretos recién guardados aparezcan, detén e inicia el Codespace. Al abrir el Codespace, espera a que inicie el servidor y se abra la vista del puerto 3000.

Para un despliegue, usa HTTPS y establece `NODE_ENV=production`; así la cookie de sesión también requiere conexión segura. Usa un usuario MySQL de aplicación con privilegios limitados y gestiona los secretos mediante la plataforma de despliegue.

## Base de datos y API

La cuenta se guarda en `Hireu.Egresado`: nombres, apellidos, correo institucional, carrera, año de grado y perfil profesional. La contraseña se guarda como hash en `ContrasenaHash`. La institución y el nivel académico se guardan en `Hireu.Estudios`. La migración 003 crea la tabla `sessions`; `express-mysql-session` guarda allí las sesiones sin necesitar permisos para crear tablas al iniciar.

- `POST /api/auth/register`: valida y crea un perfil, inicia sesión y devuelve `201`.
- `POST /api/auth/login`: valida credenciales y devuelve el perfil o un error genérico `401`.
- `POST /api/auth/forgot-password`: envía un enlace de un solo uso si el correo está registrado, sin revelar si existe.
- `POST /api/auth/reset-password`: guarda el nuevo hash bcrypt y consume el token, que vence en una hora.
- `GET /api/auth/me`: devuelve el perfil de la sesión actual o `401`.
- `POST /api/auth/logout`: destruye la sesión y expira la cookie.
- `POST /api/chat`: contesta dudas sobre Hire-U con respuestas integradas o el proveedor IA configurado; limita mensajes e intentos y deriva consultas no resueltas a soporte.

El registro valida los límites de los campos, normaliza correos, aplica bcrypt y devuelve `409` si el correo ya está registrado. Los endpoints de autenticación tienen límite de intentos. No se devuelve el hash ni se aceptan consultas SQL desde el cliente. Los egresados que ya estaban en la tabla antes de la migración tienen `ContrasenaHash` vacío: no pueden iniciar sesión hasta que se les asigne una contraseña mediante un proceso seguro; no se les asigna una contraseña común automáticamente.

## Funcionalidades y alcance

- Buscar y filtrar vacantes, ordenarlas y consultar sus detalles.
- Guardar vacantes favoritas en `localStorage`.
- Crear perfil con datos académicos y contraseña; el registro inicia sesión automáticamente.
- Iniciar sesión con una cuenta almacenada en MySQL, reconocer la sesión al recargar y cerrarla desde la página principal.
- Consultar a Paco, el asistente de Hire-U: responde preguntas, filtra vacantes por cargo, ciudad, modalidad y tipo; muestra vacantes guardadas, guarda una oferta y abre sus detalles. Usa la sesión existente para consultas personales, guía a nuevos usuarios al registro y ofrece soporte humano cuando no puede resolver una inquietud.

El catálogo de vacantes sigue siendo una colección de demostración en `JobModel.js`. Este backend administra cuentas y sesiones, no ofrece todavía gestión de vacantes ni postulaciones. Las credenciales de una base real no se incluyen en el repositorio; cada entorno debe completar su propio `.env`.

## Verificación manual

1. Configura MySQL y arranca con `npm run dev`.
2. Abre **Crear perfil**, completa el formulario y envíalo.
3. Confirma que vuelve a la página principal y aparece el saludo con el nombre.
4. Recarga la página: el saludo debe mantenerse gracias a la sesión.
5. Cierra sesión, vuelve a ingresar con el correo y la contraseña registrados y comprueba el saludo.
6. Prueba un correo duplicado y una contraseña incorrecta; la interfaz debe mostrar el error sin exponer información sensible.
7. Abre el asistente, prueba una pregunta frecuente y una consulta fuera del alcance; comprueba que la segunda ofrezca contactar a soporte. Para respuestas generativas, configura `OPENAI_API_KEY` en `.env`.

## Tecnologías

HTML, CSS, JavaScript con módulos ES, Node.js, Express, MySQL, `mysql2`, `express-session` y `bcryptjs`.
