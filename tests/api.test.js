// Pruebas de integración contra la BD real. Requiere `npm run db:init` previo.
const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const env = require('../src/config/env');
const pool = require('../src/db/pool');
const app = require('../src/app');

let server, base;
const sufijo = Date.now();
const emailA = `a_${sufijo}@test.com`;
const emailB = `b_${sufijo}@test.com`;
let tokenA, tokenB, tokenAdmin, productoId;

const req = async (method, path, { token, body, raw } = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, text };
};

test.before(async () => {
  server = app.listen(0);
  base = `http://localhost:${server.address().port}`;
});
test.after(async () => {
  await pool.query('DELETE FROM usuarios WHERE email IN ($1,$2)', [emailA, emailB]);
  if (productoId) await pool.query('DELETE FROM productos WHERE id = $1', [productoId]);
  server.close();
  await pool.end();
});

test('registro: 201, rol usuario, sin password/hash; ignora rol enviado', async () => {
  const r = await req('POST', '/api/auth/register', { body: { nombre: 'Ana', email: emailA, password: 'Password1', rol: 'admin' } });
  assert.equal(r.status, 201);
  assert.equal(r.body.rol, 'usuario');
  assert.ok(!/password|hash|\$2/i.test(r.text));
  assert.equal((await req('POST', '/api/auth/register', { body: { nombre: 'Beto', email: emailB, password: 'Password1' } })).status, 201);
});

test('registro: 409 email duplicado, 400 validaciones', async () => {
  assert.equal((await req('POST', '/api/auth/register', { body: { nombre: 'Ana', email: emailA.toUpperCase(), password: 'Password1' } })).status, 409);
  assert.equal((await req('POST', '/api/auth/register', { body: { nombre: 'Ana', email: 'malo', password: 'Password1' } })).status, 400);
  assert.equal((await req('POST', '/api/auth/register', { body: { nombre: 'Ana', email: 'x@x.com', password: '123' } })).status, 400);
  assert.equal((await req('POST', '/api/auth/register', { body: {} })).status, 400);
  assert.equal((await req('POST', '/api/auth/register', { raw: '{malformado' , body: 1 })).status, 400);
});

test('login: 200 con token con expiración; 401 credenciales malas; 400 vacío', async () => {
  const a = await req('POST', '/api/auth/login', { body: { email: emailA, password: 'Password1' } });
  assert.equal(a.status, 200);
  tokenA = a.body.token;
  assert.ok(jwt.decode(tokenA).exp);
  assert.ok(!/password|\$2/i.test(a.text));
  tokenB = (await req('POST', '/api/auth/login', { body: { email: emailB, password: 'Password1' } })).body.token;
  assert.equal((await req('POST', '/api/auth/login', { body: { email: emailA, password: 'incorrecta' } })).status, 401);
  assert.equal((await req('POST', '/api/auth/login', { body: { email: 'no@existe.com', password: 'Password1' } })).status, 401);
  assert.equal((await req('POST', '/api/auth/login', { body: {} })).status, 400);
  const ad = await req('POST', '/api/auth/login', { body: { email: env.admin.email, password: env.admin.password } });
  assert.equal(ad.status, 200);
  assert.equal(ad.body.usuario.rol, 'admin');
  tokenAdmin = ad.body.token;
});

test('JWT: manipulado, firmado con otro secreto y expirado => 401', async () => {
  assert.equal((await req('GET', '/api/favoritos')).status, 401);
  assert.equal((await req('GET', '/api/favoritos', { token: 'basura' })).status, 401);
  assert.equal((await req('GET', '/api/favoritos', { token: tokenA.slice(0, -2) + 'xx' })).status, 401);
  const falso = jwt.sign({ id: 1, rol: 'admin' }, 'otro-secreto');
  assert.equal((await req('GET', '/api/favoritos', { token: falso })).status, 401);
  const expirado = jwt.sign({ id: 1, rol: 'admin' }, env.jwtSecret, { expiresIn: -10 });
  assert.equal((await req('GET', '/api/favoritos', { token: expirado })).status, 401);
});

test('catálogo público: listado >=5, filtros, detalle, 404, 400', async () => {
  const l = await req('GET', '/api/productos');
  assert.equal(l.status, 200);
  assert.ok(l.body.length >= 5);
  const cat = l.body[0].categoria;
  const f = await req('GET', '/api/productos?categoria=' + encodeURIComponent(cat));
  assert.ok(f.body.length >= 1 && f.body.every((p) => p.categoria.toLowerCase() === cat.toLowerCase()));
  const pr = await req('GET', '/api/productos?precio_min=50&precio_max=100');
  assert.ok(pr.body.every((p) => p.precio >= 50 && p.precio <= 100));
  assert.equal((await req('GET', '/api/productos?precio_min=abc')).status, 400);
  assert.equal((await req('GET', '/api/productos/' + l.body[0].id)).status, 200);
  assert.equal((await req('GET', '/api/productos/999999')).status, 404);
  assert.equal((await req('GET', '/api/productos/abc')).status, 400);
});

test('CRUD productos: 401 sin token, 403 usuario, admin OK con 201/200/204/400/404', async () => {
  const nuevo = { nombre: 'Prueba', descripcion: 'desc', categoria: 'Test', precio: 9.5 };
  assert.equal((await req('POST', '/api/productos', { body: nuevo })).status, 401);
  assert.equal((await req('POST', '/api/productos', { token: tokenA, body: nuevo })).status, 403);
  assert.equal((await req('PUT', '/api/productos/1', { token: tokenA, body: nuevo })).status, 403);
  assert.equal((await req('DELETE', '/api/productos/1', { token: tokenA })).status, 403);

  for (const mal of [{ ...nuevo, precio: 0 }, { ...nuevo, precio: -5 }, { ...nuevo, precio: '10' }, { ...nuevo, nombre: '' }, { descripcion: 'x' }]) {
    assert.equal((await req('POST', '/api/productos', { token: tokenAdmin, body: mal })).status, 400);
  }
  const c = await req('POST', '/api/productos', { token: tokenAdmin, body: nuevo });
  assert.equal(c.status, 201);
  productoId = c.body.id;
  const u = await req('PUT', '/api/productos/' + productoId, { token: tokenAdmin, body: { ...nuevo, precio: 20 } });
  assert.equal(u.status, 200);
  assert.equal(u.body.precio, 20);
  assert.equal((await req('PUT', '/api/productos/' + productoId, { token: tokenAdmin, body: { ...nuevo, precio: 0 } })).status, 400);
  assert.equal((await req('PUT', '/api/productos/999999', { token: tokenAdmin, body: nuevo })).status, 404);
  assert.equal((await req('PATCH', '/api/productos/' + productoId, { token: tokenAdmin, body: { precio: 25 } })).body.precio, 25);
  assert.equal((await req('DELETE', '/api/productos/999999', { token: tokenAdmin })).status, 404);
});

test('favoritos: 201, 409 duplicado, 404 producto, aislamiento entre usuarios, 204 al borrar', async () => {
  assert.equal((await req('POST', '/api/favoritos/' + productoId)).status, 401);
  assert.equal((await req('POST', '/api/favoritos/' + productoId, { token: tokenA })).status, 201);
  assert.equal((await req('POST', '/api/favoritos/' + productoId, { token: tokenA })).status, 409);
  assert.equal((await req('POST', '/api/favoritos/999999', { token: tokenA })).status, 404);
  assert.equal((await req('POST', '/api/favoritos/abc', { token: tokenA })).status, 400);

  const a = await req('GET', '/api/favoritos', { token: tokenA });
  assert.equal(a.status, 200);
  assert.equal(a.body.length, 1);
  assert.equal((await req('GET', '/api/favoritos', { token: tokenB })).body.length, 0);
  // B no puede borrar el favorito de A
  assert.equal((await req('DELETE', '/api/favoritos/' + productoId, { token: tokenB })).status, 404);
  assert.equal((await req('GET', '/api/favoritos', { token: tokenA })).body.length, 1);
  // B puede tener el mismo producto sin conflicto
  assert.equal((await req('POST', '/api/favoritos/' + productoId, { token: tokenB })).status, 201);
  assert.equal((await req('DELETE', '/api/favoritos/' + productoId, { token: tokenA })).status, 204);
  assert.equal((await req('DELETE', '/api/favoritos/' + productoId, { token: tokenA })).status, 404);
  assert.equal((await req('GET', '/api/favoritos', { token: tokenB })).body.length, 1);
});

test('admin borra producto => 204 y se elimina de favoritos (cascade)', async () => {
  assert.equal((await req('DELETE', '/api/productos/' + productoId, { token: tokenAdmin })).status, 204);
  assert.equal((await req('GET', '/api/productos/' + productoId)).status, 404);
  assert.equal((await req('GET', '/api/favoritos', { token: tokenB })).body.length, 0);
  productoId = null;
});

test('ruta inexistente => 404', async () => {
  assert.equal((await req('GET', '/api/nada')).status, 404);
});

