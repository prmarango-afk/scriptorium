// Descarga las portadas de los libros de demostración y las deja optimizadas en public/portadas.
// Uso: npm run portadas
const fs = require('node:fs');
const path = require('node:path');
const { LIBROS, urlPortadaOriginal } = require('../seed');
const { guardarPortadaRemota } = require('../portadas');

const CARPETA = path.join(__dirname, '..', 'public', 'portadas');

(async () => {
  for (const libro of LIBROS) {
    const isbn = libro[0];
    if (fs.existsSync(path.join(CARPETA, `${isbn}.webp`))) continue;
    const ruta = await guardarPortadaRemota(urlPortadaOriginal(libro), CARPETA, isbn);
    console.log(ruta ? 'OK   ' : 'FALLO', isbn, libro[1]);
    await new Promise((r) => setTimeout(r, 400));
  }
  const archivos = fs.readdirSync(CARPETA);
  const total = archivos.reduce((suma, f) => suma + fs.statSync(path.join(CARPETA, f)).size, 0);
  console.log(`\n${archivos.length} archivos · ${(total / 1024).toFixed(0)} KB en total`);
})();
