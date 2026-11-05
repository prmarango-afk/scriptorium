// Optimización de portadas: cualquier imagen se convierte a WebP en dos tamaños.
//   <isbn>.webp    360 px de ancho  (fichas, estanterías, muro de la pantalla de acceso)
//   <isbn>-s.webp  160 px de ancho  (miniaturas en listas y tablas)
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const TAMANOS = [
  { sufijo: '', ancho: 360, calidad: 72 },
  { sufijo: '-s', ancho: 160, calidad: 64 },
];

async function optimizarPortada(entrada, carpeta, nombre) {
  fs.mkdirSync(carpeta, { recursive: true });
  const imagen = sharp(entrada).rotate();
  const meta = await imagen.metadata();
  if (!meta.width || meta.width < 40) throw new Error('Imagen demasiado pequeña o vacía');
  for (const t of TAMANOS) {
    await imagen.clone()
      .resize({ width: t.ancho, height: Math.round(t.ancho * 1.5), fit: 'cover', position: 'attention', withoutEnlargement: true })
      .webp({ quality: t.calidad, effort: 6, smartSubsample: true })
      .toFile(path.join(carpeta, `${nombre}${t.sufijo}.webp`));
  }
}

// Descarga una portada externa y la guarda optimizada. Devuelve la ruta pública o null si falla.
async function guardarPortadaRemota(url, carpeta, nombre) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'Scriptorium/1.0' } });
    if (!r.ok || !/^image\//.test(r.headers.get('content-type') || '')) return null;
    const datos = Buffer.from(await r.arrayBuffer());
    if (datos.length > 8 * 1024 * 1024) return null;
    await optimizarPortada(datos, carpeta, nombre);
    return `/portadas/${nombre}.webp`;
  } catch {
    return null;
  }
}

module.exports = { optimizarPortada, guardarPortadaRemota };
