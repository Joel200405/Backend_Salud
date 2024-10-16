const express = require('express');
const mysql = require('mysql');
const bcrypt = require('bcrypt'); // Importa bcrypt
const jwt = require('jsonwebtoken'); // Importa jsonwebtoken
require('dotenv').config(); // Para cargar las variables de entorno

const router = express.Router();

// Conexión a la base de datos
const db = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

// Ruta para guardar usuario (POST)
router.post('/guardarUsuario', (req, res) => {
  const { nombre, apellido_paterno, apellido_materno, correo, contrasena, telefono } = req.body;

  // Validaciones: comprobar que todos los campos requeridos están presentes
  if (!nombre || !apellido_paterno || !apellido_materno || !correo || !contrasena || !telefono) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' });
  }

  // Encriptar la contraseña
  bcrypt.hash(contrasena, 10, (err, hashedPassword) => {
    if (err) {
      console.error('Error al encriptar la contraseña:', err);
      return res.status(500).send('Error en el servidor');
    }

    const sql = 'INSERT INTO usuarios (nombre, apellido_paterno, apellido_materno, correo, contrasena, telefono) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(sql, [nombre, apellido_paterno, apellido_materno, correo, hashedPassword, telefono], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error al guardar el usuario');
      }
      res.status(201).send('Usuario guardado correctamente');
    });
  });
});

// Ruta para iniciar sesión (POST)
router.post('/login', (req, res) => {
  const { correo, contrasena } = req.body;
  const sql = 'SELECT * FROM usuarios WHERE correo = ?';

  db.query(sql, [correo], (err, results) => {
    if (err) {
      console.error('Error en la consulta:', err);
      return res.status(500).send('Error en el servidor');
    }
    if (results.length > 0) {
      const user = results[0];

      // Comparar la contraseña
      bcrypt.compare(contrasena, user.contrasena, (err, isMatch) => {
        if (err) {
          console.error('Error al comparar contraseñas:', err);
          return res.status(500).send('Error en el servidor');
        }
        if (!isMatch) {
          return res.status(401).send('Credenciales incorrectas');
        }

        // Si la contraseña coincide, generar el token
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' }); // Token válido por 1 hora

        // Enviar el token en la respuesta
        res.status(200).json({
          message: 'Inicio de sesión exitoso',
          token: token
        });
      });
    } else {
      res.status(401).send('Credenciales incorrectas');
    }
  });
});

// Ruta para verificar el estado de la sesión (GET)
router.get('/estado-sesion', (req, res) => {
    const token = req.headers['authorization'];
  
    if (!token) {
      return res.status(401).send('Token no proporcionado');
    }
  
    jwt.verify(token.split(' ')[1], process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).send('Token inválido');
      }
  
      res.status(200).json({
        message: 'Sesión activa',
        userId: decoded.id
      });
    });
  });

// Ruta para obtener información del usuario por correo (GET)
router.get('/usuario/:correo', (req, res) => {
  const correo = req.params.correo;
  const sql = 'SELECT * FROM usuarios WHERE correo = ?';
  
  db.query(sql, [correo], (err, results) => {
    if (err) {
      console.error('Error en la consulta:', err);
      return res.status(500).send('Error en el servidor');
    }
    if (results.length > 0) {
      res.status(200).json(results[0]); // Devuelve la información del usuario
    } else {
      res.status(404).send('Usuario no encontrado');
    }
  });
});

module.exports = router;