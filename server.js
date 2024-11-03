const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth'); // Asegúrate de que la ruta sea correcta

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Usar el enrutador de autenticación
app.use('/auth', authRoutes);

// Iniciar servidor
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});

/* app.listen(port, '0.0.0.0', () => {
    console.log(`Servidor escuchando en http://192.168.1.100:${port}`); // Coloca la IP de tu PC aquí
}); */