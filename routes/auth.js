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

// Ruta para obtener categorías y síntomas (GET)
router.get('/categorias-sintomas', (req, res) => {
  const sql = `
    SELECT c.id AS categoria_id, c.nombre AS categoria_nombre, 
           s.id AS sintoma_id, s.nombre AS sintoma_nombre 
    FROM categorias c 
    LEFT JOIN sintomas s ON c.id = s.categoria_id
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error en la consulta:', err);
      return res.status(500).send('Error en el servidor');
    }

    // Organizar los datos en un formato adecuado
    const categorias = {};
    results.forEach(row => {
      const { categoria_id, categoria_nombre, sintoma_id, sintoma_nombre } = row;

      // Si la categoría no existe, crearla
      if (!categorias[categoria_id]) {
        categorias[categoria_id] = {
          id: categoria_id,
          nombre: categoria_nombre,
          sintomas: []
        };
      }

      // Si hay un síntoma, agregarlo a la categoría
      if (sintoma_id) {
        categorias[categoria_id].sintomas.push({
          id: sintoma_id,
          nombre: sintoma_nombre
        });
      }
    });

    // Convertir el objeto a un array
    const categoriasArray = Object.values(categorias);
    res.status(200).json(categoriasArray);
  });
});

// Ruta para registrar una categoría (POST)
router.post('/categorias', (req, res) => {
  const { nombre } = req.body;

  if (!nombre) {
    return res.status(400).json({ message: 'El nombre de la categoría es obligatorio' });
  }

  const sql = 'INSERT INTO categorias (nombre) VALUES (?)';
  db.query(sql, [nombre], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error al guardar la categoría');
    }
    res.status(201).json({ message: 'Categoría guardada correctamente', id: result.insertId });
  });
});

// Ruta para registrar un síntoma (POST)
router.post('/sintomas', (req, res) => {
  const { nombre, categoria_id } = req.body;

  if (!nombre || !categoria_id) {
    return res.status(400).json({ message: 'El nombre del síntoma y el ID de la categoría son obligatorios' });
  }

  const sql = 'INSERT INTO sintomas (nombre, categoria_id) VALUES (?, ?)';
  db.query(sql, [nombre, categoria_id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error al guardar el síntoma');
    }
    res.status(201).json({ message: 'Síntoma guardado correctamente', id: result.insertId });
  });
});

// Ruta para obtener síntomas de una categoría específica (GET)
router.get('/sintomas/:categoriaId', (req, res) => {
  const categoriaId = req.params.categoriaId;
  const sql = 'SELECT * FROM sintomas WHERE categoria_id = ?';

  db.query(sql, [categoriaId], (err, results) => {
    if (err) {
      console.error('Error en la consulta:', err);
      return res.status(500).send('Error en el servidor');
    }
    if (results.length > 0) {
      res.status(200).json(results); // Devuelve la lista de síntomas
    } else {
      res.status(404).send('No se encontraron síntomas para esta categoría');
    }
  });
});

// Ruta para registrar una enfermedad (POST)
router.post('/enfermedades', (req, res) => {
  const { nombre } = req.body;

  if (!nombre) {
    return res.status(400).json({ message: 'El nombre de la enfermedad es obligatorio' });
  }

  const sql = 'INSERT INTO enfermedades (nombre) VALUES (?)';
  db.query(sql, [nombre], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error al guardar la enfermedad');
    }
    res.status(201).json({ message: 'Enfermedad guardada correctamente', id: result.insertId });
  });
});

// Ruta para registrar varios síntomas para una enfermedad (POST)
router.post('/enfermedad-sintomas', (req, res) => {
  const { enfermedad_id, sintomas_ids } = req.body;

  // Verificamos que enfermedad_id y sintomas_ids estén presentes y que sintomas_ids sea un arreglo
  if (!enfermedad_id || !Array.isArray(sintomas_ids) || sintomas_ids.length === 0) {
    return res.status(400).json({ message: 'El ID de la enfermedad y un arreglo de IDs de síntomas son obligatorios' });
  }

  // Insertamos cada sintoma_id en la tabla enfermedad_sintomas para la enfermedad dada
  const values = sintomas_ids.map(sintoma_id => [enfermedad_id, sintoma_id]);
  const sql = 'INSERT INTO enfermedad_sintomas (enfermedad_id, sintomas_ids) VALUES ?';

  db.query(sql, [values], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error al guardar los síntomas para la enfermedad' });
    }
    res.status(201).json({ message: 'Síntomas guardados correctamente para la enfermedad', affectedRows: result.affectedRows });
  });
});

// Ruta para registrar una recomendación (POST)
router.post('/recomendaciones', (req, res) => {
  const { enfermedad_id, edad_minima, edad_maxima, dias_sintomas, dias_sintomas_operador, recomendacion } = req.body;

  if (enfermedad_id == null || edad_minima == null || edad_maxima == null || dias_sintomas == null || !recomendacion) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' });
  }

  const sql = `
    INSERT INTO recomendaciones (enfermedad_id, edad_minima, edad_maxima, dias_sintomas, dias_sintomas_operador, recomendacion) 
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  db.query(sql, [enfermedad_id, edad_minima, edad_maxima, dias_sintomas, dias_sintomas_operador || '=', recomendacion], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error al guardar la recomendación');
    }
    res.status(201).json({ message: 'Recomendación guardada correctamente', id: result.insertId });
  });
});

// Ruta para obtener recomendaciones basadas en síntomas, edad y días con síntomas
router.post('/obtener-recomendacion', (req, res) => {
  const { sintomasSeleccionados, edad, diasSintomas } = req.body;

  if (!sintomasSeleccionados || sintomasSeleccionados.length === 0 || edad === undefined || diasSintomas === undefined) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' });
  }

  const sintomasPlaceholders = sintomasSeleccionados.map(() => '?').join(',');

  // Consulta principal para obtener la enfermedad con mayor coincidencia de síntomas
  const sql = `
    SELECT 
      e.id AS enfermedad_id, 
      e.nombre AS enfermedad_nombre, 
      COUNT(es.sintomas_ids) AS coincidencias,
      r.recomendacion, 
      r.dias_sintomas,
      r.edad_minima,
      r.edad_maxima
    FROM 
      enfermedad_sintomas es
    INNER JOIN 
      enfermedades e ON es.enfermedad_id = e.id
    INNER JOIN 
      recomendaciones r ON r.enfermedad_id = e.id
    WHERE 
      es.sintomas_ids IN (${sintomasPlaceholders})
      AND 
      (
        (r.dias_sintomas_operador = '<=' AND ? <= r.dias_sintomas AND r.dias_sintomas > 0) OR
        (r.dias_sintomas_operador = '=' AND ? = r.dias_sintomas) OR
        (r.dias_sintomas_operador = '>' AND ? > r.dias_sintomas) OR
        (r.dias_sintomas_operador = '<' AND ? < r.dias_sintomas) OR
        (r.dias_sintomas_operador = '>=' AND ? >= r.dias_sintomas)
      )
    GROUP BY 
      e.id, r.recomendacion, r.dias_sintomas, r.edad_minima, r.edad_maxima
    ORDER BY 
      coincidencias DESC, ABS(r.dias_sintomas - ?) ASC
    LIMIT 1;
  `;

  const values = [...sintomasSeleccionados, diasSintomas, diasSintomas, diasSintomas, diasSintomas, diasSintomas, diasSintomas];

  db.query(sql, values, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error en el servidor' });
    }

    if (results.length > 0) {
      const recomendacion = results[0];
      
      // Validar si la edad está dentro del rango de la enfermedad específica
      if (edad < recomendacion.edad_minima || edad > recomendacion.edad_maxima) {
        return res.status(400).json({ 
          message: `Debe ingresar una edad entre ${recomendacion.edad_minima} y ${recomendacion.edad_maxima} para la enfermedad ${recomendacion.enfermedad_nombre}`
        });
      }

      // Si la edad está dentro del rango, devolver la recomendación
      res.status(200).json(recomendacion);
    } else {
      res.status(404).json({ message: 'No se encontró ninguna recomendación' });
    }
    
  });
});

// Ruta para buscar síntomas según caracteres ingresados
router.get('/buscar-sintomas', (req, res) => {
  const termino = req.query.termino; // Obtenemos el término de búsqueda de los parámetros de consulta

  if (!termino) {
    return res.status(400).json({ message: 'El término de búsqueda es obligatorio' });
  }

  const sql = 'SELECT * FROM sintomas WHERE nombre LIKE ?';
  const valorBusqueda = `%${termino}%`; // Usamos comodines para buscar el término en cualquier posición

  db.query(sql, [valorBusqueda], (err, results) => {
    if (err) {
      console.error('Error en la consulta:', err);
      return res.status(500).send('Error en el servidor');
    }
    res.status(200).json(results); // Devolvemos los síntomas que coinciden
  });
});

// Ruta para registrar clínicas (POST)
router.post('/clinicas', (req, res) => {
  const { nombre, direccion, telefono, horario_atencion, foto_url, calificacion} = req.body;

  // Validaciones: comprobar que todos los campos requeridos están presentes
  if (!nombre || !direccion || !telefono || !horario_atencion || !foto_url || calificacion == null) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' });
  }

  // Inserta la clínica en la base de datos
  const sql = 'INSERT INTO clinicas (nombre, direccion, telefono, horario_atencion, foto_url, calificacion) VALUES (?, ?, ?, ?, ?, ?)';
  db.query(sql, [nombre, direccion, telefono, horario_atencion, foto_url, calificacion], (err, result) => {
    if (err) {
      console.error('Error al guardar la clínica:', err);
      return res.status(500).send('Error al guardar la clínica');
    }
    res.status(201).json({ message: 'Clínica guardada correctamente', id: result.insertId });
  });
});

// Ruta para obtener todas las clínicas (GET)
router.get('/clinicas', (req, res) => {
  const sql = 'SELECT * FROM clinicas';
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener clínicas:', err);
      return res.status(500).json({ message: 'Error al obtener clínicas' });
    }
    res.status(200).json(results);
  });
});

// Ruta para registrar una categoría de servicios (POST)
router.post('/categorias-servicios', (req, res) => {
  const { nombre } = req.body;

  if (!nombre) {
    return res.status(400).json({ message: 'El nombre de la categoría es obligatorio' });
  }

  const sql = 'INSERT INTO categorias_servicios (nombre) VALUES (?)';
  db.query(sql, [nombre], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error al guardar la categoría');
    }
    res.status(201).json({ message: 'Categoría guardada correctamente', id: result.insertId });
  });
});

// Ruta para registrar un servicio (POST)
router.post('/servicio', (req, res) => {
  const { nombre, categoria_id } = req.body;

  if (!nombre || !categoria_id) {
    return res.status(400).json({ message: 'El nombre del servicio y el ID de la categoría son obligatorios' });
  }

  const sql = 'INSERT INTO servicios (nombre, categoria_id) VALUES (?, ?)';
  db.query(sql, [nombre, categoria_id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error al guardar el síntoma');
    }
    res.status(201).json({ message: 'Servicio guardado correctamente', id: result.insertId });
  });
});

// Ruta para obtener todas las categorías de servicios con sus servicios
router.get('/categorias-servicios', (req, res) => {
  const sql = `
    SELECT cs.id AS categoria_id, cs.nombre AS categoria_nombre,
           s.id AS servicio_id, s.nombre AS servicio_nombre
    FROM categorias_servicios cs
    LEFT JOIN servicios s ON cs.id = s.categoria_id
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error en la consulta:', err);
      return res.status(500).send('Error en el servidor');
    }

    // Organizar los datos en un formato adecuado
    const categorias = {};
    results.forEach(row => {
      const { categoria_id, categoria_nombre, servicio_id, servicio_nombre } = row;

      // Si la categoría no existe, crearla
      if (!categorias[categoria_id]) {
        categorias[categoria_id] = {
          id: categoria_id,
          nombre: categoria_nombre,
          servicios: []
        };
      }

      // Si hay un servicio, agregarlo a la categoría
      if (servicio_id) {
        categorias[categoria_id].servicios.push({
          id: servicio_id,
          nombre: servicio_nombre
        });
      }
    });

    // Convertir el objeto a un array
    const categoriasArray = Object.values(categorias);
    res.status(200).json(categoriasArray);
  });
});

  // Ruta para obtener servicios de una categoría específica
  router.get('/servicios/:categoriaId', (req, res) => {
    const categoriaId = req.params.categoriaId;
    const sql = 'SELECT * FROM servicios WHERE categoria_id = ?';

    db.query(sql, [categoriaId], (err, results) => {
      if (err) {
        console.error('Error en la consulta:', err);
        return res.status(500).send('Error en el servidor');
      }
      if (results.length > 0) {
        res.status(200).json(results); // Devuelve la lista de servicios
      } else {
        res.status(404).send('No se encontraron servicios para esta categoría');
      }
    });
  });

  // Ruta para buscar servicios según caracteres ingresados
  router.get('/buscar-servicios', (req, res) => {
    const termino = req.query.termino; // Obtenemos el término de búsqueda de los parámetros de consulta

    if (!termino) {
      return res.status(400).json({ message: 'El término de búsqueda es obligatorio' });
    }

    const sql = 'SELECT * FROM servicios WHERE nombre LIKE ?';
    const valorBusqueda = `%${termino}%`; // Usamos comodines para buscar el término en cualquier posición

    db.query(sql, [valorBusqueda], (err, results) => {
      if (err) {
        console.error('Error en la consulta:', err);
        return res.status(500).send('Error en el servidor');
      }
      res.status(200).json(results); // Devolvemos los servicios que coinciden
    });
  });

module.exports = router;