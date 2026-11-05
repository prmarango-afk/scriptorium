// Scriptorium — lógica del frontend (JavaScript vanilla)
'use strict';

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const estado = {
  vista: 'panel',
  libros: [],
  usuarios: [],
  prestamos: [],
  stats: null,
  filtroPrestamos: 'abiertos',
  categoria: '',
  seleccion: { usuario: null, libro: null },
};

// ───────────────────────── Utilidades ─────────────────────────
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const normalizar = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const coincide = (texto, q) => normalizar(q).split(/\s+/).filter(Boolean).every((t) => normalizar(texto).includes(t));

const fmtFecha = (iso, opciones = { day: 'numeric', month: 'short' }) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('es-ES', opciones) : '—';
const hoyISO = () => new Date().toLocaleDateString('sv-SE');
const diasHasta = (iso) => Math.round((new Date(`${iso}T00:00:00`) - new Date(`${hoyISO()}T00:00:00`)) / 86400000);
const sumarDias = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('sv-SE'); };
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
const formatearIsbn = (i) => (i?.length === 13 ? `${i.slice(0, 3)}-${i.slice(3, 5)}-${i.slice(5, 9)}-${i.slice(9, 12)}-${i.slice(12)}` : i);

async function api(metodo, url, cuerpo) {
  const r = await fetch(url, {
    method: metodo,
    headers: cuerpo ? { 'Content-Type': 'application/json' } : {},
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(datos.error || `Error ${r.status}`);
  return datos;
}

function toast(mensaje, tipo = 'ok') {
  const estilos = {
    ok: 'bg-emerald-600 text-white',
    error: 'bg-rose-600 text-white',
    info: 'bg-slate-800 text-white',
  };
  const iconos = { ok: '✅', error: '⛔', info: 'ℹ️' };
  const el = document.createElement('div');
  el.className = `pointer-events-auto max-w-sm w-full sm:w-auto shadow-lg rounded-xl px-4 py-3 text-sm font-medium flex gap-2 items-start transition-all duration-300 ${estilos[tipo]}`;
  el.innerHTML = `<span>${iconos[tipo]}</span><span>${esc(mensaje)}</span>`;
  $('#toasts').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(8px)'; }, tipo === 'error' ? 5000 : 3000);
  setTimeout(() => el.remove(), tipo === 'error' ? 5400 : 3400);
}

function confirmar({ titulo, texto, boton = 'Confirmar', peligro = false }) {
  const modal = $('#modal-confirmar');
  $('#confirmar-titulo').textContent = titulo;
  $('#confirmar-texto').textContent = texto;
  const si = $('#confirmar-si');
  si.textContent = boton;
  si.className = `px-4 py-2 rounded-xl font-semibold text-white ${peligro ? 'bg-rose-600 hover:bg-rose-700' : 'bg-marca-600 hover:bg-marca-700'}`;
  modal.showModal();
  return new Promise((resolver) => {
    const fin = (v) => { modal.close(); si.onclick = null; $('#confirmar-no').onclick = null; resolver(v); };
    si.onclick = () => fin(true);
    $('#confirmar-no').onclick = () => fin(false);
    modal.oncancel = () => fin(false);
  });
}

// Portada real si existe; si no (o si falla), una portada generada con el título
const COLORES_PORTADA = [
  ['#4338ca', '#818cf8'], ['#0f766e', '#5eead4'], ['#b45309', '#fcd34d'], ['#be123c', '#fda4af'],
  ['#6d28d9', '#c4b5fd'], ['#0369a1', '#7dd3fc'], ['#15803d', '#86efac'], ['#7c2d12', '#fdba74'],
];
function portadaGenerada(libro, clases) {
  let h = 0;
  for (const c of libro.titulo || '') h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const [a, b] = COLORES_PORTADA[h % COLORES_PORTADA.length];
  return `<div class="${clases} rounded-md shadow-sm flex flex-col justify-between p-1.5 text-white overflow-hidden" style="background:linear-gradient(135deg,${a},${b})">
    <span class="font-marca font-bold leading-tight text-[0.6rem] line-clamp-4">${esc(libro.titulo)}</span>
    <span class="text-[0.5rem] opacity-80 truncate">${esc(libro.autor || '')}</span></div>`;
}
function portada(libro, clases = 'w-12 h-16') {
  const generada = portadaGenerada(libro, clases);
  if (!libro.portada) return generada;
  return `<span class="contents" data-fallback="${esc(generada)}"><img src="${esc(libro.portada)}" alt="Portada de ${esc(libro.titulo)}" loading="lazy"
    class="${clases} object-cover rounded-md shadow-sm bg-slate-200" onerror="this.parentElement.outerHTML=this.parentElement.dataset.fallback" /></span>`;
}

const insignia = (texto, color) => `<span class="inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5 ${color}">${texto}</span>`;
const ESTADO_PRESTAMO = {
  activo: (p) => {
    const d = diasHasta(p.fecha_limite);
    if (d === 0) return insignia('⏰ Vence hoy', 'bg-amber-100 text-amber-800');
    if (d <= 3) return insignia(`⏰ Vence en ${plural(d, 'día', 'días')}`, 'bg-amber-100 text-amber-800');
    return insignia('📗 En préstamo', 'bg-indigo-100 text-indigo-800');
  },
  retrasado: (p) => insignia(`⚠️ ${plural(p.dias_retraso, 'día', 'días')} de retraso`, 'bg-rose-100 text-rose-800'),
  devuelto: (p) => (p.dias_retraso > 0
    ? insignia(`↩️ Devuelto (${p.dias_retraso}d tarde)`, 'bg-orange-100 text-orange-800')
    : insignia('✅ Devuelto', 'bg-emerald-100 text-emerald-800')),
};
const ESTADO_USUARIO = {
  activo: insignia('● Activo', 'bg-emerald-100 text-emerald-800'),
  suspendido: insignia('⛔ Suspendido', 'bg-rose-100 text-rose-800'),
  baja: insignia('🗃️ Baja', 'bg-slate-200 text-slate-600'),
};
const ROL = {
  alumno: insignia('🎒 Alumno', 'bg-sky-100 text-sky-800'),
  profesor: insignia('🧑‍🏫 Profesor', 'bg-violet-100 text-violet-800'),
};
const avatar = (u) => {
  const ini = `${u.nombre?.[0] || ''}${u.apellidos?.[0] || ''}`.toUpperCase();
  const color = u.rol === 'profesor' ? 'bg-violet-200 text-violet-800' : 'bg-sky-200 text-sky-800';
  return `<div class="w-9 h-9 shrink-0 rounded-full grid place-items-center text-xs font-bold ${color}">${esc(ini)}</div>`;
};
const vacio = (texto, cols) => `<tr><td colspan="${cols}" class="px-4 py-12 text-center text-slate-400">${texto}</td></tr>`;

// ───────────────────────── Navegación ─────────────────────────
function irA(vista) {
  estado.vista = vista;
  $$('.nav-btn').forEach((b) => b.classList.toggle('activa', b.dataset.vista === vista));
  $$('.vista').forEach((s) => s.classList.toggle('activa', s.id === `vista-${vista}`));
  history.replaceState(null, '', `#${vista}`);
  window.scrollTo({ top: 0 });
}

$$('.nav-btn').forEach((b) => b.addEventListener('click', () => irA(b.dataset.vista)));
document.addEventListener('click', (e) => {
  const ir = e.target.closest('[data-ir]');
  if (ir) {
    if (ir.dataset.filtro !== undefined) cambiarFiltroPrestamos(ir.dataset.filtro);
    irA(ir.dataset.ir);
  }
});
$$('.btn-nuevo-prestamo').forEach((b) => b.addEventListener('click', () => { irA('prestamos'); $('.combo[data-tipo="usuario"] input').focus(); }));

// ───────────────────────── Carga de datos ─────────────────────────
async function cargarTodo() {
  const [stats, libros, usuarios, prestamos] = await Promise.all([
    api('GET', '/api/stats'),
    api('GET', '/api/libros'),
    api('GET', '/api/usuarios'),
    api('GET', '/api/prestamos'),
  ]);
  Object.assign(estado, { stats, libros, usuarios, prestamos });
  // Si lo seleccionado en el mostrador ha cambiado (stock, estado…), refrescarlo
  for (const tipo of ['usuario', 'libro']) {
    const sel = estado.seleccion[tipo];
    if (sel) estado.seleccion[tipo] = (tipo === 'usuario' ? usuarios : libros).find((x) => x.id === sel.id) || null;
  }
  pintarTodo();
}

function pintarTodo() {
  pintarPanel();
  pintarPrestamos();
  pintarLibros();
  pintarUsuarios();
  pintarMostrador();
  const r = estado.stats.prestamos.retrasados || 0;
  $('#badge-retrasos').textContent = r;
  $('#badge-retrasos').classList.toggle('hidden', !r);
}

// ───────────────────────── Panel ─────────────────────────
function pintarPanel() {
  const s = estado.stats;
  $('#fecha-hoy').textContent = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const kpi = (icono, valor, etiqueta, sub, color, destino) => `
    <button data-ir="${destino}" class="text-left bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 hover:shadow-md hover:-translate-y-0.5 transition">
      <div class="flex items-center justify-between"><span class="text-2xl">${icono}</span><span class="w-2 h-2 rounded-full ${color}"></span></div>
      <p class="text-3xl font-extrabold text-slate-900 mt-3">${valor}</p>
      <p class="text-sm font-semibold text-slate-600">${etiqueta}</p>
      <p class="text-xs text-slate-400 mt-0.5">${sub}</p>
    </button>`;
  const pctDisp = s.libros.ejemplares ? Math.round((s.libros.disponibles / s.libros.ejemplares) * 100) : 0;
  $('#kpis').innerHTML = [
    kpi('📚', s.libros.titulos, 'Títulos en catálogo', `${s.libros.ejemplares} ejemplares en total`, 'bg-indigo-500', 'libros'),
    kpi('✅', s.libros.disponibles, 'Ejemplares disponibles', `${pctDisp}% del fondo en estantería`, 'bg-emerald-500', 'libros'),
    kpi('🔄', s.prestamos.abiertos || 0, 'Préstamos abiertos', `${s.prestamos.prestados_hoy || 0} hoy · ${s.prestamos.devueltos_hoy || 0} devueltos hoy`, 'bg-sky-500', 'prestamos'),
    kpi('👥', s.usuarios.activos || 0, 'Lectores activos', `${s.usuarios.alumnos || 0} alumnos · ${s.usuarios.profesores || 0} profesores`, 'bg-violet-500', 'usuarios'),
  ].join('');

  // Alertas de retraso
  $('#alerta-retrasos').classList.toggle('hidden', !s.retrasados.length);
  $('#n-retrasos').textContent = s.prestamos.retrasados;
  $('#lista-retrasos').innerHTML = s.retrasados.map((p) => `
    <li class="py-2.5 flex flex-wrap items-center gap-3">
      <div class="flex-1 min-w-[200px]">
        <p class="font-semibold text-slate-900">${esc(p.titulo)}</p>
        <p class="text-xs text-slate-600">${esc(p.usuario)} · ${esc(p.curso || p.rol)} · debía devolverlo el ${fmtFecha(p.fecha_limite)}</p>
      </div>
      ${ESTADO_PRESTAMO.retrasado(p)}
      <button class="btn-devolver text-xs font-semibold bg-white border border-rose-300 text-rose-700 hover:bg-rose-100 rounded-lg px-3 py-1.5" data-id="${p.id}">↩️ Registrar devolución</button>
    </li>`).join('');

  // Gráfico de actividad (barras dobles)
  const max = Math.max(1, ...s.actividad.flatMap((d) => [d.prestamos, d.devoluciones]));
  $('#grafico').innerHTML = s.actividad.map((d) => {
    const esHoy = d.dia === hoyISO();
    return `<div class="flex-1 flex flex-col items-center gap-1 h-full justify-end group" title="${fmtFecha(d.dia, { weekday: 'long', day: 'numeric', month: 'long' })}: ${d.prestamos} préstamos, ${d.devoluciones} devoluciones">
      <div class="w-full flex items-end justify-center gap-0.5 h-full">
        <div class="w-1/2 max-w-[14px] rounded-t bg-marca-500 group-hover:bg-marca-700 transition-all" style="height:${(d.prestamos / max) * 100}%;min-height:${d.prestamos ? 4 : 0}px"></div>
        <div class="w-1/2 max-w-[14px] rounded-t bg-emerald-400 group-hover:bg-emerald-600 transition-all" style="height:${(d.devoluciones / max) * 100}%;min-height:${d.devoluciones ? 4 : 0}px"></div>
      </div>
      <span class="text-[10px] ${esHoy ? 'font-bold text-marca-700' : 'text-slate-400'}">${esHoy ? 'Hoy' : new Date(`${d.dia}T00:00:00`).getDate()}</span>
    </div>`;
  }).join('');

  $('#lista-pronto').innerHTML = s.vencen_pronto.length
    ? s.vencen_pronto.map((p) => `
      <li class="flex items-center gap-3">
        <div class="flex-1 min-w-0"><p class="font-medium text-sm truncate">${esc(p.titulo)}</p><p class="text-xs text-slate-500 truncate">${esc(p.usuario)}</p></div>
        ${ESTADO_PRESTAMO.activo(p)}
      </li>`).join('')
    : '<li class="text-sm text-slate-400">Nada vence en los próximos días 🎉</li>';

  $('#lista-top').innerHTML = s.top_libros.length
    ? s.top_libros.map((l, i) => `
      <li class="flex items-center gap-3 cursor-pointer hover:bg-slate-50 -mx-2 px-2 py-1 rounded-lg" data-ficha-libro="${l.id}">
        <span class="w-6 text-center font-extrabold ${['text-amber-500', 'text-slate-400', 'text-orange-400'][i] || 'text-slate-300'}">${i + 1}</span>
        ${portada(l, 'w-8 h-11')}
        <div class="flex-1 min-w-0"><p class="font-medium text-sm truncate">${esc(l.titulo)}</p><p class="text-xs text-slate-500 truncate">${esc(l.autor)}</p></div>
        <span class="text-xs font-semibold text-slate-500">${plural(l.veces, 'vez', 'veces')}</span>
      </li>`).join('')
    : '<li class="text-sm text-slate-400">Aún no hay préstamos</li>';

  const maxCat = Math.max(1, ...s.categorias.map((c) => c.n));
  $('#lista-categorias').innerHTML = s.categorias.map((c) => `
    <button class="w-full flex items-center gap-3 text-sm group" data-categoria-ir="${esc(c.categoria)}">
      <span class="w-32 text-left truncate text-slate-600 group-hover:text-marca-700 font-medium">${esc(c.categoria)}</span>
      <span class="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden"><span class="block h-full bg-gradient-to-r from-marca-500 to-violet-400 rounded-full" style="width:${(c.n / maxCat) * 100}%"></span></span>
      <span class="w-8 text-right text-slate-500 font-semibold">${c.n}</span>
    </button>`).join('');

  const r = s.reglas;
  $('#reglas-box').innerHTML = `
    <p class="font-semibold text-indigo-100 mb-1">📏 Normas de préstamo</p>
    <p>🎒 Alumnos: hasta ${r.alumno.maxPrestamos} libros · ${r.alumno.diasPrestamo} días</p>
    <p>🧑‍🏫 Profesores: hasta ${r.profesor.maxPrestamos} libros · ${r.profesor.diasPrestamo} días</p>
    <p>🔁 Hasta ${r.maxRenovaciones} renovaciones si no hay retraso</p>
    <p>⛔ Con un retraso no se presta más</p>`;
}

document.addEventListener('click', (e) => {
  const c = e.target.closest('[data-categoria-ir]');
  if (c) { estado.categoria = c.dataset.categoriaIr; pintarLibros(); irA('libros'); }
});

// ───────────────────────── Préstamos ─────────────────────────
function cambiarFiltroPrestamos(filtro) {
  estado.filtroPrestamos = filtro;
  $$('#tabs-prestamos .tab').forEach((t) => t.classList.toggle('activa', t.dataset.estado === filtro));
  pintarPrestamos();
}
$$('#tabs-prestamos .tab').forEach((t) => t.addEventListener('click', () => cambiarFiltroPrestamos(t.dataset.estado)));
$('#buscar-prestamos').addEventListener('input', () => pintarPrestamos());

function pintarPrestamos() {
  const f = estado.filtroPrestamos;
  const q = $('#buscar-prestamos').value;
  const lista = estado.prestamos.filter((p) =>
    (f === '' || (f === 'abiertos' ? p.estado !== 'devuelto' : p.estado === f)) &&
    (!q || coincide(`${p.titulo} ${p.autor} ${p.usuario} ${p.isbn} ${p.curso}`, q)));

  $('#tabla-prestamos').innerHTML = lista.length ? lista.map((p) => {
    const abierto = p.estado !== 'devuelto';
    const libro = estado.libros.find((l) => l.id === p.libro_id) || p;
    return `<tr class="hover:bg-slate-50 ${p.estado === 'retrasado' ? 'bg-rose-50/50' : ''}">
      <td class="px-4 py-3"><div class="flex items-center gap-3 cursor-pointer" data-ficha-libro="${p.libro_id}">${portada(libro, 'w-8 h-11')}
        <div class="min-w-0"><p class="font-semibold text-slate-900 truncate max-w-[180px]">${esc(p.titulo)}</p><p class="text-xs text-slate-500">${esc(p.autor)}</p></div></div></td>
      <td class="px-4 py-3 min-w-[160px]"><button class="text-left" data-ficha-usuario="${p.usuario_id}"><p class="font-medium hover:text-marca-700">${esc(p.usuario)}</p><p class="text-xs text-slate-500">${esc(p.curso || '')}</p></button></td>
      <td class="px-4 py-3 whitespace-nowrap text-slate-600 hidden xl:table-cell">${fmtFecha(p.fecha_prestamo)}</td>
      <td class="px-4 py-3 whitespace-nowrap ${p.estado === 'retrasado' ? 'text-rose-700 font-semibold' : 'text-slate-600'}">${fmtFecha(p.fecha_limite)}
        ${p.renovaciones ? `<span class="text-xs text-slate-400" title="Renovaciones">· 🔁${p.renovaciones}</span>` : ''}
        ${!abierto ? `<p class="text-xs text-slate-400">Devuelto ${fmtFecha(p.fecha_devolucion)}</p>` : ''}</td>
      <td class="px-4 py-3 whitespace-nowrap">${ESTADO_PRESTAMO[p.estado](p)}</td>
      <td class="px-4 py-3 text-right whitespace-nowrap">${abierto ? `
        <button class="btn-renovar text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          data-id="${p.id}" ${p.estado === 'retrasado' || p.renovaciones >= estado.stats.reglas.maxRenovaciones ? 'disabled' : ''}
          title="${p.estado === 'retrasado' ? 'No se puede renovar con retraso' : `Renovaciones: ${p.renovaciones}/${estado.stats.reglas.maxRenovaciones}`}">🔁 Renovar</button>
        <button class="btn-devolver text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg px-2.5 py-1.5 ml-1" data-id="${p.id}">↩️ Devolver</button>` : ''}</td>
    </tr>`;
  }).join('') : vacio(q ? 'No hay préstamos que coincidan con la búsqueda' : 'No hay préstamos en esta vista', 6);
}

document.addEventListener('click', async (e) => {
  const dev = e.target.closest('.btn-devolver');
  const ren = e.target.closest('.btn-renovar');
  if (!dev && !ren) return;
  const btn = dev || ren;
  const p = estado.prestamos.find((x) => x.id === Number(btn.dataset.id));
  btn.disabled = true;
  try {
    if (dev) {
      const r = await api('POST', `/api/prestamos/${btn.dataset.id}/devolver`);
      toast(`"${r.titulo}" devuelto por ${r.usuario}${r.dias_retraso ? ` con ${plural(r.dias_retraso, 'día', 'días')} de retraso` : ''}`);
    } else {
      const r = await api('POST', `/api/prestamos/${btn.dataset.id}/renovar`);
      toast(`Renovado: "${r.titulo}" hasta el ${fmtFecha(r.fecha_limite, { day: 'numeric', month: 'long' })}`);
    }
    await cargarTodo();
  } catch (err) {
    toast(err.message, 'error');
    btn.disabled = false;
  }
  void p;
});

// ── Mostrador: buscadores (combobox) de usuario y libro ──
function crearCombo(contenedor) {
  const tipo = contenedor.dataset.tipo;
  contenedor.className = 'combo relative';
  contenedor.innerHTML = `
    <input type="text" role="combobox" aria-expanded="false" placeholder="${tipo === 'usuario' ? 'Busca por nombre, curso o email…' : 'Busca por título, autor o ISBN…'}"
      class="w-full rounded-xl border border-slate-300 px-3 py-2.5 pr-9 focus:outline-none focus:ring-2 focus:ring-marca-500" />
    <button type="button" class="limpiar hidden absolute right-2 top-2 text-slate-400 hover:text-slate-700 text-xl leading-none" aria-label="Quitar selección">×</button>
    <ul role="listbox" class="lista-combo hidden absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-y-auto scroll-fino"></ul>`;
  const input = $('input', contenedor);
  const lista = $('ul', contenedor);
  let activo = 0;
  let opciones = [];

  const texto = (x) => (tipo === 'usuario' ? `${x.nombre} ${x.apellidos} ${x.email} ${x.curso || ''} ${x.rol}` : `${x.titulo} ${x.autor} ${x.isbn} ${x.categoria || ''}`);
  const fila = (x) => tipo === 'usuario'
    ? `<div class="flex items-center gap-2">${avatar(x)}<div class="min-w-0 flex-1"><p class="font-medium truncate">${esc(x.nombre)} ${esc(x.apellidos)}</p>
        <p class="text-xs text-slate-500 truncate">${esc(x.curso || x.rol)} · ${x.prestamos_activos} en préstamo</p></div>
        ${x.estado !== 'activo' ? ESTADO_USUARIO[x.estado] : x.prestamos_retrasados ? insignia('⚠️ Retraso', 'bg-rose-100 text-rose-800') : ''}</div>`
    : `<div class="flex items-center gap-2">${portada(x, 'w-7 h-10')}<div class="min-w-0 flex-1"><p class="font-medium truncate">${esc(x.titulo)}</p>
        <p class="text-xs text-slate-500 truncate">${esc(x.autor)}</p></div>
        ${x.ejemplares_disponibles > 0 ? insignia(`${x.ejemplares_disponibles} disp.`, 'bg-emerald-100 text-emerald-800') : insignia('Agotado', 'bg-rose-100 text-rose-800')}</div>`;

  function abrir() {
    const fuente = tipo === 'usuario' ? estado.usuarios.filter((u) => u.estado !== 'baja') : estado.libros;
    opciones = fuente.filter((x) => coincide(texto(x), input.value)).slice(0, 30);
    activo = 0;
    lista.innerHTML = opciones.length
      ? opciones.map((x, i) => `<li role="option" data-i="${i}" aria-selected="${i === 0}" class="px-3 py-2 cursor-pointer hover:bg-slate-50">${fila(x)}</li>`).join('')
      : '<li class="px-3 py-3 text-sm text-slate-400">Sin resultados</li>';
    lista.classList.remove('hidden');
    input.setAttribute('aria-expanded', 'true');
  }
  const cerrar = () => { lista.classList.add('hidden'); input.setAttribute('aria-expanded', 'false'); };
  const marcar = () => $$('li[role=option]', lista).forEach((li, i) => {
    li.setAttribute('aria-selected', i === activo);
    if (i === activo) li.scrollIntoView({ block: 'nearest' });
  });

  input.addEventListener('focus', () => { input.select(); abrir(); });
  input.addEventListener('input', () => { estado.seleccion[tipo] = null; pintarMostrador(); abrir(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); activo = Math.min(activo + 1, opciones.length - 1); marcar(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); activo = Math.max(activo - 1, 0); marcar(); }
    else if (e.key === 'Enter' && !lista.classList.contains('hidden')) { e.preventDefault(); if (opciones[activo]) elegir(opciones[activo]); }
    else if (e.key === 'Escape') cerrar();
  });
  lista.addEventListener('mousedown', (e) => {
    const li = e.target.closest('li[data-i]');
    if (li) { e.preventDefault(); elegir(opciones[Number(li.dataset.i)]); }
  });
  input.addEventListener('blur', () => setTimeout(cerrar, 100));
  $('.limpiar', contenedor).addEventListener('click', () => { estado.seleccion[tipo] = null; pintarMostrador(); input.focus(); });

  function elegir(x) {
    estado.seleccion[tipo] = x;
    input.value = tipo === 'usuario' ? `${x.nombre} ${x.apellidos}` : x.titulo;
    cerrar();
    pintarMostrador();
    // Paso siguiente automático: tras elegir usuario, saltar al libro
    if (tipo === 'usuario' && !estado.seleccion.libro) $('.combo[data-tipo="libro"] input').focus();
  }
}
$$('.combo').forEach(crearCombo);

function seleccionarEnMostrador(tipo, id) {
  const fuente = tipo === 'usuario' ? estado.usuarios : estado.libros;
  estado.seleccion[tipo] = fuente.find((x) => x.id === id) || null;
  $('#modal-ficha').close();
  irA('prestamos');
  pintarMostrador();
  const siguiente = tipo === 'usuario' ? 'libro' : 'usuario';
  if (!estado.seleccion[siguiente]) $(`.combo[data-tipo="${siguiente}"] input`).focus();
}

// Valida en vivo las reglas de negocio antes de enviar (el servidor las vuelve a comprobar)
function pintarMostrador() {
  const { usuario: u, libro: l } = estado.seleccion;
  const reglas = estado.stats?.reglas;
  for (const tipo of ['usuario', 'libro']) {
    const sel = estado.seleccion[tipo];
    const c = $(`.combo[data-tipo="${tipo}"]`);
    if (sel && document.activeElement !== $('input', c)) $('input', c).value = tipo === 'usuario' ? `${sel.nombre} ${sel.apellidos}` : sel.titulo;
    if (!sel && !c.contains(document.activeElement)) $('input', c).value = '';
    $('.limpiar', c).classList.toggle('hidden', !sel);
  }

  const problemas = [];
  let infoU = '';
  if (u && reglas) {
    const r = reglas[u.rol];
    infoU = `<span class="text-slate-600">${u.rol === 'profesor' ? '🧑‍🏫' : '🎒'} ${esc(u.curso || u.rol)} · <b>${u.prestamos_activos}/${r.maxPrestamos}</b> libros en préstamo</span>`;
    if (u.estado !== 'activo') problemas.push(`Usuario ${u.estado}: no puede llevarse libros`);
    if (u.prestamos_retrasados) problemas.push(`Tiene ${plural(u.prestamos_retrasados, 'préstamo', 'préstamos')} con retraso`);
    if (u.prestamos_activos >= r.maxPrestamos) problemas.push(`Ha llegado al máximo de ${r.maxPrestamos} libros`);
  }
  let infoL = '';
  if (l) {
    infoL = l.ejemplares_disponibles > 0
      ? `<span class="text-emerald-700 font-semibold">✔ ${l.ejemplares_disponibles} de ${l.ejemplares_totales} disponibles</span>`
      : '<span class="text-rose-700 font-semibold">✖ Sin ejemplares disponibles</span>';
    if (l.ejemplares_disponibles <= 0) problemas.push('No quedan ejemplares de este libro');
    if (u && estado.prestamos.some((p) => p.estado !== 'devuelto' && p.usuario_id === u.id && p.libro_id === l.id)) problemas.push('Ya tiene este libro prestado');
  }
  $('#info-usuario').innerHTML = infoU;
  $('#info-libro').innerHTML = infoL;

  const dias = Number($('#prestamo-dias').value) || (u && reglas ? reglas[u.rol].diasPrestamo : null);
  $('#prestamo-dias').placeholder = u && reglas ? `${reglas[u.rol].diasPrestamo} (auto)` : 'Auto';
  $('#info-fecha').innerHTML = dias ? `Devolver antes del <b>${fmtFecha(sumarDias(dias), { day: 'numeric', month: 'short' })}</b>` : '';

  const btn = $('#btn-prestar');
  btn.disabled = !u || !l || problemas.length > 0;
  btn.title = problemas.join(' · ');
  const avisos = problemas.map((p) => `<p class="text-rose-700 font-medium">⛔ ${esc(p)}</p>`).join('');
  if (avisos) {
    if (u && problemas.some((p) => !p.includes('libro') && !p.includes('ejemplares'))) $('#info-usuario').innerHTML += avisos;
    else $('#info-libro').innerHTML += avisos;
  }
}
$('#prestamo-dias').addEventListener('input', pintarMostrador);

$('#form-prestamo').addEventListener('submit', async (e) => {
  e.preventDefault();
  const { usuario: u, libro: l } = estado.seleccion;
  if (!u || !l) return;
  const btn = $('#btn-prestar');
  btn.disabled = true;
  try {
    const p = await api('POST', '/api/prestamos', { usuario_id: u.id, libro_id: l.id, dias: $('#prestamo-dias').value || undefined });
    toast(`📗 "${p.titulo}" prestado a ${p.usuario} hasta el ${fmtFecha(p.fecha_limite, { day: 'numeric', month: 'long' })}`);
    estado.seleccion = { usuario: null, libro: null };
    $('#prestamo-dias').value = '';
    $$('.combo input').forEach((i) => { i.value = ''; });
    await cargarTodo();
  } catch (err) {
    toast(err.message, 'error');
    pintarMostrador();
  }
});

// ───────────────────────── Libros ─────────────────────────
$('#buscar-libros').addEventListener('input', () => pintarLibros());
$('#solo-disponibles').addEventListener('change', () => pintarLibros());

function pintarLibros() {
  const q = $('#buscar-libros').value;
  const soloDisp = $('#solo-disponibles').checked;
  const cats = [...new Set(estado.libros.map((l) => l.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  if (estado.categoria && !cats.includes(estado.categoria)) estado.categoria = '';
  $('#lista-cats').innerHTML = cats.map((c) => `<option value="${esc(c)}">`).join('');

  const chip = (valor, texto) => `<button class="chip-cat text-sm font-medium rounded-full px-3 py-1 border transition
    ${estado.categoria === valor ? 'bg-marca-600 border-marca-600 text-white' : 'bg-white border-slate-300 text-slate-600 hover:border-marca-500'}" data-cat="${esc(valor)}">${esc(texto)}</button>`;
  $('#chips-categorias').innerHTML = chip('', 'Todas') + cats.map((c) => chip(c, c)).join('');

  const lista = estado.libros.filter((l) =>
    (!estado.categoria || l.categoria === estado.categoria) &&
    (!soloDisp || l.ejemplares_disponibles > 0) &&
    (!q || coincide(`${l.titulo} ${l.autor} ${l.isbn} ${l.editorial || ''} ${l.categoria || ''}`, q.replace(/-/g, ''))));

  const s = estado.stats?.libros;
  if (s) $('#resumen-libros').textContent = `${plural(s.titulos, 'título', 'títulos')} · ${s.ejemplares} ejemplares · ${s.disponibles} disponibles ahora`;

  $('#grid-libros').innerHTML = lista.length ? lista.map((l) => {
    const pct = l.ejemplares_totales ? (l.ejemplares_disponibles / l.ejemplares_totales) * 100 : 0;
    const color = l.ejemplares_disponibles === 0 ? 'bg-rose-500' : pct <= 34 ? 'bg-amber-500' : 'bg-emerald-500';
    return `<article class="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex gap-4 hover:shadow-md transition">
      <button class="shrink-0" data-ficha-libro="${l.id}" aria-label="Ver ficha">${portada(l, 'w-20 h-28')}</button>
      <div class="flex-1 min-w-0 flex flex-col">
        <button class="text-left" data-ficha-libro="${l.id}"><h3 class="font-bold text-slate-900 leading-snug line-clamp-2 hover:text-marca-700">${esc(l.titulo)}</h3></button>
        <p class="text-sm text-slate-500 truncate">${esc(l.autor)}${l.anio ? ` · ${l.anio}` : ''}</p>
        <div class="flex flex-wrap gap-1 mt-1">${l.categoria ? insignia(esc(l.categoria), 'bg-slate-100 text-slate-600') : ''}</div>
        <div class="mt-auto pt-3">
          <div class="flex justify-between text-xs mb-1"><span class="font-semibold ${l.ejemplares_disponibles ? 'text-slate-700' : 'text-rose-700'}">${l.ejemplares_disponibles ? `${l.ejemplares_disponibles} de ${l.ejemplares_totales} disponibles` : 'Agotado'}</span>
            <span class="text-slate-400 font-mono">${esc(formatearIsbn(l.isbn))}</span></div>
          <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div class="h-full ${color} rounded-full" style="width:${pct}%"></div></div>
          <div class="flex gap-1 mt-3">
            <button class="flex-1 text-xs font-semibold bg-marca-600 hover:bg-marca-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg py-1.5" data-prestar-libro="${l.id}" ${l.ejemplares_disponibles ? '' : 'disabled'}>📗 Prestar</button>
            <button class="text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5" data-editar-libro="${l.id}" title="Editar">✏️</button>
            <button class="text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-lg px-2.5" data-borrar-libro="${l.id}" title="Eliminar">🗑️</button>
          </div>
        </div>
      </div>
    </article>`;
  }).join('') : `<p class="col-span-full text-center text-slate-400 py-16">No hay libros que coincidan. ${q ? '¿Lo añadimos? Pulsa «Añadir libro».' : ''}</p>`;
}

document.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip-cat');
  if (chip) { estado.categoria = chip.dataset.cat; pintarLibros(); }
  const pr = e.target.closest('[data-prestar-libro]');
  if (pr) seleccionarEnMostrador('libro', Number(pr.dataset.prestarLibro));
  const ed = e.target.closest('[data-editar-libro]');
  if (ed) abrirModalLibro(estado.libros.find((l) => l.id === Number(ed.dataset.editarLibro)));
  const bo = e.target.closest('[data-borrar-libro]');
  if (bo) borrarLibro(Number(bo.dataset.borrarLibro));
});

async function borrarLibro(id) {
  const l = estado.libros.find((x) => x.id === id);
  if (l.prestados > 0) return toast(`No se puede eliminar "${l.titulo}": tiene ${plural(l.prestados, 'ejemplar prestado', 'ejemplares prestados')}`, 'error');
  const ok = await confirmar({
    titulo: `¿Eliminar «${l.titulo}»?`,
    texto: l.veces_prestado ? 'Tiene historial de préstamos: se dará de baja del catálogo pero se conservará su historial.' : 'Se eliminará definitivamente del catálogo.',
    boton: 'Eliminar', peligro: true,
  });
  if (!ok) return;
  try {
    const r = await api('DELETE', `/api/libros/${id}`);
    toast(r.mensaje);
    await cargarTodo();
  } catch (err) { toast(err.message, 'error'); }
}

const formLibro = $('#form-libro');
function abrirModalLibro(libro = null) {
  formLibro.reset();
  $('.error-form', formLibro).classList.add('hidden');
  $('#titulo-modal-libro').textContent = libro ? 'Editar libro' : 'Nuevo libro';
  $('#ayuda-ejemplares').textContent = libro?.prestados ? `${libro.prestados} prestados ahora (mínimo)` : '';
  formLibro.ejemplares_totales.min = libro?.prestados || 0;
  if (libro) for (const k of ['id', 'isbn', 'titulo', 'autor', 'editorial', 'anio', 'categoria', 'ejemplares_totales', 'portada']) formLibro[k].value = libro[k] ?? '';
  else formLibro.id.value = '';
  pintarPreviewPortada();
  $('#modal-libro').showModal();
  (libro ? formLibro.titulo : formLibro.isbn).focus();
}
$('#btn-nuevo-libro').addEventListener('click', () => abrirModalLibro());

function pintarPreviewPortada() {
  const url = formLibro.portada.value.trim();
  $('#preview-portada').innerHTML = portada({ titulo: formLibro.titulo.value || '?', autor: formLibro.autor.value, portada: url }, 'w-10 h-14');
}
formLibro.portada.addEventListener('input', pintarPreviewPortada);
formLibro.titulo.addEventListener('input', pintarPreviewPortada);

// Autocompletar con datos de Google Books / Open Library
async function autocompletarIsbn() {
  const isbn = formLibro.isbn.value.trim();
  const ayuda = $('#ayuda-isbn');
  if (!isbn) return formLibro.isbn.focus();
  const btn = $('#btn-buscar-isbn');
  btn.disabled = true;
  btn.textContent = '⏳ Buscando…';
  try {
    const d = await api('GET', `/api/isbn/${encodeURIComponent(isbn)}`);
    for (const k of ['titulo', 'autor', 'editorial', 'anio', 'categoria', 'portada']) if (d[k]) formLibro[k].value = d[k];
    formLibro.isbn.value = d.isbn;
    ayuda.className = 'text-xs mt-1 text-emerald-700';
    ayuda.textContent = `✔ Datos encontrados en ${d.fuente}. Revísalos antes de guardar.${d.yaEnCatalogo ? ' ⚠️ Este ISBN ya está en el catálogo.' : ''}`;
    pintarPreviewPortada();
  } catch (err) {
    ayuda.className = 'text-xs mt-1 text-amber-700';
    ayuda.textContent = `⚠️ ${err.message}`;
  } finally {
    btn.disabled = false;
    btn.textContent = '✨ Autocompletar';
  }
}
$('#btn-buscar-isbn').addEventListener('click', autocompletarIsbn);
formLibro.isbn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); autocompletarIsbn(); } });

formLibro.addEventListener('submit', async (e) => {
  e.preventDefault();
  const datos = Object.fromEntries(new FormData(formLibro));
  const id = datos.id;
  delete datos.id;
  try {
    const l = await api(id ? 'PUT' : 'POST', id ? `/api/libros/${id}` : '/api/libros', datos);
    $('#modal-libro').close();
    toast(id ? `"${l.titulo}" actualizado` : `"${l.titulo}" añadido al catálogo`);
    await cargarTodo();
  } catch (err) {
    const p = $('.error-form', formLibro);
    p.textContent = err.message;
    p.classList.remove('hidden');
  }
});

// ───────────────────────── Usuarios ─────────────────────────
['#buscar-usuarios', '#filtro-rol', '#filtro-estado'].forEach((s) => $(s).addEventListener('input', () => pintarUsuarios()));

function pintarUsuarios() {
  const q = $('#buscar-usuarios').value;
  const rol = $('#filtro-rol').value;
  const est = $('#filtro-estado').value;
  const lista = estado.usuarios.filter((u) =>
    (!rol || u.rol === rol) && (!est || u.estado === est) &&
    (!q || coincide(`${u.nombre} ${u.apellidos} ${u.email} ${u.curso || ''}`, q)));
  const s = estado.stats?.usuarios;
  if (s) $('#resumen-usuarios').textContent = `${s.alumnos} alumnos y ${s.profesores} profesores · ${s.activos} con membresía activa`;
  const max = estado.stats?.reglas;

  $('#tabla-usuarios').innerHTML = lista.length ? lista.map((u) => `
    <tr class="hover:bg-slate-50 ${u.estado === 'baja' ? 'opacity-60' : ''}">
      <td class="px-4 py-3"><button class="flex items-center gap-3 text-left" data-ficha-usuario="${u.id}">${avatar(u)}
        <div class="min-w-0"><p class="font-semibold text-slate-900 hover:text-marca-700">${esc(u.nombre)} ${esc(u.apellidos)}</p><p class="text-xs text-slate-500 truncate">${esc(u.email)}</p></div></button></td>
      <td class="px-4 py-3">${ROL[u.rol]}<p class="text-xs text-slate-500 mt-1">${esc(u.curso || '')}</p></td>
      <td class="px-4 py-3">${ESTADO_USUARIO[u.estado]}</td>
      <td class="px-4 py-3 whitespace-nowrap"><span class="font-semibold">${u.prestamos_activos}</span><span class="text-slate-400">/${max ? max[u.rol].maxPrestamos : '?'}</span>
        ${u.prestamos_retrasados ? insignia(`⚠️ ${u.prestamos_retrasados} con retraso`, 'bg-rose-100 text-rose-800 ml-1') : ''}
        <p class="text-xs text-slate-400">${plural(u.prestamos_totales, 'préstamo', 'préstamos')} en total</p></td>
      <td class="px-4 py-3 text-right whitespace-nowrap">
        <button class="text-xs font-semibold bg-marca-600 hover:bg-marca-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg px-2.5 py-1.5" data-prestar-usuario="${u.id}" ${u.estado === 'activo' ? '' : 'disabled'}>📗 Prestar</button>
        <button class="text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5" data-editar-usuario="${u.id}" title="Editar">✏️</button>
        <button class="text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-lg px-2.5 py-1.5" data-borrar-usuario="${u.id}" title="Eliminar">🗑️</button>
      </td>
    </tr>`).join('') : vacio('No hay usuarios que coincidan', 5);
}

document.addEventListener('click', (e) => {
  const pr = e.target.closest('[data-prestar-usuario]');
  if (pr) seleccionarEnMostrador('usuario', Number(pr.dataset.prestarUsuario));
  const ed = e.target.closest('[data-editar-usuario]');
  if (ed) abrirModalUsuario(estado.usuarios.find((u) => u.id === Number(ed.dataset.editarUsuario)));
  const bo = e.target.closest('[data-borrar-usuario]');
  if (bo) borrarUsuario(Number(bo.dataset.borrarUsuario));
});

async function borrarUsuario(id) {
  const u = estado.usuarios.find((x) => x.id === id);
  const nombre = `${u.nombre} ${u.apellidos}`;
  if (u.prestamos_activos > 0) return toast(`No se puede eliminar a ${nombre}: tiene ${plural(u.prestamos_activos, 'libro', 'libros')} sin devolver`, 'error');
  const ok = await confirmar({
    titulo: `¿Eliminar a ${nombre}?`,
    texto: u.prestamos_totales ? 'Tiene historial de préstamos: pasará a estado «baja» y se conservará su historial.' : 'Se eliminará definitivamente.',
    boton: 'Eliminar', peligro: true,
  });
  if (!ok) return;
  try {
    const r = await api('DELETE', `/api/usuarios/${id}`);
    toast(r.mensaje);
    await cargarTodo();
  } catch (err) { toast(err.message, 'error'); }
}

const formUsuario = $('#form-usuario');
function pintarAyudaRol() {
  const rol = formUsuario.rol.value;
  $('#label-curso').textContent = rol === 'profesor' ? 'Departamento' : 'Curso';
  formUsuario.curso.placeholder = rol === 'profesor' ? 'p. ej. Matemáticas' : 'p. ej. 2º ESO B';
  const r = estado.stats?.reglas?.[rol];
  $('#info-reglas-usuario').textContent = r ? `Como ${rol} podrá tener hasta ${r.maxPrestamos} libros a la vez durante ${r.diasPrestamo} días.` : '';
}
$$('input[name=rol]', formUsuario).forEach((r) => r.addEventListener('change', pintarAyudaRol));

function abrirModalUsuario(u = null) {
  formUsuario.reset();
  $('.error-form', formUsuario).classList.add('hidden');
  $('#titulo-modal-usuario').textContent = u ? 'Editar usuario' : 'Nuevo usuario';
  formUsuario.id.value = u?.id || '';
  if (u) for (const k of ['nombre', 'apellidos', 'email', 'curso', 'estado']) formUsuario[k].value = u[k] ?? '';
  $(`input[name=rol][value=${u?.rol || 'alumno'}]`, formUsuario).checked = true;
  pintarAyudaRol();
  $('#modal-usuario').showModal();
  formUsuario.nombre.focus();
}
$('#btn-nuevo-usuario').addEventListener('click', () => abrirModalUsuario());

formUsuario.addEventListener('submit', async (e) => {
  e.preventDefault();
  const datos = Object.fromEntries(new FormData(formUsuario));
  const id = datos.id;
  delete datos.id;
  try {
    const u = await api(id ? 'PUT' : 'POST', id ? `/api/usuarios/${id}` : '/api/usuarios', datos);
    $('#modal-usuario').close();
    toast(id ? `${u.nombre} ${u.apellidos} actualizado` : `${u.nombre} ${u.apellidos} registrado`);
    await cargarTodo();
  } catch (err) {
    const p = $('.error-form', formUsuario);
    p.textContent = err.message;
    p.classList.remove('hidden');
  }
});

// ───────────────────────── Fichas con historial ─────────────────────────
function tablaHistorial(prestamos, columna) {
  if (!prestamos.length) return '<p class="text-sm text-slate-400 py-6 text-center">Sin préstamos todavía</p>';
  return `<div class="overflow-x-auto max-h-80 scroll-fino border border-slate-200 rounded-xl"><table class="w-full text-sm">
    <thead class="text-left text-xs uppercase text-slate-500 bg-slate-50 sticky top-0"><tr>
      <th class="px-3 py-2">${columna === 'usuario' ? 'Usuario' : 'Libro'}</th><th class="px-3 py-2">Prestado</th><th class="px-3 py-2">Límite</th><th class="px-3 py-2">Estado</th><th></th></tr></thead>
    <tbody class="divide-y divide-slate-100">${prestamos.map((p) => `<tr>
      <td class="px-3 py-2 font-medium">${esc(columna === 'usuario' ? p.usuario : p.titulo)}</td>
      <td class="px-3 py-2 whitespace-nowrap text-slate-600">${fmtFecha(p.fecha_prestamo)}</td>
      <td class="px-3 py-2 whitespace-nowrap text-slate-600">${fmtFecha(p.fecha_limite)}</td>
      <td class="px-3 py-2 whitespace-nowrap">${ESTADO_PRESTAMO[p.estado](p)}</td>
      <td class="px-3 py-2 text-right">${p.estado !== 'devuelto' ? `<button class="btn-devolver text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg px-2 py-1" data-id="${p.id}">↩️ Devolver</button>` : ''}</td>
    </tr>`).join('')}</tbody></table></div>`;
}

async function fichaLibro(id) {
  try {
    const l = await api('GET', `/api/libros/${id}`);
    $('#ficha-cabecera').innerHTML = `${portada(l, 'w-20 h-28')}<div>
      <h2 class="text-xl font-bold text-slate-900">${esc(l.titulo)}</h2>
      <p class="text-slate-600">${esc(l.autor)}</p>
      <p class="text-xs text-slate-500 mt-1">${[l.editorial, l.anio, l.categoria].filter(Boolean).map(esc).join(' · ')}</p>
      <p class="text-xs font-mono text-slate-400 mt-1">ISBN ${esc(formatearIsbn(l.isbn))}</p>
      <div class="flex gap-2 mt-3 flex-wrap">${insignia(`${l.ejemplares_disponibles}/${l.ejemplares_totales} disponibles`, l.ejemplares_disponibles ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800')}
        ${insignia(`${plural(l.veces_prestado, 'préstamo', 'préstamos')} en total`, 'bg-slate-100 text-slate-600')}</div></div>`;
    $('#ficha-cuerpo').innerHTML = `<div class="flex justify-between items-center mb-2"><h3 class="font-bold">Historial de préstamos</h3>
      <button class="text-sm font-semibold bg-marca-600 hover:bg-marca-700 disabled:bg-slate-200 text-white rounded-lg px-3 py-1.5" data-prestar-libro="${l.id}" ${l.ejemplares_disponibles ? '' : 'disabled'}>📗 Prestar este libro</button></div>
      ${tablaHistorial(l.prestamos, 'usuario')}`;
    $('#modal-ficha').showModal();
  } catch (err) { toast(err.message, 'error'); }
}

async function fichaUsuario(id) {
  try {
    const u = await api('GET', `/api/usuarios/${id}`);
    $('#ficha-cabecera').innerHTML = `${avatar(u).replace('w-9 h-9', 'w-14 h-14 text-lg')}<div>
      <h2 class="text-xl font-bold text-slate-900">${esc(u.nombre)} ${esc(u.apellidos)}</h2>
      <p class="text-slate-600 text-sm">${esc(u.email)}</p>
      <div class="flex gap-2 mt-2 flex-wrap">${ROL[u.rol]} ${ESTADO_USUARIO[u.estado]} ${u.curso ? insignia(esc(u.curso), 'bg-slate-100 text-slate-600') : ''}</div>
      <p class="text-xs text-slate-500 mt-2">${u.prestamos_activos}/${u.reglas.maxPrestamos} libros en préstamo · plazo de ${u.reglas.diasPrestamo} días</p></div>`;
    $('#ficha-cuerpo').innerHTML = `<div class="flex justify-between items-center mb-2"><h3 class="font-bold">Historial de préstamos</h3>
      <button class="text-sm font-semibold bg-marca-600 hover:bg-marca-700 disabled:bg-slate-200 text-white rounded-lg px-3 py-1.5" data-prestar-usuario="${u.id}" ${u.estado === 'activo' ? '' : 'disabled'}>📗 Nuevo préstamo</button></div>
      ${tablaHistorial(u.prestamos, 'libro')}`;
    $('#modal-ficha').showModal();
  } catch (err) { toast(err.message, 'error'); }
}

document.addEventListener('click', (e) => {
  const fl = e.target.closest('[data-ficha-libro]');
  if (fl) fichaLibro(Number(fl.dataset.fichaLibro));
  const fu = e.target.closest('[data-ficha-usuario]');
  if (fu) fichaUsuario(Number(fu.dataset.fichaUsuario));
});

// Cerrar modales: botón ×, «Cancelar» o clic fuera
$$('dialog').forEach((d) => {
  $$('.cerrar', d).forEach((b) => b.addEventListener('click', () => d.close()));
  d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
});
// Al devolver desde una ficha, refrescar la ficha abierta
document.addEventListener('click', (e) => {
  if (e.target.closest('#modal-ficha .btn-devolver')) setTimeout(() => $('#modal-ficha').close(), 50);
});

// ───────────────────────── Tiempo real (SSE) ─────────────────────────
function conectarTiempoReal() {
  const punto = $('#estado-conexion');
  const texto = $('#texto-conexion');
  const fuente = new EventSource('/api/eventos');
  let pendiente = null;
  fuente.onopen = () => { punto.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse'; texto.textContent = 'En vivo · sincronizado'; };
  fuente.onerror = () => { punto.className = 'w-2 h-2 rounded-full bg-amber-400'; texto.textContent = 'Reconectando…'; };
  fuente.onmessage = () => {
    clearTimeout(pendiente);
    pendiente = setTimeout(() => cargarTodo().catch(() => {}), 150);
  };
}

// Atajo: «/» para buscar en la vista actual
document.addEventListener('keydown', (e) => {
  if (e.key !== '/' || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) || $('dialog[open]')) return;
  const campo = { prestamos: '#buscar-prestamos', libros: '#buscar-libros', usuarios: '#buscar-usuarios' }[estado.vista];
  if (campo) { e.preventDefault(); $(campo).focus(); }
});

// ───────────────────────── Inicio ─────────────────────────
(async function iniciar() {
  const inicial = location.hash.slice(1);
  if (['panel', 'prestamos', 'libros', 'usuarios'].includes(inicial)) irA(inicial);
  try {
    await cargarTodo();
    conectarTiempoReal();
  } catch (err) {
    toast(`No se pudo conectar con el servidor: ${err.message}`, 'error');
  }
})();
