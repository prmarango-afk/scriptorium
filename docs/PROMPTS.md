# Uso de la IA en Scriptorium

Herramienta: **Claude Code** (Claude Opus) trabajando directamente sobre el repositorio, por fases, con revisión humana en cada fase.

## 1. Master prompt mejorado

Partimos del prompt recomendado en el enunciado y lo ampliamos para que la IA no tuviera que adivinar el modelo de datos ni las reglas de negocio:

> Actúa como desarrollador Full-Stack Senior. Vamos a construir **Scriptorium**, la biblioteca de un colegio, como monolito **Node.js + Express + SQLite** con frontend **HTML + Tailwind CDN + JS vanilla** servido desde `public/`, desplegable en Render.
>
> **Modelo de datos:** `libros` (ISBN único y validado, título, autor, editorial, año, categoría, portada, ejemplares totales/disponibles), `usuarios` (nombre, apellidos, email único, rol alumno/profesor, curso, estado activo/suspendido/baja) y `prestamos` (libro, usuario, fecha de préstamo, fecha límite, fecha de devolución, renovaciones).
>
> **Reglas de negocio:** el préstamo descuenta stock de forma atómica y la devolución lo repone; no se presta sin stock, a usuarios suspendidos, a quien tenga retrasos o supere su máximo por rol; el estado (activo/retrasado/devuelto) se calcula, no se guarda; los registros con historial no se borran (baja lógica).
>
> **Calidad:** validación en servidor con mensajes en español, códigos HTTP correctos (400/404/409), transacciones, tests con `node:test`, datos de demostración realistas y una UI de panel de administración pensada para el personal del centro.

## 2. Desarrollo por fases

| Fase | Qué pedimos | Qué revisamos / adaptamos nosotros |
|---|---|---|
| Diseño | Esquema SQL, reglas por rol, estructura de carpetas | Elegimos los límites (3/15 alumnos, 6/30 profesores), el nombre **Scriptorium** y su identidad visual |
| Backend | API REST + validación + seed | Probamos cada regla con peticiones reales antes de seguir |
| Frontend | Panel, mostrador de préstamos, catálogo, usuarios | Revisión visual en el navegador y correcciones de UX |
| Despliegue | `render.yaml`, README, tests | Despliegue y prueba en la URL pública |

## 3. Adaptaciones sobre el código generado

Decisiones donde **no aceptamos la primera opción** o corregimos lo que salió:

1. **`node:sqlite` en lugar de `sqlite3`/`better-sqlite3`.** Los drivers clásicos compilan código nativo y suelen romper el despliegue; Node 22 trae SQLite integrado → cero dependencias nativas.
2. **Estado del préstamo calculado en una vista SQL (`v_prestamos`)** en vez de guardado: un préstamo pasa a "retrasado" solo con el paso del tiempo, sin tareas programadas.
3. **Descuento de stock atómico** (`UPDATE … WHERE ejemplares_disponibles > 0`) + `CHECK` en la tabla: el stock no puede quedar negativo ni con dos préstamos simultáneos.
4. **Validación real de ISBN** (dígito de control ISBN-10 y ISBN-13), no solo longitud.
5. **Portadas verificadas:** comprobamos los ISBN de demostración contra Open Library; los que no tenían portada fiable usan una portada generada con el título para no mostrar portadas equivocadas.
6. **Fallback de APIs externas:** Google Books devolvía `429` sin clave → añadimos Open Library como respaldo y la variable `GOOGLE_BOOKS_API_KEY`.
7. **Bugs de UI detectados al probar en el navegador:** scroll horizontal por `w-full` + margen lateral, portadas en blanco (Open Library devuelve un GIF 1×1 si no se pide `?default=false`), texto que se concatenaba en el buscador al reenfocarlo, columnas que no cabían en pantallas medianas.
8. **Tiempo real con SSE:** el enunciado pide préstamos "en tiempo real"; además de refrescar tras cada acción, los cambios se emiten a todos los navegadores conectados.
9. **Tests automáticos** de todas las reglas de negocio para detectar regresiones al iterar con la IA.
10. **Rediseño visual con referencias concretas.** Le pasamos a la IA dos referencias de estilo (*websiteglass.com*, el Liquid Glass de Apple, y *Origin UI*) con dos restricciones: estética Apple y **cero emojis**, todo con iconos SVG coherentes. Resultado: modo oscuro con paneles de cristal translúcido, dock flotante de navegación, colores del sistema iOS, interruptor y controles segmentados nativos, y un set propio de iconos SVG de trazo fino.
11. **Bug de Tailwind CDN detectado al revisar:** `@apply` sobre una clase CSS propia (`glass`) rompía toda la compilación de Tailwind en el navegador; se movió a CSS plano.
12. **Roles con permisos reales en el servidor.** Pedimos una vista para el personal y otra para los lectores. En lugar de esconder botones en el frontend, la IA añadió sesiones con token y middlewares `soloAdmin` / `soloLector`, y lo verificamos con tests (un lector recibe 403 al intentar gestionar).
13. **Peticiones y lista de espera:** para que la vista del lector tuviera sentido, añadimos un flujo nuevo que conecta las dos vistas y reutiliza la misma función de reglas de negocio (`crearPrestamo`) para que no haya dos implementaciones distintas.
14. **Portadas comprobadas a ojo:** buscamos portadas en Open Library por título, generamos una hoja de contactos y descartamos las que no correspondían (edición alemana, páginas en blanco, cuadernos de actividades, ediciones en inglés).
15. **Tema claro/oscuro con tokens:** los colores pasan a variables CSS por tema, con la variante accesible de los colores de Apple en modo claro para mantener el contraste.
16. **Bug de layout detectado probando:** `lg:grid` anulaba `hidden` en la pantalla de acceso y quedaba visible detrás de la app en pantallas grandes.
17. **ISBN equivocados detectados al revisar las portadas:** tres ISBN de los datos de ejemplo eran de otros libros. Rehicimos el catálogo con ediciones españolas reales sacando de Open Library, para cada libro, el ISBN y la portada **de la misma edición**, y revisamos todas las portadas en una hoja de contactos.
18. **Imágenes ligeras:** en vez de enlazar JPG externos, cada portada se convierte a WebP en dos tamaños (360 y 160 px) con `sharp`: 528 KB para las 46 imágenes. Las miniaturas usan la versión pequeña y todo se sirve con caché de un año.
19. **Login real:** sustituimos el PIN por cuentas con email y contraseña cifrada (scrypt + sal + comparación en tiempo constante), registro de alumnos/profesores, bloqueo tras intentos fallidos y perfil con foto. Comprobamos con tests que la API nunca devuelve el hash.
20. **Registro de movimientos:** tabla `movimientos` con fecha, hora y autor de cada acción, vista *Actividad* en forma de línea de tiempo y horas visibles en préstamos e historiales.
21. **Responsive revisado a 390, 440 y 820 px:** la bandeja de peticiones desbordaba en móvil y las tablas cortaban columnas incluso en portátil (por la barra lateral). Lo resolvimos con *container queries*: la tabla pasa a tarjetas según el espacio real de su contenedor, no según la pantalla.
22. **Persistencia en Render (decisión consciente):** en el plan gratuito los datos vuelven a los de demostración en cada despliegue o reinicio. Lo documentamos y evitamos desplegar durante la presentación.
