CREATE TABLE IF NOT EXISTS usuarios (
  id         SERIAL PRIMARY KEY,
  nombre     VARCHAR(100) NOT NULL,
  email      VARCHAR(255) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  rol        VARCHAR(10)  NOT NULL DEFAULT 'usuario' CHECK (rol IN ('usuario', 'admin')),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS productos (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(150)  NOT NULL,
  descripcion TEXT          NOT NULL DEFAULT '',
  categoria   VARCHAR(100)  NOT NULL,
  precio      NUMERIC(12,2) NOT NULL CHECK (precio > 0),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS favoritos (
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id)  ON DELETE CASCADE,
  producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (usuario_id, producto_id)
);

CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos (categoria);

