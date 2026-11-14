const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { jwtSecret, jwtExpiresIn } = require('../config/env');
const HttpError = require('../utils/httpError');

// Hash dummy para igualar tiempos cuando el email no existe
const DUMMY_HASH = bcrypt.hashSync('dummy-password', 10);

async function registrar(req, res) {
  const nombre = req.body.nombre.trim();
  const email = req.body.email.trim().toLowerCase();
  const hash = await bcrypt.hash(req.body.password, 10);

  try {
    const { rows } = await pool.query(
      `INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, 'usuario')
       RETURNING id, nombre, email, rol`,
      [nombre, email, hash]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') throw new HttpError(409, 'El email ya está registrado');
    throw err;
  }
}

async function login(req, res) {
  const email = req.body.email.trim().toLowerCase();
  const { rows } = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
  const usuario = rows[0];

  const ok = await bcrypt.compare(req.body.password, usuario ? usuario.password : DUMMY_HASH);
  if (!usuario || !ok) throw new HttpError(401, 'Credenciales inválidas');

  const token = jwt.sign({ id: usuario.id, rol: usuario.rol }, jwtSecret, {
    algorithm: 'HS256',
    expiresIn: jwtExpiresIn,
  });
  res.status(200).json({
    token,
    tipo: 'Bearer',
    expira_en: jwtExpiresIn,
    usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
  });
}

function perfil(req, res) {
  res.status(200).json(req.usuario);
}

module.exports = { registrar, login, perfil };

