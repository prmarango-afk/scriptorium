// Contraseñas: hash con scrypt (incluido en Node) y sal aleatoria. Nunca se guarda la contraseña en claro.
const crypto = require('node:crypto');

const LONGITUD = 64;

function hashPassword(password) {
  const sal = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), sal, LONGITUD).toString('hex');
  return `scrypt$${sal}$${hash}`;
}

function verificarPassword(password, guardado) {
  if (!guardado) return false;
  const [algoritmo, sal, hash] = guardado.split('$');
  if (algoritmo !== 'scrypt' || !sal || !hash) return false;
  const calculado = crypto.scryptSync(String(password), sal, LONGITUD);
  const esperado = Buffer.from(hash, 'hex');
  return esperado.length === calculado.length && crypto.timingSafeEqual(esperado, calculado);
}

// Freno a la fuerza bruta: tras 5 fallos seguidos, la cuenta queda bloqueada 1 minuto
const fallos = new Map();
const MAX_FALLOS = 5;
const BLOQUEO_MS = 60 * 1000;

function comprobarBloqueo(clave) {
  const f = fallos.get(clave);
  if (f && f.n >= MAX_FALLOS && Date.now() - f.ultimo < BLOQUEO_MS) {
    return Math.ceil((BLOQUEO_MS - (Date.now() - f.ultimo)) / 1000);
  }
  return 0;
}
function anotarFallo(clave) {
  const f = fallos.get(clave);
  const reinicio = !f || Date.now() - f.ultimo > BLOQUEO_MS;
  fallos.set(clave, { n: reinicio ? 1 : f.n + 1, ultimo: Date.now() });
}
const limpiarFallos = (clave) => fallos.delete(clave);

module.exports = { hashPassword, verificarPassword, comprobarBloqueo, anotarFallo, limpiarFallos };
