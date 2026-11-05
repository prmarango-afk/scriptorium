// Validación y normalización de datos de entrada.
// Cada función lanza HttpError(400) con un mensaje pensado para mostrarse al usuario.

class HttpError extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

const error = (status, mensaje) => new HttpError(status, mensaje);

function texto(valor, campo, { max = 200, requerido = false } = {}) {
  const v = valor == null ? '' : String(valor).trim();
  if (requerido && !v) throw error(400, `El campo "${campo}" es obligatorio`);
  if (v.length > max) throw error(400, `El campo "${campo}" no puede superar ${max} caracteres`);
  return v || null;
}

function entero(valor, campo, { min = -Infinity, max = Infinity, requerido = false } = {}) {
  if (valor === '' || valor == null) {
    if (requerido) throw error(400, `El campo "${campo}" es obligatorio`);
    return null;
  }
  const n = Number(valor);
  if (!Number.isInteger(n)) throw error(400, `El campo "${campo}" debe ser un número entero`);
  if (n < min || n > max) throw error(400, `El campo "${campo}" debe estar entre ${min} y ${max}`);
  return n;
}

function id(valor, campo = 'id') {
  return entero(valor, campo, { min: 1, requerido: true });
}

const normalizarIsbn = (raw) => String(raw ?? '').replace(/[\s-]/g, '').toUpperCase();

// Comprueba el dígito de control de ISBN-10 (módulo 11) o ISBN-13 (módulo 10)
function isbnValido(isbn) {
  if (/^\d{9}[\dX]$/.test(isbn)) {
    let suma = 0;
    for (let i = 0; i < 10; i++) suma += (isbn[i] === 'X' ? 10 : +isbn[i]) * (10 - i);
    return suma % 11 === 0;
  }
  if (/^97[89]\d{10}$/.test(isbn)) {
    let suma = 0;
    for (let i = 0; i < 12; i++) suma += +isbn[i] * (i % 2 ? 3 : 1);
    return (10 - (suma % 10)) % 10 === +isbn[12];
  }
  return false;
}

function isbn(valor) {
  const v = normalizarIsbn(valor);
  if (!v) throw error(400, 'El campo "ISBN" es obligatorio');
  if (!isbnValido(v)) throw error(400, `El ISBN "${valor}" no es válido (revisa los dígitos: debe ser un ISBN-10 o ISBN-13 correcto)`);
  return v;
}

function libro(b) {
  const anioMax = new Date().getFullYear() + 1;
  return {
    isbn: isbn(b.isbn),
    titulo: texto(b.titulo, 'título', { requerido: true }),
    autor: texto(b.autor, 'autor', { requerido: true }),
    editorial: texto(b.editorial, 'editorial', { max: 120 }),
    anio: entero(b.anio, 'año', { min: 1000, max: anioMax }),
    categoria: texto(b.categoria, 'categoría', { max: 60 }),
    portada: texto(b.portada, 'portada', { max: 500 }),
    ejemplares_totales: entero(b.ejemplares_totales, 'ejemplares', { min: 0, max: 999, requerido: true }),
  };
}

const ROLES = ['alumno', 'profesor'];
const ESTADOS = ['activo', 'suspendido', 'baja'];

function usuario(b) {
  const email = texto(b.email, 'email', { requerido: true, max: 120 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw error(400, `El email "${email}" no es válido`);
  const rol = texto(b.rol, 'rol', { requerido: true });
  if (!ROLES.includes(rol)) throw error(400, `Rol no válido: usa ${ROLES.join(' o ')}`);
  const estado = texto(b.estado, 'estado') || 'activo';
  if (!ESTADOS.includes(estado)) throw error(400, `Estado no válido: usa ${ESTADOS.join(', ')}`);
  return {
    nombre: texto(b.nombre, 'nombre', { requerido: true, max: 80 }),
    apellidos: texto(b.apellidos, 'apellidos', { requerido: true, max: 120 }),
    email,
    rol,
    curso: texto(b.curso, 'curso', { max: 40 }),
    estado,
  };
}

module.exports = { HttpError, error, texto, entero, id, isbn, isbnValido, normalizarIsbn, libro, usuario, ROLES, ESTADOS };
