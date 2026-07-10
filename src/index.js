// perfumes-admin worker
// Rutas públicas:
//   GET    /api/perfumes
//   GET    /api/perfumes/:id
//   POST   /api/login
//   POST   /api/stats                (registrar vista/consulta)
// Rutas admin (requieren token):
//   POST   /api/perfumes
//   PUT    /api/perfumes/:id
//   DELETE /api/perfumes/:id
//   POST   /api/perfumes/:id/duplicar
//   POST   /api/upload
//   GET    /api/stats

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Filename",
};

const CATEGORIAS_VALIDAS = [
  "Florales", "Amaderadas", "Orientales", "Citricas",
  "Acuaticas", "Aromaticas", "Cueros", "Gourmand",
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function bytesToHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(hash);
}

function b64url(str) {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return atob(str);
}

async function hmacSign(payloadStr, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadStr));
  return b64url(String.fromCharCode(...new Uint8Array(sig)));
}

async function signToken(payload, secret) {
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = b64url(payloadStr);
  const sig = await hmacSign(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

async function verifyToken(token, secret) {
  if (!token) return null;
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;
  const expectedSig = await hmacSign(payloadB64, secret);
  if (expectedSig !== sig) return null;
  try {
    const payload = JSON.parse(b64urlDecode(payloadB64));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

async function requireAdmin(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  const payload = await verifyToken(token, env.JWT_SECRET);
  return payload && payload.role === "admin";
}

function rowToPerfume(row, imagenesPorPerfume) {
  return {
    id: row.id,
    nombre: row.nombre,
    marca: row.marca,
    categoria: row.categoria,
    precio: row.precio,
    precioDescuento: row.precio_descuento,
    enStock: !!row.en_stock,
    imagenUrl: row.imagen_url,
    imagenes: imagenesPorPerfume ? (imagenesPorPerfume[row.id] || []) : [],
    descripcion: row.descripcion,
    infoUrl: row.info_url,
    notas: row.notas,
  };
}

async function obtenerImagenesPorPerfume(env, ids) {
  if (ids.length === 0) return {};
  const placeholders = ids.map(() => "?").join(",");
  const { results } = await env.DB.prepare(
    `SELECT * FROM perfume_imagenes WHERE perfume_id IN (${placeholders}) ORDER BY orden ASC`
  )
    .bind(...ids)
    .all();
  const agrupado = {};
  for (const img of results) {
    if (!agrupado[img.perfume_id]) agrupado[img.perfume_id] = [];
    agrupado[img.perfume_id].push(img.url);
  }
  return agrupado;
}

async function guardarImagenes(env, perfumeId, imagenes) {
  await env.DB.prepare("DELETE FROM perfume_imagenes WHERE perfume_id = ?").bind(perfumeId).run();
  if (!Array.isArray(imagenes) || imagenes.length === 0) return;
  for (let i = 0; i < imagenes.length; i++) {
    await env.DB.prepare(
      "INSERT INTO perfume_imagenes (perfume_id, url, orden) VALUES (?, ?, ?)"
    )
      .bind(perfumeId, imagenes[i], i)
      .run();
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      // ---------- LOGIN ----------
      if (path === "/api/login" && method === "POST") {
        const { password } = await request.json();
        if (!password) return json({ error: "Falta la contraseña" }, 400);
        const hash = await sha256Hex(password);
        if (hash !== env.ADMIN_PASSWORD_HASH) {
          return json({ error: "Contraseña incorrecta" }, 401);
        }
        const token = await signToken(
          { role: "admin", exp: Date.now() + 1000 * 60 * 60 * 8 },
          env.JWT_SECRET
        );
        return json({ token });
      }

      // ---------- CONFIGURACIÓN DEL SITIO (público: leer) ----------
      if (path === "/api/config" && method === "GET") {
        const row = await env.DB.prepare("SELECT * FROM configuracion WHERE id = 1").first();
        const defaults = {
          whatsappNumero: "0000000000",
          whatsappMensaje: "Hola, ando buscando el (PERFUME), a cuanto está?",
          email: "etereaparfums@gmail.com",
          instagramUrl: "https://instagram.com/etereaparfums",
          heroEyebrow: "Oud · Ámbar · Incienso",
          heroTitulo: "Fragancias de Oriente, con la intensidad de la perfumería árabe.",
          heroParrafo:
            "Trabajamos con esencias importadas de casas árabes reconocidas por su fijación e intensidad: oud, ámbar, azafrán, incienso. Si no sabés cuál elegir, escribinos por WhatsApp y te ayudamos a decidir.",
          footerTagline: "Perfumería árabe importada. Oud, ámbar, azafrán, incienso.",
          colorPrincipal: "#8B6BAE",
          colorSecundario: "#C4A6E0",
          logoUrl: "favicon.png",
        };
        if (!row) return json(defaults);
        return json({
          whatsappNumero: row.whatsapp_numero || defaults.whatsappNumero,
          whatsappMensaje: row.whatsapp_mensaje || defaults.whatsappMensaje,
          email: row.email || defaults.email,
          instagramUrl: row.instagram_url || defaults.instagramUrl,
          heroEyebrow: row.hero_eyebrow || defaults.heroEyebrow,
          heroTitulo: row.hero_titulo || defaults.heroTitulo,
          heroParrafo: row.hero_parrafo || defaults.heroParrafo,
          footerTagline: row.footer_tagline || defaults.footerTagline,
          colorPrincipal: row.color_principal || defaults.colorPrincipal,
          colorSecundario: row.color_secundario || defaults.colorSecundario,
          logoUrl: row.logo_url || defaults.logoUrl,
        });
      }

      // A partir de acá, todo requiere admin
      const isAdmin = await requireAdmin(request, env);

      // ---------- CONFIGURACIÓN DEL SITIO (admin: guardar) ----------
      if (path === "/api/config" && method === "PUT") {
        if (!isAdmin) return json({ error: "No autorizado" }, 401);
        const b = await request.json();
        await env.DB.prepare(
          `INSERT INTO configuracion (id, whatsapp_numero, whatsapp_mensaje, email, instagram_url, hero_eyebrow, hero_titulo, hero_parrafo, footer_tagline, color_principal, color_secundario, logo_url)
           VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             whatsapp_numero=excluded.whatsapp_numero,
             whatsapp_mensaje=excluded.whatsapp_mensaje,
             email=excluded.email,
             instagram_url=excluded.instagram_url,
             hero_eyebrow=excluded.hero_eyebrow,
             hero_titulo=excluded.hero_titulo,
             hero_parrafo=excluded.hero_parrafo,
             footer_tagline=excluded.footer_tagline,
             color_principal=excluded.color_principal,
             color_secundario=excluded.color_secundario,
             logo_url=excluded.logo_url`
        )
          .bind(
            b.whatsappNumero ?? null,
            b.whatsappMensaje ?? null,
            b.email ?? null,
            b.instagramUrl ?? null,
            b.heroEyebrow ?? null,
            b.heroTitulo ?? null,
            b.heroParrafo ?? null,
            b.footerTagline ?? null,
            b.colorPrincipal ?? null,
            b.colorSecundario ?? null,
            b.logoUrl ?? null
          )
          .run();
        return json({ ok: true });
      }

      // ---------- CATEGORÍAS DISPONIBLES ----------
      if (path === "/api/categorias" && method === "GET") {
        return json(CATEGORIAS_VALIDAS);
      }

      // ---------- REGISTRAR ESTADÍSTICA (público) ----------
      if (path === "/api/stats" && method === "POST") {
        const b = await request.json();
        if (!b.perfumeId || !["vista", "consulta"].includes(b.tipo)) {
          return json({ error: "Datos inválidos" }, 400);
        }
        await env.DB.prepare("INSERT INTO estadisticas (perfume_id, tipo) VALUES (?, ?)")
          .bind(b.perfumeId, b.tipo)
          .run();
        return json({ ok: true });
      }

      // ---------- LISTAR ----------
      if (path === "/api/perfumes" && method === "GET") {
        const soloStock = url.searchParams.get("stock") === "1";
        const query = soloStock
          ? "SELECT * FROM perfumes WHERE en_stock = 1 ORDER BY creado_en DESC"
          : "SELECT * FROM perfumes ORDER BY creado_en DESC";
        const { results } = await env.DB.prepare(query).all();
        const ids = results.map((r) => r.id);
        const imagenesPorPerfume = await obtenerImagenesPorPerfume(env, ids);
        return json(results.map((r) => rowToPerfume(r, imagenesPorPerfume)));
      }

      // ---------- GET UNO ----------
      const getMatch = path.match(/^\/api\/perfumes\/(\d+)$/);
      if (getMatch && method === "GET") {
        const row = await env.DB.prepare("SELECT * FROM perfumes WHERE id = ?")
          .bind(getMatch[1])
          .first();
        if (!row) return json({ error: "No encontrado" }, 404);
        const imagenesPorPerfume = await obtenerImagenesPorPerfume(env, [row.id]);
        return json(rowToPerfume(row, imagenesPorPerfume));
      }

      // ---------- IA: RECOMENDADOR (público) ----------
      if (path === "/api/ia/recomendar" && method === "POST") {
        const { consulta } = await request.json();
        if (!consulta || !consulta.trim()) {
          return json({ error: "Contame qué estás buscando" }, 400);
        }
        const { results: perfumes } = await env.DB.prepare(
          "SELECT id, nombre, marca, categoria, notas, descripcion FROM perfumes WHERE en_stock = 1"
        ).all();

        if (perfumes.length === 0) {
          return json({ recomendados: [], mensaje: "Todavía no hay perfumes cargados con stock." });
        }

        const listaTexto = perfumes
          .slice(0, 60)
          .map((p) => {
            let notasTexto = "";
            try {
              const n = JSON.parse(p.notas || "{}");
              notasTexto = [...(n.salida || []), ...(n.corazon || []), ...(n.fondo || [])].join(", ");
            } catch (e) {
              notasTexto = p.notas || "";
            }
            return `ID ${p.id}: "${p.nombre}" de ${p.marca}, familia ${p.categoria || "sin especificar"}, notas: ${notasTexto || "sin especificar"}${p.descripcion ? `, descripción: ${p.descripcion}` : ""}`;
          })
          .join("\n");

        try {
          // Paso 1: clasificación simple y aislada (SI/NO), más confiable para un modelo chico
          const clasificacion = await env.AI.run("@cf/meta/llama-3.2-3b-instruct", {
            messages: [
              {
                role: "system",
                content:
                  "Respondés únicamente con una palabra: SI o NO. Nada más, sin explicación. Tu criterio: aceptás cualquier pedido informal, vago o breve que un cliente real podría escribir buscando un perfume, aunque no sea muy específico. Rechazás solo lo que claramente no tiene que ver con perfumes, o lo que suena a chiste/broma/contexto absurdo.",
              },
              {
                role: "user",
                content: `Un cliente de una perfumería escribió esto en el buscador: "${consulta}"\n\nEjemplos que son SI (pedidos informales pero reales, aceptalos aunque sean vagos): "que le guste a las mujeres", "que le guste a todos", "que me guste a mí", "algo lindo", "un clásico", "recomendame algo", "sorprendeme", "para un regalo", "algo que no falle", "el más vendido", "para hombre", "algo diferente", "para mi novia", "para salir de noche".\n\nEjemplos que son NO (no tienen que ver con elegir un perfume, o son un chiste/broma/contexto absurdo): "una receta de comida", "ayudame con la tarea", "para la cárcel", "para la guerra", "para el fin del mundo", código, matemática, chistes.\n\nRespondé solo SI o NO.`,
              },
            ],
            max_tokens: 5,
            temperature: 0,
          });

          const textoClasificacion =
            typeof clasificacion.response === "string" ? clasificacion.response : JSON.stringify(clasificacion.response ?? "");
          const aplica = /^\s*s[ií]/i.test(textoClasificacion.trim());

          if (!aplica) {
            return json({ recomendados: [], fueraDeTema: true });
          }

          // Paso 2: recién acá se pide la recomendación en sí
          const prompt = `Este es el catálogo disponible, con datos reales de cada perfume:\n${listaTexto}\n\nEl cliente escribió: "${consulta}"\n\nRespondé ÚNICAMENTE con este JSON (sin texto extra, sin markdown):\n{"recomendados":[{"id":123,"motivo":"..."}]}\nElegí como máximo 3 perfumes del catálogo que mejor encajen, basándote ÚNICAMENTE en las notas y descripciones reales de arriba — no inventes notas ni características que no estén en los datos. Si solo hay 1 disponible que encaje de verdad, recomendá solo ese. Si ninguno encaja bien de verdad, devolvé la lista vacía en vez de forzar una recomendación. El "motivo" debe tener entre 20 y 35 palabras, citando notas o elementos concretos del catálogo que justifiquen la elección. Tono natural, como alguien del oficio — nada de frases publicitarias, nada de signos de exclamación.`;

          const respuestaIA = await env.AI.run("@cf/meta/llama-3.2-3b-instruct", {
            messages: [
              {
                role: "system",
                content:
                  "Sos un perfumista argentino con años de oficio. Hablás en español rioplatense, directo y con criterio real, nunca en tono de folleto publicitario. Solo recomendás en base a los datos reales del catálogo que te dan, nunca inventás notas o características que no estén ahí. Nunca mencionás que sos una inteligencia artificial.",
              },
              { role: "user", content: prompt },
            ],
            max_tokens: 450,
            temperature: 0.3,
          });

          let textoRespuesta =
            typeof respuestaIA.response === "string"
              ? respuestaIA.response
              : JSON.stringify(respuestaIA.response ?? respuestaIA ?? "");
          const match = textoRespuesta.match(/\{[\s\S]*\}/);
          const parsed = match ? JSON.parse(match[0]) : { recomendados: [] };

          if (parsed.fueraDeTema) {
            return json({ recomendados: [], fueraDeTema: true });
          }

          const idsRecomendados = (parsed.recomendados || []).map((r) => ({
            id: r.id,
            motivo: r.motivo,
          }));

          const perfumesCompletos = [];
          for (const rec of idsRecomendados) {
            const p = perfumes.find((x) => x.id === rec.id);
            if (p) perfumesCompletos.push({ id: p.id, nombre: p.nombre, marca: p.marca, motivo: rec.motivo });
          }

          return json({ recomendados: perfumesCompletos });
        } catch (err) {
          return json({ error: "No se pudo generar la recomendación. Probá de nuevo.", detalle: String(err) }, 500);
        }
      }

      // A partir de acá, todo requiere admin (ya está definido isAdmin más arriba)

      // ---------- IA: GENERAR DESCRIPCIÓN (admin) ----------
      if (path === "/api/ia/descripcion" && method === "POST") {
        if (!isAdmin) return json({ error: "No autorizado" }, 401);
        const b = await request.json();
        const notasTexto = [b.salida, b.corazon, b.fondo]
          .filter((arr) => Array.isArray(arr) && arr.length > 0)
          .map((arr, i) => `${["Salida", "Corazón", "Fondo"][i]}: ${arr.join(", ")}`)
          .join(". ");

        // Si hay un link de referencia (Fragantica, etc.), lo leemos para basar la descripción en info real
        let infoOnline = "";
        if (b.infoUrl && /^https?:\/\//i.test(b.infoUrl)) {
          try {
            const paginaRes = await fetch(b.infoUrl, {
              headers: { "User-Agent": "Mozilla/5.0 (compatible; EtereaBot/1.0)" },
            });
            if (paginaRes.ok) {
              const html = await paginaRes.text();
              const textoPlano = html
                .replace(/<script[\s\S]*?<\/script>/gi, " ")
                .replace(/<style[\s\S]*?<\/style>/gi, " ")
                .replace(/<[^>]+>/g, " ")
                .replace(/&nbsp;|&amp;|&quot;|&#\d+;/g, " ")
                .replace(/\s+/g, " ")
                .trim();
              infoOnline = textoPlano.slice(0, 2500);
            }
          } catch (e) {
            // si falla la lectura de la página, seguimos sin esa info, no es crítico
          }
        }

        const prompt = `Escribí una descripción de venta de 2 a 3 oraciones (máximo 55 palabras) para este perfume:\nNombre: ${b.nombre || "sin especificar"}\nMarca: ${b.marca || "sin especificar"}\nFamilia olfativa: ${b.categoria || "sin especificar"}\nNotas: ${notasTexto || "sin especificar"}\n${infoOnline ? `\nInformación de referencia encontrada online sobre este perfume (usala para que la descripción sea precisa, no inventes datos que la contradigan):\n${infoOnline}\n` : ""}\nRespondé SOLO con el texto de la descripción, sin comillas, sin título, sin explicaciones extra, sin signos de exclamación.`;

        try {
          const respuestaIA = await env.AI.run("@cf/meta/llama-3.2-3b-instruct", {
            messages: [
              {
                role: "system",
                content:
                  "Sos un redactor de perfumería árabe de lujo con oficio real, no un generador de frases de marketing. Escribís en español rioplatense (Argentina), con frases concretas y sensoriales. Si te dan información de referencia real sobre el perfume, te basás en eso en vez de inventar. Evitás por completo clichés publicitarios como 'sumergite en', 'una experiencia única', 'indulgite', 'cautivador', 'te invita a', y evitás signos de exclamación y superlativos vacíos. Nunca mencionás que sos una inteligencia artificial.",
              },
              { role: "user", content: prompt },
            ],
            max_tokens: 130,
          });
          let texto =
            typeof respuestaIA.response === "string"
              ? respuestaIA.response.trim()
              : JSON.stringify(respuestaIA.response ?? "").trim();
          texto = texto.replace(/^["']|["']$/g, "").trim();
          return json({ descripcion: texto });
        } catch (err) {
          return json({ error: "No se pudo generar la descripción. Probá de nuevo.", detalle: String(err) }, 500);
        }
      }

      // ---------- ESTADÍSTICAS (admin) ----------
      if (path === "/api/stats" && method === "GET") {
        if (!isAdmin) return json({ error: "No autorizado" }, 401);
        const { results: vistas } = await env.DB.prepare(
          `SELECT perfume_id, COUNT(*) as total FROM estadisticas WHERE tipo = 'vista' GROUP BY perfume_id`
        ).all();
        const { results: consultas } = await env.DB.prepare(
          `SELECT perfume_id, COUNT(*) as total FROM estadisticas WHERE tipo = 'consulta' GROUP BY perfume_id`
        ).all();
        const { results: perfumes } = await env.DB.prepare("SELECT id, nombre, marca FROM perfumes").all();

        const nombreDe = {};
        perfumes.forEach((p) => (nombreDe[p.id] = `${p.nombre} (${p.marca})`));

        const vistasMap = {};
        vistas.forEach((v) => (vistasMap[v.perfume_id] = v.total));
        const consultasMap = {};
        consultas.forEach((c) => (consultasMap[c.perfume_id] = c.total));

        const ranking = perfumes
          .map((p) => ({
            id: p.id,
            nombre: nombreDe[p.id],
            vistas: vistasMap[p.id] || 0,
            consultas: consultasMap[p.id] || 0,
          }))
          .sort((a, b) => b.consultas - a.consultas || b.vistas - a.vistas);

        return json({
          totalVistas: vistas.reduce((acc, v) => acc + v.total, 0),
          totalConsultas: consultas.reduce((acc, c) => acc + c.total, 0),
          ranking,
        });
      }

      // ---------- CREAR ----------
      if (path === "/api/perfumes" && method === "POST") {
        if (!isAdmin) return json({ error: "No autorizado" }, 401);
        const b = await request.json();
        if (!b.nombre || !b.marca || b.precio == null) {
          return json({ error: "Faltan campos obligatorios (nombre, marca, precio)" }, 400);
        }
        const result = await env.DB.prepare(
          `INSERT INTO perfumes (nombre, marca, categoria, precio, precio_descuento, en_stock, imagen_url, descripcion, info_url, notas)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            b.nombre,
            b.marca,
            b.categoria ?? null,
            b.precio,
            b.precioDescuento ?? null,
            b.enStock ? 1 : 0,
            b.imagenUrl ?? null,
            b.descripcion ?? null,
            b.infoUrl ?? null,
            b.notas ?? null
          )
          .run();
        const nuevoId = result.meta.last_row_id;
        if (Array.isArray(b.imagenes)) {
          await guardarImagenes(env, nuevoId, b.imagenes);
        }
        return json({ id: nuevoId }, 201);
      }

      // ---------- EDITAR ----------
      const putMatch = path.match(/^\/api\/perfumes\/(\d+)$/);
      if (putMatch && method === "PUT") {
        if (!isAdmin) return json({ error: "No autorizado" }, 401);
        const id = putMatch[1];
        const b = await request.json();
        await env.DB.prepare(
          `UPDATE perfumes SET nombre=?, marca=?, categoria=?, precio=?, precio_descuento=?, en_stock=?, imagen_url=?, descripcion=?, info_url=?, notas=?
           WHERE id=?`
        )
          .bind(
            b.nombre,
            b.marca,
            b.categoria ?? null,
            b.precio,
            b.precioDescuento ?? null,
            b.enStock ? 1 : 0,
            b.imagenUrl ?? null,
            b.descripcion ?? null,
            b.infoUrl ?? null,
            b.notas ?? null,
            id
          )
          .run();
        if (Array.isArray(b.imagenes)) {
          await guardarImagenes(env, id, b.imagenes);
        }
        return json({ ok: true });
      }

      // ---------- DUPLICAR ----------
      const dupMatch = path.match(/^\/api\/perfumes\/(\d+)\/duplicar$/);
      if (dupMatch && method === "POST") {
        if (!isAdmin) return json({ error: "No autorizado" }, 401);
        const original = await env.DB.prepare("SELECT * FROM perfumes WHERE id = ?")
          .bind(dupMatch[1])
          .first();
        if (!original) return json({ error: "No encontrado" }, 404);
        const result = await env.DB.prepare(
          `INSERT INTO perfumes (nombre, marca, categoria, precio, precio_descuento, en_stock, imagen_url, descripcion, info_url, notas)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            `${original.nombre} (copia)`,
            original.marca,
            original.categoria,
            original.precio,
            original.precio_descuento,
            original.en_stock,
            original.imagen_url,
            original.descripcion,
            original.info_url,
            original.notas
          )
          .run();
        const nuevoId = result.meta.last_row_id;
        const { results: imgs } = await env.DB.prepare(
          "SELECT url, orden FROM perfume_imagenes WHERE perfume_id = ?"
        )
          .bind(dupMatch[1])
          .all();
        for (const img of imgs) {
          await env.DB.prepare(
            "INSERT INTO perfume_imagenes (perfume_id, url, orden) VALUES (?, ?, ?)"
          )
            .bind(nuevoId, img.url, img.orden)
            .run();
        }
        return json({ id: nuevoId }, 201);
      }

      // ---------- BORRAR ----------
      const delMatch = path.match(/^\/api\/perfumes\/(\d+)$/);
      if (delMatch && method === "DELETE") {
        if (!isAdmin) return json({ error: "No autorizado" }, 401);
        await env.DB.prepare("DELETE FROM perfume_imagenes WHERE perfume_id = ?").bind(delMatch[1]).run();
        await env.DB.prepare("DELETE FROM estadisticas WHERE perfume_id = ?").bind(delMatch[1]).run();
        await env.DB.prepare("DELETE FROM perfumes WHERE id = ?").bind(delMatch[1]).run();
        return json({ ok: true });
      }

      // ---------- SUBIR IMAGEN ----------
      if (path === "/api/upload" && method === "POST") {
        if (!isAdmin) return json({ error: "No autorizado" }, 401);
        const contentType = request.headers.get("Content-Type") || "image/jpeg";
        const ext = contentType.includes("png") ? "png" : "jpg";
        const key = `perfumes/${crypto.randomUUID()}.${ext}`;
        const body = await request.arrayBuffer();
        await env.IMAGES.put(key, body, { httpMetadata: { contentType } });
        const publicUrl = `${env.PUBLIC_IMAGE_BASE_URL}/${key}`;
        return json({ url: publicUrl });
      }

      return json({ error: "No encontrado" }, 404);
    } catch (err) {
      return json({ error: "Error interno", detalle: String(err) }, 500);
    }
  },
};
