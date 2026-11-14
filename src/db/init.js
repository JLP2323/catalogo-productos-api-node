// Inicializa la BD: crea la base si no existe, tablas, admin inicial y productos de ejemplo.
// Uso: npm run db:init  (idempotente: se puede ejecutar varias veces)
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { Client } = require('pg');
const env = require('../config/env');
const pool = require('./pool');

const PRODUCTOS_EJEMPLO = [
  ['Laptop Lenovo IdeaPad 3', 'Laptop 15.6" Ryzen 5, 8GB RAM, 512GB SSD', 'Tecnología', 650.0],
  ['Smartphone Samsung Galaxy A54', 'Pantalla 6.4" AMOLED, 128GB', 'Tecnología', 420.5],
  ['Auriculares Sony WH-CH520', 'Inalámbricos Bluetooth, 50h de batería', 'Audio', 59.99],
  ['Silla Ergonómica de Oficina', 'Respaldo lumbar ajustable y malla transpirable', 'Hogar', 135.0],
  ['Zapatillas Nike Revolution 6', 'Calzado deportivo para correr', 'Deportes', 74.9],
  ['Cafetera Oster 12 Tazas', 'Cafetera programable de goteo', 'Hogar', 39.99],
];

async function crearBaseSiNoExiste() {
  const admin = new Client({ ...env.db, database: 'postgres' });
  await admin.connect();
  try {
    const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [env.db.database]);
    if (!rowCount) {
      await admin.query(`CREATE DATABASE "${env.db.database.replace(/"/g, '')}"`);
      console.log(`Base de datos "${env.db.database}" creada`);
    }
  } finally {
    await admin.end();
  }
}

async function init() {
  await crearBaseSiNoExiste();
  await pool.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  console.log('Tablas listas');

  const hash = await bcrypt.hash(env.admin.password, 10);
  await pool.query(
    `INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO UPDATE SET rol = 'admin'`,
    [env.admin.nombre, env.admin.email.toLowerCase(), hash]
  );
  console.log(`Admin disponible: ${env.admin.email}`);

  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM productos');
  if (rows[0].n === 0) {
    for (const p of PRODUCTOS_EJEMPLO) {
      await pool.query('INSERT INTO productos (nombre, descripcion, categoria, precio) VALUES ($1,$2,$3,$4)', p);
    }
    console.log(`${PRODUCTOS_EJEMPLO.length} productos de ejemplo insertados`);
  }
}

init()
  .catch((err) => {
    console.error('Error inicializando la BD:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

