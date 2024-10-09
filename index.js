// index.js
const express = require('express');
const app = express();
const pool = require('./config/database'); // Asegúrate de que la ruta sea correcta
require('dotenv').config();

// Middleware para parsear el cuerpo de las solicitudes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Importar rutas de autenticación
const authRoutes = require('./routes/auth');

// Usar las rutas de autenticación
app.use('/auth', authRoutes);

// Ruta de ejemplo
app.get('/', (req, res) => {
    res.send('API de Usalud está funcionando');
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});