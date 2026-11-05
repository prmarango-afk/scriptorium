# Scriptorium — Biblioteca escolar

Sistema full-stack para gestionar la biblioteca de un centro educativo: catálogo de libros, lectores (alumnos y profesores) y préstamos con control de stock, retrasos e historial.

**Demo en vivo:** https://scriptorium-tdcy.onrender.com (la primera carga puede tardar ~50 s si el servidor estaba dormido)

## Cuentas y vistas según el rol

Inicio de sesión real con **email y contraseña** (cifradas con *scrypt* y sal, nunca en claro; bloqueo temporal tras 5 intentos fallidos). Los alumnos y profesores pueden **crear su cuenta** desde la pantalla de acceso, y cada persona tiene su **perfil con foto** (se recorta y comprime en el navegador y el servidor la guarda en WebP de 256 px).

| Rol | Qué ve |
|---|---|
| **Personal de biblioteca** | Panel con KPIs, peticiones de lectores, retrasos, actividad y últimos movimientos; mostrador de préstamos; gestión del catálogo y de los lectores (incluida su contraseña); **registro de actividad** completo con fecha y hora. |
| **Lector** (alumno o profesor) | Sus libros con la cuenta atrás del plazo, renovación, avisos, peticiones con su puesto en la cola, recomendaciones, catálogo por estanterías estilo Apple Books, historial y su actividad. |

**Cuentas de la demo** (contraseña de todas: `scriptorium1`): `biblioteca@colegio.es` (personal) y los lectores que aparecen en la pantalla de acceso.

Los permisos se comprueban **en el servidor**: cada sesión tiene un token y las rutas de gestión exigen la cuenta de biblioteca (401/403 si no). El lector no ve el historial de otros lectores y la API nunca devuelve contraseñas.

**Flujo de peticiones:** el lector pide un libro (o se apunta a la lista de espera si está agotado) → la petición aparece en el panel del bibliotecario → con un clic se convierte en préstamo aplicando todas las reglas. No se puede renovar un libro si otros lectores lo están esperando.

**Registro de movimientos:** cada préstamo, devolución, renovación, petición, alta, edición y baja se guarda con fecha, hora y quién lo hizo.

**Interfaz:** tema claro y oscuro (sigue al sistema, recuerda la elección y cambia también la barra del navegador móvil), barra lateral en ordenador e isla de navegación en el móvil, tablas que se convierten en tarjetas cuando no caben (*container queries*).

**Portadas:** los 23 libros de la demo son ediciones españolas reales con su portada (ISBN y portada de la misma edición, de Open Library). Se sirven **optimizadas en WebP en dos tamaños** (360 px y 160 px para miniaturas, unos 8 KB y 3 KB) con caché de un año. Las portadas que añade el bibliotecario también se descargan y optimizan automáticamente. `npm run portadas` las regenera.

## Funcionalidades

| Módulo | Qué hace |
|---|---|
| **Libros** | CRUD completo, validación real de **ISBN-10/13** (dígito de control), **autocompletado por ISBN** (Google Books / Open Library) con portada, control dinámico de ejemplares, filtros por categoría y disponibilidad, búsqueda instantánea sin tildes. |
| **Usuarios** | Alta de alumnos (con curso) y profesores (con departamento), estados de membresía **activo / suspendido / baja**, ficha con historial completo. |
| **Peticiones** | Los lectores piden libros o se apuntan a la lista de espera; el bibliotecario las atiende o rechaza. |
| **Préstamos** | Mostrador de préstamo con validación en vivo, **descuento atómico de stock**, fecha límite automática por rol, **renovaciones**, **devolución**, alertas de **retraso** y avisos de vencimiento. |
| **Panel** | KPIs, préstamos con retraso, vencimientos en 3 días, gráfico de actividad de 14 días, ranking de más leídos y catálogo por categoría. |
| **Tiempo real** | Server-Sent Events: cualquier cambio aparece al instante en todos los navegadores abiertos. |

### Reglas de negocio (`db.js → REGLAS`)
- Alumnos: máximo **3 libros**, **15 días**. Profesores: máximo **6 libros**, **30 días**.
- No se presta si **no quedan ejemplares**, si el usuario está **suspendido/de baja**, si tiene **algún préstamo con retraso** o si **ya tiene ese libro**.
- Hasta **2 renovaciones**, solo si el préstamo no va con retraso.
- No se puede reducir el número de ejemplares por debajo de los prestados.
- Libros y usuarios con historial no se borran: pasan a **baja lógica** para conservar el historial.
- Todas las operaciones de préstamo/devolución van en **transacción** y la BD tiene `CHECK` para que el stock nunca sea negativo ni supere el total.

## Stack

- **Backend:** Node.js 22 + Express 5 (monolito, API REST)
- **Base de datos:** SQLite con el módulo nativo `node:sqlite` (sin dependencias nativas que compilar)
- **Frontend:** HTML5 + Tailwind CSS (CDN) + JavaScript vanilla, servido desde `public/`
- **Tests:** `node:test` (7 suites: reglas de negocio, roles, peticiones, cuentas y movimientos)
- **Imágenes:** `sharp` (portadas y fotos de perfil a WebP)
- **Despliegue:** Render (blueprint `render.yaml`)

```
├── server.js        API REST + tiempo real (SSE) + servidor estático
├── db.js            Esquema SQLite, vista v_prestamos y reglas por rol
├── validacion.js    Validación de entrada (ISBN, email, rangos)
├── seed.js          Datos de demostración (se cargan si la BD está vacía)
├── public/          Frontend (index.html + app.js)
├── test/            Pruebas de la API
└── docs/PROMPTS.md  Cómo hemos usado la IA
```

## Ejecutar en local

```bash
npm install
npm start          # http://localhost:3000
npm test           # pruebas automáticas
```

Variables de entorno opcionales: `PORT`, `ADMIN_EMAIL` / `ADMIN_PASSWORD` (cuenta del personal), `DEMO_PASSWORD`, `DATA_DIR` (fotos y portadas subidas), `DB_PATH` (ruta del fichero SQLite), `SEED=false` (no cargar datos demo), `GOOGLE_BOOKS_API_KEY`, `TZ`.

## API REST

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/libros?q=&categoria=&disponibles=1` | Listar/buscar libros |
| GET | `/api/libros/:id` | Ficha con historial |
| POST / PUT / DELETE | `/api/libros[/:id]` | Alta / edición / baja |
| GET | `/api/isbn/:isbn` | Datos del libro por ISBN (Google Books → Open Library) |
| GET | `/api/usuarios?q=&rol=&estado=` | Listar/buscar usuarios |
| GET | `/api/usuarios/:id` | Ficha con historial |
| POST / PUT / DELETE | `/api/usuarios[/:id]` | Alta / edición / baja |
| GET | `/api/prestamos?estado=abiertos\|activo\|retrasado\|devuelto` | Préstamos e historial |
| POST | `/api/prestamos` | Nuevo préstamo `{ usuario_id, libro_id, dias? }` |
| POST | `/api/prestamos/:id/devolver` | Registrar devolución |
| POST | `/api/prestamos/:id/renovar` | Renovar |
| GET | `/api/stats` | Datos del panel |
| POST / GET / DELETE | `/api/sesion` | Iniciar sesión (`{email, password}`), consultar o cerrar |
| POST | `/api/registro` | Crear cuenta de lector |
| GET / PUT | `/api/perfil` | Ver y editar el perfil propio |
| POST | `/api/perfil/password` · `/api/perfil/foto` | Cambiar contraseña · subir foto |
| GET | `/api/movimientos?grupo=&q=` | Registro de actividad (biblioteca) |
| GET | `/api/solicitudes` | Peticiones pendientes (biblioteca) |
| POST | `/api/solicitudes/:id/atender` · `/rechazar` | Convertir en préstamo o rechazar |
| GET | `/api/yo` | Zona del lector: sus préstamos, peticiones y recomendaciones |
| POST | `/api/yo/solicitudes` · `/api/yo/prestamos/:id/renovar` | Pedir un libro · renovar el suyo |
| GET | `/api/eventos` | Stream SSE de cambios |
| GET | `/api/health` | Health check |

Todas las rutas de gestión requieren `Authorization: Bearer <token>`. Los errores devuelven `{ "error": "mensaje legible" }` con el código HTTP adecuado (400 validación, 404 no existe, 409 regla de negocio).

## Despliegue

En Render: **New → Blueprint → seleccionar este repositorio** (lee `render.yaml`). En el plan gratuito el disco no es persistente: al reiniciarse el servicio se vuelven a cargar los datos de demostración. Para persistencia real basta con montar un disco y poner `DB_PATH=/var/data/library.db`.
