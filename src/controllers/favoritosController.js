const pool = require('../db/pool');
const HttpError = require('../utils/httpError');

// Todas las consultas filtran por req.usuario.id (del token): aislamiento total.
async function listar(req, res) {
  const { rows } = await pool.query(
    `SELECT p.id, p.nombre, p.descripcion, p.categoria, p.precio::float8 AS precio, f.created_at AS agregado_en
     FROM favoritos f JOIN productos p ON p.id = f.producto_id
     WHERE f.usuario_id = $1 ORDER BY f.created_at, p.id`,
    [req.usuario.id]
  );
  res.status(200).json(rows);
}

async function agregar(req, res) {
  const productoId = req.params.productoId;
  const existe = await pool.query('SELECT 1 FROM productos WHERE id = $1', [productoId]);
  if (!existe.rowCount) throw new HttpError(404, 'Producto no encontrado');

  try {
    await pool.query('INSERT INTO favoritos (usuario_id, producto_id) VALUES ($1, $2)', [req.usuario.id, productoId]);
  } catch (err) {
    if (err.code === '23505') throw new HttpError(409, 'El producto ya está en favoritos');
    if (err.code === '23503') throw new HttpError(404, 'Producto no encontrado');
    throw err;
  }
  res.status(201).json({ usuario_id: req.usuario.id, producto_id: productoId });
}

async function quitar(req, res) {
  const { rowCount } = await pool.query('DELETE FROM favoritos WHERE usuario_id = $1 AND producto_id = $2', [
    req.usuario.id,
    req.params.productoId,
  ]);
  if (!rowCount) throw new HttpError(404, 'Favorito no encontrado');
  res.status(204).end();
}

module.exports = { listar, agregar, quitar };

