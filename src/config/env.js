require('dotenv').config({ quiet: true });

const env = {
  port: Number(process.env.PORT) || 3000,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'catalogo_productos',
  },
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  admin: {
    nombre: process.env.ADMIN_NAME || 'Administrador',
    email: process.env.ADMIN_EMAIL || 'admin@catalogo.com',
    password: process.env.ADMIN_PASSWORD || 'Admin12345',
  },
};

if (!env.jwtSecret) {
  throw new Error('Falta JWT_SECRET en las variables de entorno (.env)');
}

module.exports = env;

