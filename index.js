const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const Grid = require('gridfs-stream');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const { ObjectId } = require('mongodb');
Grid.mongo = { ObjectId: ObjectId };



// Configuración de multer para almacenar los archivos subidos en el sistema de archivos local
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    crypto.randomBytes(16, (err, buf) => {
      if (err) return cb(err);
      cb(null, buf.toString('hex') + path.extname(file.originalname));
    });
  }
});

// Crea una instancia de multer con la configuración anterior
const upload = multer({ storage });

// Configuración de mongoose para conectarse a MongoDB
mongoose.set('strictQuery', true);
mongoose.connect("mongodb://127.0.0.1/local", {
    
    
useNewUrlParser: true,
useUnifiedTopology: true
})

    .then(db => console.log('RRT IS ON LINE'))
    .catch(error => console.log(error))

// Crea una conexión de GridFS a la base de datos
let gfs;
mongoose.connection.once('open', () => {
  gfs = Grid(mongoose.connection.db, mongoose.mongo);
  gfs.collection('uploads');
});

// Crea una aplicación de Express
const app = express();

// Ruta para subir archivos
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).send('No se ha proporcionado un archivo');
    return;
  }
  const ObjectID
   = require('mongodb').ObjectId;
  Grid.mongo = { ObjectId: ObjectID };

  const writestream = gfs.createWriteStream({
    filename: req.file.filename
  });

  // Abre un stream de lectura del archivo subido y lo escribe en GridFS
  const readstream = fs.createReadStream(`uploads/${req.file.filename}`);
  readstream.pipe(writestream);

  writestream.on('close', file => {
    res.status(200).json({
      success: true,
      fileId: file._id,
      filename: file.filename
    });
  });
});

// Ruta para descargar archivos
app.get('/download/:id', (req, res) => {
  gfs.files.findOne({ _id: mongoose.Types.ObjectId(req.params.id) }, (err, file) => {
    if (err) {
      res.status(400).send('No se ha encontrado el archivo');
      return;
    }

    // Verifica si el archivo es un PDF
    if (file.contentType === 'application/pdf') {
      // Configura las cabeceras de respuesta para que el navegador descargue el archivo en lugar de mostrarlo en una pestaña
      res.set({
        'Content-Disposition': `attachment; filename="${file.filename}"`,
        'Content-Type': 'application/pdf'
      });

      // Abre un stream de lectura del archivo en GridFS y lo envía en la respuesta
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    } else {
      res.status(400).send('No se ha encontrado el archivo');
      return;
    }
  });
});

// Inicia la aplicación y la escucha en el puerto 3000
app.listen(3600, () => {
  console.log('La aplicación está escuchando en el puerto 3000.');
});