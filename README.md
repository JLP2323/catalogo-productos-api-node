# API REST – Catálogo de Productos con Favoritos y Roles

API backend para gestionar un catálogo de productos, con autenticación **JWT**, control de acceso por **roles** (`usuario` / `admin`) y **favoritos privados** por usuario. Proyecto académico (UNEMI) construido con **Node.js, Express 5 y PostgreSQL**.

## Funcionalidades
- **Registro público** (siempre con rol `usuario`; el rol nunca se toma del cliente) y **login** que emite un JWT con expiración.
- **Catálogo público** de solo lectura con filtros por categoría, texto y rango de precios.
- **CRUD de productos exclusivo del `admin`**; el admin inicial se crea con un script.
- **Favoritos** solo para usuarios autenticados, con **aislamiento total**: el usuario A no puede ver ni modificar los favoritos del usuario B.
- **Persistencia** en PostgreSQL: los datos sobreviven al reinicio del servidor.
- **Validaciones estrictas** en servidor y códigos HTTP correctos (200, 201, 204, 400, 401, 403, 404, 409).

## Tecnologías
| Componente | Uso |
|---|---|
| Node.js 22 + Express 5 | Servidor HTTP y enrutamiento |
| PostgreSQL + `pg` | Base de datos y consultas parametrizadas |
| `jsonwebtoken` | Emisión y verificación de JWT (HS256) |
| `bcryptjs` | Hash de contraseñas |
| `dotenv` | Configuración por variables de entorno |
| `node:test` + Postman/Newman | Pruebas automatizadas |

## Arquitectura
Arquitectura por capas: cada petición atraviesa **ruta → middlewares → controlador → base de datos**.

```
src/
├── config/env.js            # Lee y valida variables de entorno
├── db/
│   ├── pool.js              # Pool de conexiones PostgreSQL
│   ├── schema.sql           # Definición de tablas y restricciones
│   └── init.js              # Crea BD, tablas, admin inicial y productos de ejemplo
├── middlewares/
│   ├── auth.js              # Verifica JWT y carga el usuario (401)
│   ├── roles.js             # Control de acceso por rol (403)
│   ├── validators.js        # Validación de cuerpos, IDs y datos (400)
│   └── errorHandler.js      # 404 genérico y manejo centralizado de errores
├── controllers/             # Lógica de negocio
│   ├── authController.js
│   ├── productosController.js
│   └── favoritosController.js
├── routes/                  # Definición de endpoints
│   ├── authRoutes.js
│   ├── productosRoutes.js
│   └── favoritosRoutes.js
├── utils/httpError.js       # Error con código HTTP
├── app.js                   # Configuración de Express
└── server.js                # Arranque del servidor
tests/                       # Pruebas de integración y de persistencia
postman/                     # Colección de Postman
```

## Modelo de datos
- **usuarios**: `id`, `nombre`, `email` (único), `password` (hash bcrypt), `rol` (`usuario`|`admin`), `created_at`.
- **productos**: `id`, `nombre`, `descripcion`, `categoria`, `precio` (`CHECK precio > 0`), `created_at`.
- **favoritos**: `usuario_id`, `producto_id`, clave primaria compuesta (impide duplicados) y `ON DELETE CASCADE`.

## Instalación y puesta en marcha
Requisitos: Node.js ≥ 18 y PostgreSQL en ejecución.

```bash
npm install
cp .env.example .env     # en Windows: copy .env.example .env  (y editar valores)
npm run db:init          # crea BD, tablas, admin y 6 productos de ejemplo (repetible)
npm start                # http://localhost:3000
```

## Variables de entorno
Ver [.env.example](.env.example).

| Variable | Descripción |
|---|---|
| `PORT` | Puerto de la API (3000) |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Conexión a PostgreSQL (ajusta `DB_PORT` si no usas 5432) |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Secreto de firma y vigencia del token (ej. `1h`) |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Admin creado por `npm run db:init` |

##  Endpoints
| Método | Ruta | Acceso | Códigos |
|---|---|---|---|
| POST | `/api/auth/register` | Público (rol `usuario`) | 201, 400, 409 |
| POST | `/api/auth/login` | Público | 200, 400, 401 |
| GET | `/api/auth/me` | Token | 200, 401 |
| GET | `/api/productos?categoria=&q=&precio_min=&precio_max=` | Público | 200, 400 |
| GET | `/api/productos/:id` | Público | 200, 400, 404 |
| POST | `/api/productos` | Admin | 201, 400, 401, 403 |
| PUT / PATCH | `/api/productos/:id` | Admin | 200, 400, 401, 403, 404 |
| DELETE | `/api/productos/:id` | Admin | 204, 400, 401, 403, 404 |
| GET | `/api/favoritos` | Token (solo los propios) | 200, 401 |
| POST | `/api/favoritos/:productoId` | Token | 201, 400, 401, 404, 409 |
| DELETE | `/api/favoritos/:productoId` | Token | 204, 400, 401, 404 |

Enviar el token en `Authorization: Bearer <token>`.

## Seguridad
- Contraseñas con **bcrypt**; nunca se devuelven ni el password ni el hash.
- JWT firmado (HS256) con expiración; se rechazan tokens alterados, expirados o firmados con otro secreto (401).
- El rol vigente se consulta en BD en cada petición protegida.
- Consultas **parametrizadas** (sin inyección SQL) y validación estricta de entradas.
- Los favoritos se filtran siempre por el `id` del token, nunca por datos del cliente.
- Mensaje genérico en login fallido (no revela si el email existe).

## Pruebas
```bash
npm test                          # 9 pruebas de integración (requiere BD inicializada)
node tests/persistence.check.js   # reinicia el servidor y comprueba la persistencia
```
Colección Postman: `postman/catalogo_productos.postman_collection.json` (33 peticiones, 36 aserciones). Importarla y ejecutar con el Runner en orden; también con `npx newman run postman/catalogo_productos.postman_collection.json`.

## Ejemplos de uso
```bash
# Registro y login
curl -X POST localhost:3000/api/auth/register -H "Content-Type: application/json" \
  -d '{"nombre":"Ana","email":"ana@mail.com","password":"Password1"}'
curl -X POST localhost:3000/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"ana@mail.com","password":"Password1"}'

# Catálogo filtrado (público)
curl "localhost:3000/api/productos?categoria=Hogar&precio_max=100"

# Agregar favorito
curl -X POST localhost:3000/api/favoritos/1 -H "Authorization: Bearer <TOKEN>"
```

Admin por defecto (solo desarrollo): `admin@catalogo.com` / `Admin12345`. Cámbialo en `.env` antes de ejecutar `db:init` en cualquier entorno real.
