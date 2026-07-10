let TODOS = [];
let CONFIG = {};

async function cargarConfiguracion() {
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

  try {
    const res = await fetch(`${API_URL}/api/config`);
    CONFIG = res.ok ? await res.json() : defaults;
  } catch (e) {
    CONFIG = defaults;
  }

  aplicarConfiguracionAlDOM();
}

function aplicarConfiguracionAlDOM() {
  const eyebrow = document.getElementById("heroEyebrow");
  const titulo = document.getElementById("heroTitulo");
  const parrafo = document.getElementById("heroParrafo");
  const footerTagline = document.getElementById("footerTagline");
  const footerWhatsapp = document.getElementById("footerWhatsapp");
  const footerInstagram = document.getElementById("footerInstagram");
  const footerEmail = document.getElementById("footerEmail");
  const footerLogo = document.getElementById("footerLogo");
  const headerLogo = document.getElementById("headerLogo");

  if (eyebrow) eyebrow.textContent = CONFIG.heroEyebrow;
  if (titulo) titulo.textContent = CONFIG.heroTitulo;
  if (parrafo) parrafo.textContent = CONFIG.heroParrafo;
  if (footerTagline) footerTagline.textContent = CONFIG.footerTagline;
  if (footerWhatsapp) footerWhatsapp.href = whatsappLinkBase();
  if (footerInstagram && CONFIG.instagramUrl) {
    footerInstagram.href = CONFIG.instagramUrl;
    footerInstagram.style.display = "inline";
  } else if (footerInstagram) {
    footerInstagram.style.display = "none";
  }
  if (footerEmail && CONFIG.email) {
    footerEmail.href = `mailto:${CONFIG.email}`;
    footerEmail.textContent = CONFIG.email;
    footerEmail.style.display = "inline";
  } else if (footerEmail) {
    footerEmail.style.display = "none";
  }
  if (footerLogo && CONFIG.logoUrl) footerLogo.src = CONFIG.logoUrl;
  if (headerLogo && CONFIG.logoUrl) headerLogo.src = CONFIG.logoUrl;

  if (CONFIG.colorPrincipal) document.documentElement.style.setProperty("--gold", CONFIG.colorPrincipal);
  if (CONFIG.colorSecundario) document.documentElement.style.setProperty("--gold-soft", CONFIG.colorSecundario);
}

function whatsappLinkBase() {
  return `https://wa.me/${CONFIG.whatsappNumero}`;
}

async function cargarPerfumes() {
  const cont = document.getElementById("catalogo");
  try {
    const res = await fetch(`${API_URL}/api/perfumes`);
    if (!res.ok) throw new Error("Respuesta no OK");
    TODOS = await res.json();
    poblarMarcas(TODOS);
    poblarCategorias(TODOS);
    render(TODOS);
  } catch (e) {
    cont.innerHTML = `<div class="empty-state">No se pudo cargar el catálogo. Verificá tu conexión e intentá de nuevo.</div>`;
  }
}

function poblarMarcas(lista) {
  const sel = document.getElementById("filtroMarca");
  sel.querySelectorAll("option:not(:first-child)").forEach((o) => o.remove());
  const marcas = [...new Set(lista.map((p) => p.marca).filter(Boolean))].sort();
  marcas.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    sel.appendChild(opt);
  });
}

function poblarCategorias(lista) {
  const sel = document.getElementById("filtroCategoria");
  sel.querySelectorAll("option:not(:first-child)").forEach((o) => o.remove());
  const categorias = [...new Set(lista.map((p) => p.categoria).filter(Boolean))].sort();
  categorias.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    sel.appendChild(opt);
  });
}

function fotosDe(p) {
  if (Array.isArray(p.imagenes) && p.imagenes.length > 0) return p.imagenes;
  if (p.imagenUrl) return [p.imagenUrl];
  return [];
}

function piramideDe(p) {
  if (!p.notas) return { salida: [], corazon: [], fondo: [] };
  try {
    const obj = JSON.parse(p.notas);
    if (obj && (obj.salida || obj.corazon || obj.fondo)) {
      return { salida: obj.salida || [], corazon: obj.corazon || [], fondo: obj.fondo || [] };
    }
  } catch (e) {
    // formato viejo: texto separado por comas, se muestra todo junto
  }
  const viejo = p.notas.split(",").map((n) => n.trim()).filter(Boolean);
  return { salida: [], corazon: viejo, fondo: [] };
}

function piramideTieneAlgo(piramide) {
  return piramide.salida.length > 0 || piramide.corazon.length > 0 || piramide.fondo.length > 0;
}

function tagsHtml(lista) {
  return lista.map((n) => `<span class="tag">${n}</span>`).join("");
}

// Versión compacta para la card chica (todo mezclado, sin etiquetas de grupo)
function notasCompactasDe(p) {
  const piramide = piramideDe(p);
  return [...piramide.salida, ...piramide.corazon, ...piramide.fondo];
}

let aromasActivos = [];

function todosLosAromas(lista) {
  const set = new Set();
  lista.forEach((p) => notasCompactasDe(p).forEach((n) => set.add(n)));
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
}

function mostrarSugerenciasAromas(texto) {
  const cont = document.getElementById("aromasSugerencias");
  if (!texto.trim()) {
    cont.classList.remove("visible");
    cont.innerHTML = "";
    return;
  }
  const q = texto.trim().toLowerCase();
  const coincidencias = todosLosAromas(TODOS)
    .filter((a) => a.toLowerCase().includes(q) && !aromasActivos.includes(a))
    .slice(0, 8);

  if (coincidencias.length === 0) {
    cont.innerHTML = `<div class="sin-resultados">Sin resultados</div>`;
  } else {
    cont.innerHTML = coincidencias
      .map((a) => `<div class="sugerencia" data-aroma="${a}">${a}</div>`)
      .join("");
    cont.querySelectorAll(".sugerencia").forEach((el) => {
      el.addEventListener("click", () => agregarAroma(el.dataset.aroma));
    });
  }
  cont.classList.add("visible");
}

function agregarAroma(aroma) {
  if (!aromasActivos.includes(aroma)) aromasActivos.push(aroma);
  const input = document.getElementById("buscarAroma");
  input.value = "";
  document.getElementById("aromasSugerencias").classList.remove("visible");
  document.getElementById("aromasSugerencias").innerHTML = "";
  renderChipsAromas();
  aplicarFiltros();
}

function quitarAroma(aroma) {
  aromasActivos = aromasActivos.filter((a) => a !== aroma);
  renderChipsAromas();
  aplicarFiltros();
}

function renderChipsAromas() {
  const fila = document.getElementById("aromasActivosFila");
  fila.innerHTML = aromasActivos
    .map((a) => `<span class="aroma-activo-chip">${a} <button type="button" data-quitar="${a}">×</button></span>`)
    .join("");
  fila.querySelectorAll("[data-quitar]").forEach((btn) => {
    btn.addEventListener("click", () => quitarAroma(btn.dataset.quitar));
  });
}

document.getElementById("buscarAroma").addEventListener("input", (e) => {
  mostrarSugerenciasAromas(e.target.value);
});

document.addEventListener("click", (e) => {
  const wrap = document.querySelector(".filtro-aromas-wrap");
  if (wrap && !wrap.contains(e.target)) {
    document.getElementById("aromasSugerencias").classList.remove("visible");
  }
});

function registrarStat(perfumeId, tipo) {
  fetch(`${API_URL}/api/stats`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ perfumeId, tipo }),
  }).catch(() => {});
}

// ---------- Recomendador de IA ----------
async function pedirRecomendacionIA() {
  const consulta = document.getElementById("iaConsulta").value.trim();
  const cont = document.getElementById("iaResultados");
  if (!consulta) return;

  cont.innerHTML = `<div class="ia-cargando">Pensando en algo para vos...</div>`;

  const controlador = new AbortController();
  const timeoutId = setTimeout(() => controlador.abort(), 20000);

  try {
    const res = await fetch(`${API_URL}/api/ia/recomendar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consulta }),
      signal: controlador.signal,
    });
    clearTimeout(timeoutId);
    const data = await res.json();

    if (!res.ok) {
      cont.innerHTML = `<div class="ia-error">${data.error || "No se pudo generar la recomendación."}</div>`;
      return;
    }

    if (data.fueraDeTema) {
      cont.innerHTML = `<div class="ia-cargando">No puedo ayudarte con eso — contame qué perfume estás buscando y te tiro opciones 🙂</div>`;
      return;
    }

    if (!data.recomendados || data.recomendados.length === 0) {
      cont.innerHTML = `<div class="ia-cargando">${data.mensaje || "No encontramos algo que encaje bien. Probá describirlo distinto."}</div>`;
      return;
    }

    cont.innerHTML = data.recomendados
      .map((r) => {
        const pCompleto = TODOS.find((p) => p.id === r.id);
        const foto = pCompleto ? (fotosDe(pCompleto)[0] || "") : "";
        return `
          <div class="ia-sugerencia-card" data-id="${r.id}">
            ${foto ? `<img src="${foto}" alt="${r.nombre}">` : ""}
            <div class="ia-sugerencia-info">
              <div class="nombre">${r.nombre} — ${r.marca}</div>
              <div class="motivo">${r.motivo || ""}</div>
            </div>
          </div>
        `;
      })
      .join("");

    cont.querySelectorAll(".ia-sugerencia-card").forEach((card) => {
      card.addEventListener("click", () => {
        const p = TODOS.find((x) => x.id === parseInt(card.dataset.id, 10));
        if (p) abrirModal(p);
      });
    });
  } catch (e) {
    clearTimeout(timeoutId);
    if (e.name === "AbortError") {
      cont.innerHTML = `<div class="ia-error">Tardó demasiado en responder. Probá de nuevo.</div>`;
    } else {
      cont.innerHTML = `<div class="ia-error">No se pudo conectar. Intentá de nuevo.</div>`;
    }
  }
}

document.getElementById("iaBoton").addEventListener("click", pedirRecomendacionIA);
document.getElementById("iaConsulta").addEventListener("keydown", (e) => {
  if (e.key === "Enter") pedirRecomendacionIA();
});

function render(lista) {
  const cont = document.getElementById("catalogo");
  if (lista.length === 0) {
    cont.innerHTML = `<div class="empty-state">No encontramos perfumes con esos filtros.</div>`;
    return;
  }
  cont.innerHTML = lista.map(cardHtml).join("");

  lista.forEach((p) => registrarStat(p.id, "vista"));

  lista.forEach((p) => {
    const fotos = fotosDe(p);
    if (fotos.length <= 1) return;
    const dots = document.querySelectorAll(`#dots-${p.id} span`);
    dots.forEach((dot, i) => {
      dot.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const img = document.getElementById(`img-${p.id}`);
        if (img) img.src = fotos[i];
        dots.forEach((d, di) => d.classList.toggle("activo", di === i));
      });
    });
  });

  lista.forEach((p) => {
    const card = document.querySelector(`.card[data-id="${p.id}"]`);
    if (card) card.addEventListener("click", () => abrirModal(p));
  });
}

// ---------- Modal de detalle ----------
function abrirModal(p) {
  const overlay = document.getElementById("modalOverlay");
  const fotos = fotosDe(p);
  const piramide = piramideDe(p);
  const tieneDescuento = p.precioDescuento != null && p.precioDescuento < p.precio;
  const precioMostrar = tieneDescuento ? p.precioDescuento : p.precio;
  const mensaje = encodeURIComponent(CONFIG.whatsappMensaje.replace("(PERFUME)", p.nombre));
  const waLink = `${whatsappLinkBase()}?text=${mensaje}`;

  const dotsHtml =
    fotos.length > 1
      ? `<div class="card-gallery-dots" id="modalDots">${fotos
          .map((_, i) => `<span class="${i === 0 ? "activo" : ""}"></span>`)
          .join("")}</div>`
      : "";

  const notasHtml = piramideTieneAlgo(piramide)
    ? `<div class="modal-notas-grupos">
        ${piramide.salida.length ? `<div class="modal-notas-grupo"><span class="modal-notas-etiqueta">Salida</span><div class="modal-notas">${tagsHtml(piramide.salida)}</div></div>` : ""}
        ${piramide.corazon.length ? `<div class="modal-notas-grupo"><span class="modal-notas-etiqueta">Corazón</span><div class="modal-notas">${tagsHtml(piramide.corazon)}</div></div>` : ""}
        ${piramide.fondo.length ? `<div class="modal-notas-grupo"><span class="modal-notas-etiqueta">Fondo</span><div class="modal-notas">${tagsHtml(piramide.fondo)}</div></div>` : ""}
      </div>`
    : "";

  const descHtml = p.descripcion
    ? `<div>
        <div class="modal-desc-titulo">Descripción</div>
        <div class="modal-descripcion">${p.descripcion}</div>
      </div>`
    : "";

  overlay.innerHTML = `
    <div class="modal-overlay" id="overlayClick">
      <div class="modal-content">
        <button class="modal-close" id="modalCloseBtn">×</button>
        <div class="modal-galeria">
          ${fotos[0] ? `<img id="modalImg" src="${fotos[0]}" alt="${p.nombre}">` : ""}
          ${dotsHtml}
        </div>
        <div class="modal-body">
          <div class="modal-scroll">
            <div class="modal-marca">${p.marca}</div>
            <div class="modal-nombre">${p.nombre}</div>
            <div class="modal-meta-row">
              ${p.categoria ? `<span class="modal-cat">${p.categoria}</span>` : ""}
              <span class="modal-stock ${p.enStock ? "si-hay" : "no-hay"}">${p.enStock ? "● Con stock" : "● Sin stock"}</span>
            </div>
            <div class="modal-precio ${tieneDescuento ? "con-descuento" : ""}">
              <span class="precio-actual">$${precioMostrar.toLocaleString("es-AR")}</span>
              ${tieneDescuento ? `<span class="precio-tachado">$${p.precio.toLocaleString("es-AR")}</span>` : ""}
            </div>
            ${notasHtml}
            ${descHtml}
          </div>
          <div class="modal-actions">
            <a class="btn btn-whatsapp" href="${waLink}" target="_blank" rel="noopener" onclick="registrarStat(${p.id}, 'consulta')">Consultar</a>
            ${p.infoUrl ? `<a class="btn btn-info" href="${p.infoUrl}" target="_blank" rel="noopener">Más info</a>` : ""}
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById("modalCloseBtn").addEventListener("click", cerrarModal);
  document.getElementById("overlayClick").addEventListener("click", (e) => {
    if (e.target.id === "overlayClick") cerrarModal();
  });

  if (fotos.length > 1) {
    document.querySelectorAll("#modalDots span").forEach((dot, i) => {
      dot.addEventListener("click", () => {
        document.getElementById("modalImg").src = fotos[i];
        document.querySelectorAll("#modalDots span").forEach((d, di) => d.classList.toggle("activo", di === i));
      });
    });
  }

  document.body.style.overflow = "hidden";
}

function cerrarModal() {
  document.getElementById("modalOverlay").innerHTML = "";
  document.body.style.overflow = "";
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") cerrarModal();
});

function cardHtml(p) {
  const tieneDescuento = p.precioDescuento != null && p.precioDescuento < p.precio;
  const precioMostrar = tieneDescuento ? p.precioDescuento : p.precio;
  const mensaje = encodeURIComponent(CONFIG.whatsappMensaje.replace("(PERFUME)", p.nombre));
  const waLink = `${whatsappLinkBase()}?text=${mensaje}`;
  const fotos = fotosDe(p);
  const primeraFoto = fotos[0] || "";
  const notas = notasCompactasDe(p);

  const dotsHtml =
    fotos.length > 1
      ? `<div class="card-gallery-dots" id="dots-${p.id}">${fotos
          .map((_, i) => `<span class="${i === 0 ? "activo" : ""}"></span>`)
          .join("")}</div>`
      : "";

  const notasHtml =
    notas.length > 0
      ? `<div class="card-notas">${notas.map((n) => `<span class="tag">${n}</span>`).join("")}</div>`
      : "";

  return `
    <div class="card" data-id="${p.id}">
      <div class="card-img">
        ${primeraFoto ? `<img id="img-${p.id}" src="${primeraFoto}" loading="lazy" alt="${p.nombre}">` : ""}
        <span class="card-badge ${p.enStock ? "si-hay" : "no-hay"}">
          ${p.enStock ? "Con stock" : "Sin stock"}
        </span>
        ${p.categoria ? `<span class="card-cat">${p.categoria}</span>` : ""}
        ${dotsHtml}
      </div>
      <div class="card-body">
        <div class="card-marca">${p.marca}</div>
        <div class="card-nombre">${p.nombre}</div>
        ${notasHtml}
        <div class="card-precio ${tieneDescuento ? "con-descuento" : ""}">
          <span class="precio-actual">$${precioMostrar.toLocaleString("es-AR")}</span>
          ${tieneDescuento ? `<span class="precio-tachado">$${p.precio.toLocaleString("es-AR")}</span>` : ""}
        </div>
        <div class="card-actions">
          <a class="btn btn-whatsapp" href="${waLink}" target="_blank" rel="noopener" onclick="event.stopPropagation(); registrarStat(${p.id}, 'consulta')">Consultar</a>
          ${p.infoUrl ? `<a class="btn btn-info" href="${p.infoUrl}" target="_blank" rel="noopener" onclick="event.stopPropagation()">Más info</a>` : ""}
        </div>
      </div>
    </div>
  `;
}

function aplicarFiltros() {
  const q = document.getElementById("buscar").value.trim().toLowerCase();
  const marca = document.getElementById("filtroMarca").value;
  const categoria = document.getElementById("filtroCategoria").value;
  const stock = document.getElementById("filtroStock").value;

  const filtrados = TODOS.filter((p) => {
    const coincideTexto =
      !q ||
      (p.nombre && p.nombre.toLowerCase().includes(q)) ||
      (p.marca && p.marca.toLowerCase().includes(q));
    const coincideMarca = !marca || p.marca === marca;
    const coincideCategoria = !categoria || p.categoria === categoria;
    const coincideStock =
      !stock || (stock === "si" && p.enStock) || (stock === "no" && !p.enStock);
    const coincideAromas =
      aromasActivos.length === 0 ||
      aromasActivos.every((a) => notasCompactasDe(p).includes(a));
    return coincideTexto && coincideMarca && coincideCategoria && coincideStock && coincideAromas;
  });

  render(filtrados);
}

document.getElementById("buscar").addEventListener("input", aplicarFiltros);
document.getElementById("filtroMarca").addEventListener("change", aplicarFiltros);
document.getElementById("filtroCategoria").addEventListener("change", aplicarFiltros);
document.getElementById("filtroStock").addEventListener("change", aplicarFiltros);

(async () => {
  await cargarConfiguracion();
  cargarPerfumes();
})();
