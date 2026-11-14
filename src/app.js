const express = require('express');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/productos', require('./routes/productosRoutes'));
app.use('/api/favoritos', require('./routes/favoritosRoutes'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;

