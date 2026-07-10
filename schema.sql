CREATE TABLE IF NOT EXISTS perfumes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  marca TEXT NOT NULL,
  categoria TEXT,
  precio REAL NOT NULL,
  precio_descuento REAL,
  en_stock INTEGER NOT NULL DEFAULT 1,
  imagen_url TEXT,
  descripcion TEXT,
  info_url TEXT,
  notas TEXT,
  creado_en TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS perfume_imagenes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  perfume_id INTEGER NOT NULL,
  url TEXT NOT NULL,
  orden INTEGER DEFAULT 0,
  FOREIGN KEY (perfume_id) REFERENCES perfumes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS estadisticas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  perfume_id INTEGER NOT NULL,
  tipo TEXT NOT NULL,
  fecha TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (perfume_id) REFERENCES perfumes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_perfumes_marca ON perfumes(marca);
CREATE INDEX IF NOT EXISTS idx_perfumes_stock ON perfumes(en_stock);
CREATE INDEX IF NOT EXISTS idx_perfumes_categoria ON perfumes(categoria);
CREATE INDEX IF NOT EXISTS idx_imagenes_perfume ON perfume_imagenes(perfume_id);
CREATE INDEX IF NOT EXISTS idx_stats_perfume ON estadisticas(perfume_id);
CREATE INDEX IF NOT EXISTS idx_stats_tipo ON estadisticas(tipo);

CREATE TABLE IF NOT EXISTS configuracion (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  whatsapp_numero TEXT,
  whatsapp_mensaje TEXT,
  email TEXT,
  instagram_url TEXT,
  hero_eyebrow TEXT,
  hero_titulo TEXT,
  hero_parrafo TEXT,
  footer_tagline TEXT,
  color_principal TEXT,
  color_secundario TEXT,
  logo_url TEXT
);
