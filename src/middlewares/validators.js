const HttpError = require('../utils/httpError');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const esTexto = (v) => typeof v === 'string';

function validarRegistro(req, _res, next) {
  const { nombre, email, password } = req.body || {};
  if (!esTexto(nombre) || nombre.trim().length < 2 || nombre.trim().length > 100)
    return next(new HttpError(400, 'nombre es obligatorio (2 a 100 caracteres)'));
  if (!esTexto(email) || !EMAIL_RE.test(email.trim()) || email.length > 255)
    return next(new HttpError(400, 'email inválido'));
  if (!esTexto(password) || password.length < 8 || password.length > 72)
    return next(new HttpError(400, 'password es obligatorio (8 a 72 caracteres)'));
  // El rol nunca se toma del cliente: el registro público siempre crea 'usuario'.
  next();
}

function validarLogin(req, _res, next) {
  const { email, password } = req.body || {};
  if (!esTexto(email) || !email.trim() || !esTexto(password) || !password)
    return next(new HttpError(400, 'email y password son obligatorios'));
  next();
}

// Valida el ID de ruta como entero positivo
const validarId = (param) => (req, _res, next) => {
  const valor = req.params[param];
  if (!/^\d+$/.test(valor) || Number(valor) < 1 || Number(valor) > 2147483647)
    return next(new HttpError(400, `${param} debe ser un entero positivo`));
  req.params[param] = Number(valor);
  next();
};

// parcial=true (PUT/PATCH parcial) permite omitir campos pero valida los presentes.
const validarProducto = (parcial = false) => (req, _res, next) => {
  const b = req.body;
  if (!b || typeof b !== 'object' || Array.isArray(b)) return next(new HttpError(400, 'Cuerpo JSON requerido'));

  const campos = ['nombre', 'descripcion', 'categoria', 'precio'];
  if (parcial && !campos.some((c) => b[c] !== undefined))
    return next(new HttpError(400, 'Envía al menos un campo a actualizar'));

  const requerido = (c) => !parcial || b[c] !== undefined;

  if (requerido('nombre') && (!esTexto(b.nombre) || !b.nombre.trim() || b.nombre.length > 150))
    return next(new HttpError(400, 'nombre es obligatorio (máx. 150 caracteres)'));
  if (requerido('categoria') && (!esTexto(b.categoria) || !b.categoria.trim() || b.categoria.length > 100))
    return next(new HttpError(400, 'categoria es obligatoria (máx. 100 caracteres)'));
  if (b.descripcion !== undefined && !esTexto(b.descripcion))
    return next(new HttpError(400, 'descripcion debe ser texto'));
  if (requerido('precio')) {
    if (typeof b.precio !== 'number' || !Number.isFinite(b.precio) || b.precio <= 0 || b.precio >= 1e10)
      return next(new HttpError(400, 'precio debe ser un número mayor a 0'));
  }
  next();
};

module.exports = { validarRegistro, validarLogin, validarId, validarProducto };

