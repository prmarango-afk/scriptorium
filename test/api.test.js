// Pruebas de la API y de las reglas de negocio (node --test)
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { abrir } = require('../db');
const { sembrar } = require('../seed');
const { crearApp } = require('../server');

let servidor;
let base;
let tokenAdmin;

before(async () => {
  const db = abrir(':memory:');
  sembrar(db);
  servidor = crearApp(db).listen(0);
  await new Promise((r) => servidor.once('listening', r));
  base = `http://localhost:${servidor.address().port}`;
  tokenAdmin = (await api('POST', '/api/sesion', { email: 'biblioteca@colegio.es', password: 'scriptorium1' }, null)).body.token;
});
after(() => servidor.close());

// Por defecto las peticiones van como bibliotecario; se puede pasar otro token o null
async function api(metodo, ruta, cuerpo, token = tokenAdmin) {
  const r = await fetch(base + ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  return { status: r.status, body: await r.json() };
}

test('CRUD de libros con validación de ISBN', async () => {
  const malo = await api('POST', '/api/libros', { isbn: '978-84-0000-000-1', titulo: 'X', autor: 'Y', ejemplares_totales: 1 });
  assert.equal(malo.status, 400);

  const nuevo = await api('POST', '/api/libros', { isbn: '978-0-306-40615-7', titulo: 'Libro de prueba', autor: 'Autora', ejemplares_totales: 2 });
  assert.equal(nuevo.status, 201);
  assert.equal(nuevo.body.ejemplares_disponibles, 2);

  const duplicado = await api('POST', '/api/libros', { isbn: '9780306406157', titulo: 'Otro', autor: 'Z', ejemplares_totales: 1 });
  assert.equal(duplicado.status, 409);

  const editado = await api('PUT', `/api/libros/${nuevo.body.id}`, { ejemplares_totales: 5 });
  assert.equal(editado.body.ejemplares_disponibles, 5);

  const borrado = await api('DELETE', `/api/libros/${nuevo.body.id}`);
  assert.equal(borrado.body.modo, 'eliminado');
});

test('Préstamo descuenta stock y la devolución lo repone', async () => {
  const u = await api('POST', '/api/usuarios', { nombre: 'Ana', apellidos: 'Prueba', email: 'ana.prueba@colegio.es', rol: 'alumno', curso: '1º ESO' });
  const l = await api('POST', '/api/libros', { isbn: '0-306-40615-2', titulo: 'Único', autor: 'A', ejemplares_totales: 1 });

  const p = await api('POST', '/api/prestamos', { usuario_id: u.body.id, libro_id: l.body.id });
  assert.equal(p.status, 201);
  assert.equal(p.body.estado, 'activo');
  assert.equal((await api('GET', `/api/libros/${l.body.id}`)).body.ejemplares_disponibles, 0);

  // Sin stock: otro usuario no puede llevárselo
  const otro = await api('POST', '/api/usuarios', { nombre: 'Bea', apellidos: 'Prueba', email: 'bea@colegio.es', rol: 'profesor' });
  assert.equal((await api('POST', '/api/prestamos', { usuario_id: otro.body.id, libro_id: l.body.id })).status, 409);

  // No se puede bajar el stock por debajo de lo prestado ni borrar el libro
  assert.equal((await api('PUT', `/api/libros/${l.body.id}`, { ejemplares_totales: 0 })).status, 409);
  assert.equal((await api('DELETE', `/api/libros/${l.body.id}`)).status, 409);

  const ren = await api('POST', `/api/prestamos/${p.body.id}/renovar`);
  assert.equal(ren.body.renovaciones, 1);

  const dev = await api('POST', `/api/prestamos/${p.body.id}/devolver`);
  assert.equal(dev.body.estado, 'devuelto');
  assert.equal((await api('GET', `/api/libros/${l.body.id}`)).body.ejemplares_disponibles, 1);
  assert.equal((await api('POST', `/api/prestamos/${p.body.id}/devolver`)).status, 409);

  // Con historial, borrar el libro es una baja lógica
  assert.equal((await api('DELETE', `/api/libros/${l.body.id}`)).body.modo, 'baja');
});

test('Reglas: retrasos, usuarios suspendidos y máximo por rol', async () => {
  const usuarios = (await api('GET', '/api/usuarios')).body;
  const libro = (await api('GET', '/api/libros?disponibles=1')).body[0];

  const conRetraso = usuarios.find((u) => u.prestamos_retrasados > 0 && u.estado === 'activo');
  const r1 = await api('POST', '/api/prestamos', { usuario_id: conRetraso.id, libro_id: libro.id });
  assert.equal(r1.status, 409);
  assert.match(r1.body.error, /retraso/);

  const suspendido = usuarios.find((u) => u.estado === 'suspendido');
  assert.equal((await api('POST', '/api/prestamos', { usuario_id: suspendido.id, libro_id: libro.id })).status, 409);

  const alumno = (await api('POST', '/api/usuarios', { nombre: 'Max', apellidos: 'Lector', email: 'max@colegio.es', rol: 'alumno' })).body;
  const libros = (await api('GET', '/api/libros?disponibles=1')).body;
  for (let i = 0; i < 3; i++) {
    assert.equal((await api('POST', '/api/prestamos', { usuario_id: alumno.id, libro_id: libros[i].id })).status, 201);
  }
  const cuarto = await api('POST', '/api/prestamos', { usuario_id: alumno.id, libro_id: libros[3].id });
  assert.equal(cuarto.status, 409);
  assert.match(cuarto.body.error, /máximo/);

  // No se puede eliminar un usuario con libros sin devolver
  assert.equal((await api('DELETE', `/api/usuarios/${alumno.id}`)).status, 409);
});

test('Estadísticas del panel', async () => {
  const s = (await api('GET', '/api/stats')).body;
  assert.ok(s.libros.titulos > 0);
  assert.ok(s.prestamos.retrasados >= 1);
  assert.equal(s.actividad.length, 14);
});

test('Roles: sin sesión o como lector no se puede gestionar', async () => {
  assert.equal((await api('POST', '/api/sesion', { email: 'biblioteca@colegio.es', password: 'mala' }, null)).status, 401);
  assert.equal((await api('GET', '/api/stats', null, null)).status, 401);
  assert.equal((await api('GET', '/api/libros', null, null)).status, 200); // el catálogo es público

  const lector = (await api('POST', '/api/sesion', { email: 'lucia.martinez@alumnos.colegio.es', password: 'scriptorium1' }, null)).body;
  assert.equal(lector.rol, 'lector');
  assert.equal((await api('GET', '/api/usuarios', null, lector.token)).status, 403);
  assert.equal((await api('POST', '/api/libros', { isbn: '9780306406157', titulo: 'X', autor: 'Y', ejemplares_totales: 1 }, lector.token)).status, 403);

  // El lector no ve el historial de otros lectores en la ficha del libro
  const ficha = (await api('GET', '/api/libros/1', null, lector.token)).body;
  assert.equal(ficha.prestamos, undefined);
});

test('Petición de un lector: la atiende el bibliotecario y se convierte en préstamo', async () => {
  const lector = (await api('POST', '/api/sesion', { email: 'leo.torres@alumnos.colegio.es', password: 'scriptorium1' }, null)).body;
  const libro = (await api('GET', '/api/libros?disponibles=1')).body.find((l) => l.ejemplares_disponibles >= 1);

  const s = await api('POST', '/api/yo/solicitudes', { libro_id: libro.id }, lector.token);
  assert.equal(s.status, 201);
  assert.equal((await api('POST', '/api/yo/solicitudes', { libro_id: libro.id }, lector.token)).status, 409); // duplicada

  const p = await api('POST', `/api/solicitudes/${s.body.id}/atender`);
  assert.equal(p.status, 201);
  assert.equal((await api('GET', `/api/libros/${libro.id}`)).body.ejemplares_disponibles, libro.ejemplares_disponibles - 1);

  const yo = (await api('GET', '/api/yo', null, lector.token)).body;
  assert.ok(yo.prestamos.some((x) => x.id === p.body.id && x.estado === 'activo'));
  assert.equal(yo.solicitudes.find((x) => x.id === s.body.id).estado, 'atendida');

  // El lector puede renovar su préstamo, pero no el de otro
  assert.equal((await api('POST', `/api/yo/prestamos/${p.body.id}/renovar`, null, lector.token)).status, 200);
  const otro = (await api('GET', '/api/prestamos?estado=abiertos')).body.find((x) => x.usuario_id !== yo.id);
  assert.equal((await api('POST', `/api/yo/prestamos/${otro.id}/renovar`, null, lector.token)).status, 403);
});

test('Cuentas: registro, contraseñas cifradas, perfil y movimientos con fecha y hora', async () => {
  const debil = await api('POST', '/api/registro', { nombre: 'Nora', apellidos: 'Nueva', email: 'nora@alumnos.colegio.es', rol: 'alumno', password: 'corta' }, null);
  assert.equal(debil.status, 400);

  const reg = await api('POST', '/api/registro', { nombre: 'Nora', apellidos: 'Nueva', email: 'nora@alumnos.colegio.es', rol: 'alumno', curso: '1º ESO B', password: 'lectora2026' }, null);
  assert.equal(reg.status, 201);
  assert.equal(reg.body.rol, 'lector');
  assert.equal((await api('POST', '/api/registro', { nombre: 'Otra', apellidos: 'Vez', email: 'nora@alumnos.colegio.es', rol: 'alumno', password: 'lectora2026' }, null)).status, 409);

  // La contraseña nunca sale de la API
  const lista = (await api('GET', '/api/usuarios')).body;
  assert.ok(lista.every((u) => !('password_hash' in u)));

  // Cambiar contraseña exige la actual
  assert.equal((await api('POST', '/api/perfil/password', { actual: 'mal', nueva: 'otraClave99' }, reg.body.token)).status, 400);
  assert.equal((await api('POST', '/api/perfil/password', { actual: 'lectora2026', nueva: 'otraClave99' }, reg.body.token)).status, 200);
  assert.equal((await api('POST', '/api/sesion', { email: 'nora@alumnos.colegio.es', password: 'otraClave99' }, null)).status, 201);

  // El registro de movimientos guarda fecha y hora de cada acción
  const movs = (await api('GET', '/api/movimientos?limite=500')).body;
  assert.ok(movs.some((m) => m.tipo === 'registro' && /Nora Nueva/.test(m.detalle)));
  assert.match(movs[0].creado_en, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
});
