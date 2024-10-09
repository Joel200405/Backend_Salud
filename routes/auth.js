const express = require('express');
const router = express.Router();
const pool = require('../config/database'); // Importar la base de datos
const bcrypt = require('bcrypt'); // Para encriptar contraseñas
const jwt = require('jsonwebtoken'); // Para generar tokens JWT
require('dotenv').config();

// Ruta para registrar usuarios
router.post('/register', (req, res) => {
    const { nombre, apellido_paterno, apellido_materno, correo, contrasena, telefono } = req.body;

    // Verificar si todos los datos están presentes
    if (!nombre || !apellido_paterno || !correo || !contrasena) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios' });
    }

    // Encriptar la contraseña
    bcrypt.hash(contrasena, 10, (err, hashedPassword) => {
        if (err) return res.status(500).json({ message: 'Error en el servidor' });

        // Insertar el usuario en la base de datos
        pool.query(
            'INSERT INTO usuarios (nombre, apellido_paterno, apellido_materno, correo, contrasena, telefono) VALUES (?, ?, ?, ?, ?, ?)',
            [nombre, apellido_paterno, apellido_materno, correo, hashedPassword, telefono],
            (err, result) => {
                if (err) return res.status(500).json({ message: 'Error al registrar el usuario' });

                // Responder con éxito
                res.status(201).json({ message: 'Usuario registrado exitosamente' });
            }
        );
    });
});

// Ruta para login
router.post('/login', (req, res) => {
    const { correo, contrasena } = req.body;

    // Verificar si los campos están presentes
    if (!correo || !contrasena) {
        return res.status(400).json({ message: 'Correo y contraseña son obligatorios' });
    }

    // Buscar al usuario por correo
    pool.query('SELECT * FROM usuarios WHERE correo = ?', [correo], (err, results) => {
        if (err) return res.status(500).json({ message: 'Error en el servidor' });
        if (results.length === 0) return res.status(400).json({ message: 'Correo no encontrado' });

        const user = results[0];

        // Comparar la contraseña
        bcrypt.compare(contrasena, user.contrasena, (err, isMatch) => {
            if (err) return res.status(500).json({ message: 'Error en el servidor' });
            if (!isMatch) return res.status(400).json({ message: 'Contraseña incorrecta' });

            // Generar un token JWT
            const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
            res.json({ message: 'Inicio de sesión exitoso', token });
        });
    });
});

module.exports = router;