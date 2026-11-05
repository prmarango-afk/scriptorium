// Datos de demostración: se cargan solo si la base de datos está vacía.
const { transaccion } = require('./db');

const portada = (isbn) => `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false`;

const LIBROS = [
  // isbn, titulo, autor, editorial, anio, categoria, ejemplares, portada verificada
  ['9788420412146', 'Don Quijote de la Mancha', 'Miguel de Cervantes', 'Alfaguara', 2015, 'Clásicos', 4, false],
  ['9788497592208', 'Cien años de soledad', 'Gabriel García Márquez', 'Debolsillo', 2003, 'Novela', 3, true],
  ['9788478884452', 'Harry Potter y la piedra filosofal', 'J. K. Rowling', 'Salamandra', 1999, 'Fantasía', 5, true],
  ['9788445000656', 'El Hobbit', 'J. R. R. Tolkien', 'Minotauro', 1982, 'Fantasía', 3, true],
  ['9788408163435', 'La sombra del viento', 'Carlos Ruiz Zafón', 'Planeta', 2016, 'Novela', 2, true],
  ['9788498381498', 'El Principito', 'Antoine de Saint-Exupéry', 'Salamandra', 2008, 'Infantil', 6, true],
  ['9788499890944', '1984', 'George Orwell', 'Debolsillo', 2013, 'Ciencia ficción', 3, false],
  ['9788427202122', 'Los juegos del hambre', 'Suzanne Collins', 'Molino', 2012, 'Juvenil', 4, false],
  ['9788423687268', 'Marina', 'Carlos Ruiz Zafón', 'Edebé', 2009, 'Juvenil', 3, false],
  ['9788420471839', 'La casa de los espíritus', 'Isabel Allende', 'Debolsillo', 2001, 'Novela', 2, false],
  ['9788420674421', 'Bodas de sangre', 'Federico García Lorca', 'Alianza', 2011, 'Teatro', 5, false],
  ['9788415594031', 'Wonder. La lección de August', 'R. J. Palacio', 'Nube de Tinta', 2012, 'Juvenil', 4, false],
  ['9788497593793', 'Rimas y leyendas', 'Gustavo Adolfo Bécquer', 'Debolsillo', 2004, 'Poesía', 3, false],
  ['9788478887194', 'Breve historia del tiempo', 'Stephen Hawking', 'Crítica', 2005, 'Ciencias', 2, false],
  ['9788420482897', 'Matilda', 'Roald Dahl', 'Alfaguara', 2016, 'Infantil', 2, false],
  ['9788491050278', 'Sapiens. De animales a dioses', 'Yuval Noah Harari', 'Debate', 2015, 'Historia', 1, false],
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
  [2, 5, 30, 15, 16],    // devuelto a tiempo
  [8, 0, 28, 15, 10],    // devuelto con 3 días de retraso
  [11, 1, 20, 15, 8],
  [4, 4, 16, 15, 2],
  [5, 3, 12, 15, 5],
  [2, 2, 9, 15, 1],
  [9, 8, 22, 30, 4],
  [14, 0, 7, 15, 0],     // devuelto hoy
  [12, 6, 60, 15, 40],   // alumna suspendida, préstamo antiguo
];

function sembrar(db) {
  if (db.prepare('SELECT COUNT(*) AS n FROM libros').get().n > 0) return false;

  transaccion(db, () => {
    const insLibro = db.prepare(`INSERT INTO libros (isbn, titulo, autor, editorial, anio, categoria, portada,
      ejemplares_totales, ejemplares_disponibles) VALUES (?,?,?,?,?,?,?,?,?)`);
    const idsLibros = LIBROS.map(([isbn, titulo, autor, editorial, anio, categoria, n, verificada]) =>
      insLibro.run(isbn, titulo, autor, editorial, anio, categoria, verificada ? portada(isbn) : null, n, n).lastInsertRowid);

    const insUsuario = db.prepare('INSERT INTO usuarios (nombre, apellidos, email, rol, curso, estado) VALUES (?,?,?,?,?,?)');
    const idsUsuarios = USUARIOS.map((u) => insUsuario.run(...u).lastInsertRowid);

    const insPrestamo = db.prepare(`INSERT INTO prestamos (libro_id, usuario_id, fecha_prestamo, fecha_limite, fecha_devolucion)
      VALUES (?, ?, date('now','localtime', ?), date('now','localtime', ?), CASE WHEN ? IS NULL THEN NULL ELSE date('now','localtime', ?) END)`);
    for (const [l, u, hace, plazo, devuelto] of PRESTAMOS) {
      const dev = devuelto == null ? null : `-${devuelto} days`;
      insPrestamo.run(idsLibros[l], idsUsuarios[u], `-${hace} days`, `${plazo - hace >= 0 ? "+" : ""}${plazo - hace} days`, dev, dev);
    }

    // El stock disponible se calcula a partir de los préstamos abiertos sembrados
    db.exec(`UPDATE libros SET ejemplares_disponibles = ejemplares_totales -
      (SELECT COUNT(*) FROM prestamos p WHERE p.libro_id = libros.id AND p.fecha_devolucion IS NULL)`);
  });
  console.log('🌱 Base de datos vacía: cargados datos de demostración');
  return true;
}

module.exports = { sembrar };
