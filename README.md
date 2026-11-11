# Hire-U

Hire-U es una aplicación web para conectar estudiantes y egresados con oportunidades laborales. El frontend permite explorar vacantes y crear una cuenta. El backend guarda perfiles y sesiones en MySQL y verifica las credenciales al iniciar sesión.

## Arquitectura

El proyecto separa las responsabilidades MVC en el cliente y el servidor:

- **Frontend, modelos** (`js/models/`): `JobModel` administra el catálogo y los favoritos; `AuthModel` envía las operaciones de cuenta a la API.
- **Frontend, vistas** (`js/views/`): `JobView` y `ProfileView` leen y actualizan el DOM sin contener reglas de autenticación ni consultas SQL.
- **Frontend, controladores** (`js/controllers/`): `JobController` y `ProfileController` coordinan formularios, eventos, modelos y vistas.
- **Backend, rutas** (`server/routes/`): declara los endpoints HTTP de autenticación.
- **Backend, controlador** (`server/controllers/authController.js`): valida los datos, aplica hashing y coordina las operaciones y sesiones.
- **Backend, modelo** (`server/models/EgresadoModel.js`): ejecuta consultas parametrizadas para buscar y crear egresados en las tablas `Egresado` y `Estudios`.
- **Configuración y arranque** (`server/config/`, `server/app.js`): crea el pool de base de datos, configura sesiones y sirve el sitio y la API desde el mismo origen.

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
├── index.html
├── registro-egresado.html
├── styles.css
├── script.js
├── profile.js
├── js/
│   ├── controllers/
│   ├── models/
│   └── views/
├── server/
│   ├── app.js
│   ├── config/database.js
│   ├── controllers/authController.js
│   ├── models/EgresadoModel.js
│   └── routes/authRoutes.js
├── database/migrations/001_add_auth_to_egresado.sql
├── assets/
├── .env.example
└── package.json
```

## Configuración local

Requisitos: Node.js 20 o posterior y MySQL 8 (o una versión compatible con `utf8mb4`). No se debe conectar MySQL directamente desde el navegador.

1. Prepara la base `Hireu` con el esquema SQL que compartiste. **Ese archivo comienza con `DROP DATABASE IF EXISTS Hireu`; no lo ejecutes sobre una base que quieras conservar**, porque borrará todos sus datos. Si la base ya existe, omite la importación completa y continúa con la migración de autenticación. Si estás creando una base vacía, créala primero, quita esa línea `DROP DATABASE` del archivo y luego importa el resto del esquema.

2. Ejecuta una sola vez la migración, después de que existan las tablas `Egresado` y `Estudios`:

   ```bash
   mysql -u root -p < database/migrations/001_add_auth_to_egresado.sql
   ```

   La migración agrega `ContrasenaHash` y un índice único para `CorreoInstitucional`; no elimina ni recrea la base. Antes de ejecutarla, asegúrate de que no existan correos duplicados en `Egresado` (la consulta de comprobación está comentada al inicio del archivo).

3. Crea el archivo local de configuración y edita los valores para tu instalación:

   ```bash
   cp .env.example .env
   ```

   Configura `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` y `DB_NAME=Hireu`. Cambia `SESSION_SECRET` por una cadena aleatoria de al menos 32 caracteres. No compartas ni subas `.env` al repositorio; está excluido por `.gitignore`.

   Puedes generar el secreto de sesión con `openssl rand -hex 48` y pegar el resultado en `.env`. Para desarrollo, crea un usuario MySQL dedicado en vez de usar `root`:

   ```sql
   CREATE USER 'hire_u_app'@'localhost' IDENTIFIED BY 'elige-una-contrasena';
   GRANT SELECT, INSERT, UPDATE, DELETE, CREATE ON Hireu.* TO 'hire_u_app'@'localhost';
   ```

   El servidor crea la tabla de sesiones automáticamente la primera vez que inicia; por eso el usuario de aplicación necesita `CREATE` además de los permisos de lectura, inserción, actualización y eliminación.

4. Instala dependencias e inicia el backend desde la raíz del proyecto:

   ```bash
   npm install
   npm run dev
   ```

5. Abre `http://localhost:3000`. Express sirve el HTML, CSS, módulos frontend y endpoints API desde el mismo origen. No uses `file://`, Live Server ni `python -m http.server` para este flujo, porque esos servidores no ejecutan la API.

Si aparece el aviso de vista previa estática o no se puede conectar con la API, confirma que MySQL está activo, que existe `.env` con sus datos de conexión y que abriste `http://localhost:3000` después de ejecutar `npm run dev`. El puerto `8000` solo sirve para revisar el diseño y no guarda registros.

### GitHub Codespaces

En **Settings → Codespaces → Codespaces secrets**, configura `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` y `SESSION_SECRET` con acceso al repositorio. Codespaces los proporciona al entorno como variables de entorno; no se deben incluir sus valores en el repositorio ni en el frontend. El servidor ya las lee desde `process.env`.

La configuración de `.devcontainer/devcontainer.json` instala dependencias al crear el contenedor, ejecuta `npm run dev` al conectarse y reenvía el puerto 3000 para abrir el sitio. Para aplicar esta configuración a un Codespace existente, guarda y sube los cambios al repositorio, luego usa **Codespaces: Rebuild Container**. Para que los secretos recién guardados aparezcan, detén e inicia el Codespace. Al abrir el Codespace, espera a que inicie el servidor y se abra la vista del puerto 3000.

Para un despliegue, usa HTTPS y establece `NODE_ENV=production`; así la cookie de sesión también requiere conexión segura. Usa un usuario MySQL de aplicación con privilegios limitados y gestiona los secretos mediante la plataforma de despliegue.

## Base de datos y API

La cuenta se guarda en `Hireu.Egresado`: nombres, apellidos, correo institucional, carrera, año de grado y perfil profesional. La contraseña se guarda como hash en `ContrasenaHash`. La institución y el nivel académico se guardan en `Hireu.Estudios`. La tabla `sessions` es gestionada por `express-mysql-session`.

- `POST /api/auth/register`: valida y crea un perfil, inicia sesión y devuelve `201`.
- `POST /api/auth/login`: valida credenciales y devuelve el perfil o un error genérico `401`.
- `GET /api/auth/me`: devuelve el perfil de la sesión actual o `401`.
- `POST /api/auth/logout`: destruye la sesión y expira la cookie.

El registro valida los límites de los campos, normaliza correos, aplica bcrypt y devuelve `409` si el correo ya está registrado. Los endpoints de autenticación tienen límite de intentos. No se devuelve el hash ni se aceptan consultas SQL desde el cliente. Los egresados que ya estaban en la tabla antes de la migración tienen `ContrasenaHash` vacío: no pueden iniciar sesión hasta que se les asigne una contraseña mediante un proceso seguro; no se les asigna una contraseña común automáticamente.

## Funcionalidades y alcance

- Buscar y filtrar vacantes, ordenarlas y consultar sus detalles.
- Guardar vacantes favoritas en `localStorage`.
- Crear perfil con datos académicos y contraseña; el registro inicia sesión automáticamente.
- Iniciar sesión con una cuenta almacenada en MySQL, reconocer la sesión al recargar y cerrarla desde la página principal.

El catálogo de vacantes sigue siendo una colección de demostración en `JobModel.js`. Este backend administra cuentas y sesiones, no ofrece todavía gestión de vacantes ni postulaciones. Las credenciales de una base real no se incluyen en el repositorio; cada entorno debe completar su propio `.env`.

## Verificación manual

1. Configura MySQL y arranca con `npm run dev`.
2. Abre **Crear perfil**, completa el formulario y envíalo.
3. Confirma que vuelve a la página principal y aparece el saludo con el nombre.
4. Recarga la página: el saludo debe mantenerse gracias a la sesión.
5. Cierra sesión, vuelve a ingresar con el correo y la contraseña registrados y comprueba el saludo.
6. Prueba un correo duplicado y una contraseña incorrecta; la interfaz debe mostrar el error sin exponer información sensible.

## Tecnologías

HTML, CSS, JavaScript con módulos ES, Node.js, Express, MySQL, `mysql2`, `express-session` y `bcryptjs`.
