const HttpError = require('../utils/httpError');

const requerirRol = (...roles) => (req, _res, next) => {
  if (!req.usuario || !roles.includes(req.usuario.rol)) {
    return next(new HttpError(403, 'No tienes permisos para esta acción'));
  }
  next();
};

module.exports = { requerirRol };

