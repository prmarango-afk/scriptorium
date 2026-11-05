// Scriptorium (biblioteca escolar) — servidor Express (API REST + frontend estático)
const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const { abrir, transaccion, REGLAS, MAX_RENOVACIONES, MAX_SOLICITUDES } = require('./db');
const { sembrar } = require('./seed');
const v = require('./validacion');

const { error } = v;
const ADMIN_PIN = process.env.ADMIN_PIN || '1234';
const DURACION_SESION_MS = 12 * 60 * 60 * 1000;

function crearApp(db) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
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
  // Dos roles: "admin" (personal de biblioteca, entra con PIN) y "lector" (alumno/profesor, entra con su email).
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

  app.post('/api/sesion', (req, res) => {
    const { tipo } = req.body || {};
    let sesion;
    if (tipo === 'admin') {
      const pin = String(req.body.pin ?? '');
      const esperado = Buffer.from(ADMIN_PIN);
      const recibido = Buffer.from(pin.padEnd(esperado.length).slice(0, esperado.length));
      if (pin.length !== ADMIN_PIN.length || !crypto.timingSafeEqual(esperado, recibido)) throw error(401, 'PIN incorrecto');
      sesion = { rol: 'admin', nombre: 'Biblioteca' };
    } else if (tipo === 'lector') {
      const email = v.texto(req.body.email, 'email', { requerido: true }).toLowerCase();
      const u = uno('SELECT id, nombre, apellidos, estado FROM usuarios WHERE email = ?', email);
      if (!u) throw error(401, 'No hay ningún lector con ese email');
      if (u.estado === 'baja') throw error(403, 'Tu cuenta está dada de baja. Pregunta en la biblioteca');
      sesion = { rol: 'lector', usuario_id: u.id, nombre: `${u.nombre} ${u.apellidos}` };
    } else {
      throw error(400, 'Tipo de acceso no válido');
    }
    const token = crypto.randomBytes(24).toString('hex');
    sesiones.set(token, { ...sesion, expira: Date.now() + DURACION_SESION_MS });
    res.status(201).json({ token, ...sesion });
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

  // Lectores de demostración para la pantalla de acceso (solo con datos demo)
  app.get('/api/demo/lectores', (req, res) => {
    if (process.env.SEED === 'false') return res.json([]);
    const consulta = (rol, n) => todos(`SELECT nombre, apellidos, email, rol, curso FROM usuarios
                                        WHERE estado = 'activo' AND rol = ? ORDER BY id LIMIT ?`, rol, n);
    res.json([...consulta('alumno', 4), ...consulta('profesor', 2)]);
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
  app.post('/api/libros', soloAdmin, (req, res) => {
    const d = v.libro(req.body);
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
    res.status(201).json(libroActivo(idLibro));
  });

  app.put('/api/libros/:id', soloAdmin, (req, res) => {
    const actual = libroActivo(v.id(req.params.id));
    const d = v.libro({ ...actual, ...req.body });
    const duplicado = uno('SELECT id FROM libros WHERE isbn = ? AND id <> ?', d.isbn, actual.id);
    if (duplicado) throw error(409, `Ya existe otro libro con el ISBN ${d.isbn}`);
    // Ajuste dinámico de stock: los ejemplares prestados no pueden desaparecer
    if (d.ejemplares_totales < actual.prestados) {
      throw error(409, `No puedes dejar ${d.ejemplares_totales} ejemplares: hay ${actual.prestados} prestados ahora mismo`);
    }
    ejecutar(`UPDATE libros SET isbn=?, titulo=?, autor=?, editorial=?, anio=?, categoria=?, portada=?,
              ejemplares_totales=?, ejemplares_disponibles=? WHERE id=?`,
      ...nulos(d), d.ejemplares_totales - actual.prestados, actual.id);
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
      return res.json({ ok: true, modo: 'baja', mensaje: `"${libro.titulo}" dado de baja (se conserva su historial)` });
    }
    ejecutar('DELETE FROM libros WHERE id = ?', libro.id);
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
  const SQL_USUARIOS = `SELECT u.*,
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
    if (uno('SELECT id FROM usuarios WHERE email = ?', d.email)) throw error(409, `Ya existe un usuario con el email ${d.email}`);
    const r = ejecutar('INSERT INTO usuarios (nombre, apellidos, email, rol, curso, estado) VALUES (?,?,?,?,?,?)', ...nulos(d));
    res.status(201).json(buscarUsuario(Number(r.lastInsertRowid)));
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
    ejecutar('UPDATE usuarios SET nombre=?, apellidos=?, email=?, rol=?, curso=?, estado=? WHERE id=?', ...nulos(d), actual.id);
    if (d.estado === 'baja') cancelarSolicitudesDe(actual.id, 'Cuenta dada de baja');
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
      return res.json({ ok: true, modo: 'baja', mensaje: `${nombre} pasa a estado "baja" (se conserva su historial)` });
    }
    ejecutar('DELETE FROM usuarios WHERE id = ?', u.id);
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
  function crearPrestamo({ libroId, usuarioId, dias, notas }) {
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
    ejecutar("UPDATE solicitudes SET estado = 'atendida', resuelta_en = datetime('now','localtime') WHERE libro_id = ? AND usuario_id = ? AND estado = 'pendiente'", libroId, usuarioId);
    return idPrestamo;
  }

  function renovarPrestamo(idPrestamo) {
    const p = buscarPrestamo(idPrestamo);
    if (p.fecha_devolucion) throw error(409, 'No se puede renovar un préstamo ya devuelto');
    if (p.estado === 'retrasado') throw error(409, `No se puede renovar: lleva ${p.dias_retraso} día(s) de retraso. Hay que devolverlo`);
    if (p.renovaciones >= MAX_RENOVACIONES) throw error(409, `Ya se ha renovado ${MAX_RENOVACIONES} veces (máximo permitido)`);
    if (uno("SELECT 1 FROM solicitudes WHERE libro_id = ? AND estado = 'pendiente' AND usuario_id <> ?", p.libro_id, p.usuario_id)) {
      throw error(409, 'No se puede renovar: hay otros lectores esperando este libro');
    }
    ejecutar('UPDATE prestamos SET fecha_limite = date(fecha_limite, ?), renovaciones = renovaciones + 1 WHERE id = ?',
      `+${REGLAS[p.rol].diasPrestamo} days`, idPrestamo);
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
    const nuevoId = transaccion(db, () => crearPrestamo({ libroId, usuarioId, dias: req.body.dias, notas }));
    res.status(201).json(buscarPrestamo(nuevoId));
  });

  app.post('/api/prestamos/:id/devolver', soloAdmin, (req, res) => {
    const idPrestamo = v.id(req.params.id);
    transaccion(db, () => {
      const p = buscarPrestamo(idPrestamo);
      if (p.fecha_devolucion) throw error(409, `Este préstamo ya se devolvió el ${p.fecha_devolucion}`);
      ejecutar("UPDATE prestamos SET fecha_devolucion = date('now','localtime') WHERE id = ?", idPrestamo);
      ejecutar('UPDATE libros SET ejemplares_disponibles = ejemplares_disponibles + 1 WHERE id = ?', p.libro_id);
    });
    res.json(buscarPrestamo(idPrestamo));
  });

  app.post('/api/prestamos/:id/renovar', soloAdmin, (req, res) => {
    const idPrestamo = v.id(req.params.id);
    transaccion(db, () => renovarPrestamo(idPrestamo));
    res.json(buscarPrestamo(idPrestamo));
  });

  // ───────────────────────── Peticiones de lectores ─────────────────────────
  const SQL_SOLICITUDES = `SELECT s.*, l.titulo, l.autor, l.isbn, l.portada, l.ejemplares_disponibles,
      u.nombre || ' ' || u.apellidos AS usuario, u.rol, u.curso, u.email,
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
    const idPrestamo = transaccion(db, () => crearPrestamo({ libroId: s.libro_id, usuarioId: s.usuario_id }));
    res.status(201).json(buscarPrestamo(idPrestamo));
  });

  app.post('/api/solicitudes/:id/rechazar', soloAdmin, (req, res) => {
    const s = buscarSolicitud(v.id(req.params.id));
    if (s.estado !== 'pendiente') throw error(409, 'Esta petición ya está resuelta');
    const motivo = v.texto(req.body?.motivo, 'motivo', { max: 200 });
    ejecutar("UPDATE solicitudes SET estado = 'rechazada', resuelta_en = datetime('now','localtime'), motivo = ? WHERE id = ?", motivo, s.id);
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
      renovarPrestamo(idPrestamo);
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
      return Number(ejecutar('INSERT INTO solicitudes (libro_id, usuario_id) VALUES (?, ?)', libroId, u.id).lastInsertRowid);
    });
    res.status(201).json(buscarSolicitud(idSolicitud));
  });

  app.delete('/api/yo/solicitudes/:id', soloLector, (req, res) => {
    const s = buscarSolicitud(v.id(req.params.id));
    if (s.usuario_id !== req.sesion.usuario_id) throw error(403, 'Esta petición no es tuya');
    if (s.estado !== 'pendiente') throw error(409, 'Esta petición ya está resuelta');
    ejecutar("UPDATE solicitudes SET estado = 'cancelada', resuelta_en = datetime('now','localtime'), motivo = 'Cancelada por el lector' WHERE id = ?", s.id);
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
