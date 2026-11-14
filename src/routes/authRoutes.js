const router = require('express').Router();
const c = require('../controllers/authController');
const { validarRegistro, validarLogin } = require('../middlewares/validators');
const { autenticar } = require('../middlewares/auth');

router.post('/register', validarRegistro, c.registrar);
router.post('/login', validarLogin, c.login);
router.get('/me', autenticar, c.perfil);

module.exports = router;

