const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/Biblioteca_Digital', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});


const libroSchema = new mongoose.Schema({
  titulo: String,
  autor: String,
  isbn: String,
  genero: String,
  anioPublicacion: Number,
  copias: Number,
  disponibles: Number
});

const Libro = mongoose.model('Libro', libroSchema, 'Libros');

const prestamoSchema = new mongoose.Schema({
  libroId: mongoose.Schema.Types.ObjectId,
  usuario: String,
  fechaPrestamo: Date,
  fechaDevolucion: Date,
  devuelto: Boolean
}, { collection: 'Prestamos' });

const Prestamo = mongoose.model('Prestamo', prestamoSchema);


async function agregarLibro(nombre_titulo,nombre_autor,codigo_isbn,generoLibro,publicacion,numero_copias,numero_disponibles) {
  const nuevoLibro = new Libro({
    titulo:nombre_titulo,
    autor:nombre_autor,
    isbn:codigo_isbn,
    genero:generoLibro,
    anioPublicacion: publicacion,
    copias: numero_copias,
    disponibles: numero_disponibles
  });

 const libro = await Libro.findOne({ isbn: codigo_isbn });
  if (libro){
    console.log("Libro ya existe!");
    return;
  }

  

  await nuevoLibro.save();
  console.log("Libro guardado con éxito");
}

async function prestarLibro(isbn, usuarioPrestamo,fecha_prestamo,fecha_devolucion) {

  const libro = await Libro.findOne({ isbn });

  if (!libro) {
    console.log("Libro no encontrado.");
    return;
  }

  const prestamoExistente = await Prestamo.findOne({
    libroId: libro._id,
    usuario: usuarioPrestamo,
    devuelto: false
  });

  if (prestamoExistente) {
    console.log("Este usuario ya tiene un préstamo activo para este libro.");
    return;
  }


  if (libro.disponibles > 0) {
  
    libro.disponibles -= 1;
    await libro.save(); 

  
    const nuevoPrestamo = new Prestamo({
      libroId: libro._id,
      usuario: usuarioPrestamo,
      fechaPrestamo: fecha_prestamo,
      fechaDevolucion: fecha_devolucion,
      devuelto: false
    });

    await nuevoPrestamo.save();
    console.log("prestamo cedido");
  }
  else {
    console.log("Ya no hay copias disponibles.");
  }
}


async function devolverLibro(nombrePrestamo,isbn) 
{
  const libro = await Libro.findOne({ isbn });

  if(!libro)
  {
    console.log("el libro no existe");
    return;
  }

  const prestamo = await Prestamo.findOne({
    libroId: libro._id,
    usuario: nombrePrestamo,
    devuelto: false
  });

  if (!prestamo) 
  {
    console.log("No se encontró un préstamo activo para este usuario y libro.");
    return;
  }


  if(libro.disponibles < libro.copias)
  {
    libro.disponibles += 1;
    await libro.save();
  }

  prestamo.devuelto = true;
  await prestamo.save();
  console.log(`- ${libro.titulo}`, " devuelto");

}


async function buscarLibro(nombre = "", autor = "", genero = "") 
{ 
  buscarPorNombre(nombre);
  buscarPorAutor(autor);
  buscarPorGenero(genero);
}

async function  buscarPorGenero(params) 
{
  if (params === "")  return;

  const libros = await Libro.find({genero: params});

  try
  {
  if (libros.length === 0) {
      console.log("No se encontraron libros con ese género.");
    } else {
      console.log(`Se encontraron ${libros.length} libros del género '${params}':`);
      libros.forEach((libro) => {
        console.log(`- ${libro.titulo} (${libro.autor})`);
      });
    }
  } 
  catch (error)
  {
    console.error("Ocurrió un error al buscar libros por género:", error);
  }
}

async function buscarPorAutor(params) 
{
  if (params === "")  return;

  const libros = await Libro.find({autor: params});

  try
  {
  if (libros.length === 0) {
      console.log("No se encontraron libros con ese autor.");
    } else {
      console.log(`Se encontraron ${libros.length} libros del autor '${params}':`);
      libros.forEach((libro) => {
        console.log(`- ${libro.titulo} (${libro.autor})`);
      });
    }
  } 
  catch (error)
  {
    console.error("Ocurrió un error al buscar libros por autor:", error);
  }
}

async function buscarPorNombre(params) 
{
  if (params === "")  return;

  const libros = await Libro.find({titulo: params});

  try
  {
  if (libros.length === 0) {
      console.log("No se encontraron libros con ese nombre.");
    } else {
      console.log(`Se encontraron ${libros.length} libros llamado '${params}':`);
      libros.forEach((libro) => {
        console.log(`- ${libro.titulo} (${libro.autor})`);
      });
    }
  } 
  catch (error)
  {
    console.error("Ocurrió un error al buscar libros por nombre:", error);
  }
}



async function reportePopulares() {
  try {
    const topLibros = await Prestamo.aggregate([
      {
        $group: {
          _id: "$libroId",
          cantidadPrestamos: { $sum: 1 }
        }
      },
      {
        $sort: { cantidadPrestamos: -1 }
      },
      {
        $limit: 5
      },
      {
        $lookup: {
          from: "Libros",
          localField: "_id",
          foreignField: "_id",
          as: "libro"
        }
      },
      {
        $unwind: "$libro"
      },
      {
        $project: {
          titulo: "$libro.titulo",
          autor: "$libro.autor",
          isbn: "$libro.isbn",
          genero: "$libro.genero",
          cantidadPrestamos: 1
        }
      }
    ]);

    console.log("Top 5 libros más prestados:");
    topLibros.forEach((libro, index) => {
      console.log(
        `${index + 1}. "${libro.titulo}" de ${libro.autor} (ISBN: ${libro.isbn}) — ${libro.cantidadPrestamos} préstamos`
      );
    });

  } catch (error) {
    console.error("Error al generar el reporte de libros populares:", error);
  }
}


async function realizarOperaciones() 
{
  await agregarLibro("four kingdom","anonimo","23345-23456789","historico",500,5,20);
  await prestarLibro("23345-23456789","jorge",new Date("2025-07-12T00:00:00Z"),new Date("2025-08-12T00:00:00Z"));
  await devolverLibro("jorge","23345-23456789");

  await buscarLibro("four kingom");

  reportePopulares();

}

realizarOperaciones();


