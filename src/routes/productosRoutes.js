const router = require('express').Router();
const c = require('../controllers/productosController');
const { autenticar } = require('../middlewares/auth');
const { requerirRol } = require('../middlewares/roles');
const { validarId, validarProducto } = require('../middlewares/validators');

// Lectura pública
router.get('/', c.listar);
router.get('/:id', validarId('id'), c.obtener);

// Escritura: solo admin (401 sin token, 403 si no es admin, antes de validar el cuerpo)
const admin = [autenticar, requerirRol('admin')];
router.post('/', ...admin, validarProducto(false), c.crear);
router.put('/:id', ...admin, validarId('id'), validarProducto(false), c.actualizar);
router.patch('/:id', ...admin, validarId('id'), validarProducto(true), c.actualizar);
router.delete('/:id', ...admin, validarId('id'), c.eliminar);

module.exports = router;

