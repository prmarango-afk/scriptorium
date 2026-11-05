// Capa de datos: conexión SQLite (módulo nativo node:sqlite, sin dependencias
// que compilar), creación automática del esquema y utilidades de transacción.
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'library.db');

// Reglas de negocio configurables por rol
const REGLAS = {
  alumno:   { maxPrestamos: 3, diasPrestamo: 15 },
  profesor: { maxPrestamos: 6, diasPrestamo: 30 },
};
const MAX_RENOVACIONES = 2;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS libros (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  isbn                   TEXT    NOT NULL UNIQUE,
  titulo                 TEXT    NOT NULL,
  autor                  TEXT    NOT NULL,
  editorial              TEXT,
  anio                   INTEGER,
  categoria              TEXT,
  portada                TEXT,
  ejemplares_totales     INTEGER NOT NULL DEFAULT 1 CHECK (ejemplares_totales >= 0),
  ejemplares_disponibles INTEGER NOT NULL DEFAULT 1,
  activo                 INTEGER NOT NULL DEFAULT 1,
  creado_en              TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  CHECK (ejemplares_disponibles >= 0 AND ejemplares_disponibles <= ejemplares_totales)
);

CREATE TABLE IF NOT EXISTS usuarios (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre     TEXT NOT NULL,
  apellidos  TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE COLLATE NOCASE,
  rol        TEXT NOT NULL CHECK (rol IN ('alumno','profesor')),
  curso      TEXT,
  estado     TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','suspendido','baja')),
  creado_en  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS prestamos (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  libro_id         INTEGER NOT NULL REFERENCES libros(id)   ON DELETE RESTRICT,
  usuario_id       INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  fecha_prestamo   TEXT    NOT NULL DEFAULT (date('now','localtime')),
  fecha_limite     TEXT    NOT NULL,
  fecha_devolucion TEXT,
  renovaciones     INTEGER NOT NULL DEFAULT 0,
  notas            TEXT
);

CREATE INDEX IF NOT EXISTS idx_prestamos_libro   ON prestamos(libro_id);
CREATE INDEX IF NOT EXISTS idx_prestamos_usuario ON prestamos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_prestamos_abiertos ON prestamos(fecha_devolucion);

-- Vista con el estado calculado de cada préstamo (activo / retrasado / devuelto)
DROP VIEW IF EXISTS v_prestamos;
CREATE VIEW v_prestamos AS
SELECT p.*,
       l.titulo, l.autor, l.isbn,
       u.nombre || ' ' || u.apellidos AS usuario,
       u.rol, u.curso, u.email,
       CASE
         WHEN p.fecha_devolucion IS NOT NULL THEN 'devuelto'
         WHEN p.fecha_limite < date('now','localtime') THEN 'retrasado'
         ELSE 'activo'
       END AS estado,
       -- Días de retraso: hasta hoy si sigue abierto, hasta la devolución si ya se devolvió
       CAST(max(0, julianday(COALESCE(p.fecha_devolucion, date('now','localtime')))
                   - julianday(p.fecha_limite)) AS INTEGER) AS dias_retraso
FROM prestamos p
JOIN libros   l ON l.id = p.libro_id
JOIN usuarios u ON u.id = p.usuario_id;
`;

function abrir(dbPath = DB_PATH) {
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  if (dbPath !== ':memory:') db.exec('PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA);
  return db;
}

// Ejecuta fn dentro de una transacción; si lanza, deshace todo.
function transaccion(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

module.exports = { abrir, transaccion, DB_PATH, REGLAS, MAX_RENOVACIONES };
