# Scriptorium — Biblioteca escolar

Sistema full-stack para gestionar la biblioteca de un centro educativo: catálogo de libros, lectores (alumnos y profesores) y préstamos con control de stock, retrasos e historial.

**Demo en vivo:** _URL_PENDIENTE_

## Dos vistas según el rol

| Rol | Cómo entra | Qué ve |
|---|---|---|
| **Personal de biblioteca** | PIN (`1234` en la demo, variable `ADMIN_PIN`) | Panel con KPIs, peticiones de lectores, retrasos y actividad; mostrador de préstamos; gestión del catálogo y de los lectores. |
| **Lector** (alumno o profesor) | Su email del centro (en la demo hay accesos rápidos) | Sus libros con la cuenta atrás del plazo, renovación, avisos de retraso, peticiones con su puesto en la cola, recomendaciones según lo que ha leído, catálogo por estanterías estilo Apple Books e historial. |

Los permisos se comprueban **en el servidor**: cada sesión tiene un token y las rutas de gestión exigen rol de biblioteca (401/403 si no). El lector no ve el historial de otros lectores.

**Flujo de peticiones:** el lector pide un libro (o se apunta a la lista de espera si está agotado) → la petición aparece en el panel del bibliotecario → con un clic se convierte en préstamo aplicando todas las reglas. No se puede renovar un libro si otros lectores lo están esperando.

**Interfaz:** tema claro y oscuro (sigue al sistema y recuerda la elección), barra lateral en ordenador e isla de navegación inferior en el móvil, portadas reales de Open Library y portadas generadas cuando no hay imagen.

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
- **Tests:** `node:test` (6 suites: reglas de negocio, roles y flujo de peticiones)
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

Variables de entorno opcionales: `PORT`, `ADMIN_PIN` (PIN del personal, por defecto `1234`), `DB_PATH` (ruta del fichero SQLite), `SEED=false` (no cargar datos demo), `GOOGLE_BOOKS_API_KEY`, `TZ`.

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
| POST / GET / DELETE | `/api/sesion` | Iniciar sesión (`{tipo:'admin', pin}` o `{tipo:'lector', email}`), consultar o cerrar |
| GET | `/api/solicitudes` | Peticiones pendientes (biblioteca) |
| POST | `/api/solicitudes/:id/atender` · `/rechazar` | Convertir en préstamo o rechazar |
| GET | `/api/yo` | Zona del lector: sus préstamos, peticiones y recomendaciones |
| POST | `/api/yo/solicitudes` · `/api/yo/prestamos/:id/renovar` | Pedir un libro · renovar el suyo |
| GET | `/api/eventos` | Stream SSE de cambios |
| GET | `/api/health` | Health check |

Todas las rutas de gestión requieren `Authorization: Bearer <token>`. Los errores devuelven `{ "error": "mensaje legible" }` con el código HTTP adecuado (400 validación, 404 no existe, 409 regla de negocio).

## Despliegue

En Render: **New → Blueprint → seleccionar este repositorio** (lee `render.yaml`). En el plan gratuito el disco no es persistente: al reiniciarse el servicio se vuelven a cargar los datos de demostración. Para persistencia real basta con montar un disco y poner `DB_PATH=/var/data/library.db`.
