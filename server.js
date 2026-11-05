// Scriptorium (biblioteca escolar) — servidor Express (API REST + frontend estático)
const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const fs = require('node:fs');
const { abrir, transaccion, DATA_DIR, REGLAS, MAX_RENOVACIONES, MAX_SOLICITUDES } = require('./db');
const { sembrar } = require('./seed');
const v = require('./validacion');
const auth = require('./auth');
const { guardarPortadaRemota } = require('./portadas');

const { error } = v;
const DURACION_SESION_MS = 12 * 60 * 60 * 1000;
const CARPETA_PORTADAS = path.join(DATA_DIR, 'portadas');
const CARPETA_FOTOS = path.join(DATA_DIR, 'fotos');

function crearApp(db) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '3mb' })); // 3 MB por la foto de perfil (llega ya reducida desde el navegador)
  // Portadas y fotos: nombres únicos por versión, así que se pueden cachear un año
  const cacheLarga = { maxAge: '365d', immutable: true };
  app.use('/portadas', express.static(path.join(__dirname, 'public', 'portadas'), cacheLarga));
  app.use('/portadas', express.static(CARPETA_PORTADAS, cacheLarga));
  app.use('/fotos', express.static(CARPETA_FOTOS, cacheLarga));
  app.use(express.static(path.join(__dirname, 'public')));

  const uno = (sql, ...p) => db.prepare(sql).get(...p);
  const todos = (sql, ...p) => db.prepare(sql).all(...p);
  const ejecutar = (sql, ...p) => db.prepare(sql).run(...p);
  const nulos = (o) => Object.values(o).map((x) => (x === undefined ? null : x));

  // ───────────────────────── Tiempo real (SSE) ─────────────────────────
  // Cada cambio correcto en la API se notifica a todos los navegadores abiertos
  const clientes = new Set();
  app.get('/api/eventos', (req, res) => {
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.flushHeaders();
    res.write('retry: 3000\n\n');
    clientes.add(res);
    const ping = setInterval(() => res.write(': ping\n\n'), 25000);
    req.on('close', () => { clearInterval(ping); clientes.delete(res); });
  });
  app.use('/api', (req, res, next) => {
    if (req.method !== 'GET' && !req.path.startsWith('/sesion')) {
      res.on('finish', () => {
        if (res.statusCode < 400) {
          const msg = `data: ${JSON.stringify({ recurso: req.path.split('/')[1], metodo: req.method })}\n\n`;
          for (const c of clientes) c.write(msg);
        }
      });
    }
    next();
  });

  // ───────────────────────── Sesiones y roles ─────────────────────────
  // Dos roles: "admin" (cuenta del personal de biblioteca) y "lector" (alumno/profesor).
  // Todos entran con email y contraseña. Las sesiones son tokens aleatorios en memoria.
  const sesiones = new Map();

  app.use('/api', (req, res, next) => {
    const token = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const s = token && sesiones.get(token);
    if (s && s.expira > Date.now()) req.sesion = s;
    else if (s) sesiones.delete(token);
    next();
  });
  const soloAdmin = (req, res, next) => {
    if (!req.sesion) throw error(401, 'Inicia sesión para continuar');
    if (req.sesion.rol !== 'admin') throw error(403, 'Solo el personal de biblioteca puede hacer esto');
    next();
  };
  const soloLector = (req, res, next) => {
    if (!req.sesion) throw error(401, 'Inicia sesión para continuar');
    if (req.sesion.rol !== 'lector') throw error(403, 'Esta sección es para lectores');
    next();
  };
  const conSesion = (req, res, next) => {
    if (!req.sesion) throw error(401, 'Inicia sesión para continuar');
    next();
  };

  function crearSesion(res, sesion) {
    const token = crypto.randomBytes(24).toString('hex');
    sesiones.set(token, { ...sesion, expira: Date.now() + DURACION_SESION_MS });
    res.status(201).json({ token, ...sesion });
  }

  app.post('/api/sesion', (req, res) => {
    const email = v.texto(req.body?.email, 'email', { requerido: true }).toLowerCase();
    const password = String(req.body?.password ?? '');
    const espera = auth.comprobarBloqueo(email);
    if (espera) throw error(429, `Demasiados intentos fallidos. Espera ${espera} segundos`);

    const staff = uno('SELECT id, nombre, apellidos, password_hash FROM personal WHERE email = ?', email);
    const lector = staff ? null : uno('SELECT id, nombre, apellidos, estado, password_hash FROM usuarios WHERE email = ?', email);
    const cuenta = staff || lector;
    // Mismo mensaje si no existe o si la contraseña no coincide: no se revela qué emails están registrados
    if (!cuenta || !auth.verificarPassword(password, cuenta.password_hash)) {
      auth.anotarFallo(email);
      throw error(401, 'Email o contraseña incorrectos');
    }
    if (lector?.estado === 'baja') throw error(403, 'Tu cuenta está dada de baja. Pregunta en la biblioteca');
    auth.limpiarFallos(email);
    const nombre = `${cuenta.nombre} ${cuenta.apellidos}`.trim();
    crearSesion(res, staff
      ? { rol: 'admin', personal_id: staff.id, nombre }
      : { rol: 'lector', usuario_id: lector.id, nombre });
  });

  // Alta de lectores desde la pantalla de acceso
  app.post('/api/registro', (req, res) => {
    const d = v.usuario({ ...req.body, estado: 'activo' });
    const password = v.password(req.body?.password);
    if (uno('SELECT 1 FROM usuarios WHERE email = ?', d.email) || uno('SELECT 1 FROM personal WHERE email = ?', d.email)) {
      throw error(409, 'Ya hay una cuenta con ese email. Inicia sesión');
    }
    const id = Number(ejecutar('INSERT INTO usuarios (nombre, apellidos, email, rol, curso, estado, password_hash) VALUES (?,?,?,?,?,?,?)',
      ...nulos(d), auth.hashPassword(password)).lastInsertRowid);
    const nombre = `${d.nombre} ${d.apellidos}`;
    registrar('registro', `${nombre} crea su cuenta de ${d.rol}`, { usuarioId: id, actor: nombre });
    crearSesion(res, { rol: 'lector', usuario_id: id, nombre });
  });

  app.get('/api/sesion', (req, res) => {
    if (!req.sesion) throw error(401, 'Sin sesión');
    const { expira, ...s } = req.sesion;
    res.json(s);
  });

  app.delete('/api/sesion', (req, res) => {
    const token = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
    sesiones.delete(token);
    res.json({ ok: true });
  });

  // Cuentas de demostración para la pantalla de acceso (solo con datos demo)
  app.get('/api/demo/cuentas', (req, res) => {
    if (process.env.SEED === 'false') return res.json([]);
    const lectores = (rol, n) => todos(`SELECT nombre, apellidos, email, rol, foto FROM usuarios
                                        WHERE estado = 'activo' AND rol = ? ORDER BY id LIMIT ?`, rol, n);
    const staff = todos("SELECT nombre, apellidos, email, 'admin' AS rol, foto FROM personal ORDER BY id LIMIT 1");
    res.json([...staff, ...lectores('alumno', 3), ...lectores('profesor', 2)]);
  });

  // ───────────────────────── Perfil (cualquier sesión) ─────────────────────────
  const tablaPerfil = (req) => (req.sesion.rol === 'admin' ? 'personal' : 'usuarios');
  const idPerfil = (req) => (req.sesion.rol === 'admin' ? req.sesion.personal_id : req.sesion.usuario_id);
  const leerPerfil = (req) => {
    const p = req.sesion.rol === 'admin'
      ? uno("SELECT id, nombre, apellidos, email, foto, 'admin' AS rol, NULL AS curso, creado_en FROM personal WHERE id = ?", idPerfil(req))
      : uno('SELECT id, nombre, apellidos, email, foto, rol, curso, estado, creado_en FROM usuarios WHERE id = ?', idPerfil(req));
    if (!p) throw error(401, 'La cuenta ya no existe');
    return p;
  };

  app.get('/api/perfil', conSesion, (req, res) => res.json(leerPerfil(req)));

  app.put('/api/perfil', conSesion, (req, res) => {
    const nombre = v.texto(req.body?.nombre, 'nombre', { requerido: true, max: 80 });
    const apellidos = v.texto(req.body?.apellidos, 'apellidos', { requerido: req.sesion.rol !== 'admin', max: 120 }) || '';
    if (req.sesion.rol === 'admin') {
      ejecutar('UPDATE personal SET nombre = ?, apellidos = ? WHERE id = ?', nombre, apellidos, idPerfil(req));
    } else {
      const curso = v.texto(req.body?.curso, 'curso', { max: 40 });
      ejecutar('UPDATE usuarios SET nombre = ?, apellidos = ?, curso = ? WHERE id = ?', nombre, apellidos, curso, idPerfil(req));
    }
    req.sesion.nombre = `${nombre} ${apellidos}`.trim();
    res.json(leerPerfil(req));
  });

  app.post('/api/perfil/password', conSesion, (req, res) => {
    const fila = uno(`SELECT password_hash FROM ${tablaPerfil(req)} WHERE id = ?`, idPerfil(req));
    if (!auth.verificarPassword(req.body?.actual, fila?.password_hash)) throw error(400, 'La contraseña actual no es correcta');
    const nueva = v.password(req.body?.nueva, 'nueva contraseña');
    ejecutar(`UPDATE ${tablaPerfil(req)} SET password_hash = ? WHERE id = ?`, auth.hashPassword(nueva), idPerfil(req));
    res.json({ ok: true });
  });

  // Foto de perfil: llega como data URL; se guarda recortada a 256x256 en WebP
  app.post('/api/perfil/foto', conSesion, async (req, res) => {
    const m = /^data:image\/(png|jpe?g|webp|gif|avif);base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body?.imagen || ''));
    if (!m) throw error(400, 'Formato de imagen no válido (usa JPG, PNG o WebP)');
    const datos = Buffer.from(m[2], 'base64');
    if (datos.length > 2 * 1024 * 1024) throw error(400, 'La imagen es demasiado grande (máximo 2 MB)');
    const sharp = require('sharp');
    fs.mkdirSync(CARPETA_FOTOS, { recursive: true });
    const nombreArchivo = `${req.sesion.rol}-${idPerfil(req)}-${crypto.randomBytes(4).toString('hex')}.webp`;
    try {
      await sharp(datos).rotate().resize(256, 256, { fit: 'cover', position: 'attention' })
        .webp({ quality: 78 }).toFile(path.join(CARPETA_FOTOS, nombreArchivo));
    } catch {
      throw error(400, 'No se ha podido leer la imagen');
    }
    const anterior = uno(`SELECT foto FROM ${tablaPerfil(req)} WHERE id = ?`, idPerfil(req))?.foto;
    ejecutar(`UPDATE ${tablaPerfil(req)} SET foto = ? WHERE id = ?`, `/fotos/${nombreArchivo}`, idPerfil(req));
    borrarFoto(anterior);
    res.json(leerPerfil(req));
  });

  app.delete('/api/perfil/foto', conSesion, (req, res) => {
    const anterior = uno(`SELECT foto FROM ${tablaPerfil(req)} WHERE id = ?`, idPerfil(req))?.foto;
    ejecutar(`UPDATE ${tablaPerfil(req)} SET foto = NULL WHERE id = ?`, idPerfil(req));
    borrarFoto(anterior);
    res.json(leerPerfil(req));
  });

  function borrarFoto(ruta) {
    if (!ruta?.startsWith('/fotos/')) return;
    fs.rm(path.join(CARPETA_FOTOS, path.basename(ruta)), { force: true }, () => {});
  }

  // ───────────────────────── Registro de movimientos ─────────────────────────
  function registrar(tipo, detalle, { libroId = null, usuarioId = null, actor = null } = {}) {
    ejecutar('INSERT INTO movimientos (tipo, detalle, libro_id, usuario_id, actor) VALUES (?,?,?,?,?)',
      tipo, detalle, libroId, usuarioId, actor);
  }
  const quien = (req) => req.sesion?.nombre || null;

  const GRUPOS_MOVIMIENTOS = {
    prestamos: ['prestamo', 'renovacion'],
    devoluciones: ['devolucion'],
    peticiones: ['solicitud', 'solicitud_atendida', 'solicitud_rechazada', 'solicitud_cancelada'],
    catalogo: ['libro_alta', 'libro_edicion', 'libro_baja'],
    lectores: ['lector_alta', 'lector_edicion', 'lector_baja', 'registro'],
  };

  app.get('/api/movimientos', soloAdmin, (req, res) => {
    let sql = `SELECT m.*, l.titulo, l.portada, u.nombre || ' ' || u.apellidos AS usuario, u.foto, u.rol
               FROM movimientos m LEFT JOIN libros l ON l.id = m.libro_id LEFT JOIN usuarios u ON u.id = m.usuario_id WHERE 1 = 1`;
    const p = [];
    const grupo = GRUPOS_MOVIMIENTOS[req.query.grupo];
    if (grupo) { sql += ` AND m.tipo IN (${grupo.map(() => '?').join(',')})`; p.push(...grupo); }
    if (req.query.q) { sql += ' AND (m.detalle LIKE ? OR m.actor LIKE ?)'; p.push(`%${req.query.q}%`, `%${req.query.q}%`); }
    const limite = v.entero(req.query.limite, 'limite', { min: 1, max: 1000 }) || 300;
    res.json(todos(`${sql} ORDER BY m.creado_en DESC, m.id DESC LIMIT ${limite}`, ...p));
  });

  // ───────────────────────── Salud ─────────────────────────
  app.get('/api/health', (req, res) => {
    res.json({ ok: true, hora: uno("SELECT datetime('now','localtime') AS t").t });
  });

  // ───────────────────────── Libros (lectura pública) ─────────────────────────
  const SQL_LIBROS = `SELECT l.*, (l.ejemplares_totales - l.ejemplares_disponibles) AS prestados,
      (SELECT COUNT(*) FROM prestamos p WHERE p.libro_id = l.id) AS veces_prestado,
      (SELECT COUNT(*) FROM solicitudes s WHERE s.libro_id = l.id AND s.estado = 'pendiente') AS en_espera
    FROM libros l WHERE l.activo = 1`;

  const libroActivo = (idLibro) => {
    const l = uno(`${SQL_LIBROS} AND l.id = ?`, idLibro);
    if (!l) throw error(404, 'Libro no encontrado');
    return l;
  };

  app.get('/api/libros', (req, res) => {
    let sql = SQL_LIBROS;
    const p = [];
    if (req.query.q) {
      const like = `%${req.query.q}%`;
      sql += ' AND (l.titulo LIKE ? OR l.autor LIKE ? OR l.isbn LIKE ? OR l.editorial LIKE ?)';
      p.push(like, like, `%${v.normalizarIsbn(req.query.q)}%`, like);
    }
    if (req.query.categoria) { sql += ' AND l.categoria = ?'; p.push(req.query.categoria); }
    if (req.query.disponibles === '1') sql += ' AND l.ejemplares_disponibles > 0';
    res.json(todos(`${sql} ORDER BY l.titulo COLLATE NOCASE`, ...p));
  });

  app.get('/api/libros/:id', (req, res) => {
    const libro = libroActivo(v.id(req.params.id));
    // El historial con nombres de lectores solo lo ve el personal de biblioteca
    if (req.sesion?.rol === 'admin') {
      libro.prestamos = todos('SELECT * FROM v_prestamos WHERE libro_id = ? ORDER BY id DESC', libro.id);
    }
    res.json(libro);
  });

  // ───────────────────────── Libros (gestión) ─────────────────────────
  // Si la portada es una URL externa, se descarga y se guarda optimizada en WebP
  async function portadaOptimizada(d) {
    if (!/^https?:\/\//i.test(d.portada || '')) return d.portada;
    const local = await guardarPortadaRemota(d.portada, CARPETA_PORTADAS, `${d.isbn}-${crypto.randomBytes(3).toString('hex')}`);
    return local || d.portada;
  }

  app.post('/api/libros', soloAdmin, async (req, res) => {
    const d = v.libro(req.body);
    d.portada = await portadaOptimizada(d);
    const existente = uno('SELECT id, activo FROM libros WHERE isbn = ?', d.isbn);
    if (existente?.activo) throw error(409, `Ya existe un libro con el ISBN ${d.isbn}`);
    let idLibro;
    if (existente) {
      // Estaba dado de baja: se reactiva con los datos nuevos y conserva su historial
      ejecutar(`UPDATE libros SET titulo=?, autor=?, editorial=?, anio=?, categoria=?, portada=?,
                ejemplares_totales=?, ejemplares_disponibles=?, activo=1 WHERE id=?`,
        d.titulo, d.autor, d.editorial, d.anio, d.categoria, d.portada,
        d.ejemplares_totales, d.ejemplares_totales, existente.id);
      idLibro = existente.id;
    } else {
      idLibro = Number(ejecutar(`INSERT INTO libros (isbn, titulo, autor, editorial, anio, categoria, portada,
                 ejemplares_totales, ejemplares_disponibles) VALUES (?,?,?,?,?,?,?,?,?)`,
        ...nulos(d), d.ejemplares_totales).lastInsertRowid);
    }
    registrar('libro_alta', `«${d.titulo}» añadido al catálogo (${d.ejemplares_totales} ejemplares)`, { libroId: idLibro, actor: quien(req) });
    res.status(201).json(libroActivo(idLibro));
  });

  app.put('/api/libros/:id', soloAdmin, async (req, res) => {
    const actual = libroActivo(v.id(req.params.id));
    const d = v.libro({ ...actual, ...req.body });
    if (d.portada !== actual.portada) d.portada = await portadaOptimizada(d);
    const duplicado = uno('SELECT id FROM libros WHERE isbn = ? AND id <> ?', d.isbn, actual.id);
    if (duplicado) throw error(409, `Ya existe otro libro con el ISBN ${d.isbn}`);
    // Ajuste dinámico de stock: los ejemplares prestados no pueden desaparecer
    if (d.ejemplares_totales < actual.prestados) {
      throw error(409, `No puedes dejar ${d.ejemplares_totales} ejemplares: hay ${actual.prestados} prestados ahora mismo`);
    }
    ejecutar(`UPDATE libros SET isbn=?, titulo=?, autor=?, editorial=?, anio=?, categoria=?, portada=?,
              ejemplares_totales=?, ejemplares_disponibles=? WHERE id=?`,
      ...nulos(d), d.ejemplares_totales - actual.prestados, actual.id);
    const cambioStock = d.ejemplares_totales !== actual.ejemplares_totales ? ` (ejemplares: ${actual.ejemplares_totales} → ${d.ejemplares_totales})` : '';
    registrar('libro_edicion', `«${d.titulo}» editado${cambioStock}`, { libroId: actual.id, actor: quien(req) });
    res.json(libroActivo(actual.id));
  });

  app.delete('/api/libros/:id', soloAdmin, (req, res) => {
    const libro = libroActivo(v.id(req.params.id));
    if (libro.prestados > 0) {
      throw error(409, `No se puede eliminar "${libro.titulo}": tiene ${libro.prestados} ejemplar(es) prestado(s)`);
    }
    ejecutar("UPDATE solicitudes SET estado = 'cancelada', resuelta_en = datetime('now','localtime'), motivo = 'Libro retirado del catálogo' WHERE libro_id = ? AND estado = 'pendiente'", libro.id);
    if (libro.veces_prestado > 0) {
      // Con historial: baja lógica para no perder el registro de préstamos
      ejecutar('UPDATE libros SET activo = 0 WHERE id = ?', libro.id);
      registrar('libro_baja', `«${libro.titulo}» dado de baja del catálogo`, { libroId: libro.id, actor: quien(req) });
      return res.json({ ok: true, modo: 'baja', mensaje: `"${libro.titulo}" dado de baja (se conserva su historial)` });
    }
    ejecutar('DELETE FROM libros WHERE id = ?', libro.id);
    registrar('libro_baja', `«${libro.titulo}» eliminado del catálogo`, { actor: quien(req) });
    res.json({ ok: true, modo: 'eliminado', mensaje: `"${libro.titulo}" eliminado del catálogo` });
  });

  // Autocompletado por ISBN: Google Books y, si no lo encuentra, Open Library
  app.get('/api/isbn/:isbn', soloAdmin, async (req, res) => {
    const isbn = v.isbn(req.params.isbn);
    const local = uno('SELECT id, titulo, activo FROM libros WHERE isbn = ?', isbn);
    const datos = (await buscarGoogleBooks(isbn)) || (await buscarOpenLibrary(isbn));
    if (!datos) throw error(404, 'No se han encontrado datos para ese ISBN. Rellena los campos a mano.');
    res.json({ ...datos, isbn, yaEnCatalogo: Boolean(local?.activo) });
  });

  // ───────────────────────── Usuarios ─────────────────────────
  const SQL_USUARIOS = `SELECT u.id, u.nombre, u.apellidos, u.email, u.rol, u.curso, u.estado, u.foto, u.creado_en,
      (u.password_hash IS NOT NULL) AS tiene_password,
      (SELECT COUNT(*) FROM prestamos p WHERE p.usuario_id = u.id AND p.fecha_devolucion IS NULL) AS prestamos_activos,
      (SELECT COUNT(*) FROM v_prestamos p WHERE p.usuario_id = u.id AND p.estado = 'retrasado') AS prestamos_retrasados,
      (SELECT COUNT(*) FROM prestamos p WHERE p.usuario_id = u.id) AS prestamos_totales
    FROM usuarios u WHERE 1 = 1`;

  const buscarUsuario = (idUsuario) => {
    const u = uno(`${SQL_USUARIOS} AND u.id = ?`, idUsuario);
    if (!u) throw error(404, 'Usuario no encontrado');
    return u;
  };

  app.get('/api/usuarios', soloAdmin, (req, res) => {
    let sql = SQL_USUARIOS;
    const p = [];
    if (req.query.q) {
      const like = `%${req.query.q}%`;
      sql += " AND (u.nombre || ' ' || u.apellidos LIKE ? OR u.email LIKE ? OR u.curso LIKE ?)";
      p.push(like, like, like);
    }
    if (req.query.rol) { sql += ' AND u.rol = ?'; p.push(req.query.rol); }
    if (req.query.estado) { sql += ' AND u.estado = ?'; p.push(req.query.estado); }
    res.json(todos(`${sql} ORDER BY u.apellidos COLLATE NOCASE, u.nombre COLLATE NOCASE`, ...p));
  });

  app.get('/api/usuarios/:id', soloAdmin, (req, res) => {
    const u = buscarUsuario(v.id(req.params.id));
    u.prestamos = todos('SELECT * FROM v_prestamos WHERE usuario_id = ? ORDER BY id DESC', u.id);
    u.reglas = REGLAS[u.rol];
    res.json(u);
  });

  app.post('/api/usuarios', soloAdmin, (req, res) => {
    const d = v.usuario(req.body);
    const password = req.body.password ? v.password(req.body.password) : null;
    if (uno('SELECT id FROM usuarios WHERE email = ?', d.email)) throw error(409, `Ya existe un usuario con el email ${d.email}`);
    const r = ejecutar('INSERT INTO usuarios (nombre, apellidos, email, rol, curso, estado, password_hash) VALUES (?,?,?,?,?,?,?)',
      ...nulos(d), password ? auth.hashPassword(password) : null);
    const nuevo = buscarUsuario(Number(r.lastInsertRowid));
    registrar('lector_alta', `Alta de ${d.nombre} ${d.apellidos} (${d.rol})`, { usuarioId: nuevo.id, actor: quien(req) });
    res.status(201).json(nuevo);
  });

  app.put('/api/usuarios/:id', soloAdmin, (req, res) => {
    const actual = buscarUsuario(v.id(req.params.id));
    const d = v.usuario({ ...actual, ...req.body });
    if (uno('SELECT id FROM usuarios WHERE email = ? AND id <> ?', d.email, actual.id)) {
      throw error(409, `Ya existe otro usuario con el email ${d.email}`);
    }
    if (d.estado === 'baja' && actual.prestamos_activos > 0) {
      throw error(409, `No se puede dar de baja: tiene ${actual.prestamos_activos} préstamo(s) sin devolver`);
    }
    const password = req.body.password ? v.password(req.body.password) : null;
    ejecutar('UPDATE usuarios SET nombre=?, apellidos=?, email=?, rol=?, curso=?, estado=? WHERE id=?', ...nulos(d), actual.id);
    if (password) ejecutar('UPDATE usuarios SET password_hash = ? WHERE id = ?', auth.hashPassword(password), actual.id);
    if (d.estado === 'baja') cancelarSolicitudesDe(actual.id, 'Cuenta dada de baja');
    const cambios = [actual.estado !== d.estado && `estado: ${d.estado}`, password && 'nueva contraseña'].filter(Boolean).join(', ');
    registrar('lector_edicion', `Ficha de ${d.nombre} ${d.apellidos} actualizada${cambios ? ` (${cambios})` : ''}`, { usuarioId: actual.id, actor: quien(req) });
    res.json(buscarUsuario(actual.id));
  });

  app.delete('/api/usuarios/:id', soloAdmin, (req, res) => {
    const u = buscarUsuario(v.id(req.params.id));
    const nombre = `${u.nombre} ${u.apellidos}`;
    if (u.prestamos_activos > 0) {
      throw error(409, `No se puede eliminar a ${nombre}: tiene ${u.prestamos_activos} préstamo(s) sin devolver`);
    }
    if (u.prestamos_totales > 0) {
      ejecutar("UPDATE usuarios SET estado = 'baja' WHERE id = ?", u.id);
      cancelarSolicitudesDe(u.id, 'Cuenta dada de baja');
      registrar('lector_baja', `${nombre} dado de baja`, { usuarioId: u.id, actor: quien(req) });
      return res.json({ ok: true, modo: 'baja', mensaje: `${nombre} pasa a estado "baja" (se conserva su historial)` });
    }
    ejecutar('DELETE FROM usuarios WHERE id = ?', u.id);
    borrarFoto(u.foto);
    registrar('lector_baja', `${nombre} eliminado`, { actor: quien(req) });
    res.json({ ok: true, modo: 'eliminado', mensaje: `${nombre} eliminado` });
  });

  const cancelarSolicitudesDe = (idUsuario, motivo) =>
    ejecutar("UPDATE solicitudes SET estado = 'cancelada', resuelta_en = datetime('now','localtime'), motivo = ? WHERE usuario_id = ? AND estado = 'pendiente'", motivo, idUsuario);

  // ───────────────────────── Préstamos ─────────────────────────
  const buscarPrestamo = (idPrestamo) => {
    const p = uno('SELECT * FROM v_prestamos WHERE id = ?', idPrestamo);
    if (!p) throw error(404, 'Préstamo no encontrado');
    return p;
  };

  // Reglas de negocio de un préstamo nuevo. Se llama dentro de una transacción.
  function crearPrestamo({ libroId, usuarioId, dias, notas, actor }) {
    const u = buscarUsuario(usuarioId);
    const libro = libroActivo(libroId);
    const regla = REGLAS[u.rol];
    const plazo = v.entero(dias, 'días de préstamo', { min: 1, max: 90 }) || regla.diasPrestamo;
    const nombre = `${u.nombre} ${u.apellidos}`;

    if (u.estado !== 'activo') throw error(409, `${nombre} no puede llevarse libros: su estado es "${u.estado}"`);
    if (u.prestamos_retrasados > 0) {
      throw error(409, `${nombre} tiene ${u.prestamos_retrasados} préstamo(s) con retraso. Debe devolverlos antes de pedir otro`);
    }
    if (u.prestamos_activos >= regla.maxPrestamos) {
      throw error(409, `${nombre} ya tiene ${u.prestamos_activos} libros: el máximo para un ${u.rol} es ${regla.maxPrestamos}`);
    }
    if (uno('SELECT 1 FROM prestamos WHERE libro_id = ? AND usuario_id = ? AND fecha_devolucion IS NULL', libroId, usuarioId)) {
      throw error(409, `${nombre} ya tiene prestado "${libro.titulo}"`);
    }
    // Descuento de stock atómico: solo resta si queda algún ejemplar
    const r = ejecutar('UPDATE libros SET ejemplares_disponibles = ejemplares_disponibles - 1 WHERE id = ? AND ejemplares_disponibles > 0', libroId);
    if (r.changes === 0) throw error(409, `No quedan ejemplares disponibles de "${libro.titulo}"`);

    const idPrestamo = Number(ejecutar(`INSERT INTO prestamos (libro_id, usuario_id, fecha_limite, notas)
                            VALUES (?, ?, date('now','localtime', ?), ?)`,
      libroId, usuarioId, `+${plazo} days`, notas ?? null).lastInsertRowid);
    // Si el lector tenía pedido este libro, la petición queda atendida
    const atendida = ejecutar("UPDATE solicitudes SET estado = 'atendida', resuelta_en = datetime('now','localtime') WHERE libro_id = ? AND usuario_id = ? AND estado = 'pendiente'", libroId, usuarioId);
    registrar('prestamo', `«${libro.titulo}» prestado a ${nombre} durante ${plazo} días${atendida.changes ? ' (atendiendo su petición)' : ''}`,
      { libroId, usuarioId, actor });
    return idPrestamo;
  }

  function renovarPrestamo(idPrestamo, actor) {
    const p = buscarPrestamo(idPrestamo);
    if (p.fecha_devolucion) throw error(409, 'No se puede renovar un préstamo ya devuelto');
    if (p.estado === 'retrasado') throw error(409, `No se puede renovar: lleva ${p.dias_retraso} día(s) de retraso. Hay que devolverlo`);
    if (p.renovaciones >= MAX_RENOVACIONES) throw error(409, `Ya se ha renovado ${MAX_RENOVACIONES} veces (máximo permitido)`);
    if (uno("SELECT 1 FROM solicitudes WHERE libro_id = ? AND estado = 'pendiente' AND usuario_id <> ?", p.libro_id, p.usuario_id)) {
      throw error(409, 'No se puede renovar: hay otros lectores esperando este libro');
    }
    ejecutar('UPDATE prestamos SET fecha_limite = date(fecha_limite, ?), renovaciones = renovaciones + 1 WHERE id = ?',
      `+${REGLAS[p.rol].diasPrestamo} days`, idPrestamo);
    const nueva = uno('SELECT fecha_limite FROM prestamos WHERE id = ?', idPrestamo).fecha_limite;
    registrar('renovacion', `«${p.titulo}» renovado para ${p.usuario} hasta el ${nueva}`, { libroId: p.libro_id, usuarioId: p.usuario_id, actor });
  }

  app.get('/api/prestamos', soloAdmin, (req, res) => {
    let sql = 'SELECT * FROM v_prestamos WHERE 1 = 1';
    const p = [];
    const { estado } = req.query;
    if (estado === 'abiertos') sql += " AND estado IN ('activo','retrasado')";
    else if (['activo', 'retrasado', 'devuelto'].includes(estado)) { sql += ' AND estado = ?'; p.push(estado); }
    if (req.query.usuario_id) { sql += ' AND usuario_id = ?'; p.push(v.id(req.query.usuario_id, 'usuario_id')); }
    if (req.query.libro_id) { sql += ' AND libro_id = ?'; p.push(v.id(req.query.libro_id, 'libro_id')); }
    if (req.query.q) {
      const like = `%${req.query.q}%`;
      sql += ' AND (titulo LIKE ? OR usuario LIKE ? OR isbn LIKE ?)';
      p.push(like, like, like);
    }
    // Primero los abiertos (los más urgentes arriba) y después el historial más reciente
    sql += ` ORDER BY (fecha_devolucion IS NULL) DESC,
             CASE WHEN fecha_devolucion IS NULL THEN fecha_limite END ASC,
             fecha_devolucion DESC, id DESC`;
    const limite = v.entero(req.query.limite, 'limite', { min: 1, max: 1000 }) || 500;
    res.json(todos(`${sql} LIMIT ${limite}`, ...p));
  });

  app.post('/api/prestamos', soloAdmin, (req, res) => {
    const libroId = v.id(req.body.libro_id, 'libro');
    const usuarioId = v.id(req.body.usuario_id, 'usuario');
    const notas = v.texto(req.body.notas, 'notas', { max: 300 });
    const nuevoId = transaccion(db, () => crearPrestamo({ libroId, usuarioId, dias: req.body.dias, notas, actor: quien(req) }));
    res.status(201).json(buscarPrestamo(nuevoId));
  });

  app.post('/api/prestamos/:id/devolver', soloAdmin, (req, res) => {
    const idPrestamo = v.id(req.params.id);
    transaccion(db, () => {
      const p = buscarPrestamo(idPrestamo);
      if (p.fecha_devolucion) throw error(409, `Este préstamo ya se devolvió el ${p.fecha_devolucion}`);
      ejecutar("UPDATE prestamos SET fecha_devolucion = date('now','localtime'), devuelto_en = datetime('now','localtime') WHERE id = ?", idPrestamo);
      ejecutar('UPDATE libros SET ejemplares_disponibles = ejemplares_disponibles + 1 WHERE id = ?', p.libro_id);
      registrar('devolucion', `${p.usuario} devuelve «${p.titulo}»${p.dias_retraso ? ` con ${p.dias_retraso} día(s) de retraso` : ''}`,
        { libroId: p.libro_id, usuarioId: p.usuario_id, actor: quien(req) });
    });
    res.json(buscarPrestamo(idPrestamo));
  });

  app.post('/api/prestamos/:id/renovar', soloAdmin, (req, res) => {
    const idPrestamo = v.id(req.params.id);
    transaccion(db, () => renovarPrestamo(idPrestamo, quien(req)));
    res.json(buscarPrestamo(idPrestamo));
  });

  // ───────────────────────── Peticiones de lectores ─────────────────────────
  const SQL_SOLICITUDES = `SELECT s.*, l.titulo, l.autor, l.isbn, l.portada, l.ejemplares_disponibles,
      u.nombre || ' ' || u.apellidos AS usuario, u.rol, u.curso, u.email, u.foto,
      (SELECT COUNT(*) FROM solicitudes s2 WHERE s2.libro_id = s.libro_id AND s2.estado = 'pendiente' AND s2.id < s.id) AS posicion
    FROM solicitudes s JOIN libros l ON l.id = s.libro_id JOIN usuarios u ON u.id = s.usuario_id`;

  const buscarSolicitud = (idSolicitud) => {
    const s = uno(`${SQL_SOLICITUDES} WHERE s.id = ?`, idSolicitud);
    if (!s) throw error(404, 'Petición no encontrada');
    return s;
  };

  app.get('/api/solicitudes', soloAdmin, (req, res) => {
    const estado = ['pendiente', 'atendida', 'rechazada', 'cancelada'].includes(req.query.estado) ? req.query.estado : 'pendiente';
    res.json(todos(`${SQL_SOLICITUDES} WHERE s.estado = ? ORDER BY s.id`, estado));
  });

  app.post('/api/solicitudes/:id/atender', soloAdmin, (req, res) => {
    const s = buscarSolicitud(v.id(req.params.id));
    if (s.estado !== 'pendiente') throw error(409, 'Esta petición ya está resuelta');
    const idPrestamo = transaccion(db, () => crearPrestamo({ libroId: s.libro_id, usuarioId: s.usuario_id, actor: quien(req) }));
    res.status(201).json(buscarPrestamo(idPrestamo));
  });

  app.post('/api/solicitudes/:id/rechazar', soloAdmin, (req, res) => {
    const s = buscarSolicitud(v.id(req.params.id));
    if (s.estado !== 'pendiente') throw error(409, 'Esta petición ya está resuelta');
    const motivo = v.texto(req.body?.motivo, 'motivo', { max: 200 });
    ejecutar("UPDATE solicitudes SET estado = 'rechazada', resuelta_en = datetime('now','localtime'), motivo = ? WHERE id = ?", motivo, s.id);
    registrar('solicitud_rechazada', `Petición de ${s.usuario} para «${s.titulo}» rechazada`, { libroId: s.libro_id, usuarioId: s.usuario_id, actor: quien(req) });
    res.json(buscarSolicitud(s.id));
  });

  // ───────────────────────── Zona del lector ─────────────────────────
  app.get('/api/yo', soloLector, (req, res) => {
    const u = buscarUsuario(req.sesion.usuario_id);
    u.reglas = { ...REGLAS[u.rol], maxRenovaciones: MAX_RENOVACIONES, maxSolicitudes: MAX_SOLICITUDES };
    u.prestamos = todos(`SELECT p.*, l.portada, l.categoria FROM v_prestamos p JOIN libros l ON l.id = p.libro_id
                         WHERE p.usuario_id = ? ORDER BY (p.fecha_devolucion IS NULL) DESC, p.fecha_limite, p.id DESC`, u.id);
    u.solicitudes = todos(`${SQL_SOLICITUDES} WHERE s.usuario_id = ? AND (s.estado = 'pendiente' OR s.resuelta_en >= datetime('now','localtime','-7 days'))
                           ORDER BY s.estado = 'pendiente' DESC, s.id DESC`, u.id);
    // Recomendaciones: libros disponibles de las categorías que ya ha leído y que aún no ha leído
    u.movimientos = todos(`SELECT m.*, l.titulo, l.portada FROM movimientos m LEFT JOIN libros l ON l.id = m.libro_id
                           WHERE m.usuario_id = ? ORDER BY m.creado_en DESC, m.id DESC LIMIT 60`, u.id);
    u.recomendados = todos(`SELECT l.*, COUNT(p2.id) AS popularidad FROM libros l
        LEFT JOIN prestamos p2 ON p2.libro_id = l.id
        WHERE l.activo = 1 AND l.ejemplares_disponibles > 0
          AND l.id NOT IN (SELECT libro_id FROM prestamos WHERE usuario_id = ?)
        GROUP BY l.id
        ORDER BY (l.categoria IN (SELECT l2.categoria FROM prestamos p3 JOIN libros l2 ON l2.id = p3.libro_id WHERE p3.usuario_id = ?)) DESC,
                 popularidad DESC, l.titulo
        LIMIT 8`, u.id, u.id);
    res.json(u);
  });

  app.post('/api/yo/prestamos/:id/renovar', soloLector, (req, res) => {
    const idPrestamo = v.id(req.params.id);
    transaccion(db, () => {
      const p = buscarPrestamo(idPrestamo);
      if (p.usuario_id !== req.sesion.usuario_id) throw error(403, 'Este préstamo no es tuyo');
      renovarPrestamo(idPrestamo, quien(req));
    });
    res.json(buscarPrestamo(idPrestamo));
  });

  app.post('/api/yo/solicitudes', soloLector, (req, res) => {
    const libroId = v.id(req.body?.libro_id, 'libro');
    const idSolicitud = transaccion(db, () => {
      const u = buscarUsuario(req.sesion.usuario_id);
      const libro = libroActivo(libroId);
      if (u.estado !== 'activo') throw error(409, `Tu cuenta está ${u.estado}: no puedes pedir libros ahora`);
      if (uno('SELECT 1 FROM prestamos WHERE libro_id = ? AND usuario_id = ? AND fecha_devolucion IS NULL', libroId, u.id)) {
        throw error(409, `Ya tienes "${libro.titulo}" en préstamo`);
      }
      if (uno("SELECT 1 FROM solicitudes WHERE libro_id = ? AND usuario_id = ? AND estado = 'pendiente'", libroId, u.id)) {
        throw error(409, `Ya has pedido "${libro.titulo}"`);
      }
      const pendientes = uno("SELECT COUNT(*) AS n FROM solicitudes WHERE usuario_id = ? AND estado = 'pendiente'", u.id).n;
      if (pendientes >= MAX_SOLICITUDES) throw error(409, `Solo puedes tener ${MAX_SOLICITUDES} peticiones a la vez`);
      const id = Number(ejecutar('INSERT INTO solicitudes (libro_id, usuario_id) VALUES (?, ?)', libroId, u.id).lastInsertRowid);
      registrar('solicitud', `${u.nombre} ${u.apellidos} pide «${libro.titulo}»${libro.ejemplares_disponibles ? '' : ' (lista de espera)'}`,
        { libroId, usuarioId: u.id, actor: quien(req) });
      return id;
    });
    res.status(201).json(buscarSolicitud(idSolicitud));
  });

  app.delete('/api/yo/solicitudes/:id', soloLector, (req, res) => {
    const s = buscarSolicitud(v.id(req.params.id));
    if (s.usuario_id !== req.sesion.usuario_id) throw error(403, 'Esta petición no es tuya');
    if (s.estado !== 'pendiente') throw error(409, 'Esta petición ya está resuelta');
    ejecutar("UPDATE solicitudes SET estado = 'cancelada', resuelta_en = datetime('now','localtime'), motivo = 'Cancelada por el lector' WHERE id = ?", s.id);
    registrar('solicitud_cancelada', `${s.usuario} cancela su petición de «${s.titulo}»`, { libroId: s.libro_id, usuarioId: s.usuario_id, actor: quien(req) });
    res.json({ ok: true });
  });

  // ───────────────────────── Estadísticas (dashboard) ─────────────────────────
  app.get('/api/stats', soloAdmin, (req, res) => {
    res.json({
      libros: uno(`SELECT COUNT(*) AS titulos, COALESCE(SUM(ejemplares_totales),0) AS ejemplares,
                   COALESCE(SUM(ejemplares_disponibles),0) AS disponibles FROM libros WHERE activo = 1`),
      usuarios: uno(`SELECT COUNT(*) AS total,
                     SUM(estado = 'activo') AS activos, SUM(rol = 'alumno' AND estado <> 'baja') AS alumnos,
                     SUM(rol = 'profesor' AND estado <> 'baja') AS profesores FROM usuarios`),
      prestamos: uno(`SELECT SUM(estado IN ('activo','retrasado')) AS abiertos, SUM(estado = 'retrasado') AS retrasados,
                      SUM(fecha_devolucion = date('now','localtime')) AS devueltos_hoy,
                      SUM(fecha_prestamo = date('now','localtime')) AS prestados_hoy,
                      COUNT(*) AS historico FROM v_prestamos`),
      solicitudes: todos(`${SQL_SOLICITUDES} WHERE s.estado = 'pendiente' ORDER BY s.id`),
      movimientos: todos(`SELECT m.*, l.titulo, l.portada FROM movimientos m LEFT JOIN libros l ON l.id = m.libro_id
                          ORDER BY m.creado_en DESC, m.id DESC LIMIT 7`),
      retrasados: todos("SELECT * FROM v_prestamos WHERE estado = 'retrasado' ORDER BY dias_retraso DESC LIMIT 10"),
      vencen_pronto: todos(`SELECT * FROM v_prestamos WHERE estado = 'activo'
                            AND fecha_limite <= date('now','localtime','+3 days') ORDER BY fecha_limite LIMIT 10`),
      top_libros: todos(`SELECT l.id, l.titulo, l.autor, l.isbn, l.portada, COUNT(p.id) AS veces
                         FROM libros l JOIN prestamos p ON p.libro_id = l.id WHERE l.activo = 1
                         GROUP BY l.id ORDER BY veces DESC, l.titulo LIMIT 5`),
      actividad: todos(`WITH RECURSIVE dias(d) AS (
                          SELECT date('now','localtime','-13 days') UNION ALL
                          SELECT date(d,'+1 day') FROM dias WHERE d < date('now','localtime'))
                        SELECT d AS dia,
                          (SELECT COUNT(*) FROM prestamos WHERE fecha_prestamo = d) AS prestamos,
                          (SELECT COUNT(*) FROM prestamos WHERE fecha_devolucion = d) AS devoluciones
                        FROM dias`),
      categorias: todos(`SELECT categoria, COUNT(*) AS n FROM libros WHERE activo = 1 AND categoria IS NOT NULL
                         GROUP BY categoria ORDER BY n DESC`),
      reglas: { ...REGLAS, maxRenovaciones: MAX_RENOVACIONES },
    });
  });

  // ───────────────────────── Errores ─────────────────────────
  app.use('/api', (req, res) => res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` }));

  app.use((err, req, res, next) => {
    if (err instanceof v.HttpError) return res.status(err.status).json({ error: err.message });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'El cuerpo de la petición no es JSON válido' });
    if (/constraint/i.test(err.message)) return res.status(409).json({ error: 'Operación no permitida por las reglas de la base de datos' });
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  });

  return app;
}

// ───────────────────────── Búsqueda externa de ISBN ─────────────────────────
async function obtenerJson(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(6000), headers: { 'User-Agent': 'Scriptorium/1.0' } });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

async function buscarGoogleBooks(isbn) {
  const clave = process.env.GOOGLE_BOOKS_API_KEY ? `&key=${process.env.GOOGLE_BOOKS_API_KEY}` : '';
  const j = await obtenerJson(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}${clave}`);
  const info = j?.items?.[0]?.volumeInfo;
  if (!info) return null;
  return {
    titulo: info.title + (info.subtitle ? `. ${info.subtitle}` : ''),
    autor: (info.authors || []).join(', '),
    editorial: info.publisher || '',
    anio: Number(String(info.publishedDate || '').slice(0, 4)) || null,
    categoria: info.categories?.[0] || '',
    portada: (info.imageLinks?.thumbnail || '').replace('http://', 'https://'),
    fuente: 'Google Books',
  };
}

async function buscarOpenLibrary(isbn) {
  const j = await obtenerJson(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
  const info = j?.[`ISBN:${isbn}`];
  if (!info) return null;
  return {
    titulo: info.title + (info.subtitle ? `. ${info.subtitle}` : ''),
    autor: (info.authors || []).map((a) => a.name).join(', '),
    editorial: info.publishers?.[0]?.name || '',
    anio: Number((String(info.publish_date || '').match(/\d{4}/) || [])[0]) || null,
    categoria: '',
    portada: info.cover?.medium || '',
    fuente: 'Open Library',
  };
}

// ───────────────────────── Arranque ─────────────────────────
if (require.main === module) {
  const db = abrir();
  if (process.env.SEED !== 'false') sembrar(db);
  const PORT = process.env.PORT || 3000;
  crearApp(db).listen(PORT, () => console.log(`Scriptorium en http://localhost:${PORT}`));
}

module.exports = { crearApp };
