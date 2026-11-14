const router = require('express').Router();
const c = require('../controllers/favoritosController');
const { autenticar } = require('../middlewares/auth');
const { validarId } = require('../middlewares/validators');
const HttpError = require('../utils/httpError');

router.use(autenticar);

router.get('/', c.listar);
router.post('/:productoId', validarId('productoId'), c.agregar);
// Alternativa: POST /api/favoritos con { "producto_id": n }
router.post('/', (req, _res, next) => {
  const id = req.body && req.body.producto_id;
  if (!Number.isInteger(id) || id < 1 || id > 2147483647)
    return next(new HttpError(400, 'producto_id debe ser un entero positivo'));
  req.params.productoId = id;
  next();
}, c.agregar);
router.delete('/:productoId', validarId('productoId'), c.quitar);

module.exports = router;

