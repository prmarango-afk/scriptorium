// Datos de demostración: se cargan solo si la base de datos está vacía.
const { transaccion } = require('./db');

// Portadas de Open Library comprobadas una a una (por ISBN o por id de portada)
const porIsbn = (isbn) => `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false`;
const porId = (id) => `https://covers.openlibrary.org/b/id/${id}-M.jpg`;

const LIBROS = [
  // isbn, titulo, autor, editorial, anio, categoria, ejemplares, portada (null = portada generada)
  ['9788420412146', 'Don Quijote de la Mancha', 'Miguel de Cervantes', 'Alfaguara', 2015, 'Clásicos', 4, null],
  ['9788497592208', 'Cien años de soledad', 'Gabriel García Márquez', 'Debolsillo', 2003, 'Novela', 3, porIsbn('9788497592208')],
  ['9788478884452', 'Harry Potter y la piedra filosofal', 'J. K. Rowling', 'Salamandra', 1999, 'Fantasía', 5, porIsbn('9788478884452')],
  ['9788445000656', 'El Hobbit', 'J. R. R. Tolkien', 'Minotauro', 1982, 'Fantasía', 3, porId(15270291)],
  ['9788408163435', 'La sombra del viento', 'Carlos Ruiz Zafón', 'Planeta', 2016, 'Novela', 2, porId(10107644)],
  ['9788498381498', 'El Principito', 'Antoine de Saint-Exupéry', 'Salamandra', 2008, 'Infantil', 6, porIsbn('9788498381498')],
  ['9788499890944', '1984', 'George Orwell', 'Debolsillo', 2013, 'Ciencia ficción', 3, porId(8745958)],
  ['9788427202122', 'Los juegos del hambre', 'Suzanne Collins', 'Molino', 2012, 'Juvenil', 4, null],
  ['9788423687268', 'Marina', 'Carlos Ruiz Zafón', 'Edebé', 2009, 'Juvenil', 3, porId(10107517)],
  ['9788420471839', 'La casa de los espíritus', 'Isabel Allende', 'Debolsillo', 2001, 'Novela', 2, null],
  ['9788420674421', 'Bodas de sangre', 'Federico García Lorca', 'Alianza', 2011, 'Teatro', 5, null],
  ['9788415594031', 'Wonder. La lección de August', 'R. J. Palacio', 'Nube de Tinta', 2012, 'Juvenil', 4, porId(8223160)],
  ['9788497593793', 'Rimas y leyendas', 'Gustavo Adolfo Bécquer', 'Edaf', 2004, 'Poesía', 3, porId(2271282)],
  ['9788478887194', 'Breve historia del tiempo', 'Stephen Hawking', 'Crítica', 2005, 'Ciencias', 2, null],
  ['9788420482897', 'Matilda', 'Roald Dahl', 'Alfaguara', 2016, 'Infantil', 2, porId(12889769)],
  ['9788491050278', 'Sapiens. De animales a dioses', 'Yuval Noah Harari', 'Debate', 2015, 'Historia', 1, null],
  ['9788466350891', 'Crónica de una muerte anunciada', 'Gabriel García Márquez', 'Bruguera', 1981, 'Novela', 3, porId(8489859)],
  ['9788420471549', 'La historia interminable', 'Michael Ende', 'Alfaguara', 2008, 'Fantasía', 2, porId(10448326)],
  ['9788445008546', 'Fahrenheit 451', 'Ray Bradbury', 'Minotauro', 1993, 'Ciencia ficción', 3, porId(12993656)],
  ['9788467252927', 'Momo', 'Michael Ende', 'Alfaguara', 2012, 'Juvenil', 2, porId(8574580)],
  ['9788415083696', 'Orgullo y prejuicio', 'Jane Austen', 'Anaya', 2013, 'Clásicos', 2, porId(13574150)],
  ['9786073138765', 'El alquimista', 'Paulo Coelho', 'Debolsillo', 2016, 'Novela', 3, porId(12674818)],
  ['9788426137203', 'Frankenstein', 'Mary Shelley', 'Juventud', 2010, 'Clásicos', 2, porId(12356249)],
];

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

function sembrar(db) {
  if (db.prepare('SELECT COUNT(*) AS n FROM libros').get().n > 0) return false;

  transaccion(db, () => {
    const insLibro = db.prepare(`INSERT INTO libros (isbn, titulo, autor, editorial, anio, categoria, portada,
      ejemplares_totales, ejemplares_disponibles) VALUES (?,?,?,?,?,?,?,?,?)`);
    const idsLibros = LIBROS.map(([isbn, titulo, autor, editorial, anio, categoria, n, img]) =>
      insLibro.run(isbn, titulo, autor, editorial, anio, categoria, img, n, n).lastInsertRowid);

    const insUsuario = db.prepare('INSERT INTO usuarios (nombre, apellidos, email, rol, curso, estado) VALUES (?,?,?,?,?,?)');
    const idsUsuarios = USUARIOS.map((u) => insUsuario.run(...u).lastInsertRowid);

    const insPrestamo = db.prepare(`INSERT INTO prestamos (libro_id, usuario_id, fecha_prestamo, fecha_limite, fecha_devolucion)
      VALUES (?, ?, date('now','localtime', ?), date('now','localtime', ?), CASE WHEN ? IS NULL THEN NULL ELSE date('now','localtime', ?) END)`);
    for (const [l, u, hace, plazo, devuelto] of PRESTAMOS) {
      const dev = devuelto == null ? null : `-${devuelto} days`;
      insPrestamo.run(idsLibros[l], idsUsuarios[u], `-${hace} days`, `${plazo - hace >= 0 ? '+' : ''}${plazo - hace} days`, dev, dev);
    }

    const insSolicitud = db.prepare(`INSERT INTO solicitudes (libro_id, usuario_id, creada_en) VALUES (?, ?, datetime('now','localtime', ?))`);
    for (const [l, u, horas] of SOLICITUDES) insSolicitud.run(idsLibros[l], idsUsuarios[u], `-${horas} hours`);

    // El stock disponible se calcula a partir de los préstamos abiertos sembrados
    db.exec(`UPDATE libros SET ejemplares_disponibles = ejemplares_totales -
      (SELECT COUNT(*) FROM prestamos p WHERE p.libro_id = libros.id AND p.fecha_devolucion IS NULL)`);
  });
  console.log('Base de datos vacía: cargados datos de demostración');
  return true;
}

module.exports = { sembrar };
