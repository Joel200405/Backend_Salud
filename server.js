const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config(); // Para cargar las variables de entorno

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Conexión a la base de datos
const db = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

// Rutas
app.post('/api/guardarUsuario', (req, res) => {
  const { nombre, apellido_paterno, apellido_materno, correo, contrasena, telefono } = req.body;
  const sql = 'INSERT INTO usuarios (nombre, apellido_paterno, apellido_materno, correo, contrasena, telefono) VALUES (?, ?, ?, ?, ?, ?)';
  db.query(sql, [nombre, apellido_paterno, apellido_materno, correo, contrasena, telefono], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error al guardar el usuario');
    }
    res.status(201).send('Usuario guardado correctamente');
  });
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});

function validarLogin(req, res, next) {
  const { correo, contrasena } = req.body;
  if (!correo || !contrasena) {
    return res.status(400).send('Faltan campos requeridos');
  }
  next();
}

// Ruta para iniciar sesión
app.post('/auth/login', (req, res) => {
  const { correo, contrasena } = req.body;
  const sql = 'SELECT * FROM usuarios WHERE correo = ? AND contrasena = ?';
  
  db.query(sql, [correo, contrasena], (err, results) => {
    if (err) {
      console.error('Error en la consulta:', err); // Mensaje de error más específico
      return res.status(500).send('Error en el servidor');
    }
    if (results.length > 0) {
      res.status(200).send('Inicio de sesión exitoso');
    } else {
      res.status(401).send('Credenciales incorrectas');
    }
  });
});