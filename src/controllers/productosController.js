const pool = require('../db/pool');
const HttpError = require('../utils/httpError');

const COLS = 'id, nombre, descripcion, categoria, precio::float8 AS precio';

async function listar(req, res) {
  const { categoria, q, precio_min, precio_max } = req.query;
  const where = [];
  const params = [];

  if (categoria !== undefined) {
    if (typeof categoria !== 'string' || !categoria.trim()) throw new HttpError(400, 'categoria inválida');
    params.push(categoria.trim());
    where.push(`LOWER(categoria) = LOWER($${params.length})`);
  }
  if (q !== undefined) {
    if (typeof q !== 'string' || !q.trim()) throw new HttpError(400, 'q inválido');
    params.push(`%${q.trim()}%`);
    where.push(`(nombre ILIKE $${params.length} OR descripcion ILIKE $${params.length})`);
  }
  for (const [nombre, valor, op] of [['precio_min', precio_min, '>='], ['precio_max', precio_max, '<=']]) {
    if (valor === undefined) continue;
    const n = Number(valor);
    if (typeof valor !== 'string' || valor.trim() === '' || !Number.isFinite(n) || n < 0)
      throw new HttpError(400, `${nombre} debe ser un número válido`);
    params.push(n);
    where.push(`precio ${op} $${params.length}`);
  }

  const sql = `SELECT ${COLS} FROM productos ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id`;
  const { rows } = await pool.query(sql, params);
  res.status(200).json(rows);
}

async function obtener(req, res) {
  const { rows } = await pool.query(`SELECT ${COLS} FROM productos WHERE id = $1`, [req.params.id]);
  if (!rows[0]) throw new HttpError(404, 'Producto no encontrado');
  res.status(200).json(rows[0]);
}

async function crear(req, res) {
  const { nombre, descripcion = '', categoria, precio } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO productos (nombre, descripcion, categoria, precio) VALUES ($1,$2,$3,$4) RETURNING ${COLS}`,
    [nombre.trim(), descripcion, categoria.trim(), precio]
  );
  res.status(201).json(rows[0]);
}

async function actualizar(req, res) {
  const { nombre, descripcion, categoria, precio } = req.body;
  const { rows } = await pool.query(
    `UPDATE productos SET
       nombre      = COALESCE($1, nombre),
       descripcion = COALESCE($2, descripcion),
       categoria   = COALESCE($3, categoria),
       precio      = COALESCE($4, precio)
     WHERE id = $5 RETURNING ${COLS}`,
    [nombre?.trim() ?? null, descripcion ?? null, categoria?.trim() ?? null, precio ?? null, req.params.id]
  );
  if (!rows[0]) throw new HttpError(404, 'Producto no encontrado');
  res.status(200).json(rows[0]);
}

async function eliminar(req, res) {
  const { rowCount } = await pool.query('DELETE FROM productos WHERE id = $1', [req.params.id]);
  if (!rowCount) throw new HttpError(404, 'Producto no encontrado');
  res.status(204).end();
}

module.exports = { listar, obtener, crear, actualizar, eliminar };

