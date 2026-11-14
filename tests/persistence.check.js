// Demuestra persistencia: crea datos, reinicia el servidor y comprueba que siguen.
const { spawn } = require('child_process');
const PORT = 3999;
const base = `http://localhost:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function arrancar() {
  const p = spawn('node', ['src/server.js'], { env: { ...process.env, PORT }, stdio: 'ignore' });
  for (let i = 0; i < 30; i++) {
    try { if ((await fetch(base + '/health')).ok) return p; } catch {}
    await sleep(200);
  }
  throw new Error('no arrancó');
}
const j = (m, path, token, body) =>
  fetch(base + path, { method: m, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: 'Bearer ' + token }) }, body: body && JSON.stringify(body) }).then(async (r) => ({ s: r.status, b: r.status === 204 ? null : await r.json() }));

(async () => {
  const email = `persist_${Date.now()}@test.com`;
  let p = await arrancar();
  await j('POST', '/api/auth/register', null, { nombre: 'Persist', email, password: 'Password1' });
  const t = (await j('POST', '/api/auth/login', null, { email, password: 'Password1' })).b.token;
  await j('POST', '/api/favoritos/1', t);
  p.kill(); await sleep(500);
  p = await arrancar();
  const login = await j('POST', '/api/auth/login', null, { email, password: 'Password1' });
  const favs = await j('GET', '/api/favoritos', login.b.token);
  const prods = await j('GET', '/api/productos');
  console.log('login tras reinicio:', login.s, '| favoritos:', favs.b.length, '| productos:', prods.b.length);
  p.kill();
  process.exit(login.s === 200 && favs.b.length === 1 && prods.b.length >= 5 ? 0 : 1);
})();

