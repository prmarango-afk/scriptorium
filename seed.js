// Datos de demostración: se cargan solo si la base de datos está vacía.
const { transaccion } = require('./db');
const { hashPassword } = require('./auth');

// Contraseña de todas las cuentas de la demo (se puede cambiar con la variable DEMO_PASSWORD)
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'scriptorium1';
const PERSONAL = [
  // nombre, apellidos, email
  [process.env.ADMIN_NOMBRE || 'Pilar', 'Navarro (Biblioteca)', process.env.ADMIN_EMAIL || 'biblioteca@colegio.es'],
];

// Cada libro es una edición española real: el ISBN y la portada son de la misma edición (Open Library).
// Las portadas se descargan y optimizan a WebP con `npm run portadas` y se sirven desde /portadas.
// fuente: id de portada de Open Library, o 'isbn' para buscarla por el ISBN.
const LIBROS = [
  // isbn, titulo, autor, editorial, anio, categoria, ejemplares, fuente
  ['9788423901500', 'Don Quijote de la Mancha', 'Miguel de Cervantes', 'Espasa Calpe (Austral)', 1999, 'Clásicos', 4, 7260092],
  ['9788497592208', 'Cien años de soledad', 'Gabriel García Márquez', 'Debolsillo', 2003, 'Novela', 3, 'isbn'],
  ['9788478884452', 'Harry Potter y la piedra filosofal', 'J. K. Rowling', 'Salamandra', 1999, 'Fantasía', 5, 'isbn'],
  ['9788445000656', 'El Hobbit', 'J. R. R. Tolkien', 'Minotauro', 2012, 'Fantasía', 3, 'isbn'],
  ['9788408163435', 'La sombra del viento', 'Carlos Ruiz Zafón', 'Planeta', 2016, 'Novela', 2, 15156378],
  ['9788498381498', 'El Principito', 'Antoine de Saint-Exupéry', 'Salamandra', 2008, 'Infantil', 6, 'isbn'],
  ['9788499890944', '1984', 'George Orwell', 'Debolsillo', 2013, 'Ciencia ficción', 3, 'isbn'],
  ['9788427202122', 'Los juegos del hambre', 'Suzanne Collins', 'Molino', 2012, 'Juvenil', 4, 'isbn'],
  ['9788423648993', 'Marina', 'Carlos Ruiz Zafón', 'Edebé', 2003, 'Juvenil', 3, 10107517],
  ['9788466353489', 'La casa de los espíritus', 'Isabel Allende', 'Debolsillo', 2021, 'Novela', 2, 12726378],
  ['9788437605609', 'Bodas de sangre', 'Federico García Lorca', 'Cátedra', 2005, 'Teatro', 5, 1047476],
  ['9788415594024', 'Wonder. La lección de August', 'R. J. Palacio', 'Nube de Tinta', 2012, 'Juvenil', 4, 7371891],
  ['9788467585025', 'Rimas y leyendas', 'Gustavo Adolfo Bécquer', 'SM', 2015, 'Poesía', 3, 9083023],
  ['9788498921939', 'Historia del tiempo', 'Stephen Hawking', 'Crítica', 2011, 'Ciencias', 2, 12805672],
  ['9788420446387', 'Matilda', 'Roald Dahl', 'Alfaguara', 1998, 'Infantil', 2, 7985767],
  ['9788499926223', 'Sapiens. De animales a dioses', 'Yuval Noah Harari', 'Debate', 2014, 'Historia', 1, 7387235],
  ['9788402076939', 'Crónica de una muerte anunciada', 'Gabriel García Márquez', 'Bruguera', 1981, 'Novela', 3, 8489859],
  ['9788420471549', 'La historia interminable', 'Michael Ende', 'Alfaguara', 2008, 'Fantasía', 2, 10448326],
  ['9788445006771', 'Fahrenheit 451', 'Ray Bradbury', 'Minotauro', 2006, 'Ciencia ficción', 3, 12447990],
  ['9788467252927', 'Momo', 'Michael Ende', 'Alfaguara', 2012, 'Juvenil', 2, 12498737],
  ['9788415083696', 'Orgullo y prejuicio', 'Jane Austen', 'Alma', 2013, 'Clásicos', 2, 13745414],
  ['9786073138765', 'El alquimista', 'Paulo Coelho', 'Debolsillo', 2016, 'Novela', 3, 12674818],
  ['9788415089452', 'Frankenstein', 'Mary Shelley', 'Plutón Ediciones', 2012, 'Clásicos', 2, 8078328],
];

// URL original de la portada en Open Library (tamaño grande, para optimizarla después)
const urlPortadaOriginal = ([isbn, , , , , , , fuente]) => (fuente === 'isbn'
  ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`
  : `https://covers.openlibrary.org/b/id/${fuente}-L.jpg`);

const USUARIOS = [
  // nombre, apellidos, email, rol, curso, estado
  ['Lucía', 'Martínez Gómez', 'lucia.martinez@alumnos.colegio.es', 'alumno', '1º ESO A', 'activo'],
  ['Hugo', 'Fernández Ruiz', 'hugo.fernandez@alumnos.colegio.es', 'alumno', '2º ESO B', 'activo'],
  ['Martina', 'López Sánchez', 'martina.lopez@alumnos.colegio.es', 'alumno', '3º ESO A', 'activo'],
  ['Mateo', 'García Díaz', 'mateo.garcia@alumnos.colegio.es', 'alumno', '4º ESO C', 'activo'],
  ['Sofía', 'Romero Navarro', 'sofia.romero@alumnos.colegio.es', 'alumno', '1º Bach A', 'activo'],
  ['Leo', 'Torres Moreno', 'leo.torres@alumnos.colegio.es', 'alumno', '2º Bach B', 'activo'],
  ['Daniela', 'Ortiz Castro', 'daniela.ortiz@alumnos.colegio.es', 'alumno', '2º ESO A', 'suspendido'],
  ['Carmen', 'Vidal Herrera', 'carmen.vidal@colegio.es', 'profesor', 'Lengua y Literatura', 'activo'],
  ['Javier', 'Molina Prieto', 'javier.molina@colegio.es', 'profesor', 'Física y Química', 'activo'],
  ['Elena', 'Santos Iglesias', 'elena.santos@colegio.es', 'profesor', 'Historia', 'activo'],
];

// libro (índice), usuario (índice), días desde el préstamo, días de plazo, devuelto hace N días (null = abierto)
const PRESTAMOS = [
  [2, 0, 3, 15, null],   // activo
  [5, 1, 13, 15, null],  // vence en 2 días
  [7, 2, 25, 15, null],  // retrasado 10 días
  [6, 3, 18, 15, null],  // retrasado 3 días
  [1, 7, 10, 30, null],  // profesora, activo
  [0, 7, 40, 30, null],  // profesora, retrasado
  [13, 8, 5, 30, null],
  [10, 9, 1, 30, null],
  [3, 4, 0, 15, null],   // prestado hoy
  [15, 9, 6, 30, null],  // Sapiens: único ejemplar prestado (agotado)
  [18, 5, 4, 15, null],
  [2, 5, 30, 15, 16],    // devuelto a tiempo
  [8, 0, 28, 15, 10],    // devuelto con 3 días de retraso
  [11, 1, 20, 15, 8],
  [4, 4, 16, 15, 2],
  [5, 3, 12, 15, 5],
  [2, 2, 9, 15, 1],
  [9, 8, 22, 30, 4],
  [14, 0, 7, 15, 0],     // devuelto hoy
  [12, 6, 60, 15, 40],   // alumna suspendida, préstamo antiguo
  [17, 0, 45, 15, 31],
  [19, 1, 26, 15, 12],
  [16, 7, 35, 30, 6],
  [21, 4, 24, 15, 11],
  [20, 2, 19, 15, 6],
  [6, 5, 33, 15, 20],
  [3, 1, 11, 15, 3],
];

// Peticiones pendientes: libro (índice), usuario (índice), hace N horas
const SOLICITUDES = [
  [15, 4, 20],  // Sapiens (agotado): queda en espera
  [17, 0, 5],   // La historia interminable
  [11, 9, 2],   // Wonder
];

// Hora "realista" en horario escolar (08:30 a 14:00) a partir de un número
const minutosEscolares = (i) => 510 + ((i * 47) % 330);
// Modificadores de SQLite para "hace N días a cierta hora" (si es hoy, un rato antes de ahora)
const momento = (hace, i) => (hace > 0
  ? [`-${hace} days`, 'start of day', `+${minutosEscolares(i)} minutes`]
  : [`-${30 + (i % 5) * 20} minutes`, '+0 minutes', '+0 minutes']);

function sembrar(db) {
  if (db.prepare('SELECT COUNT(*) AS n FROM libros').get().n > 0) return false;

  transaccion(db, () => {
    const hash = hashPassword(DEMO_PASSWORD);
    const insPersonal = db.prepare('INSERT INTO personal (nombre, apellidos, email, password_hash) VALUES (?,?,?,?)');
    for (const [nombre, apellidos, email] of PERSONAL) insPersonal.run(nombre, apellidos, email, process.env.ADMIN_PASSWORD ? hashPassword(process.env.ADMIN_PASSWORD) : hash);
    const bibliotecaria = `${PERSONAL[0][0]} ${PERSONAL[0][1]}`;

    const insLibro = db.prepare(`INSERT INTO libros (isbn, titulo, autor, editorial, anio, categoria, portada,
      ejemplares_totales, ejemplares_disponibles, creado_en) VALUES (?,?,?,?,?,?,?,?,?, datetime('now','localtime','-90 days'))`);
    const idsLibros = LIBROS.map(([isbn, titulo, autor, editorial, anio, categoria, n]) =>
      insLibro.run(isbn, titulo, autor, editorial, anio, categoria, `/portadas/${isbn}.webp`, n, n).lastInsertRowid);

    const insUsuario = db.prepare(`INSERT INTO usuarios (nombre, apellidos, email, rol, curso, estado, password_hash, creado_en)
      VALUES (?,?,?,?,?,?,?, datetime('now','localtime','-80 days'))`);
    const idsUsuarios = USUARIOS.map((u) => insUsuario.run(...u, hash).lastInsertRowid);
    const nombreDe = (i) => `${USUARIOS[i][0]} ${USUARIOS[i][1]}`;

    const insPrestamo = db.prepare(`INSERT INTO prestamos (libro_id, usuario_id, fecha_prestamo, fecha_limite, fecha_devolucion, prestado_en, devuelto_en)
      VALUES (?, ?, date('now','localtime', ?), date('now','localtime', ?),
              CASE WHEN ? IS NULL THEN NULL ELSE date('now','localtime', ?) END,
              datetime('now','localtime', ?, ?, ?),
              CASE WHEN ? IS NULL THEN NULL ELSE datetime('now','localtime', ?, ?, ?) END)`);
    const insMovimiento = db.prepare(`INSERT INTO movimientos (tipo, detalle, libro_id, usuario_id, actor, creado_en)
      VALUES (?, ?, ?, ?, ?, datetime('now','localtime', ?, ?, ?))`);

    PRESTAMOS.forEach(([l, u, hace, plazo, devuelto], i) => {
      const dev = devuelto == null ? null : `-${devuelto} days`;
      const enPrestamo = momento(hace, i);
      const enDevolucion = devuelto == null ? [null, null, null] : momento(devuelto, i + 7);
      insPrestamo.run(idsLibros[l], idsUsuarios[u], `-${hace} days`, `${plazo - hace >= 0 ? '+' : ''}${plazo - hace} days`,
        dev, dev, ...enPrestamo, dev, ...enDevolucion);
      const titulo = LIBROS[l][1];
      insMovimiento.run('prestamo', `«${titulo}» prestado a ${nombreDe(u)} durante ${plazo} días`, idsLibros[l], idsUsuarios[u], bibliotecaria, ...enPrestamo);
      if (devuelto != null) {
        const retraso = Math.max(0, hace - devuelto - plazo);
        insMovimiento.run('devolucion', `${nombreDe(u)} devuelve «${titulo}»${retraso ? ` con ${retraso} día(s) de retraso` : ''}`,
          idsLibros[l], idsUsuarios[u], bibliotecaria, ...enDevolucion);
      }
    });

    const insSolicitud = db.prepare(`INSERT INTO solicitudes (libro_id, usuario_id, creada_en) VALUES (?, ?, datetime('now','localtime', ?))`);
    for (const [l, u, horas] of SOLICITUDES) {
      insSolicitud.run(idsLibros[l], idsUsuarios[u], `-${horas} hours`);
      insMovimiento.run('solicitud', `${nombreDe(u)} pide «${LIBROS[l][1]}»`, idsLibros[l], idsUsuarios[u], nombreDe(u), `-${horas} hours`, '+0 minutes', '+0 minutes');
    }

    // El stock disponible se calcula a partir de los préstamos abiertos sembrados
    db.exec(`UPDATE libros SET ejemplares_disponibles = ejemplares_totales -
      (SELECT COUNT(*) FROM prestamos p WHERE p.libro_id = libros.id AND p.fecha_devolucion IS NULL)`);
  });
  console.log('Base de datos vacía: cargados datos de demostración');
  return true;
}

module.exports = { sembrar, LIBROS, urlPortadaOriginal, DEMO_PASSWORD };
