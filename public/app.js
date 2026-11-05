// Scriptorium — lógica del frontend (JavaScript vanilla)
'use strict';

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const estado = {
  sesion: null,           // { token, rol: 'admin' | 'lector', nombre, usuario_id }
  vista: null,
  libros: [],
  usuarios: [],
  prestamos: [],
  stats: null,
  yo: null,               // datos del lector conectado
  perfil: null,           // cuenta conectada (nombre, foto...)
  movimientos: [],
  grupoActividad: '',
  filtroPrestamos: 'abiertos',
  filtroRol: '',
  categoria: '',
  categoriaExplorar: '',
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
  casa: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
  brujula: '<circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36z"/>',
  historial: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
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
  chevron: '<path d="m9 18 6-6-6-6"/>',
  etiqueta: '<path d="M12.59 2.59A2 2 0 0 0 11.17 2H4a2 2 0 0 0-2 2v7.17a2 2 0 0 0 .59 1.42l8.7 8.7a2.43 2.43 0 0 0 3.42 0l6.58-6.58a2.43 2.43 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r="1"/>',
  normas: '<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
  cargando: '<path d="M21 12a9 9 0 1 1-6.22-8.56"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  luna: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  salir: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  bandeja: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  marcador: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
  ojo: '<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/>',
  ojoTachado: '<path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c4.4 0 8.2 2.7 9.94 6.65a1 1 0 0 1 0 .7 10.8 10.8 0 0 1-1.44 2.49"/><path d="M14.08 14.16a3 3 0 0 1-4.24-4.24"/><path d="M17.48 17.5a10.75 10.75 0 0 1-15.42-5.15 1 1 0 0 1 0-.7 10.75 10.75 0 0 1 4.45-5.14"/><path d="m2 2 20 20"/>',
  camara: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  candado: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  usuarioMas: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/>',
  cola: '<path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M12 22v-8.3a4 4 0 0 0-1.17-2.83L3 3"/><path d="m15 9 6-6"/>',
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
  iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('es-ES', opciones) : '—';
const hoyISO = () => new Date().toLocaleDateString('sv-SE');
const diasEntre = (a, b) => Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 86400000);
const diasHasta = (iso) => diasEntre(hoyISO(), iso);
const sumarDias = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('sv-SE'); };
// "5 nov · 10:42" a partir de "2026-11-05 10:42:00"
const fmtFechaHora = (dt, opciones = { day: 'numeric', month: 'short' }) => (dt
  ? `${fmtFecha(dt, opciones)} · ${dt.slice(11, 16)}` : '—');
const fmtHora = (dt) => (dt ? dt.slice(11, 16) : '');
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
const formatearIsbn = (i) => (i?.length === 13 ? `${i.slice(0, 3)}-${i.slice(3, 5)}-${i.slice(5, 9)}-${i.slice(9, 12)}-${i.slice(12)}` : i);
function haceCuanto(fechaHora) {
  const min = Math.max(0, Math.round((Date.now() - new Date(fechaHora.replace(' ', 'T'))) / 60000));
  if (min < 1) return 'ahora mismo';
  if (min < 60) return `hace ${min} min`;
  if (min < 60 * 24) return `hace ${Math.round(min / 60)} h`;
  return `hace ${plural(Math.round(min / 1440), 'día', 'días')}`;
}
const leer = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const guardar = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } };

async function api(metodo, url, cuerpo) {
  const cabeceras = {};
  if (cuerpo) cabeceras['Content-Type'] = 'application/json';
  if (estado.sesion?.token) cabeceras.Authorization = `Bearer ${estado.sesion.token}`;
  const r = await fetch(url, { method: metodo, headers: cabeceras, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  const datos = await r.json().catch(() => ({}));
  if (r.status === 401 && estado.sesion && !url.startsWith('/api/sesion')) {
    cerrarSesion(false);
    toast('Tu sesión ha caducado. Vuelve a entrar.', 'info');
  }
  if (!r.ok) throw new Error(datos.error || `Error ${r.status}`);
  return datos;
}

function toast(mensaje, tipo = 'ok') {
  const estilos = { ok: ['checkCirculo', 'text-ios-green'], error: ['alerta', 'text-ios-red'], info: ['info', 'text-ios-blue'] };
  const [ic, color] = estilos[tipo];
  const el = document.createElement('div');
  el.className = 'glass-fuerte pointer-events-auto rounded-2xl px-4 py-3 text-sm flex gap-3 items-start transition-all duration-300 w-full';
  el.style.cssText = 'opacity:0;transform:translateY(-8px) scale(.98)';
  el.innerHTML = `<span class="${color} mt-px">${icono(ic, 'w-[18px] h-[18px]')}</span><span>${esc(mensaje)}</span>`;
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

// ───────────────────────── Portadas ─────────────────────────
// Portada real si existe; si no (o si falla al cargar), una portada generada con el título
const COLORES_PORTADA = [
  ['#1e3a8a', '#0a84ff'], ['#134e4a', '#30d158'], ['#7c2d12', '#ff9f0a'], ['#881337', '#ff375f'],
  ['#4c1d95', '#bf5af2'], ['#0c4a6e', '#64d2ff'], ['#312e81', '#5e5ce6'], ['#3f3f46', '#a1a1aa'],
];
function coloresDe(titulo) {
  let h = 0;
  for (const c of titulo || '') h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COLORES_PORTADA[h % COLORES_PORTADA.length];
}
const SOMBRA_PORTADA = 'ring-1 ring-inset ring-white/15 shadow-[0_10px_24px_-10px_rgba(0,0,0,.7)]';
function portadaGenerada(libro, clases) {
  const [a, b] = coloresDe(libro.titulo);
  const fondo = `background:linear-gradient(150deg,${a},${b})`;
  // En miniatura no cabe el título: monograma con la inicial
  if (/\bw-(7|8|10)\b/.test(clases)) {
    return `<div class="${clases} rounded-[6px] grid place-items-center text-white font-semibold text-sm ${SOMBRA_PORTADA}" style="${fondo}">${esc((libro.titulo || '?').trim()[0].toUpperCase())}</div>`;
  }
  const grande = /\bw-(2[4-9]|3\d|full)\b/.test(clases);
  return `<div class="${clases} rounded-[6px] flex flex-col justify-between text-white overflow-hidden ${SOMBRA_PORTADA} ${grande ? 'p-3' : 'p-1.5'}" style="${fondo}">
    <span class="font-semibold tracking-tight ${grande ? 'text-[15px] leading-tight line-clamp-5' : 'text-[0.6rem] leading-[1.1] line-clamp-4'}">${esc(libro.titulo)}</span>
    <span class="${grande ? 'text-[11px]' : 'text-[0.48rem]'} opacity-80 truncate">${esc(libro.autor || '')}</span></div>`;
}
// Las portadas propias tienen dos tamaños: <isbn>.webp (360 px) y <isbn>-s.webp (160 px, para miniaturas)
const esPortadaLocal = (url) => /^\/portadas\/.+\.webp$/.test(url || '');
const miniatura = (url) => (esPortadaLocal(url) ? url.replace(/\.webp$/, '-s.webp') : url);
const esMiniatura = (clases) => /\bw-(7|8|10|12|16|20)\b/.test(clases);

function portada(libro, clases = 'w-12 h-16') {
  const generada = portadaGenerada(libro, clases);
  if (!libro.portada) return generada;
  const src = esMiniatura(clases) ? miniatura(libro.portada) : libro.portada;
  return `<span class="contents" data-fallback="${esc(generada)}"><img src="${esc(src)}" alt="Portada de ${esc(libro.titulo)}" loading="lazy" decoding="async"
    class="${clases} object-cover rounded-[6px] bg-tinte/5 ${SOMBRA_PORTADA}"
    onerror="this.parentElement.outerHTML=this.parentElement.dataset.fallback" /></span>`;
}
const portadaGrandeUrl = (url) => (url || '');
// Fondo difuminado con la portada (como en Apple Music / Books)
function fondoPortada(libro, clases = '') {
  const [a, b] = coloresDe(libro.titulo);
  const estilo = libro.portada ? `background-image:url('${esc(miniatura(libro.portada))}')` : `background:linear-gradient(150deg,${a},${b})`;
  return `<div class="absolute inset-0 bg-cover bg-center blur-3xl scale-150 opacity-60 ${clases}" style="${estilo}"></div>`;
}

// ───────────────────────── Insignias y avatares ─────────────────────────
const TONOS = {
  azul: 'bg-ios-blue/15 text-ios-blue ring-ios-blue/25',
  verde: 'bg-ios-green/15 text-ios-green ring-ios-green/25',
  rojo: 'bg-ios-red/15 text-ios-red ring-ios-red/25',
  naranja: 'bg-ios-orange/15 text-ios-orange ring-ios-orange/25',
  morado: 'bg-ios-purple/15 text-ios-purple ring-ios-purple/25',
  celeste: 'bg-ios-teal/15 text-ios-teal ring-ios-teal/25',
  gris: 'bg-tinte/[0.06] text-t3 ring-tinte/10',
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
function avatar(u, clases = 'w-9 h-9 text-xs') {
  if (u.foto) return `<img src="${esc(u.foto)}" alt="" class="${clases} shrink-0 rounded-full object-cover ring-1 ring-inset ring-white/20 bg-tinte/10" loading="lazy" decoding="async" />`;
  const partes = u.apellidos ? [u.nombre, u.apellidos] : String(u.nombre || '').split(' ');
  const ini = `${partes[0]?.[0] || ''}${partes[1]?.[0] || ''}`.toUpperCase();
  const fondo = u.rol === 'profesor' ? 'from-[#bf5af2] to-[#5e5ce6]' : u.rol === 'admin' ? 'from-[#ff9f0a] to-[#ff375f]' : 'from-[#64d2ff] to-[#0a84ff]';
  return `<div class="${clases} shrink-0 rounded-full grid place-items-center font-semibold text-white bg-gradient-to-br ${fondo} ring-1 ring-inset ring-white/20">${esc(ini)}</div>`;
}
const vacio = (texto, cols) => `<tr><td colspan="${cols}" class="px-4 py-14 text-center text-t3">${texto}</td></tr>`;

// ───────────────────────── Tema claro / oscuro ─────────────────────────
function pintarBotonesTema() {
  const oscuro = document.documentElement.dataset.tema === 'oscuro';
  $$('.btn-tema').forEach((b) => {
    b.innerHTML = icono(oscuro ? 'sol' : 'luna', 'w-4 h-4');
    b.title = oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';
  });
}
document.addEventListener('click', (e) => {
  if (!e.target.closest('.btn-tema')) return;
  const nuevo = document.documentElement.dataset.tema === 'oscuro' ? 'claro' : 'oscuro';
  document.documentElement.dataset.tema = nuevo;
  $('meta[name=theme-color]')?.setAttribute('content', nuevo === 'claro' ? '#f2f2f7' : '#050507');
  guardar('scriptorium.tema', nuevo);
  pintarBotonesTema();
});

// ───────────────────────── Acceso: entrar y crear cuenta ─────────────────────────
const DEMO_PASSWORD = 'scriptorium1';

async function mostrarAcceso() {
  $('#aplicacion').classList.add('hidden');
  $('#pantalla-acceso').classList.remove('hidden');
  $('#error-acceso').classList.add('hidden');
  try {
    const [libros, cuentas] = await Promise.all([api('GET', '/api/libros'), api('GET', '/api/demo/cuentas')]);
    pintarMuro(libros);
    $('#cuentas-demo').innerHTML = cuentas.length ? `
      <p class="etiqueta mb-1">Cuentas de la demo</p>
      <p class="text-xs text-t3 mb-3">Contraseña de todas: <b class="text-t1 font-semibold font-mono">${DEMO_PASSWORD}</b></p>
      <div class="flex flex-wrap gap-2">${cuentas.map((u) => `
        <button type="button" class="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 bg-tinte/[0.05] ring-1 ring-inset ring-tinte/10 hover:bg-tinte/[0.1] transition text-xs" data-email-demo="${esc(u.email)}">
          ${u.rol === 'admin'
            ? `<span class="w-6 h-6 rounded-full grid place-items-center text-white bg-gradient-to-br from-[#ff9f0a] to-[#ff375f]">${icono('estanteria', 'w-3 h-3')}</span>Biblioteca`
            : `${avatar(u, 'w-6 h-6 text-[9px]')}${esc(u.nombre)}`}</button>`).join('')}</div>` : '';
  } catch { /* la pantalla funciona igual sin muro ni cuentas demo */ }
}

function pintarMuro(libros) {
  const conPortada = libros.filter((l) => l.portada);
  const columnas = 4;
  $('#muro').innerHTML = Array.from({ length: columnas }, (_, c) => {
    const propios = conPortada.filter((_, i) => i % columnas === c);
    const serie = [...propios, ...propios].map((l) => portada(l, 'w-full aspect-[2/3]')).join('');
    return `<div class="flex-1 min-w-0"><div class="muro-col ${c % 2 ? 'bajar' : ''} flex flex-col gap-4" style="--dur:${70 + c * 12}s">${serie}${serie}</div></div>`;
  }).join('');
  $('#muro-movil').innerHTML = conPortada.slice(0, 12).map((l) => portada(l, 'w-16 h-24 shrink-0')).join('');
}

function modoAcceso(modo) {
  const registro = modo === 'registro';
  $$('#selector-acceso .seg').forEach((x) => x.classList.toggle('activa', x.dataset.acceso === modo));
  $('#form-entrar').classList.toggle('hidden', registro);
  $('#form-registro').classList.toggle('hidden', !registro);
  $('#titulo-acceso').textContent = registro ? 'Crea tu cuenta' : 'Bienvenido';
  $('#subtitulo-acceso').textContent = registro ? 'Para alumnos y profesores del centro.' : 'Entra con tu cuenta del centro.';
  $('#error-acceso').classList.add('hidden');
  (registro ? $('#form-registro [name=nombre]') : $('#acceso-email')).focus();
}
$$('#selector-acceso .seg').forEach((b) => b.addEventListener('click', () => modoAcceso(b.dataset.acceso)));

document.addEventListener('click', (e) => {
  const demo = e.target.closest('[data-email-demo]');
  if (demo) {
    $('#acceso-email').value = demo.dataset.emailDemo;
    $('#acceso-password').value = DEMO_PASSWORD;
    $('#form-entrar').requestSubmit();
  }
  const ver = e.target.closest('.ver-password');
  if (ver) {
    const input = $('input', ver.parentElement);
    const mostrar = input.type === 'password';
    input.type = mostrar ? 'text' : 'password';
    ver.innerHTML = icono(mostrar ? 'ojoTachado' : 'ojo', 'w-4 h-4');
    ver.setAttribute('aria-label', mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña');
  }
});

// Selector de rol y medidor de fuerza en el registro
const formRegistro = $('#form-registro');
$$('input[name=rol]', formRegistro).forEach((r) => r.addEventListener('change', () => {
  $$('#registro-rol .seg').forEach((l) => l.classList.toggle('activa', $('input', l).checked));
  const profe = formRegistro.rol.value === 'profesor';
  $('#registro-label-curso').textContent = profe ? 'Departamento' : 'Curso';
  formRegistro.curso.placeholder = profe ? 'Matemáticas' : '2º ESO B';
  formRegistro.email.placeholder = profe ? 'nombre@colegio.es' : 'nombre@alumnos.colegio.es';
}));
formRegistro.password.addEventListener('input', () => {
  const v = formRegistro.password.value;
  const puntos = [v.length >= 8, /[a-zA-Z]/.test(v) && /\d/.test(v), v.length >= 12, /[^a-zA-Z0-9]/.test(v) || /[A-Z]/.test(v) && /[a-z]/.test(v)]
    .filter(Boolean).length;
  const colores = ['rgb(var(--rojo))', 'rgb(var(--naranja))', 'rgb(var(--amarillo))', 'rgb(var(--verde))'];
  $$('#fuerza-password span').forEach((b, i) => { b.style.background = i < puntos ? colores[puntos - 1] : ''; });
});

async function entrar(peticion, boton) {
  boton.disabled = true;
  try {
    const s = await peticion();
    estado.sesion = s;
    guardar('scriptorium.sesion', JSON.stringify(s));
    $('#acceso-password').value = '';
    formRegistro.reset();
    await arrancarApp();
    toast(s.rol === 'admin' ? `Hola, ${s.nombre.split(' ')[0]}. Sesión de biblioteca iniciada` : `Hola, ${s.nombre.split(' ')[0]}`);
  } catch (err) {
    $('#error-acceso').textContent = err.message;
    $('#error-acceso').classList.remove('hidden');
  } finally {
    boton.disabled = false;
  }
}
$('#form-entrar').addEventListener('submit', (e) => {
  e.preventDefault();
  entrar(() => api('POST', '/api/sesion', { email: $('#acceso-email').value, password: $('#acceso-password').value }), $('button[type=submit]', e.target));
});
formRegistro.addEventListener('submit', (e) => {
  e.preventDefault();
  const datos = Object.fromEntries(new FormData(formRegistro));
  entrar(() => api('POST', '/api/registro', datos), $('button[type=submit]', e.target));
});

function cerrarSesion(avisarServidor = true) {
  if (avisarServidor && estado.sesion) api('DELETE', '/api/sesion').catch(() => {});
  estado.sesion = null;
  estado.yo = null;
  estado.perfil = null;
  guardar('scriptorium.sesion', null);
  $$('dialog[open]').forEach((d) => d.close());
  mostrarAcceso();
}
document.addEventListener('click', (e) => { if (e.target.closest('.btn-salir')) cerrarSesion(); });

// ───────────────────────── Navegación por rol ─────────────────────────
const NAV = {
  admin: [
    { vista: 'panel', texto: 'Panel', icono: 'panel' },
    { vista: 'prestamos', texto: 'Préstamos', icono: 'intercambio', insignia: 'retrasos' },
    { vista: 'libros', texto: 'Catálogo', icono: 'libro' },
    { vista: 'usuarios', texto: 'Lectores', icono: 'usuarios' },
    { vista: 'actividad', texto: 'Actividad', icono: 'historial' },
  ],
  lector: [
    { vista: 'mi-inicio', texto: 'Inicio', icono: 'casa' },
    { vista: 'explorar', texto: 'Explorar', icono: 'brujula' },
    { vista: 'historial', texto: 'Historial', icono: 'historial' },
  ],
};

function pintarNavegacion() {
  const items = NAV[estado.sesion.rol];
  const burbuja = (i, clases) => (i.insignia ? `<span data-insignia="${i.insignia}" class="hidden ${clases} min-w-[18px] h-[18px] px-1 rounded-full bg-ios-red text-white text-[10px] font-semibold grid place-items-center"></span>` : '');
  $('#nav-lateral').innerHTML = items.map((i) => `
    <button class="lado-btn" data-vista="${i.vista}">${icono(i.icono, 'w-[18px] h-[18px]')}${i.texto}${burbuja(i, 'ml-auto')}</button>`).join('');
  $('#dock').innerHTML = items.map((i) => `
    <button class="dock-btn" data-vista="${i.vista}">${icono(i.icono, 'w-[22px] h-[22px]')}<span class="text-[11px] font-medium">${i.texto}</span>${burbuja(i, 'absolute top-1 right-3 ring-2 ring-modal')}</button>`).join('');
  pintarSesion();
}

function pintarSesion() {
  const s = estado.sesion;
  const p = estado.perfil || { nombre: s.nombre };
  const rolTexto = s.rol === 'admin' ? 'Personal de biblioteca' : (p.rol === 'profesor' ? 'Profesor' : 'Lector');
  const datosAvatar = { ...p, rol: s.rol === 'admin' ? 'admin' : p.rol };
  $$('.rol-texto').forEach((e) => { e.textContent = rolTexto; });
  $$('.nombre-sesion').forEach((e) => { e.textContent = `${p.nombre} ${p.apellidos || ''}`.trim(); });
  $$('.avatar-sesion').forEach((e) => { e.innerHTML = avatar(datosAvatar, 'w-9 h-9 text-xs'); });
  $$('.avatar-sesion-mini').forEach((e) => { e.innerHTML = avatar(datosAvatar, 'w-8 h-8 text-[10px]'); });
}

function irA(vista) {
  const items = NAV[estado.sesion.rol];
  if (vista === 'inicio' || !items.some((i) => i.vista === vista)) vista = items[0].vista;
  estado.vista = vista;
  $$('[data-vista]').forEach((b) => b.classList.toggle('activa', b.dataset.vista === vista));
  $$('.vista').forEach((s) => s.classList.toggle('activa', s.id === `vista-${vista}`));
  history.replaceState(null, '', `#${vista}`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.addEventListener('click', (e) => {
  const nav = e.target.closest('[data-vista]');
  if (nav && !nav.closest('.vista')) { irA(nav.dataset.vista); return; }
  const ir = e.target.closest('[data-ir]');
  if (ir) {
    e.preventDefault();
    if (ir.dataset.filtro !== undefined) cambiarFiltroPrestamos(ir.dataset.filtro);
    if ($('#modal-ficha').open) $('#modal-ficha').close();
    irA(ir.dataset.ir);
  }
});
$$('.btn-nuevo-prestamo').forEach((b) => b.addEventListener('click', () => { irA('prestamos'); $('.combo[data-tipo="usuario"] input').focus(); }));

async function arrancarApp() {
  $('#pantalla-acceso').classList.add('hidden');
  $('#aplicacion').classList.remove('hidden');
  estado.perfil = await api('GET', '/api/perfil');
  await cargarTodo();
  pintarNavegacion();
  const inicial = location.hash.slice(1);
  irA(NAV[estado.sesion.rol].some((i) => i.vista === inicial) ? inicial : 'inicio');
  conectarTiempoReal();
}

// ───────────────────────── Carga de datos ─────────────────────────
async function cargarTodo() {
  if (estado.sesion.rol === 'admin') {
    const [stats, libros, usuarios, prestamos, movimientos] = await Promise.all([
      api('GET', '/api/stats'), api('GET', '/api/libros'), api('GET', '/api/usuarios'), api('GET', '/api/prestamos'),
      api('GET', '/api/movimientos?limite=400'),
    ]);
    Object.assign(estado, { stats, libros, usuarios, prestamos, movimientos });
    for (const tipo of ['usuario', 'libro']) {
      const sel = estado.seleccion[tipo];
      if (sel) estado.seleccion[tipo] = (tipo === 'usuario' ? usuarios : libros).find((x) => x.id === sel.id) || null;
    }
    pintarPanel();
    pintarPrestamos();
    pintarLibros();
    pintarUsuarios();
    pintarMostrador();
    pintarActividad();
    const r = stats.prestamos.retrasados || 0;
    $$('[data-insignia="retrasos"]').forEach((b) => { b.textContent = r; b.classList.toggle('hidden', !r); });
  } else {
    const [yo, libros] = await Promise.all([api('GET', '/api/yo'), api('GET', '/api/libros')]);
    Object.assign(estado, { yo, libros });
    pintarInicioLector();
    pintarExplorar();
    pintarHistorial();
  }
  $$('.fecha-hoy').forEach((e) => { e.textContent = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); });
}

// ════════════════════════════════ VISTAS DEL BIBLIOTECARIO ════════════════════════════════

// ───────────────────────── Panel ─────────────────────────
function pintarPanel() {
  const s = estado.stats;
  const kpi = (ic, color, valor, etiqueta, sub, destino) => `
    <button data-ir="${destino}" class="card text-left p-4 sm:p-5 transition hover:-translate-y-0.5">
      <span class="w-9 h-9 rounded-xl grid place-items-center ${color}">${icono(ic, 'w-[18px] h-[18px]')}</span>
      <p class="text-[32px] font-semibold tracking-[-0.03em] mt-4 leading-none tabular-nums">${valor}</p>
      <p class="text-[13px] font-medium text-t2 mt-2">${etiqueta}</p>
      <p class="text-xs text-t3 mt-0.5">${sub}</p>
    </button>`;
  const pctDisp = s.libros.ejemplares ? Math.round((s.libros.disponibles / s.libros.ejemplares) * 100) : 0;
  $('#kpis').innerHTML = [
    kpi('estanteria', 'bg-ios-blue/15 text-ios-blue', s.libros.titulos, 'Títulos', `${s.libros.ejemplares} ejemplares en total`, 'libros'),
    kpi('checkCirculo', 'bg-ios-green/15 text-ios-green', s.libros.disponibles, 'Disponibles', `${pctDisp}% del fondo en estantería`, 'libros'),
    kpi('intercambio', 'bg-ios-orange/15 text-ios-orange', s.prestamos.abiertos || 0, 'Préstamos abiertos', `${s.prestamos.prestados_hoy || 0} hoy · ${s.prestamos.devueltos_hoy || 0} devueltos hoy`, 'prestamos'),
    kpi('lectorOk', 'bg-ios-purple/15 text-ios-purple', s.usuarios.activos || 0, 'Lectores activos', `${s.usuarios.alumnos || 0} alumnos · ${s.usuarios.profesores || 0} profesores`, 'usuarios'),
  ].join('');

  pintarSolicitudes('#caja-solicitudes');
  pintarSolicitudes('#caja-solicitudes-prestamos');

  $('#n-retrasos').textContent = s.prestamos.retrasados || 0;
  $('#lista-retrasos').innerHTML = s.retrasados.length ? s.retrasados.map((p) => {
    const libro = estado.libros.find((l) => l.id === p.libro_id) || p;
    return `<li class="py-3 flex items-center gap-3">
      ${portada(libro, 'w-8 h-11')}
      <div class="flex-1 min-w-0">
        <p class="font-medium truncate">${esc(p.titulo)}</p>
        <p class="text-xs text-t3 mt-0.5 truncate">${esc(p.usuario)} · ${esc(p.curso || p.rol)}</p>
      </div>
      <div class="flex flex-col items-end gap-1.5">${ESTADO_PRESTAMO.retrasado(p)}
        <button class="btn-devolver btn-verde" data-id="${p.id}">${icono('devolver', 'w-3.5 h-3.5')}Devolver</button></div>
    </li>`;
  }).join('') : `<li class="py-6 text-sm text-t3 flex items-center gap-2">${icono('checkCirculo', 'w-4 h-4 text-ios-green')}Ningún préstamo con retraso</li>`;

  const max = Math.max(1, ...s.actividad.flatMap((d) => [d.prestamos, d.devoluciones]));
  $('#grafico').innerHTML = s.actividad.map((d) => {
    const esHoy = d.dia === hoyISO();
    return `<div class="flex-1 flex flex-col items-center gap-2 h-full justify-end group" title="${fmtFecha(d.dia, { weekday: 'long', day: 'numeric', month: 'long' })}: ${d.prestamos} préstamos, ${d.devoluciones} devoluciones">
      <div class="w-full flex items-end justify-center gap-[3px] h-full rounded-lg group-hover:bg-tinte/[0.03] transition">
        <div class="w-1/2 max-w-[10px] rounded-full bg-gradient-to-t from-ios-blue/70 to-ios-blue" style="height:${(d.prestamos / max) * 100}%;min-height:${d.prestamos ? 6 : 0}px"></div>
        <div class="w-1/2 max-w-[10px] rounded-full bg-gradient-to-t from-ios-green/70 to-ios-green" style="height:${(d.devoluciones / max) * 100}%;min-height:${d.devoluciones ? 6 : 0}px"></div>
      </div>
      <span class="text-[10px] tabular-nums ${esHoy ? 'font-semibold text-t1' : 'text-t4'}">${esHoy ? 'Hoy' : new Date(`${d.dia}T00:00:00`).getDate()}</span>
    </div>`;
  }).join('');

  $('#lista-pronto').innerHTML = s.vencen_pronto.length
    ? s.vencen_pronto.map((p) => `
      <li class="flex items-center gap-3">
        <div class="flex-1 min-w-0"><p class="text-sm font-medium truncate">${esc(p.titulo)}</p><p class="text-xs text-t3 truncate">${esc(p.usuario)}</p></div>
        ${ESTADO_PRESTAMO.activo(p)}
      </li>`).join('')
    : `<li class="text-sm text-t3 flex items-center gap-2">${icono('checkCirculo', 'w-4 h-4 text-ios-green')}Nada vence en los próximos días</li>`;

  $('#lista-top').innerHTML = s.top_libros.map((l, i) => `
    <li class="cursor-pointer group" data-ficha-libro="${l.id}">
      <div class="relative transition group-hover:-translate-y-1">${portada(l, 'w-full aspect-[2/3]')}
        <span class="absolute -top-2 -left-2 w-7 h-7 rounded-full grid place-items-center text-xs font-semibold glass-fuerte ${i === 0 ? 'text-ios-yellow' : 'text-t2'}">${i + 1}</span></div>
      <p class="text-sm font-medium truncate mt-3">${esc(l.titulo)}</p>
      <p class="text-xs text-t3">${plural(l.veces, 'préstamo', 'préstamos')}</p>
    </li>`).join('') || '<li class="text-sm text-t3">Aún no hay préstamos</li>';

  const maxCat = Math.max(1, ...s.categorias.map((c) => c.n));
  $('#lista-categorias').innerHTML = s.categorias.map((c) => `
    <button class="w-full flex items-center gap-3 text-sm group" data-categoria-ir="${esc(c.categoria)}">
      <span class="w-28 text-left truncate text-t2 group-hover:text-t1 transition">${esc(c.categoria)}</span>
      <span class="flex-1 h-1.5 bg-tinte/[0.07] rounded-full overflow-hidden"><span class="block h-full bg-gradient-to-r from-ios-blue to-ios-purple rounded-full" style="width:${(c.n / maxCat) * 100}%"></span></span>
      <span class="w-5 text-right text-t3 tabular-nums text-xs">${c.n}</span>
    </button>`).join('');

  $('#panel-movimientos').innerHTML = s.movimientos.map((m) => filaMovimiento(m, true)).join('')
    || '<li class="py-4 text-sm text-t3">Aún no hay movimientos</li>';

  const r = s.reglas;
  const regla = (ic, texto) => `<li class="flex gap-3 items-start"><span class="text-t3 mt-0.5">${icono(ic, 'w-4 h-4')}</span><span>${texto}</span></li>`;
  $('#reglas-box').innerHTML = `
    <h2 class="titulo-seccion mb-4">${icono('normas', 'w-4 h-4 text-t3')}Normas de préstamo</h2>
    <ul class="space-y-3 text-sm text-t2">
      ${regla('birrete', `Alumnos: hasta <b class="text-t1 font-medium">${r.alumno.maxPrestamos} libros</b> durante ${r.alumno.diasPrestamo} días`)}
      ${regla('maletin', `Profesores: hasta <b class="text-t1 font-medium">${r.profesor.maxPrestamos} libros</b> durante ${r.profesor.diasPrestamo} días`)}
      ${regla('renovar', `Hasta ${r.maxRenovaciones} renovaciones si no hay retraso ni lista de espera`)}
      ${regla('prohibido', 'Con un préstamo retrasado no se presta más')}
    </ul>`;
}

document.addEventListener('click', (e) => {
  const c = e.target.closest('[data-categoria-ir]');
  if (c) { estado.categoria = c.dataset.categoriaIr; pintarLibros(); irA('libros'); }
});

// ── Peticiones de lectores (bandeja del bibliotecario) ──
function pintarSolicitudes(selector) {
  const lista = estado.stats.solicitudes;
  $(selector).innerHTML = `
    <div class="flex items-center justify-between gap-3 mb-3">
      <h2 class="titulo-seccion"><span class="w-7 h-7 rounded-full bg-ios-blue/15 text-ios-blue grid place-items-center">${icono('bandeja', 'w-4 h-4')}</span>
        Peticiones de lectores ${lista.length ? `<span class="text-xs font-semibold text-ios-blue bg-ios-blue/15 rounded-full px-2 py-0.5">${lista.length}</span>` : ''}</h2>
    </div>
    <ul class="divide-y divide-tinte/[0.06]">${lista.length ? lista.map((s) => {
      const libro = estado.libros.find((l) => l.id === s.libro_id) || s;
      const hay = s.ejemplares_disponibles > 0;
      return `<li class="py-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <button data-ficha-libro="${s.libro_id}">${portada(libro, 'w-8 h-11')}</button>
        <div class="flex-1 min-w-[150px]">
          <p class="font-medium truncate">${esc(s.titulo)}</p>
          <p class="text-xs text-t3 truncate">${esc(s.usuario)} · ${esc(s.curso || s.rol)} · ${fmtFechaHora(s.creada_en)}</p>
        </div>
        <div class="flex items-center gap-2 ml-auto">
          ${hay ? '' : insignia('Sin stock', 'naranja', 'reloj')}
          <button class="btn-atender btn-verde" data-id="${s.id}" ${hay ? '' : 'disabled title="No hay ejemplares disponibles"'}>${icono('check', 'w-3.5 h-3.5')}Prestar</button>
          <button class="btn-rechazar btn-icono-rojo w-7 h-7" data-id="${s.id}" title="Rechazar" aria-label="Rechazar">${icono('cerrar', 'w-3.5 h-3.5')}</button>
        </div>
      </li>`;
    }).join('') : `<li class="py-6 text-sm text-t3 flex items-center gap-2">${icono('checkCirculo', 'w-4 h-4 text-ios-green')}No hay peticiones pendientes</li>`}</ul>`;
}

document.addEventListener('click', async (e) => {
  const at = e.target.closest('.btn-atender');
  const re = e.target.closest('.btn-rechazar');
  if (!at && !re) return;
  const btn = at || re;
  btn.disabled = true;
  try {
    if (at) {
      const p = await api('POST', `/api/solicitudes/${btn.dataset.id}/atender`);
      toast(`«${p.titulo}» prestado a ${p.usuario} hasta el ${fmtFecha(p.fecha_limite, { day: 'numeric', month: 'long' })}`);
    } else {
      await api('POST', `/api/solicitudes/${btn.dataset.id}/rechazar`, { motivo: 'Rechazada por la biblioteca' });
      toast('Petición rechazada', 'info');
    }
    await cargarTodo();
  } catch (err) {
    toast(err.message, 'error');
    btn.disabled = false;
  }
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
  if (!estado.stats) return;
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
    return `<tr class="hover:bg-tinte/[0.025] transition ${p.estado === 'retrasado' ? 'bg-ios-red/[0.04]' : ''}">
      <td class="px-4 py-3"><div class="flex items-center gap-3 cursor-pointer" data-ficha-libro="${p.libro_id}">${portada(libro, 'w-8 h-11')}
        <div class="min-w-0"><p class="font-medium truncate max-w-[200px] hover:text-ios-blue transition">${esc(p.titulo)}</p><p class="text-xs text-t3">${esc(p.autor)}</p></div></div></td>
      <td class="c-lector px-4 py-3 min-w-[160px]"><button class="text-left" data-ficha-usuario="${p.usuario_id}"><p class="hover:text-ios-blue transition">${esc(p.usuario)}</p><p class="text-xs text-t3">${esc(p.curso || '')}</p></button></td>
      <td class="px-4 py-3 whitespace-nowrap text-t3 hidden xl:table-cell tabular-nums">${p.prestado_en ? fmtFechaHora(p.prestado_en) : fmtFecha(p.fecha_prestamo)}</td>
      <td class="c-limite px-4 py-3 whitespace-nowrap tabular-nums ${p.estado === 'retrasado' ? 'text-ios-red' : 'text-t2'}">${fmtFecha(p.fecha_limite)}
        ${p.renovaciones ? `<span class="text-[11px] text-t3 ml-1" title="Renovaciones">${icono('renovar', 'w-3 h-3 inline -mt-0.5')} ${p.renovaciones}</span>` : ''}
        ${!abierto ? `<p class="text-xs text-t3">Devuelto ${p.devuelto_en ? fmtFechaHora(p.devuelto_en) : fmtFecha(p.fecha_devolucion)}</p>` : `<p class="text-xs text-t3 xl:hidden">Prestado ${p.prestado_en ? fmtFechaHora(p.prestado_en) : fmtFecha(p.fecha_prestamo)}</p>`}</td>
      <td class="c-estado px-4 py-3">${ESTADO_PRESTAMO[p.estado](p)}</td>
      <td class="c-acciones px-4 py-3 text-right whitespace-nowrap">${abierto ? `
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
      const url = estado.sesion.rol === 'admin' ? `/api/prestamos/${btn.dataset.id}/renovar` : `/api/yo/prestamos/${btn.dataset.id}/renovar`;
      const r = await api('POST', url);
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
    ${icono('buscar', 'w-4 h-4 absolute left-3.5 top-[13px] text-t3 pointer-events-none')}
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
        <p class="text-xs text-t3 truncate">${esc(x.curso || x.rol)} · ${x.prestamos_activos} en préstamo</p></div>
        ${x.estado !== 'activo' ? ESTADO_USUARIO[x.estado] : x.prestamos_retrasados ? insignia('Retraso', 'rojo', 'alerta') : ''}</div>`
    : `<div class="flex items-center gap-3">${portada(x, 'w-7 h-10')}<div class="min-w-0 flex-1"><p class="text-sm truncate">${esc(x.titulo)}</p>
        <p class="text-xs text-t3 truncate">${esc(x.autor)}</p></div>
        ${x.ejemplares_disponibles > 0 ? insignia(`${x.ejemplares_disponibles} disp.`, 'verde') : insignia('Agotado', 'rojo')}</div>`;

  function abrir() {
    const fuente = tipo === 'usuario' ? estado.usuarios.filter((u) => u.estado !== 'baja') : estado.libros;
    opciones = fuente.filter((x) => coincide(texto(x), estado.seleccion[tipo] ? '' : input.value)).slice(0, 30);
    activo = 0;
    lista.innerHTML = opciones.length
      ? opciones.map((x, i) => `<li role="option" data-i="${i}" aria-selected="${i === 0}" class="px-2.5 py-2 rounded-xl cursor-pointer hover:bg-tinte/[0.06]">${fila(x)}</li>`).join('')
      : '<li class="px-3 py-3 text-sm text-t3">Sin resultados</li>';
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
  if (!estado.stats) return;
  const { usuario: u, libro: l } = estado.seleccion;
  const reglas = estado.stats.reglas;
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
  if (u) {
    const r = reglas[u.rol];
    infoU = `<p class="flex items-center gap-1.5 text-t3">${icono(u.rol === 'profesor' ? 'maletin' : 'birrete', 'w-3.5 h-3.5')}${esc(u.curso || u.rol)} · <b class="text-t1 font-medium">${u.prestamos_activos}/${r.maxPrestamos}</b> en préstamo</p>`;
    if (u.estado !== 'activo') avisosU.push(`Lector ${u.estado}: no puede llevarse libros`);
    if (u.prestamos_retrasados) avisosU.push(`Tiene ${plural(u.prestamos_retrasados, 'préstamo', 'préstamos')} con retraso`);
    if (u.prestamos_activos >= r.maxPrestamos) avisosU.push(`Ha llegado al máximo de ${r.maxPrestamos} libros`);
  }
  let infoL = '';
  if (l) {
    if (l.ejemplares_disponibles > 0) infoL = `<p class="flex items-center gap-1.5 text-ios-green">${icono('checkCirculo', 'w-3.5 h-3.5')}${l.ejemplares_disponibles} de ${l.ejemplares_totales} disponibles</p>`;
    else avisosL.push('No quedan ejemplares de este libro');
    if (u && estado.prestamos.some((p) => p.estado !== 'devuelto' && p.usuario_id === u.id && p.libro_id === l.id)) avisosL.push('Este lector ya tiene este libro');
  }
  $('#info-usuario').innerHTML = infoU + avisosU.map(aviso).join('');
  $('#info-libro').innerHTML = infoL + avisosL.map(aviso).join('');

  const dias = Number($('#prestamo-dias').value) || (u ? reglas[u.rol].diasPrestamo : null);
  $('#prestamo-dias').placeholder = u ? `${reglas[u.rol].diasPrestamo}` : 'Auto';
  $('#info-fecha').innerHTML = dias ? `Hasta el <b class="text-t1 font-medium">${fmtFecha(sumarDias(dias))}</b>` : '';
  $('#btn-prestar').disabled = !u || !l || avisosU.length + avisosL.length > 0;
}
$('#prestamo-dias').addEventListener('input', pintarMostrador);

$('#form-prestamo').addEventListener('submit', async (e) => {
  e.preventDefault();
  const { usuario: u, libro: l } = estado.seleccion;
  if (!u || !l) return;
  $('#btn-prestar').disabled = true;
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

// ───────────────────────── Catálogo (gestión) ─────────────────────────
$('#buscar-libros').addEventListener('input', () => pintarLibros());
$('#solo-disponibles').addEventListener('change', () => pintarLibros());

function categoriasDe(libros) {
  return [...new Set(libros.map((l) => l.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
}
const chip = (valor, texto, activo, clase) => `<button class="${clase} shrink-0 text-[13px] font-medium rounded-full px-3.5 py-1.5 transition ring-1 ring-inset
  ${activo ? 'bg-t1 text-fondo ring-transparent' : 'bg-tinte/[0.05] text-t2 ring-tinte/10 hover:text-t1 hover:bg-tinte/[0.1]'}" data-cat="${esc(valor)}">${esc(texto)}</button>`;

function pintarLibros() {
  if (!estado.stats) return;
  const q = $('#buscar-libros').value;
  const soloDisp = $('#solo-disponibles').checked;
  const cats = categoriasDe(estado.libros);
  if (estado.categoria && !cats.includes(estado.categoria)) estado.categoria = '';
  $('#lista-cats').innerHTML = cats.map((c) => `<option value="${esc(c)}">`).join('');
  $('#chips-categorias').innerHTML = chip('', 'Todas', !estado.categoria, 'chip-cat') + cats.map((c) => chip(c, c, estado.categoria === c, 'chip-cat')).join('');

  const lista = estado.libros.filter((l) =>
    (!estado.categoria || l.categoria === estado.categoria) &&
    (!soloDisp || l.ejemplares_disponibles > 0) &&
    (!q || coincide(`${l.titulo} ${l.autor} ${l.isbn} ${l.editorial || ''} ${l.categoria || ''}`, q.replace(/-/g, ''))));

  const s = estado.stats.libros;
  $('#resumen-libros').textContent = `${plural(s.titulos, 'título', 'títulos')} · ${s.ejemplares} ejemplares · ${s.disponibles} disponibles ahora`;

  $('#grid-libros').innerHTML = lista.length ? lista.map((l) => {
    const pct = l.ejemplares_totales ? (l.ejemplares_disponibles / l.ejemplares_totales) * 100 : 0;
    const color = l.ejemplares_disponibles === 0 ? 'bg-ios-red' : pct <= 34 ? 'bg-ios-orange' : 'bg-ios-green';
    return `<article class="card p-4 flex gap-4 transition hover:-translate-y-0.5">
      <button class="shrink-0 transition hover:scale-[1.03]" data-ficha-libro="${l.id}" aria-label="Ver ficha de ${esc(l.titulo)}">${portada(l, 'w-20 h-[120px]')}</button>
      <div class="flex-1 min-w-0 flex flex-col">
        <button class="text-left" data-ficha-libro="${l.id}"><h3 class="font-semibold tracking-tight leading-snug line-clamp-2 hover:text-ios-blue transition">${esc(l.titulo)}</h3></button>
        <p class="text-[13px] text-t3 truncate mt-0.5">${esc(l.autor)}${l.anio ? ` · ${l.anio}` : ''}</p>
        <div class="mt-2 flex gap-1.5 flex-wrap">${l.categoria ? insignia(esc(l.categoria), 'gris') : ''}${l.en_espera ? insignia(`${l.en_espera} en espera`, 'azul', 'cola') : ''}</div>
        <div class="mt-auto pt-3">
          <p class="text-xs font-medium mb-1.5 ${l.ejemplares_disponibles ? 'text-t2' : 'text-ios-red'}">${l.ejemplares_disponibles ? `${l.ejemplares_disponibles} de ${l.ejemplares_totales} disponibles` : 'Agotado'}</p>
          <div class="h-1 bg-tinte/[0.08] rounded-full overflow-hidden"><div class="h-full ${color} rounded-full" style="width:${pct}%"></div></div>
          <div class="flex gap-1.5 mt-3">
            <button class="btn-cristal flex-1 py-1.5 text-xs" data-prestar-libro="${l.id}" ${l.ejemplares_disponibles ? '' : 'disabled'}>${icono('intercambio', 'w-3.5 h-3.5')}Prestar</button>
            <button class="btn-icono" data-editar-libro="${l.id}" title="Editar" aria-label="Editar">${icono('lapiz', 'w-3.5 h-3.5')}</button>
            <button class="btn-icono-rojo" data-borrar-libro="${l.id}" title="Eliminar" aria-label="Eliminar">${icono('papelera', 'w-3.5 h-3.5')}</button>
          </div>
        </div>
      </div>
    </article>`;
  }).join('') : `<div class="col-span-full card py-16 text-center text-t3">${icono('buscar', 'w-6 h-6 mx-auto mb-3 text-t4')}No hay libros que coincidan${q ? '. Puedes añadirlo con «Añadir libro».' : ''}</div>`;
}

document.addEventListener('click', (e) => {
  const c = e.target.closest('.chip-cat');
  if (c) { estado.categoria = c.dataset.cat; pintarLibros(); }
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
const AYUDA_ISBN = 'Escribe el ISBN y pulsa Autocompletar para traer los datos de Google Books u Open Library.';
function abrirModalLibro(libro = null) {
  formLibro.reset();
  $('.error-form', formLibro).classList.add('hidden');
  $('#ayuda-isbn').className = 'text-xs mt-2 text-t3';
  $('#ayuda-isbn').textContent = AYUDA_ISBN;
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
  $('#preview-portada').innerHTML = portada({ titulo: formLibro.titulo.value || 'Sin título', autor: formLibro.autor.value, portada: formLibro.portada.value.trim() }, 'w-10 h-14');
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

// ───────────────────────── Lectores (gestión) ─────────────────────────
$('#buscar-usuarios').addEventListener('input', () => pintarUsuarios());
$('#filtro-estado').addEventListener('change', () => pintarUsuarios());
$$('#filtro-rol .seg').forEach((b) => b.addEventListener('click', () => {
  estado.filtroRol = b.dataset.valor;
  $$('#filtro-rol .seg').forEach((x) => x.classList.toggle('activa', x === b));
  pintarUsuarios();
}));

function pintarUsuarios() {
  if (!estado.stats) return;
  const q = $('#buscar-usuarios').value;
  const rol = estado.filtroRol;
  const est = $('#filtro-estado').value;
  const lista = estado.usuarios.filter((u) =>
    (!rol || u.rol === rol) && (!est || u.estado === est) &&
    (!q || coincide(`${u.nombre} ${u.apellidos} ${u.email} ${u.curso || ''}`, q)));
  const s = estado.stats.usuarios;
  $('#resumen-usuarios').textContent = `${s.alumnos} alumnos y ${s.profesores} profesores · ${s.activos} con membresía activa`;
  const reglas = estado.stats.reglas;

  $('#tabla-usuarios').innerHTML = lista.length ? lista.map((u) => `
    <tr class="hover:bg-tinte/[0.025] transition ${u.estado === 'baja' ? 'opacity-50' : ''}">
      <td class="px-4 py-3"><button class="flex items-center gap-3 text-left" data-ficha-usuario="${u.id}">${avatar(u)}
        <div class="min-w-0"><p class="font-medium hover:text-ios-blue transition">${esc(u.nombre)} ${esc(u.apellidos)}</p><p class="text-xs text-t3 truncate">${esc(u.email)}</p></div></button></td>
      <td class="px-4 py-3">${ROL[u.rol]}<p class="text-xs text-t3 mt-1">${esc(u.curso || '')}</p></td>
      <td class="px-4 py-3">${ESTADO_USUARIO[u.estado]}</td>
      <td class="px-4 py-3 whitespace-nowrap"><span class="tabular-nums"><span class="font-medium">${u.prestamos_activos}</span><span class="text-t3">/${reglas[u.rol].maxPrestamos}</span></span>
        ${u.prestamos_retrasados ? `<span class="ml-1.5">${insignia(`${u.prestamos_retrasados} con retraso`, 'rojo', 'alerta')}</span>` : ''}
        <p class="text-xs text-t3">${plural(u.prestamos_totales, 'préstamo', 'préstamos')} en total</p></td>
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
  formUsuario.password.value = '';
  $('#label-password-usuario').textContent = u ? 'Nueva contraseña (opcional)' : 'Contraseña inicial';
  formUsuario.password.placeholder = u ? 'Déjalo vacío para no cambiarla' : '8+ caracteres, letras y números';
  formUsuario.password.required = !u;
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
  if (!datos.password) delete datos.password;
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

// ════════════════════════════════ VISTAS DEL LECTOR ════════════════════════════════

// Tarjeta de libro tipo Apple Books: portada grande + título
const azulejo = (l, ancho = 'w-32 sm:w-36') => `
  <button class="${ancho} shrink-0 text-left group" data-ficha-libro="${l.id}">
    <div class="transition duration-300 group-hover:-translate-y-1 group-hover:scale-[1.02]">${portada(l, 'w-full aspect-[2/3]')}</div>
    <p class="text-[13px] font-medium mt-2.5 line-clamp-2 leading-snug">${esc(l.titulo)}</p>
    <p class="text-xs text-t3 truncate">${esc(l.autor)}</p>
    <p class="text-[11px] mt-1 flex items-center gap-1 ${l.ejemplares_disponibles > 0 ? 'text-ios-green' : 'text-ios-orange'}">
      <span class="w-1.5 h-1.5 rounded-full ${l.ejemplares_disponibles > 0 ? 'bg-ios-green' : 'bg-ios-orange'}"></span>${l.ejemplares_disponibles > 0 ? 'Disponible' : 'Agotado'}</p>
  </button>`;

// Anillo de progreso: cuánto queda del plazo de préstamo
function anillo(p) {
  const total = Math.max(1, diasEntre(p.fecha_prestamo, p.fecha_limite));
  const quedan = diasHasta(p.fecha_limite);
  const fraccion = Math.min(1, Math.max(0, quedan / total));
  const color = p.estado === 'retrasado' ? 'rgb(var(--rojo))' : quedan <= 3 ? 'rgb(var(--naranja))' : 'rgb(var(--azul))';
  const C = 2 * Math.PI * 22;
  return `<div class="relative w-16 h-16 shrink-0">
    <svg class="anillo w-16 h-16" viewBox="0 0 52 52"><circle cx="26" cy="26" r="22" fill="none" stroke="rgb(var(--tinte) / .08)" stroke-width="5"/>
      <circle cx="26" cy="26" r="22" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - (p.estado === 'retrasado' ? 1 : fraccion))}"/></svg>
    <div class="absolute inset-0 grid place-items-center text-center leading-none">
      <span><b class="text-base font-semibold tabular-nums" style="color:${color}">${p.estado === 'retrasado' ? p.dias_retraso : Math.max(0, quedan)}</b>
      <span class="block text-[9px] text-t3 mt-0.5">${p.estado === 'retrasado' ? 'tarde' : 'días'}</span></span></div>
  </div>`;
}

function pintarInicioLector() {
  const yo = estado.yo;
  const abiertos = yo.prestamos.filter((p) => p.estado !== 'devuelto');
  const retrasados = abiertos.filter((p) => p.estado === 'retrasado');
  const pronto = abiertos.filter((p) => p.estado === 'activo' && diasHasta(p.fecha_limite) <= 3);
  const hora = new Date().getHours();
  const saludo = hora < 14 ? 'Buenos días' : hora < 21 ? 'Buenas tardes' : 'Buenas noches';

  $('#lector-saludo').innerHTML = `
    <div class="flex items-center gap-4">
      ${avatar(yo, 'w-14 h-14 text-lg')}
      <div><p class="text-sm text-t3 first-letter:uppercase fecha-hoy"></p>
      <h1 class="titulo-vista">${saludo}, ${esc(yo.nombre)}</h1>
      <div class="flex gap-2 mt-2 flex-wrap">${ROL[yo.rol]}${yo.curso ? insignia(esc(yo.curso), 'gris') : ''}${yo.estado !== 'activo' ? ESTADO_USUARIO[yo.estado] : ''}</div></div>
    </div>`;

  const avisoCaja = (tono, ic, titulo, texto) => `
    <div class="card p-4 flex gap-3 items-start relative overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-r from-ios-${tono}/[0.12] to-transparent pointer-events-none"></div>
      <span class="relative w-9 h-9 rounded-full bg-ios-${tono}/15 text-ios-${tono} grid place-items-center shrink-0">${icono(ic, 'w-[18px] h-[18px]')}</span>
      <div class="relative"><p class="font-semibold">${titulo}</p><p class="text-sm text-t2 mt-0.5">${texto}</p></div>
    </div>`;
  const avisos = [];
  if (yo.estado === 'suspendido') avisos.push(avisoCaja('red', 'prohibido', 'Tu cuenta está suspendida', 'Pasa por la biblioteca para reactivarla. Mientras tanto no puedes llevarte ni pedir libros.'));
  if (retrasados.length) avisos.push(avisoCaja('red', 'alerta', `Tienes ${plural(retrasados.length, 'libro', 'libros')} con retraso`, `Devuélvelo cuanto antes: ${retrasados.map((p) => `«${esc(p.titulo)}»`).join(', ')}. Hasta entonces no podrás llevarte otro.`));
  if (pronto.length) avisos.push(avisoCaja('orange', 'reloj', 'Se acaba el plazo', `${pronto.map((p) => `«${esc(p.titulo)}» vence ${diasHasta(p.fecha_limite) === 0 ? 'hoy' : `el ${fmtFecha(p.fecha_limite, { weekday: 'long', day: 'numeric' })}`}`).join(' · ')}. Puedes renovarlo desde aquí.`));
  $('#lector-avisos').innerHTML = avisos.join('');

  $('#lector-cupo').textContent = `${abiertos.length} de ${yo.reglas.maxPrestamos} libros`;
  $('#lector-leyendo').innerHTML = abiertos.length ? abiertos.map((p) => {
    const libro = estado.libros.find((l) => l.id === p.libro_id) || p;
    const noRenovable = p.estado === 'retrasado' || p.renovaciones >= yo.reglas.maxRenovaciones;
    return `<article class="card p-4 relative overflow-hidden">
      ${fondoPortada(libro, 'opacity-25')}
      <div class="relative flex gap-4">
        <button data-ficha-libro="${p.libro_id}" class="shrink-0 transition hover:scale-[1.03]">${portada(libro, 'w-24 h-36')}</button>
        <div class="flex-1 min-w-0 flex flex-col">
          <h3 class="font-semibold tracking-tight leading-snug line-clamp-2">${esc(p.titulo)}</h3>
          <p class="text-[13px] text-t3 truncate">${esc(p.autor)}</p>
          <p class="text-[11px] text-t3 mt-0.5">Lo cogiste el ${p.prestado_en ? fmtFechaHora(p.prestado_en, { day: 'numeric', month: 'long' }) : fmtFecha(p.fecha_prestamo)}</p>
          <div class="flex items-center gap-3 mt-3">${anillo(p)}
            <div class="text-xs text-t3 leading-relaxed">Devolver antes del<br><b class="text-t1 font-medium text-[13px]">${fmtFecha(p.fecha_limite, { weekday: 'short', day: 'numeric', month: 'long' })}</b></div></div>
          <div class="mt-auto pt-3 flex items-center gap-2">
            <button class="btn-renovar btn-mini" data-id="${p.id}" ${noRenovable ? 'disabled' : ''}>${icono('renovar', 'w-3.5 h-3.5')}Renovar</button>
            <span class="text-[11px] text-t3">${p.renovaciones}/${yo.reglas.maxRenovaciones} renovaciones</span>
          </div>
        </div>
      </div>
    </article>`;
  }).join('') : `<div class="md:col-span-2 xl:col-span-3 card p-8 text-center">
      ${icono('libroAbierto', 'w-8 h-8 mx-auto text-t4 mb-3')}
      <p class="font-medium">No tienes ningún libro ahora mismo</p>
      <p class="text-sm text-t3 mt-1 mb-4">Explora el catálogo y pide el próximo.</p>
      <button class="btn-azul" data-ir="explorar">${icono('brujula', 'w-4 h-4')}Explorar</button></div>`;

  const sol = yo.solicitudes;
  $('#lector-peticiones-caja').innerHTML = sol.length ? `
    <h2 class="text-xl font-semibold tracking-tight mb-4">Mis peticiones</h2>
    <div class="card divide-y divide-tinte/[0.06]">${sol.map((s) => {
      const libro = estado.libros.find((l) => l.id === s.libro_id) || s;
      let estadoTxt;
      if (s.estado === 'pendiente') {
        estadoTxt = s.ejemplares_disponibles > 0 && s.posicion === 0
          ? insignia('Lista para recoger en el mostrador', 'verde', 'checkCirculo')
          : insignia(s.posicion > 0 ? `En cola · ${s.posicion} ${s.posicion === 1 ? 'persona' : 'personas'} delante` : 'Esperando a que vuelva un ejemplar', 'azul', 'cola');
      } else if (s.estado === 'atendida') estadoTxt = insignia('Prestado', 'verde', 'check');
      else if (s.estado === 'rechazada') estadoTxt = insignia('Rechazada', 'rojo', 'cerrar');
      else estadoTxt = insignia('Cancelada', 'gris');
      return `<div class="p-4 flex items-center gap-4">
        <button data-ficha-libro="${s.libro_id}">${portada(libro, 'w-10 h-14')}</button>
        <div class="flex-1 min-w-0"><p class="font-medium truncate">${esc(s.titulo)}</p>
          <p class="text-xs text-t3 mb-1.5">Pedido ${haceCuanto(s.creada_en)} · ${fmtFechaHora(s.creada_en)}${s.motivo && s.estado !== 'pendiente' ? ` · ${esc(s.motivo)}` : ''}</p>${estadoTxt}</div>
        ${s.estado === 'pendiente' ? `<button class="btn-cancelar-peticion btn-mini" data-id="${s.id}">Cancelar</button>` : ''}
      </div>`;
    }).join('')}</div>` : '';

  $('#lector-recomendados').innerHTML = yo.recomendados.map((l) => azulejo(l)).join('') || '<p class="text-sm text-t3">Pronto habrá recomendaciones para ti.</p>';
  $$('.fecha-hoy', $('#lector-saludo')).forEach((e) => { e.textContent = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }); });
}

// ── Explorar: estanterías por categoría, estilo Apple Books ──
$('#buscar-explorar').addEventListener('input', () => pintarExplorar());
document.addEventListener('click', (e) => {
  const c = e.target.closest('.chip-explorar');
  if (c) { estado.categoriaExplorar = c.dataset.cat; pintarExplorar(); }
});

function pintarExplorar() {
  const q = $('#buscar-explorar').value;
  const cats = categoriasDe(estado.libros);
  const cat = estado.categoriaExplorar;
  $('#chips-explorar').innerHTML = chip('', 'Todo', !cat, 'chip-explorar') + cats.map((c) => chip(c, c, cat === c, 'chip-explorar')).join('');

  if (q || cat) {
    const lista = estado.libros.filter((l) => (!cat || l.categoria === cat) && (!q || coincide(`${l.titulo} ${l.autor} ${l.categoria || ''} ${l.editorial || ''}`, q)));
    $('#explorar-destacado').innerHTML = '';
    $('#explorar-estantes').innerHTML = lista.length
      ? `<p class="text-sm text-t3 mb-4">${plural(lista.length, 'resultado', 'resultados')}</p>
         <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8">${lista.map((l) => azulejo(l, 'w-full')).join('')}</div>`
      : `<div class="card py-16 text-center text-t3">${icono('buscar', 'w-6 h-6 mx-auto mb-3 text-t4')}No hay libros que coincidan con tu búsqueda</div>`;
    return;
  }

  // Destacado: el libro disponible más leído (con portada)
  const destacado = [...estado.libros].filter((l) => l.portada && l.ejemplares_disponibles > 0).sort((a, b) => b.veces_prestado - a.veces_prestado)[0];
  $('#explorar-destacado').innerHTML = destacado ? `
    <div class="card relative overflow-hidden p-6 sm:p-8">
      ${fondoPortada(destacado, 'opacity-50')}
      <div class="absolute inset-0 bg-gradient-to-r from-fondo/70 via-fondo/30 to-transparent"></div>
      <div class="relative flex flex-col sm:flex-row gap-6 sm:items-end">
        <button data-ficha-libro="${destacado.id}" class="shrink-0 self-start transition hover:scale-[1.02]">${portada({ ...destacado, portada: portadaGrandeUrl(destacado.portada) }, 'w-36 h-52 sm:w-40 sm:h-60')}</button>
        <div class="max-w-md">
          <p class="etiqueta text-ios-blue">El más leído del centro</p>
          <h2 class="text-3xl sm:text-4xl font-semibold tracking-[-0.03em] leading-tight">${esc(destacado.titulo)}</h2>
          <p class="text-t2 mt-1">${esc(destacado.autor)}${destacado.anio ? ` · ${destacado.anio}` : ''}</p>
          <p class="text-sm text-t3 mt-3">${plural(destacado.veces_prestado, 'préstamo', 'préstamos')} este curso · ${destacado.ejemplares_disponibles} ${destacado.ejemplares_disponibles === 1 ? 'ejemplar disponible' : 'ejemplares disponibles'}</p>
          <button class="btn-primario mt-5" data-ficha-libro="${destacado.id}">Ver libro${icono('chevron', 'w-4 h-4')}</button>
        </div>
      </div>
    </div>` : '';

  $('#explorar-estantes').innerHTML = cats.map((c) => {
    const libros = estado.libros.filter((l) => l.categoria === c).sort((a, b) => (b.portada ? 1 : 0) - (a.portada ? 1 : 0));
    return `<section>
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold tracking-tight">${esc(c)}</h2>
        <button class="chip-explorar text-[13px] text-t3 hover:text-t1 inline-flex items-center gap-1" data-cat="${esc(c)}">Ver todo${icono('chevron', 'w-3.5 h-3.5')}</button>
      </div>
      <div class="flex gap-4 overflow-x-auto sin-scroll -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 pb-2">${libros.map((l) => azulejo(l)).join('')}</div>
    </section>`;
  }).join('');
}

// ── Historial del lector ──
function pintarHistorial() {
  const yo = estado.yo;
  const devueltos = yo.prestamos.filter((p) => p.estado === 'devuelto');
  const aTiempo = devueltos.filter((p) => !p.dias_retraso).length;
  const pct = devueltos.length ? Math.round((aTiempo / devueltos.length) * 100) : 100;
  $('#historial-resumen').textContent = `${plural(yo.prestamos.length, 'préstamo', 'préstamos')} desde que estás en Scriptorium`;
  const dato = (valor, texto, color) => `<div class="card p-4 sm:p-5"><p class="text-[28px] font-semibold tracking-tight tabular-nums ${color}">${valor}</p><p class="text-xs sm:text-sm text-t3 mt-1">${texto}</p></div>`;
  $('#historial-stats').innerHTML = [
    dato(devueltos.length, 'Libros leídos', ''),
    dato(`${pct}%`, 'Devueltos a tiempo', pct >= 80 ? 'text-ios-green' : 'text-ios-orange'),
    dato(new Set(yo.prestamos.map((p) => p.categoria).filter(Boolean)).size, 'Géneros explorados', ''),
  ].join('');
  $('#historial-lista').innerHTML = yo.prestamos.length ? yo.prestamos.map((p) => {
    const libro = estado.libros.find((l) => l.id === p.libro_id) || p;
    return `<div class="p-4 flex items-center gap-4">
      <button data-ficha-libro="${p.libro_id}">${portada(libro, 'w-10 h-14')}</button>
      <div class="flex-1 min-w-0"><p class="font-medium truncate">${esc(p.titulo)}</p>
        <p class="text-xs text-t3">${esc(p.autor)}</p>
        <p class="text-xs text-t3">${p.prestado_en ? fmtFechaHora(p.prestado_en) : fmtFecha(p.fecha_prestamo)} — ${p.devuelto_en ? fmtFechaHora(p.devuelto_en) : p.fecha_devolucion ? fmtFecha(p.fecha_devolucion) : 'ahora'}</p></div>
      ${ESTADO_PRESTAMO[p.estado](p)}
    </div>`;
  }).join('') : `<p class="p-10 text-center text-t3">Aún no has leído nada con nosotros</p>`;
  $('#historial-actividad').innerHTML = lineaTiempo(yo.movimientos, false) || '<p class="p-8 text-center text-t3 text-sm">Sin actividad todavía</p>';
}

document.addEventListener('click', async (e) => {
  const pedir = e.target.closest('.btn-pedir');
  const cancelar = e.target.closest('.btn-cancelar-peticion');
  if (!pedir && !cancelar) return;
  const btn = pedir || cancelar;
  btn.disabled = true;
  try {
    if (pedir) {
      const s = await api('POST', '/api/yo/solicitudes', { libro_id: Number(btn.dataset.libro) });
      toast(s.ejemplares_disponibles > 0 ? `Pedido «${s.titulo}». Pásalo a recoger por el mostrador.` : `Te has apuntado a la lista de espera de «${s.titulo}»`);
    } else {
      await api('DELETE', `/api/yo/solicitudes/${btn.dataset.id}`);
      toast('Petición cancelada', 'info');
    }
    if ($('#modal-ficha').open) $('#modal-ficha').close();
    await cargarTodo();
  } catch (err) {
    toast(err.message, 'error');
    btn.disabled = false;
  }
});

// ════════════════════════════════ FICHAS (modal) ════════════════════════════════
function cabeceraFicha(libro, contenido) {
  return `<div class="relative overflow-hidden px-6 pt-6 pb-6 sm:px-8 sm:pt-8">
    ${fondoPortada(libro)}
    <div class="absolute inset-0 bg-gradient-to-b from-transparent via-modal/40 to-modal"></div>
    <button type="button" class="cerrar-ficha btn-icono absolute top-4 right-4 z-10 bg-modal/60" aria-label="Cerrar">${icono('cerrar', 'w-4 h-4')}</button>
    <div class="relative flex flex-col sm:flex-row gap-6 sm:items-end">${contenido}</div>
  </div>`;
}

const tablaHistorial = (prestamos) => (prestamos.length ? `
  <div class="contenedor-tabla overflow-auto max-h-72 scroll-fino rounded-2xl ring-1 ring-inset ring-tinte/[0.08]"><table class="tabla-adaptable w-full text-sm">
    <thead class="sticky top-0 bg-modal"><tr><th class="th">Lector</th><th class="th">Prestado</th><th class="th">Devolución</th><th class="th">Estado</th><th class="th"></th></tr></thead>
    <tbody class="divide-y divide-tinte/[0.05]">${prestamos.map((p) => `<tr>
      <td class="px-4 py-2.5">${esc(p.usuario)}</td>
      <td class="px-4 py-2.5 whitespace-nowrap text-t3 tabular-nums">${p.prestado_en ? fmtFechaHora(p.prestado_en) : fmtFecha(p.fecha_prestamo)}</td>
      <td class="px-4 py-2.5 whitespace-nowrap text-t3 tabular-nums">${p.devuelto_en ? `Devuelto ${fmtFechaHora(p.devuelto_en)}` : `Límite ${fmtFecha(p.fecha_limite)}`}</td>
      <td class="px-4 py-2.5">${ESTADO_PRESTAMO[p.estado](p)}</td>
      <td class="px-4 py-2.5 text-right">${p.estado !== 'devuelto' ? `<button class="btn-devolver btn-verde" data-id="${p.id}">${icono('devolver', 'w-3.5 h-3.5')}Devolver</button>` : ''}</td>
    </tr>`).join('')}</tbody></table></div>` : '<p class="text-sm text-t3 py-8 text-center">Sin préstamos todavía</p>');

async function fichaLibro(id) {
  try {
    const l = await api('GET', `/api/libros/${id}`);
    const admin = estado.sesion.rol === 'admin';
    const datos = [l.editorial, l.anio, l.categoria].filter(Boolean).map(esc).join(' · ');
    const cabecera = cabeceraFicha(l, `
      <div class="shrink-0">${portada({ ...l, portada: portadaGrandeUrl(l.portada) }, 'w-32 h-48 sm:w-36 sm:h-[216px]')}</div>
      <div class="min-w-0">
        ${l.categoria ? `<p class="etiqueta">${esc(l.categoria)}</p>` : ''}
        <h2 class="text-2xl sm:text-3xl font-semibold tracking-[-0.02em] leading-tight">${esc(l.titulo)}</h2>
        <p class="text-t2 mt-1">${esc(l.autor)}</p>
        <p class="text-xs text-t3 mt-2">${datos}</p>
        <p class="text-xs font-mono text-t4 mt-1">ISBN ${esc(formatearIsbn(l.isbn))}</p>
        <div class="flex gap-2 mt-3 flex-wrap">${insignia(l.ejemplares_disponibles ? `${l.ejemplares_disponibles} de ${l.ejemplares_totales} disponibles` : 'Agotado', l.ejemplares_disponibles ? 'verde' : 'naranja')}
          ${insignia(`${plural(l.veces_prestado, 'préstamo', 'préstamos')}`, 'gris')}${l.en_espera ? insignia(`${l.en_espera} en lista de espera`, 'azul', 'cola') : ''}</div>
      </div>`);

    let cuerpo;
    if (admin) {
      cuerpo = `<div class="flex justify-between items-center mb-3"><h3 class="titulo-seccion">${icono('reloj', 'w-4 h-4 text-t3')}Historial de préstamos</h3>
        <div class="flex gap-2"><button class="btn-cristal py-1.5" data-editar-libro="${l.id}">${icono('lapiz', 'w-4 h-4')}Editar</button>
        <button class="btn-primario py-1.5" data-prestar-libro="${l.id}" ${l.ejemplares_disponibles ? '' : 'disabled'}>${icono('intercambio', 'w-4 h-4')}Prestar</button></div></div>
        ${tablaHistorial(l.prestamos)}`;
    } else {
      const yo = estado.yo;
      const loTiene = yo.prestamos.find((p) => p.libro_id === l.id && p.estado !== 'devuelto');
      const peticion = yo.solicitudes.find((s) => s.libro_id === l.id && s.estado === 'pendiente');
      let accion;
      if (loTiene) accion = `<button class="btn-cristal w-full sm:w-auto" disabled>${icono('libroAbierto', 'w-4 h-4')}Lo tienes en préstamo hasta el ${fmtFecha(loTiene.fecha_limite)}</button>`;
      else if (peticion) accion = `<button class="btn-cancelar-peticion btn-cristal w-full sm:w-auto" data-id="${peticion.id}">${icono('cerrar', 'w-4 h-4')}Cancelar mi petición</button>`;
      else if (yo.estado !== 'activo') accion = `<button class="btn-cristal w-full sm:w-auto" disabled>${icono('prohibido', 'w-4 h-4')}Tu cuenta está ${esc(yo.estado)}</button>`;
      else if (l.ejemplares_disponibles > 0) accion = `<button class="btn-pedir btn-azul w-full sm:w-auto py-2.5 px-6" data-libro="${l.id}">${icono('marcador', 'w-4 h-4')}Pedir este libro</button>`;
      else accion = `<button class="btn-pedir btn-cristal w-full sm:w-auto py-2.5 px-6" data-libro="${l.id}">${icono('cola', 'w-4 h-4')}Apuntarme a la lista de espera</button>`;
      cuerpo = `<div class="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <p class="text-sm text-t3 max-w-sm">${l.ejemplares_disponibles > 0
          ? 'Pídelo y lo tendrás apartado en el mostrador. El plazo empieza cuando lo recojas.'
          : 'Ahora no queda ningún ejemplar. Apúntate y serás el siguiente cuando lo devuelvan.'}</p>
        ${accion}</div>`;
    }
    $('#ficha-contenido').innerHTML = `${cabecera}<div class="px-6 pb-6 sm:px-8 sm:pb-8 max-h-[50vh] overflow-y-auto scroll-fino">${cuerpo}</div>`;
    $('#modal-ficha').showModal();
  } catch (err) { toast(err.message, 'error'); }
}

async function fichaUsuario(id) {
  try {
    const u = await api('GET', `/api/usuarios/${id}`);
    const filas = u.prestamos.map((p) => {
      const libro = estado.libros.find((l) => l.id === p.libro_id) || p;
      return `<div class="py-3 flex items-center gap-3">
        <button data-ficha-libro="${p.libro_id}">${portada(libro, 'w-8 h-11')}</button>
        <div class="flex-1 min-w-0"><p class="font-medium truncate">${esc(p.titulo)}</p>
          <p class="text-xs text-t3">${p.prestado_en ? fmtFechaHora(p.prestado_en) : fmtFecha(p.fecha_prestamo)} — ${p.devuelto_en ? fmtFechaHora(p.devuelto_en) : p.fecha_devolucion ? fmtFecha(p.fecha_devolucion) : `límite ${fmtFecha(p.fecha_limite)}`}</p></div>
        ${ESTADO_PRESTAMO[p.estado](p)}
        ${p.estado !== 'devuelto' ? `<button class="btn-devolver btn-verde" data-id="${p.id}">${icono('devolver', 'w-3.5 h-3.5')}Devolver</button>` : ''}
      </div>`;
    }).join('');
    $('#ficha-contenido').innerHTML = `
      <div class="relative p-6 sm:p-8 pb-4">
        <button type="button" class="cerrar-ficha btn-icono absolute top-4 right-4" aria-label="Cerrar">${icono('cerrar', 'w-4 h-4')}</button>
        <div class="flex gap-4 items-center">${avatar(u, 'w-16 h-16 text-xl')}<div class="min-w-0">
          <h2 class="text-2xl font-semibold tracking-tight">${esc(u.nombre)} ${esc(u.apellidos)}</h2>
          <p class="text-t3 text-sm">${esc(u.email)}</p>
          <div class="flex gap-2 mt-2 flex-wrap">${ROL[u.rol]} ${ESTADO_USUARIO[u.estado]} ${u.curso ? insignia(esc(u.curso), 'gris') : ''}</div></div></div>
        <div class="flex justify-between items-center mt-6">
          <p class="text-sm text-t3">${u.prestamos_activos}/${u.reglas.maxPrestamos} libros en préstamo · plazo de ${u.reglas.diasPrestamo} días</p>
          <button class="btn-primario py-1.5" data-prestar-usuario="${u.id}" ${u.estado === 'activo' ? '' : 'disabled'}>${icono('intercambio', 'w-4 h-4')}Nuevo préstamo</button></div>
      </div>
      <div class="px-6 sm:px-8 pb-6 max-h-[50vh] overflow-y-auto scroll-fino divide-y divide-tinte/[0.06]">${filas || '<p class="text-sm text-t3 py-8 text-center">Sin préstamos todavía</p>'}</div>`;
    $('#modal-ficha').showModal();
  } catch (err) { toast(err.message, 'error'); }
}

document.addEventListener('click', (e) => {
  const fl = e.target.closest('[data-ficha-libro]');
  if (fl && !e.target.closest('.btn-pedir, .btn-cancelar-peticion')) { fichaLibro(Number(fl.dataset.fichaLibro)); return; }
  const fu = e.target.closest('[data-ficha-usuario]');
  if (fu) fichaUsuario(Number(fu.dataset.fichaUsuario));
  if (e.target.closest('.cerrar-ficha')) $('#modal-ficha').close();
  const ed = e.target.closest('#modal-ficha [data-editar-libro]');
  if (ed) $('#modal-ficha').close();
});

// Cerrar modales: botón cerrar, «Cancelar» o clic fuera
$$('dialog').forEach((d) => {
  $$('.cerrar', d).forEach((b) => b.addEventListener('click', () => d.close()));
  d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
});

// ════════════════════════════════ MOVIMIENTOS Y ACTIVIDAD ════════════════════════════════
const TIPOS_MOVIMIENTO = {
  prestamo: ['intercambio', 'azul', 'Préstamo'],
  devolucion: ['devolver', 'verde', 'Devolución'],
  renovacion: ['renovar', 'morado', 'Renovación'],
  solicitud: ['marcador', 'celeste', 'Petición'],
  solicitud_atendida: ['check', 'verde', 'Petición atendida'],
  solicitud_rechazada: ['cerrar', 'rojo', 'Petición rechazada'],
  solicitud_cancelada: ['cerrar', 'gris', 'Petición cancelada'],
  libro_alta: ['mas', 'azul', 'Alta de libro'],
  libro_edicion: ['lapiz', 'gris', 'Libro editado'],
  libro_baja: ['papelera', 'rojo', 'Baja de libro'],
  lector_alta: ['usuarioMas', 'morado', 'Alta de lector'],
  lector_edicion: ['lapiz', 'gris', 'Lector editado'],
  lector_baja: ['archivo', 'rojo', 'Baja de lector'],
  registro: ['usuarioMas', 'verde', 'Nueva cuenta'],
};

function filaMovimiento(m, compacta = false) {
  const [ic, tono] = TIPOS_MOVIMIENTO[m.tipo] || ['info', 'gris'];
  const libro = m.libro_id ? (estado.libros.find((l) => l.id === m.libro_id) || { titulo: m.titulo, portada: m.portada }) : null;
  return `<li class="flex items-center gap-3 py-2.5 ${compacta ? 'border-b border-tinte/[0.05] last:border-0' : ''}">
    <span class="w-12 shrink-0 text-right text-xs tabular-nums text-t3">${compacta ? fmtFecha(m.creado_en) : ''}<b class="block text-t1 font-medium text-[13px]">${fmtHora(m.creado_en)}</b></span>
    <span class="w-8 h-8 shrink-0 rounded-full grid place-items-center ring-1 ring-inset ${TONOS[tono]}">${icono(ic, 'w-4 h-4')}</span>
    <div class="flex-1 min-w-0">
      <p class="text-sm leading-snug">${esc(m.detalle)}</p>
      <p class="text-[11px] text-t3 mt-0.5">${esc((TIPOS_MOVIMIENTO[m.tipo] || [])[2] || m.tipo)}${m.actor ? ` · por ${esc(m.actor)}` : ''}</p>
    </div>
    ${libro?.titulo ? `<button class="shrink-0" data-ficha-libro="${m.libro_id}" aria-label="Ver libro">${portada(libro, 'w-7 h-10')}</button>` : ''}
  </li>`;
}

// Agrupa por día: "Hoy", "Ayer", "lunes, 3 de noviembre"
function lineaTiempo(movimientos, conTarjeta = true) {
  if (!movimientos.length) return '';
  const grupos = new Map();
  for (const m of movimientos) {
    const dia = m.creado_en.slice(0, 10);
    if (!grupos.has(dia)) grupos.set(dia, []);
    grupos.get(dia).push(m);
  }
  const titulo = (dia) => {
    const d = diasEntre(dia, hoyISO());
    if (d === 0) return 'Hoy';
    if (d === 1) return 'Ayer';
    return new Date(`${dia}T00:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  };
  return [...grupos].map(([dia, lista]) => `
    <section>
      <h3 class="etiqueta first-letter:uppercase px-1 ${conTarjeta ? 'mb-2' : 'mt-3 mb-1'}">${titulo(dia)} <span class="normal-case tracking-normal text-t4">· ${plural(lista.length, 'movimiento', 'movimientos')}</span></h3>
      <ul class="${conTarjeta ? 'card px-4 py-1 divide-y divide-tinte/[0.05]' : 'divide-y divide-tinte/[0.05] px-2'}">${lista.map((m) => filaMovimiento(m)).join('')}</ul>
    </section>`).join('');
}

function pintarActividad() {
  const q = $('#buscar-actividad').value;
  const grupos = {
    prestamos: ['prestamo', 'renovacion'], devoluciones: ['devolucion'],
    peticiones: ['solicitud', 'solicitud_atendida', 'solicitud_rechazada', 'solicitud_cancelada'],
    catalogo: ['libro_alta', 'libro_edicion', 'libro_baja'], lectores: ['lector_alta', 'lector_edicion', 'lector_baja', 'registro'],
  };
  const lista = estado.movimientos.filter((m) =>
    (!estado.grupoActividad || grupos[estado.grupoActividad].includes(m.tipo)) &&
    (!q || coincide(`${m.detalle} ${m.actor || ''}`, q)));
  $('#linea-tiempo').innerHTML = lineaTiempo(lista)
    || `<div class="card py-16 text-center text-t3">${icono('historial', 'w-6 h-6 mx-auto mb-3 text-t4')}No hay movimientos que coincidan</div>`;
}
$('#buscar-actividad').addEventListener('input', pintarActividad);
$$('#filtro-actividad .seg').forEach((b) => b.addEventListener('click', () => {
  estado.grupoActividad = b.dataset.grupo;
  $$('#filtro-actividad .seg').forEach((x) => x.classList.toggle('activa', x === b));
  pintarActividad();
}));

// ════════════════════════════════ MI PERFIL ════════════════════════════════
function pintarPerfil() {
  const p = estado.perfil;
  const admin = estado.sesion.rol === 'admin';
  $('#perfil-foto').innerHTML = avatar({ ...p, rol: admin ? 'admin' : p.rol }, 'w-24 h-24 text-3xl');
  $('#perfil-nombre').textContent = `${p.nombre} ${p.apellidos || ''}`.trim();
  $('#perfil-email').textContent = `${p.email} · ${admin ? 'Personal de biblioteca' : p.rol === 'profesor' ? 'Profesor' : 'Alumno'}`;
  $('#perfil-quitar-foto').classList.toggle('hidden', !p.foto);
  const f = $('#form-perfil');
  f.nombre.value = p.nombre;
  f.apellidos.value = p.apellidos || '';
  f.curso.value = p.curso || '';
  $('#perfil-curso-caja').classList.toggle('hidden', admin);
  $('#perfil-label-curso').textContent = p.rol === 'profesor' ? 'Departamento' : 'Curso';
}
document.addEventListener('click', (e) => {
  if (!e.target.closest('.btn-perfil')) return;
  pintarPerfil();
  $('#form-password').reset();
  $('#modal-perfil').showModal();
});

async function perfilActualizado(p, mensaje) {
  estado.perfil = p;
  pintarPerfil();
  pintarSesion();
  if (mensaje) toast(mensaje);
  await cargarTodo().catch(() => {});
}

$('#form-perfil').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const p = await api('PUT', '/api/perfil', Object.fromEntries(new FormData(e.target)));
    estado.sesion.nombre = `${p.nombre} ${p.apellidos || ''}`.trim();
    guardar('scriptorium.sesion', JSON.stringify(estado.sesion));
    await perfilActualizado(p, 'Perfil actualizado');
  } catch (err) { toast(err.message, 'error'); }
});

$('#form-password').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('POST', '/api/perfil/password', Object.fromEntries(new FormData(e.target)));
    e.target.reset();
    toast('Contraseña actualizada');
  } catch (err) { toast(err.message, 'error'); }
});

// Foto de perfil: se recorta cuadrada y se reduce en el navegador antes de subirla (pocos KB)
async function prepararFoto(archivo) {
  if (!archivo.type.startsWith('image/')) throw new Error('Elige un archivo de imagen');
  if (archivo.size > 15 * 1024 * 1024) throw new Error('La imagen es demasiado grande');
  const bitmap = await createImageBitmap(archivo);
  const lado = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  canvas.getContext('2d').drawImage(bitmap, (bitmap.width - lado) / 2, (bitmap.height - lado) / 2, lado, lado, 0, 0, 512, 512);
  return canvas.toDataURL('image/jpeg', 0.85);
}
async function subirFoto(archivo) {
  if (!archivo) return;
  try {
    $('#perfil-foto').innerHTML = `<div class="w-24 h-24 rounded-full grid place-items-center bg-tinte/10">${icono('cargando', 'w-6 h-6 animate-spin text-t3')}</div>`;
    const imagen = await prepararFoto(archivo);
    await perfilActualizado(await api('POST', '/api/perfil/foto', { imagen }), 'Foto de perfil actualizada');
  } catch (err) {
    toast(err.message, 'error');
    pintarPerfil();
  }
}
['#perfil-archivo', '.perfil-archivo-alt'].forEach((sel) => $(sel).addEventListener('change', (e) => { subirFoto(e.target.files[0]); e.target.value = ''; }));
$('#perfil-quitar-foto').addEventListener('click', async () => {
  try { await perfilActualizado(await api('DELETE', '/api/perfil/foto'), 'Foto eliminada'); } catch (err) { toast(err.message, 'error'); }
});

// ───────────────────────── Tiempo real (SSE) ─────────────────────────
let fuenteEventos = null;
function conectarTiempoReal() {
  if (fuenteEventos) return;
  const pastilla = $('#estado-conexion');
  const punto = $('.punto', pastilla);
  const texto = $('.texto', pastilla);
  fuenteEventos = new EventSource('/api/eventos');
  let pendiente = null;
  fuenteEventos.onopen = () => {
    punto.className = 'punto w-1.5 h-1.5 rounded-full bg-ios-green shadow-[0_0_8px_rgb(var(--verde))] animate-pulse';
    texto.textContent = 'En vivo';
  };
  fuenteEventos.onerror = () => { punto.className = 'punto w-1.5 h-1.5 rounded-full bg-ios-orange'; texto.textContent = 'Reconectando'; };
  fuenteEventos.onmessage = () => {
    if (!estado.sesion) return;
    clearTimeout(pendiente);
    pendiente = setTimeout(() => cargarTodo().catch(() => {}), 150);
  };
}

// Atajo: «/» para buscar en la vista actual
document.addEventListener('keydown', (e) => {
  if (e.key !== '/' || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) || $('dialog[open]')) return;
  const campo = { prestamos: '#buscar-prestamos', libros: '#buscar-libros', usuarios: '#buscar-usuarios', explorar: '#buscar-explorar', actividad: '#buscar-actividad' }[estado.vista];
  if (campo) { e.preventDefault(); $(campo).focus(); }
});

// ───────────────────────── Inicio ─────────────────────────
(async function iniciar() {
  hidratarIconos();
  pintarBotonesTema();
  $('#ayuda-isbn').textContent = AYUDA_ISBN;
  try { estado.sesion = JSON.parse(leer('scriptorium.sesion') || 'null'); } catch { estado.sesion = null; }
  if (!estado.sesion) return mostrarAcceso();
  try {
    await api('GET', '/api/sesion');
    await arrancarApp();
  } catch {
    estado.sesion = null;
    guardar('scriptorium.sesion', null);
    mostrarAcceso();
  }
})();
