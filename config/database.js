// config/database.js
const mysql = require('mysql');
require('dotenv').config();

const pool = mysql.createPool({
    connectionLimit: 10,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: 3306
});

// Exporta el pool
module.exports = pool;

// Si quieres comprobar la conexión al iniciar el archivo, puedes hacerlo así:
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error de conexión a la base de datos: ' + err.stack);
        return;
    }
    console.log('Conectado a la base de datos como id ' + connection.threadId);
    // Cerrar la conexión después de usarla
    connection.release();
});
