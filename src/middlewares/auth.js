const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const pool = require('../db/pool');
const HttpError = require('../utils/httpError');

// Verifica firma y expiración del JWT; carga el usuario (rol vigente) desde la BD.
async function autenticar(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const [esquema, token] = header.split(' ');
    if (esquema !== 'Bearer' || !token) throw new HttpError(401, 'Token requerido');

    let payload;
    try {
      payload = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
    } catch (e) {
      throw new HttpError(401, e.name === 'TokenExpiredError' ? 'Token expirado' : 'Token inválido');
    }

    const { rows } = await pool.query('SELECT id, nombre, email, rol FROM usuarios WHERE id = $1', [payload.id]);
    if (!rows[0]) throw new HttpError(401, 'Usuario del token no existe');
    req.usuario = rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { autenticar };

