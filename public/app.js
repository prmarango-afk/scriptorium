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
  filtroRol: '',
  categoria: '',
  seleccion: { usuario: null, libro: null },
};

// ───────────────────────── Iconos SVG (trazo fino, estilo SF Symbols) ─────────────────────────
const ICONOS = {
  pluma: '<path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><path d="M16 8 2 22"/><path d="M17.5 15H9"/>',
  panel: '<rect width="7" height="9" x="3" y="3" rx="1.5"/><rect width="7" height="5" x="14" y="3" rx="1.5"/><rect width="7" height="9" x="14" y="12" rx="1.5"/><rect width="7" height="5" x="3" y="16" rx="1.5"/>',
  intercambio: '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
  libro: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
  libroAbierto: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  estanteria: '<path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/>',
  usuarios: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  lectorOk: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m16 11 2 2 4-4"/>',
  mas: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  buscar: '<circle cx="11" cy="11" r="7.5"/><path d="m20.5 20.5-4.2-4.2"/>',
  cerrar: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  checkCirculo: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  alerta: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  reloj: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  renovar: '<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>',
  devolver: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  lapiz: '<path d="M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z"/><path d="m15 5 4 4"/>',
  papelera: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/>',
  destello: '<path d="M12 3l1.9 5.6 5.6 1.9-5.6 1.9L12 18l-1.9-5.6L4.5 10.5l5.6-1.9z"/><path d="M19 3v4"/><path d="M21 5h-4"/>',
  birrete: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  maletin: '<rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  medalla: '<circle cx="12" cy="8" r="6"/><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11"/>',
  grafico: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  prohibido: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
  archivo: '<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  calendario: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  etiqueta: '<path d="M12.59 2.59A2 2 0 0 0 11.17 2H4a2 2 0 0 0-2 2v7.17a2 2 0 0 0 .59 1.42l8.7 8.7a2.43 2.43 0 0 0 3.42 0l6.58-6.58a2.43 2.43 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r="1"/>',
  normas: '<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
  cargando: '<path d="M21 12a9 9 0 1 1-6.22-8.56"/>',
};
function icono(nombre, clases = 'w-4 h-4') {
  return `<svg class="icono ${clases}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONOS[nombre] || ''}</svg>`;
}
// Sustituye los <i data-icono="..."> del HTML por su SVG
function hidratarIconos(ctx = document) {
  $$('i[data-icono]', ctx).forEach((i) => { i.outerHTML = icono(i.dataset.icono, i.className); });
}

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
    ok: ['checkCirculo', 'text-ios-green'],
    error: ['alerta', 'text-ios-red'],
    info: ['info', 'text-ios-blue'],
  };
  const [ic, color] = estilos[tipo];
  const el = document.createElement('div');
  el.className = 'glass-fuerte pointer-events-auto rounded-2xl px-4 py-3 text-sm flex gap-3 items-start transition-all duration-300 w-full';
  el.style.cssText = 'opacity:0;transform:translateY(-8px) scale(.98)';
  el.innerHTML = `<span class="${color} mt-px">${icono(ic, 'w-[18px] h-[18px]')}</span><span class="text-zinc-100">${esc(mensaje)}</span>`;
  $('#toasts').appendChild(el);
  requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'none'; });
  const dura = tipo === 'error' ? 5000 : 3200;
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(-8px) scale(.98)'; }, dura);
  setTimeout(() => el.remove(), dura + 400);
}

function confirmar({ titulo, texto, boton = 'Eliminar' }) {
  const modal = $('#modal-confirmar');
  $('#confirmar-titulo').textContent = titulo;
  $('#confirmar-texto').textContent = texto;
  $('#confirmar-si').textContent = boton;
  modal.showModal();
  return new Promise((resolver) => {
    const fin = (v) => { modal.close(); $('#confirmar-si').onclick = null; $('#confirmar-no').onclick = null; resolver(v); };
    $('#confirmar-si').onclick = () => fin(true);
    $('#confirmar-no').onclick = () => fin(false);
    modal.oncancel = () => fin(false);
  });
}

// Portada real si existe; si no (o si falla), una portada generada con el título
const COLORES_PORTADA = [
  ['#1e3a8a', '#0a84ff'], ['#134e4a', '#30d158'], ['#7c2d12', '#ff9f0a'], ['#881337', '#ff375f'],
  ['#4c1d95', '#bf5af2'], ['#0c4a6e', '#64d2ff'], ['#312e81', '#5e5ce6'], ['#3f3f46', '#a1a1aa'],
];
function portadaGenerada(libro, clases) {
  let h = 0;
  for (const c of libro.titulo || '') h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const [a, b] = COLORES_PORTADA[h % COLORES_PORTADA.length];
  // En miniatura no cabe el título: se muestra un monograma con la inicial
  if (/\bw-(7|8|10)\b/.test(clases)) {
    return `<div class="${clases} rounded-[6px] grid place-items-center text-white font-semibold text-sm ring-1 ring-inset ring-white/15 shadow-[0_6px_16px_-6px_rgba(0,0,0,.8)]"
      style="background:linear-gradient(150deg,${a},${b})">${esc((libro.titulo || '?').trim()[0].toUpperCase())}</div>`;
  }
  return `<div class="${clases} rounded-[6px] flex flex-col justify-between p-1.5 text-white overflow-hidden ring-1 ring-inset ring-white/15 shadow-[0_6px_16px_-6px_rgba(0,0,0,.8)]"
    style="background:linear-gradient(150deg,${a},${b})">
    <span class="font-semibold leading-[1.1] text-[0.6rem] tracking-tight line-clamp-4">${esc(libro.titulo)}</span>
    <span class="text-[0.48rem] opacity-75 truncate">${esc(libro.autor || '')}</span></div>`;
}
function portada(libro, clases = 'w-12 h-16') {
  const generada = portadaGenerada(libro, clases);
  if (!libro.portada) return generada;
  return `<span class="contents" data-fallback="${esc(generada)}"><img src="${esc(libro.portada)}" alt="Portada de ${esc(libro.titulo)}" loading="lazy"
    class="${clases} object-cover rounded-[6px] bg-white/5 ring-1 ring-inset ring-white/10 shadow-[0_6px_16px_-6px_rgba(0,0,0,.8)]"
    onerror="this.parentElement.outerHTML=this.parentElement.dataset.fallback" /></span>`;
}

// Insignias con los colores del sistema
const TONOS = {
  azul: 'bg-ios-blue/15 text-ios-blue ring-ios-blue/25',
  verde: 'bg-ios-green/15 text-ios-green ring-ios-green/25',
  rojo: 'bg-ios-red/15 text-ios-red ring-ios-red/25',
  naranja: 'bg-ios-orange/15 text-ios-orange ring-ios-orange/25',
  morado: 'bg-ios-purple/15 text-ios-purple ring-ios-purple/25',
  celeste: 'bg-ios-teal/15 text-ios-teal ring-ios-teal/25',
  gris: 'bg-white/[0.06] text-zinc-400 ring-white/10',
};
const insignia = (texto, tono, ic) =>
  `<span class="inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-medium rounded-full px-2 py-0.5 ring-1 ring-inset ${TONOS[tono]}">${ic ? icono(ic, 'w-3 h-3') : ''}${texto}</span>`;

const ESTADO_PRESTAMO = {
  activo: (p) => {
    const d = diasHasta(p.fecha_limite);
    if (d === 0) return insignia('Vence hoy', 'naranja', 'reloj');
    if (d <= 3) return insignia(`Vence en ${plural(d, 'día', 'días')}`, 'naranja', 'reloj');
    return insignia('En préstamo', 'azul', 'libroAbierto');
  },
  retrasado: (p) => insignia(`${plural(p.dias_retraso, 'día', 'días')} de retraso`, 'rojo', 'alerta'),
  devuelto: (p) => (p.dias_retraso > 0
    ? insignia(`Devuelto · ${p.dias_retraso}d tarde`, 'naranja', 'devolver')
    : insignia('Devuelto', 'verde', 'check')),
};
const ESTADO_USUARIO = {
  activo: insignia('Activo', 'verde', 'checkCirculo'),
  suspendido: insignia('Suspendido', 'rojo', 'prohibido'),
  baja: insignia('Baja', 'gris', 'archivo'),
};
const ROL = {
  alumno: insignia('Alumno', 'celeste', 'birrete'),
  profesor: insignia('Profesor', 'morado', 'maletin'),
};
const avatar = (u, clases = 'w-9 h-9 text-xs') => {
  const ini = `${u.nombre?.[0] || ''}${u.apellidos?.[0] || ''}`.toUpperCase();
  const fondo = u.rol === 'profesor' ? 'from-[#bf5af2] to-[#5e5ce6]' : 'from-[#64d2ff] to-[#0a84ff]';
  return `<div class="${clases} shrink-0 rounded-full grid place-items-center font-semibold text-white bg-gradient-to-br ${fondo} ring-1 ring-inset ring-white/20 shadow-[0_4px_12px_-4px_rgba(0,0,0,.6)]">${esc(ini)}</div>`;
};
const vacio = (texto, cols) => `<tr><td colspan="${cols}" class="px-4 py-14 text-center text-zinc-500">${texto}</td></tr>`;

// ───────────────────────── Navegación ─────────────────────────
function irA(vista) {
  estado.vista = vista;
  $$('.dock-btn').forEach((b) => b.classList.toggle('activa', b.dataset.vista === vista));
  $$('.vista').forEach((s) => s.classList.toggle('activa', s.id === `vista-${vista}`));
  history.replaceState(null, '', `#${vista}`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

$$('.dock-btn').forEach((b) => b.addEventListener('click', () => irA(b.dataset.vista)));
document.addEventListener('click', (e) => {
  const ir = e.target.closest('[data-ir]');
  if (ir) {
    e.preventDefault();
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

  const kpi = (ic, color, valor, etiqueta, sub, destino) => `
    <button data-ir="${destino}" class="card text-left p-4 sm:p-5 transition hover:-translate-y-0.5 hover:bg-white/[0.06] group">
      <span class="w-9 h-9 rounded-xl grid place-items-center ${color}">${icono(ic, 'w-[18px] h-[18px]')}</span>
      <p class="text-[32px] font-semibold tracking-[-0.03em] mt-4 leading-none tabular-nums">${valor}</p>
      <p class="text-[13px] font-medium text-zinc-300 mt-2">${etiqueta}</p>
      <p class="text-xs text-zinc-500 mt-0.5">${sub}</p>
    </button>`;
  const pctDisp = s.libros.ejemplares ? Math.round((s.libros.disponibles / s.libros.ejemplares) * 100) : 0;
  $('#kpis').innerHTML = [
    kpi('estanteria', 'bg-ios-blue/15 text-ios-blue', s.libros.titulos, 'Títulos', `${s.libros.ejemplares} ejemplares en total`, 'libros'),
    kpi('checkCirculo', 'bg-ios-green/15 text-ios-green', s.libros.disponibles, 'Disponibles', `${pctDisp}% del fondo en estantería`, 'libros'),
    kpi('intercambio', 'bg-ios-orange/15 text-ios-orange', s.prestamos.abiertos || 0, 'Préstamos abiertos', `${s.prestamos.prestados_hoy || 0} hoy · ${s.prestamos.devueltos_hoy || 0} devueltos hoy`, 'prestamos'),
    kpi('lectorOk', 'bg-ios-purple/15 text-ios-purple', s.usuarios.activos || 0, 'Lectores activos', `${s.usuarios.alumnos || 0} alumnos · ${s.usuarios.profesores || 0} profesores`, 'usuarios'),
  ].join('');

  // Alertas de retraso
  $('#alerta-retrasos').classList.toggle('hidden', !s.retrasados.length);
  $('#n-retrasos').textContent = s.prestamos.retrasados;
  $('#lista-retrasos').innerHTML = s.retrasados.map((p) => `
    <li class="py-3 flex flex-wrap items-center gap-3">
      <div class="flex-1 min-w-[200px]">
        <p class="font-medium text-zinc-100">${esc(p.titulo)}</p>
        <p class="text-xs text-zinc-500 mt-0.5">${esc(p.usuario)} · ${esc(p.curso || p.rol)} · vencía el ${fmtFecha(p.fecha_limite)}</p>
      </div>
      ${ESTADO_PRESTAMO.retrasado(p)}
      <button class="btn-devolver btn-verde" data-id="${p.id}">${icono('devolver', 'w-3.5 h-3.5')}Devolver</button>
    </li>`).join('');

  // Gráfico de actividad (barras dobles)
  const max = Math.max(1, ...s.actividad.flatMap((d) => [d.prestamos, d.devoluciones]));
  $('#grafico').innerHTML = s.actividad.map((d) => {
    const esHoy = d.dia === hoyISO();
    return `<div class="flex-1 flex flex-col items-center gap-2 h-full justify-end group" title="${fmtFecha(d.dia, { weekday: 'long', day: 'numeric', month: 'long' })}: ${d.prestamos} préstamos, ${d.devoluciones} devoluciones">
      <div class="w-full flex items-end justify-center gap-[3px] h-full rounded-lg group-hover:bg-white/[0.03] transition">
        <div class="w-1/2 max-w-[10px] rounded-full bg-gradient-to-t from-ios-blue/70 to-ios-blue" style="height:${(d.prestamos / max) * 100}%;min-height:${d.prestamos ? 6 : 0}px"></div>
        <div class="w-1/2 max-w-[10px] rounded-full bg-gradient-to-t from-ios-green/70 to-ios-green" style="height:${(d.devoluciones / max) * 100}%;min-height:${d.devoluciones ? 6 : 0}px"></div>
      </div>
      <span class="text-[10px] tabular-nums ${esHoy ? 'font-semibold text-white' : 'text-zinc-600'}">${esHoy ? 'Hoy' : new Date(`${d.dia}T00:00:00`).getDate()}</span>
    </div>`;
  }).join('');

  $('#lista-pronto').innerHTML = s.vencen_pronto.length
    ? s.vencen_pronto.map((p) => `
      <li class="flex items-center gap-3">
        <div class="flex-1 min-w-0"><p class="text-sm font-medium truncate">${esc(p.titulo)}</p><p class="text-xs text-zinc-500 truncate">${esc(p.usuario)}</p></div>
        ${ESTADO_PRESTAMO.activo(p)}
      </li>`).join('')
    : `<li class="text-sm text-zinc-500 flex items-center gap-2">${icono('checkCirculo', 'w-4 h-4 text-ios-green')}Nada vence en los próximos días</li>`;

  $('#lista-top').innerHTML = s.top_libros.length
    ? s.top_libros.map((l, i) => `
      <li class="flex items-center gap-3 cursor-pointer hover:bg-white/[0.04] -mx-2 px-2 py-1.5 rounded-xl transition" data-ficha-libro="${l.id}">
        <span class="w-4 text-center text-sm font-semibold tabular-nums ${i === 0 ? 'text-ios-yellow' : 'text-zinc-600'}">${i + 1}</span>
        ${portada(l, 'w-8 h-11')}
        <div class="flex-1 min-w-0"><p class="text-sm font-medium truncate">${esc(l.titulo)}</p><p class="text-xs text-zinc-500 truncate">${esc(l.autor)}</p></div>
        <span class="text-xs text-zinc-500 tabular-nums">${l.veces}</span>
      </li>`).join('')
    : '<li class="text-sm text-zinc-500">Aún no hay préstamos</li>';

  const maxCat = Math.max(1, ...s.categorias.map((c) => c.n));
  $('#lista-categorias').innerHTML = s.categorias.map((c) => `
    <button class="w-full flex items-center gap-3 text-sm group" data-categoria-ir="${esc(c.categoria)}">
      <span class="w-28 text-left truncate text-zinc-400 group-hover:text-white transition">${esc(c.categoria)}</span>
      <span class="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden"><span class="block h-full bg-gradient-to-r from-ios-blue to-ios-purple rounded-full" style="width:${(c.n / maxCat) * 100}%"></span></span>
      <span class="w-5 text-right text-zinc-500 tabular-nums text-xs">${c.n}</span>
    </button>`).join('');

  const r = s.reglas;
  const regla = (ic, texto) => `<li class="flex gap-3 items-start"><span class="text-zinc-500 mt-0.5">${icono(ic, 'w-4 h-4')}</span><span>${texto}</span></li>`;
  $('#reglas-box').innerHTML = `
    <h2 class="titulo-seccion mb-4">${icono('normas', 'w-4 h-4 text-zinc-500')}Normas de préstamo</h2>
    <ul class="space-y-3 text-sm text-zinc-300">
      ${regla('birrete', `Alumnos: hasta <b class="text-white font-medium">${r.alumno.maxPrestamos} libros</b> durante ${r.alumno.diasPrestamo} días`)}
      ${regla('maletin', `Profesores: hasta <b class="text-white font-medium">${r.profesor.maxPrestamos} libros</b> durante ${r.profesor.diasPrestamo} días`)}
      ${regla('renovar', `Hasta ${r.maxRenovaciones} renovaciones si no hay retraso`)}
      ${regla('prohibido', 'Con un préstamo retrasado no se presta más')}
    </ul>`;
}

document.addEventListener('click', (e) => {
  const c = e.target.closest('[data-categoria-ir]');
  if (c) { estado.categoria = c.dataset.categoriaIr; pintarLibros(); irA('libros'); }
});

// ───────────────────────── Préstamos ─────────────────────────
function cambiarFiltroPrestamos(filtro) {
  estado.filtroPrestamos = filtro;
  $$('#tabs-prestamos .seg').forEach((t) => t.classList.toggle('activa', t.dataset.estado === filtro));
  pintarPrestamos();
}
$$('#tabs-prestamos .seg').forEach((t) => t.addEventListener('click', () => cambiarFiltroPrestamos(t.dataset.estado)));
$('#buscar-prestamos').addEventListener('input', () => pintarPrestamos());

function pintarPrestamos() {
  const f = estado.filtroPrestamos;
  const q = $('#buscar-prestamos').value;
  const lista = estado.prestamos.filter((p) =>
    (f === '' || (f === 'abiertos' ? p.estado !== 'devuelto' : p.estado === f)) &&
    (!q || coincide(`${p.titulo} ${p.autor} ${p.usuario} ${p.isbn} ${p.curso}`, q)));
  const maxRen = estado.stats.reglas.maxRenovaciones;

  $('#tabla-prestamos').innerHTML = lista.length ? lista.map((p) => {
    const abierto = p.estado !== 'devuelto';
    const libro = estado.libros.find((l) => l.id === p.libro_id) || p;
    const noRenovable = p.estado === 'retrasado' || p.renovaciones >= maxRen;
    return `<tr class="hover:bg-white/[0.025] transition ${p.estado === 'retrasado' ? 'bg-ios-red/[0.04]' : ''}">
      <td class="px-4 py-3"><div class="flex items-center gap-3 cursor-pointer" data-ficha-libro="${p.libro_id}">${portada(libro, 'w-8 h-11')}
        <div class="min-w-0"><p class="font-medium truncate max-w-[200px] hover:text-ios-blue transition">${esc(p.titulo)}</p><p class="text-xs text-zinc-500">${esc(p.autor)}</p></div></div></td>
      <td class="px-4 py-3 min-w-[160px]"><button class="text-left" data-ficha-usuario="${p.usuario_id}"><p class="hover:text-ios-blue transition">${esc(p.usuario)}</p><p class="text-xs text-zinc-500">${esc(p.curso || '')}</p></button></td>
      <td class="px-4 py-3 whitespace-nowrap text-zinc-400 hidden lg:table-cell tabular-nums">${fmtFecha(p.fecha_prestamo)}</td>
      <td class="px-4 py-3 whitespace-nowrap tabular-nums ${p.estado === 'retrasado' ? 'text-ios-red' : 'text-zinc-300'}">${fmtFecha(p.fecha_limite)}
        ${p.renovaciones ? `<span class="text-[11px] text-zinc-500 ml-1" title="Renovaciones">${icono('renovar', 'w-3 h-3 inline -mt-0.5')} ${p.renovaciones}</span>` : ''}
        ${!abierto ? `<p class="text-xs text-zinc-500">Devuelto ${fmtFecha(p.fecha_devolucion)}</p>` : ''}</td>
      <td class="px-4 py-3">${ESTADO_PRESTAMO[p.estado](p)}</td>
      <td class="px-4 py-3 text-right whitespace-nowrap">${abierto ? `
        <button class="btn-renovar btn-mini" data-id="${p.id}" ${noRenovable ? 'disabled' : ''}
          title="${p.estado === 'retrasado' ? 'No se puede renovar con retraso' : `Renovaciones: ${p.renovaciones}/${maxRen}`}">${icono('renovar', 'w-3.5 h-3.5')}Renovar</button>
        <button class="btn-devolver btn-verde ml-1" data-id="${p.id}">${icono('devolver', 'w-3.5 h-3.5')}Devolver</button>` : ''}</td>
    </tr>`;
  }).join('') : vacio(q ? 'No hay préstamos que coincidan con la búsqueda' : 'No hay préstamos en esta vista', 6);
}

document.addEventListener('click', async (e) => {
  const dev = e.target.closest('.btn-devolver');
  const ren = e.target.closest('.btn-renovar');
  if (!dev && !ren) return;
  const btn = dev || ren;
  btn.disabled = true;
  try {
    if (dev) {
      const r = await api('POST', `/api/prestamos/${btn.dataset.id}/devolver`);
      toast(`«${r.titulo}» devuelto por ${r.usuario}${r.dias_retraso ? ` con ${plural(r.dias_retraso, 'día', 'días')} de retraso` : ''}`);
      if (btn.closest('#modal-ficha')) $('#modal-ficha').close();
    } else {
      const r = await api('POST', `/api/prestamos/${btn.dataset.id}/renovar`);
      toast(`Renovado «${r.titulo}» hasta el ${fmtFecha(r.fecha_limite, { day: 'numeric', month: 'long' })}`);
    }
    await cargarTodo();
  } catch (err) {
    toast(err.message, 'error');
    btn.disabled = false;
  }
});

// ── Mostrador: buscadores (combobox) de lector y libro ──
function crearCombo(contenedor) {
  const tipo = contenedor.dataset.tipo;
  contenedor.className = 'combo relative';
  contenedor.innerHTML = `
    ${icono('buscar', 'w-4 h-4 absolute left-3.5 top-[13px] text-zinc-500 pointer-events-none')}
    <input type="text" role="combobox" aria-expanded="false" placeholder="${tipo === 'usuario' ? 'Nombre, curso o email' : 'Título, autor o ISBN'}" class="campo pl-10 pr-9" />
    <button type="button" class="limpiar hidden absolute right-2 top-[7px] btn-icono w-7 h-7" aria-label="Quitar selección">${icono('cerrar', 'w-3.5 h-3.5')}</button>
    <ul role="listbox" class="lista-combo hidden absolute z-30 mt-2 w-full glass-fuerte rounded-2xl p-1 max-h-72 overflow-y-auto scroll-fino"></ul>`;
  const input = $('input', contenedor);
  const lista = $('ul', contenedor);
  let activo = 0;
  let opciones = [];

  const texto = (x) => (tipo === 'usuario' ? `${x.nombre} ${x.apellidos} ${x.email} ${x.curso || ''} ${x.rol}` : `${x.titulo} ${x.autor} ${x.isbn} ${x.categoria || ''}`);
  const fila = (x) => tipo === 'usuario'
    ? `<div class="flex items-center gap-3">${avatar(x, 'w-8 h-8 text-[11px]')}<div class="min-w-0 flex-1"><p class="text-sm truncate">${esc(x.nombre)} ${esc(x.apellidos)}</p>
        <p class="text-xs text-zinc-500 truncate">${esc(x.curso || x.rol)} · ${x.prestamos_activos} en préstamo</p></div>
        ${x.estado !== 'activo' ? ESTADO_USUARIO[x.estado] : x.prestamos_retrasados ? insignia('Retraso', 'rojo', 'alerta') : ''}</div>`
    : `<div class="flex items-center gap-3">${portada(x, 'w-7 h-10')}<div class="min-w-0 flex-1"><p class="text-sm truncate">${esc(x.titulo)}</p>
        <p class="text-xs text-zinc-500 truncate">${esc(x.autor)}</p></div>
        ${x.ejemplares_disponibles > 0 ? insignia(`${x.ejemplares_disponibles} disp.`, 'verde') : insignia('Agotado', 'rojo')}</div>`;

  function abrir() {
    const fuente = tipo === 'usuario' ? estado.usuarios.filter((u) => u.estado !== 'baja') : estado.libros;
    opciones = fuente.filter((x) => coincide(texto(x), estado.seleccion[tipo] ? '' : input.value)).slice(0, 30);
    activo = 0;
    lista.innerHTML = opciones.length
      ? opciones.map((x, i) => `<li role="option" data-i="${i}" aria-selected="${i === 0}" class="px-2.5 py-2 rounded-xl cursor-pointer hover:bg-white/[0.06]">${fila(x)}</li>`).join('')
      : '<li class="px-3 py-3 text-sm text-zinc-500">Sin resultados</li>';
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
  $('.limpiar', contenedor).addEventListener('click', () => { estado.seleccion[tipo] = null; input.value = ''; pintarMostrador(); input.focus(); });

  function elegir(x) {
    estado.seleccion[tipo] = x;
    input.value = tipo === 'usuario' ? `${x.nombre} ${x.apellidos}` : x.titulo;
    cerrar();
    pintarMostrador();
    // Paso siguiente automático: tras elegir lector, saltar al libro
    if (tipo === 'usuario' && !estado.seleccion.libro) $('.combo[data-tipo="libro"] input').focus();
    else input.blur();
  }
}
$$('.combo').forEach(crearCombo);

function seleccionarEnMostrador(tipo, id) {
  const fuente = tipo === 'usuario' ? estado.usuarios : estado.libros;
  estado.seleccion[tipo] = fuente.find((x) => x.id === id) || null;
  if ($('#modal-ficha').open) $('#modal-ficha').close();
  irA('prestamos');
  pintarMostrador();
  const siguiente = tipo === 'usuario' ? 'libro' : 'usuario';
  if (!estado.seleccion[siguiente]) setTimeout(() => $(`.combo[data-tipo="${siguiente}"] input`).focus(), 50);
}

// Valida en vivo las reglas de negocio antes de enviar (el servidor las vuelve a comprobar)
function pintarMostrador() {
  const { usuario: u, libro: l } = estado.seleccion;
  const reglas = estado.stats?.reglas;
  for (const tipo of ['usuario', 'libro']) {
    const sel = estado.seleccion[tipo];
    const c = $(`.combo[data-tipo="${tipo}"]`);
    const input = $('input', c);
    if (sel && document.activeElement !== input) input.value = tipo === 'usuario' ? `${sel.nombre} ${sel.apellidos}` : sel.titulo;
    if (!sel && document.activeElement !== input) input.value = '';
    $('.limpiar', c).classList.toggle('hidden', !sel);
  }

  const aviso = (texto) => `<p class="flex items-center gap-1.5 text-ios-red">${icono('prohibido', 'w-3.5 h-3.5')}${esc(texto)}</p>`;
  const avisosU = [];
  const avisosL = [];
  let infoU = '';
  if (u && reglas) {
    const r = reglas[u.rol];
    infoU = `<p class="flex items-center gap-1.5 text-zinc-400">${icono(u.rol === 'profesor' ? 'maletin' : 'birrete', 'w-3.5 h-3.5')}${esc(u.curso || u.rol)} · <b class="text-zinc-100 font-medium">${u.prestamos_activos}/${r.maxPrestamos}</b> en préstamo</p>`;
    if (u.estado !== 'activo') avisosU.push(`Lector ${u.estado}: no puede llevarse libros`);
    if (u.prestamos_retrasados) avisosU.push(`Tiene ${plural(u.prestamos_retrasados, 'préstamo', 'préstamos')} con retraso`);
    if (u.prestamos_activos >= r.maxPrestamos) avisosU.push(`Ha llegado al máximo de ${r.maxPrestamos} libros`);
  }
  let infoL = '';
  if (l) {
    infoL = l.ejemplares_disponibles > 0
      ? `<p class="flex items-center gap-1.5 text-ios-green">${icono('checkCirculo', 'w-3.5 h-3.5')}${l.ejemplares_disponibles} de ${l.ejemplares_totales} disponibles</p>`
      : '';
    if (l.ejemplares_disponibles <= 0) avisosL.push('No quedan ejemplares de este libro');
    if (u && estado.prestamos.some((p) => p.estado !== 'devuelto' && p.usuario_id === u.id && p.libro_id === l.id)) avisosL.push('Este lector ya tiene este libro');
  }
  $('#info-usuario').innerHTML = infoU + avisosU.map(aviso).join('');
  $('#info-libro').innerHTML = infoL + avisosL.map(aviso).join('');

  const dias = Number($('#prestamo-dias').value) || (u && reglas ? reglas[u.rol].diasPrestamo : null);
  $('#prestamo-dias').placeholder = u && reglas ? `${reglas[u.rol].diasPrestamo}` : 'Auto';
  $('#info-fecha').innerHTML = dias ? `Hasta el <b class="text-zinc-200 font-medium">${fmtFecha(sumarDias(dias))}</b>` : '';

  const btn = $('#btn-prestar');
  btn.disabled = !u || !l || avisosU.length + avisosL.length > 0;
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
    toast(`«${p.titulo}» prestado a ${p.usuario} hasta el ${fmtFecha(p.fecha_limite, { day: 'numeric', month: 'long' })}`);
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

  const chip = (valor, texto) => `<button class="chip-cat text-[13px] font-medium rounded-full px-3.5 py-1.5 transition ring-1 ring-inset
    ${estado.categoria === valor ? 'bg-white text-black ring-white' : 'bg-white/[0.05] text-zinc-400 ring-white/10 hover:text-white hover:bg-white/[0.1]'}" data-cat="${esc(valor)}">${esc(texto)}</button>`;
  $('#chips-categorias').innerHTML = chip('', 'Todas') + cats.map((c) => chip(c, c)).join('');

  const lista = estado.libros.filter((l) =>
    (!estado.categoria || l.categoria === estado.categoria) &&
    (!soloDisp || l.ejemplares_disponibles > 0) &&
    (!q || coincide(`${l.titulo} ${l.autor} ${l.isbn} ${l.editorial || ''} ${l.categoria || ''}`, q.replace(/-/g, ''))));

  const s = estado.stats?.libros;
  if (s) $('#resumen-libros').textContent = `${plural(s.titulos, 'título', 'títulos')} · ${s.ejemplares} ejemplares · ${s.disponibles} disponibles ahora`;

  $('#grid-libros').innerHTML = lista.length ? lista.map((l) => {
    const pct = l.ejemplares_totales ? (l.ejemplares_disponibles / l.ejemplares_totales) * 100 : 0;
    const color = l.ejemplares_disponibles === 0 ? 'bg-ios-red' : pct <= 34 ? 'bg-ios-orange' : 'bg-ios-green';
    return `<article class="card p-4 flex gap-4 transition hover:bg-white/[0.06]">
      <button class="shrink-0 transition hover:scale-[1.03]" data-ficha-libro="${l.id}" aria-label="Ver ficha de ${esc(l.titulo)}">${portada(l, 'w-20 h-[112px]')}</button>
      <div class="flex-1 min-w-0 flex flex-col">
        <button class="text-left" data-ficha-libro="${l.id}"><h3 class="font-semibold tracking-tight leading-snug line-clamp-2 hover:text-ios-blue transition">${esc(l.titulo)}</h3></button>
        <p class="text-[13px] text-zinc-500 truncate mt-0.5">${esc(l.autor)}${l.anio ? ` · ${l.anio}` : ''}</p>
        ${l.categoria ? `<div class="mt-2">${insignia(esc(l.categoria), 'gris')}</div>` : ''}
        <div class="mt-auto pt-3">
          <div class="flex justify-between items-baseline text-xs mb-1.5">
            <span class="font-medium ${l.ejemplares_disponibles ? 'text-zinc-300' : 'text-ios-red'}">${l.ejemplares_disponibles ? `${l.ejemplares_disponibles} de ${l.ejemplares_totales} disponibles` : 'Agotado'}</span>
          </div>
          <div class="h-1 bg-white/[0.07] rounded-full overflow-hidden"><div class="h-full ${color} rounded-full" style="width:${pct}%"></div></div>
          <div class="flex gap-1.5 mt-3">
            <button class="btn-cristal flex-1 py-1.5 text-xs" data-prestar-libro="${l.id}" ${l.ejemplares_disponibles ? '' : 'disabled'}>${icono('intercambio', 'w-3.5 h-3.5')}Prestar</button>
            <button class="btn-icono" data-editar-libro="${l.id}" title="Editar" aria-label="Editar">${icono('lapiz', 'w-3.5 h-3.5')}</button>
            <button class="btn-icono-rojo" data-borrar-libro="${l.id}" title="Eliminar" aria-label="Eliminar">${icono('papelera', 'w-3.5 h-3.5')}</button>
          </div>
        </div>
      </div>
    </article>`;
  }).join('') : `<div class="col-span-full card py-16 text-center text-zinc-500">${icono('buscar', 'w-6 h-6 mx-auto mb-3 text-zinc-600')}No hay libros que coincidan${q ? '. Puedes añadirlo con «Añadir libro».' : ''}</div>`;
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
  if (l.prestados > 0) return toast(`No se puede eliminar «${l.titulo}»: tiene ${plural(l.prestados, 'ejemplar prestado', 'ejemplares prestados')}`, 'error');
  const ok = await confirmar({
    titulo: `¿Eliminar «${l.titulo}»?`,
    texto: l.veces_prestado ? 'Tiene historial de préstamos: se dará de baja del catálogo y se conservará su historial.' : 'Se eliminará definitivamente del catálogo.',
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
  $('#ayuda-isbn').className = 'text-xs mt-2 text-zinc-500';
  $('#ayuda-isbn').textContent = 'Escribe el ISBN y pulsa Autocompletar para traer los datos de Google Books u Open Library.';
  $('#titulo-modal-libro').textContent = libro ? 'Editar libro' : 'Nuevo libro';
  $('#ayuda-ejemplares').textContent = libro?.prestados ? `Mínimo ${libro.prestados} (prestados ahora)` : '';
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
  $('#preview-portada').innerHTML = portada({ titulo: formLibro.titulo.value || 'Sin título', autor: formLibro.autor.value, portada: url }, 'w-10 h-14');
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
  btn.innerHTML = `${icono('cargando', 'w-4 h-4 animate-spin')}<span>Buscando</span>`;
  try {
    const d = await api('GET', `/api/isbn/${encodeURIComponent(isbn)}`);
    for (const k of ['titulo', 'autor', 'editorial', 'anio', 'categoria', 'portada']) if (d[k]) formLibro[k].value = d[k];
    formLibro.isbn.value = d.isbn;
    ayuda.className = 'text-xs mt-2 text-ios-green';
    ayuda.textContent = `Datos encontrados en ${d.fuente}. Revísalos antes de guardar.${d.yaEnCatalogo ? ' Atención: este ISBN ya está en el catálogo.' : ''}`;
    pintarPreviewPortada();
  } catch (err) {
    ayuda.className = 'text-xs mt-2 text-ios-orange';
    ayuda.textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.innerHTML = `${icono('destello', 'w-4 h-4 text-ios-yellow')}<span>Autocompletar</span>`;
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
    toast(id ? `«${l.titulo}» actualizado` : `«${l.titulo}» añadido al catálogo`);
    await cargarTodo();
  } catch (err) {
    const p = $('.error-form', formLibro);
    p.textContent = err.message;
    p.classList.remove('hidden');
  }
});

// ───────────────────────── Lectores ─────────────────────────
$('#buscar-usuarios').addEventListener('input', () => pintarUsuarios());
$('#filtro-estado').addEventListener('change', () => pintarUsuarios());
$$('#filtro-rol .seg').forEach((b) => b.addEventListener('click', () => {
  estado.filtroRol = b.dataset.valor;
  $$('#filtro-rol .seg').forEach((x) => x.classList.toggle('activa', x === b));
  pintarUsuarios();
}));

function pintarUsuarios() {
  const q = $('#buscar-usuarios').value;
  const rol = estado.filtroRol;
  const est = $('#filtro-estado').value;
  const lista = estado.usuarios.filter((u) =>
    (!rol || u.rol === rol) && (!est || u.estado === est) &&
    (!q || coincide(`${u.nombre} ${u.apellidos} ${u.email} ${u.curso || ''}`, q)));
  const s = estado.stats?.usuarios;
  if (s) $('#resumen-usuarios').textContent = `${s.alumnos} alumnos y ${s.profesores} profesores · ${s.activos} con membresía activa`;
  const reglas = estado.stats?.reglas;

  $('#tabla-usuarios').innerHTML = lista.length ? lista.map((u) => `
    <tr class="hover:bg-white/[0.025] transition ${u.estado === 'baja' ? 'opacity-50' : ''}">
      <td class="px-4 py-3"><button class="flex items-center gap-3 text-left" data-ficha-usuario="${u.id}">${avatar(u)}
        <div class="min-w-0"><p class="font-medium hover:text-ios-blue transition">${esc(u.nombre)} ${esc(u.apellidos)}</p><p class="text-xs text-zinc-500 truncate">${esc(u.email)}</p></div></button></td>
      <td class="px-4 py-3">${ROL[u.rol]}<p class="text-xs text-zinc-500 mt-1">${esc(u.curso || '')}</p></td>
      <td class="px-4 py-3">${ESTADO_USUARIO[u.estado]}</td>
      <td class="px-4 py-3 whitespace-nowrap"><span class="tabular-nums"><span class="font-medium">${u.prestamos_activos}</span><span class="text-zinc-500">/${reglas ? reglas[u.rol].maxPrestamos : '?'}</span></span>
        ${u.prestamos_retrasados ? `<span class="ml-1.5">${insignia(`${u.prestamos_retrasados} con retraso`, 'rojo', 'alerta')}</span>` : ''}
        <p class="text-xs text-zinc-500">${plural(u.prestamos_totales, 'préstamo', 'préstamos')} en total</p></td>
      <td class="px-4 py-3 text-right whitespace-nowrap">
        <button class="btn-mini" data-prestar-usuario="${u.id}" ${u.estado === 'activo' ? '' : 'disabled'}>${icono('intercambio', 'w-3.5 h-3.5')}Prestar</button>
        <button class="btn-icono ml-1" data-editar-usuario="${u.id}" title="Editar" aria-label="Editar">${icono('lapiz', 'w-3.5 h-3.5')}</button>
        <button class="btn-icono-rojo" data-borrar-usuario="${u.id}" title="Eliminar" aria-label="Eliminar">${icono('papelera', 'w-3.5 h-3.5')}</button>
      </td>
    </tr>`).join('') : vacio('No hay lectores que coincidan', 5);
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
  });
  if (!ok) return;
  try {
    const r = await api('DELETE', `/api/usuarios/${id}`);
    toast(r.mensaje);
    await cargarTodo();
  } catch (err) { toast(err.message, 'error'); }
}

const formUsuario = $('#form-usuario');
function pintarSelectorRol() {
  const rol = formUsuario.rol.value;
  $$('#selector-rol .seg').forEach((l) => l.classList.toggle('activa', $('input', l).checked));
  $('#label-curso').textContent = rol === 'profesor' ? 'Departamento' : 'Curso';
  formUsuario.curso.placeholder = rol === 'profesor' ? 'Matemáticas' : '2º ESO B';
  const r = estado.stats?.reglas?.[rol];
  $('#info-reglas-usuario').innerHTML = r ? `${icono('info', 'w-3.5 h-3.5')}Como ${rol} podrá tener hasta ${r.maxPrestamos} libros a la vez durante ${r.diasPrestamo} días.` : '';
}
$$('input[name=rol]', formUsuario).forEach((r) => r.addEventListener('change', pintarSelectorRol));

function abrirModalUsuario(u = null) {
  formUsuario.reset();
  $('.error-form', formUsuario).classList.add('hidden');
  $('#titulo-modal-usuario').textContent = u ? 'Editar lector' : 'Nuevo lector';
  formUsuario.id.value = u?.id || '';
  if (u) for (const k of ['nombre', 'apellidos', 'email', 'curso', 'estado']) formUsuario[k].value = u[k] ?? '';
  $(`input[name=rol][value=${u?.rol || 'alumno'}]`, formUsuario).checked = true;
  pintarSelectorRol();
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
  if (!prestamos.length) return '<p class="text-sm text-zinc-500 py-8 text-center">Sin préstamos todavía</p>';
  return `<div class="overflow-auto max-h-80 scroll-fino rounded-2xl ring-1 ring-inset ring-white/[0.08]"><table class="w-full text-sm">
    <thead class="sticky top-0 bg-[#1c1c20]"><tr>
      <th class="th">${columna === 'usuario' ? 'Lector' : 'Libro'}</th><th class="th">Prestado</th><th class="th">Límite</th><th class="th">Estado</th><th class="th"></th></tr></thead>
    <tbody class="divide-y divide-white/[0.05]">${prestamos.map((p) => `<tr>
      <td class="px-4 py-2.5">${esc(columna === 'usuario' ? p.usuario : p.titulo)}</td>
      <td class="px-4 py-2.5 whitespace-nowrap text-zinc-400 tabular-nums">${fmtFecha(p.fecha_prestamo)}</td>
      <td class="px-4 py-2.5 whitespace-nowrap text-zinc-400 tabular-nums">${fmtFecha(p.fecha_limite)}</td>
      <td class="px-4 py-2.5">${ESTADO_PRESTAMO[p.estado](p)}</td>
      <td class="px-4 py-2.5 text-right">${p.estado !== 'devuelto' ? `<button class="btn-devolver btn-verde" data-id="${p.id}">${icono('devolver', 'w-3.5 h-3.5')}Devolver</button>` : ''}</td>
    </tr>`).join('')}</tbody></table></div>`;
}

async function fichaLibro(id) {
  try {
    const l = await api('GET', `/api/libros/${id}`);
    $('#ficha-cabecera').innerHTML = `${portada(l, 'w-20 h-28')}<div class="min-w-0">
      <h2 class="text-xl font-semibold tracking-tight">${esc(l.titulo)}</h2>
      <p class="text-zinc-400">${esc(l.autor)}</p>
      <p class="text-xs text-zinc-500 mt-1">${[l.editorial, l.anio, l.categoria].filter(Boolean).map(esc).join(' · ')}</p>
      <p class="text-xs font-mono text-zinc-600 mt-1">ISBN ${esc(formatearIsbn(l.isbn))}</p>
      <div class="flex gap-2 mt-3 flex-wrap">${insignia(`${l.ejemplares_disponibles}/${l.ejemplares_totales} disponibles`, l.ejemplares_disponibles ? 'verde' : 'rojo')}
        ${insignia(`${plural(l.veces_prestado, 'préstamo', 'préstamos')} en total`, 'gris')}</div></div>`;
    $('#ficha-cuerpo').innerHTML = `<div class="flex justify-between items-center mb-3"><h3 class="titulo-seccion">${icono('reloj', 'w-4 h-4 text-zinc-500')}Historial</h3>
      <button class="btn-primario py-1.5" data-prestar-libro="${l.id}" ${l.ejemplares_disponibles ? '' : 'disabled'}>${icono('intercambio', 'w-4 h-4')}Prestar</button></div>
      ${tablaHistorial(l.prestamos, 'usuario')}`;
    $('#modal-ficha').showModal();
  } catch (err) { toast(err.message, 'error'); }
}

async function fichaUsuario(id) {
  try {
    const u = await api('GET', `/api/usuarios/${id}`);
    $('#ficha-cabecera').innerHTML = `${avatar(u, 'w-14 h-14 text-lg')}<div class="min-w-0">
      <h2 class="text-xl font-semibold tracking-tight">${esc(u.nombre)} ${esc(u.apellidos)}</h2>
      <p class="text-zinc-400 text-sm">${esc(u.email)}</p>
      <div class="flex gap-2 mt-2 flex-wrap">${ROL[u.rol]} ${ESTADO_USUARIO[u.estado]} ${u.curso ? insignia(esc(u.curso), 'gris') : ''}</div>
      <p class="text-xs text-zinc-500 mt-2">${u.prestamos_activos}/${u.reglas.maxPrestamos} libros en préstamo · plazo de ${u.reglas.diasPrestamo} días</p></div>`;
    $('#ficha-cuerpo').innerHTML = `<div class="flex justify-between items-center mb-3"><h3 class="titulo-seccion">${icono('reloj', 'w-4 h-4 text-zinc-500')}Historial</h3>
      <button class="btn-primario py-1.5" data-prestar-usuario="${u.id}" ${u.estado === 'activo' ? '' : 'disabled'}>${icono('intercambio', 'w-4 h-4')}Nuevo préstamo</button></div>
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

// Cerrar modales: botón cerrar, «Cancelar» o clic fuera
$$('dialog').forEach((d) => {
  $$('.cerrar', d).forEach((b) => b.addEventListener('click', () => d.close()));
  d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
});

// ───────────────────────── Tiempo real (SSE) ─────────────────────────
function conectarTiempoReal() {
  const pastilla = $('#estado-conexion');
  const punto = $('.punto', pastilla);
  const texto = $('.texto', pastilla);
  const fuente = new EventSource('/api/eventos');
  let pendiente = null;
  fuente.onopen = () => {
    punto.className = 'punto w-1.5 h-1.5 rounded-full bg-ios-green shadow-[0_0_8px_#30d158] animate-pulse';
    texto.textContent = 'En vivo';
  };
  fuente.onerror = () => { punto.className = 'punto w-1.5 h-1.5 rounded-full bg-ios-orange'; texto.textContent = 'Reconectando'; };
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
  hidratarIconos();
  const inicial = location.hash.slice(1);
  if (['panel', 'prestamos', 'libros', 'usuarios'].includes(inicial)) irA(inicial);
  try {
    await cargarTodo();
    conectarTiempoReal();
  } catch (err) {
    toast(`No se pudo conectar con el servidor: ${err.message}`, 'error');
  }
})();
