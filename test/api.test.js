// Pruebas de la API y de las reglas de negocio (node --test)
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { abrir } = require('../db');
const { sembrar } = require('../seed');
const { crearApp } = require('../server');

let servidor;
let base;

before(async () => {
  const db = abrir(':memory:');
  sembrar(db);
  servidor = crearApp(db).listen(0);
  await new Promise((r) => servidor.once('listening', r));
  base = `http://localhost:${servidor.address().port}`;
});
after(() => servidor.close());

async function api(metodo, ruta, cuerpo) {
  const r = await fetch(base + ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
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
