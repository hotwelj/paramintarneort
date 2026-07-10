let TOKEN = sessionStorage.getItem("auraToken") || null;
let imagenesSubidas = []; // array de URLs, en el orden que se muestran
let editandoId = null;
let indiceArrastrado = null;

const $ = (id) => document.getElementById(id);

// ---------- Login ----------
function mostrarMsg(elId, texto, tipo) {
  $(elId).innerHTML = texto ? `<div class="msg ${tipo}">${texto}</div>` : "";
}

async function login() {
  const password = $("password").value;
  if (!password) return;
  $("btnLogin").disabled = true;
  try {
    const res = await fetch(`${API_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) {
      mostrarMsg("loginMsg", data.error || "Error al ingresar", "error");
      return;
    }
    TOKEN = data.token;
    sessionStorage.setItem("auraToken", TOKEN);
    mostrarPanel();
  } catch (e) {
    mostrarMsg("loginMsg", "No se pudo conectar con el servidor.", "error");
  } finally {
    $("btnLogin").disabled = false;
  }
}

function logout() {
  TOKEN = null;
  sessionStorage.removeItem("auraToken");
  $("panel").style.display = "none";
  $("loginBox").style.display = "block";
  $("btnLogout").style.display = "none";
}

function mostrarPanel() {
  $("loginBox").style.display = "none";
  $("panel").style.display = "block";
  $("btnLogout").style.display = "inline-block";
  cargarCategorias();
  cargarLista();
}

$("btnLogin").addEventListener("click", login);
$("password").addEventListener("keydown", (e) => { if (e.key === "Enter") login(); });
$("btnLogout").addEventListener("click", logout);

// ---------- Tabs ----------
$("tabPerfumes").addEventListener("click", () => {
  $("tabPerfumes").classList.add("activo");
  $("tabStats").classList.remove("activo");
  $("tabConfig").classList.remove("activo");
  $("vistaPerfumes").style.display = "block";
  $("vistaStats").style.display = "none";
  $("vistaConfig").style.display = "none";
});

$("tabStats").addEventListener("click", () => {
  $("tabStats").classList.add("activo");
  $("tabPerfumes").classList.remove("activo");
  $("tabConfig").classList.remove("activo");
  $("vistaStats").style.display = "block";
  $("vistaPerfumes").style.display = "none";
  $("vistaConfig").style.display = "none";
  cargarStats();
});

$("tabConfig").addEventListener("click", () => {
  $("tabConfig").classList.add("activo");
  $("tabPerfumes").classList.remove("activo");
  $("tabStats").classList.remove("activo");
  $("vistaConfig").style.display = "block";
  $("vistaPerfumes").style.display = "none";
  $("vistaStats").style.display = "none";
  cargarConfigAdmin();
});

// ---------- Categorías ----------
async function cargarCategorias() {
  try {
    const res = await fetch(`${API_URL}/api/categorias`);
    const categorias = await res.json();
    const sel = $("categoria");
    sel.querySelectorAll("option:not(:first-child)").forEach((o) => o.remove());
    categorias.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      sel.appendChild(opt);
    });
    const optOtra = document.createElement("option");
    optOtra.value = "__otra__";
    optOtra.textContent = "Otra (escribir)...";
    sel.appendChild(optOtra);
  } catch (e) {
    // si falla, se sigue usando sin categorías
  }
}

$("categoria").addEventListener("change", () => {
  const esOtra = $("categoria").value === "__otra__";
  $("categoriaOtra").style.display = esOtra ? "block" : "none";
  if (esOtra) $("categoriaOtra").focus();
});

function categoriaSeleccionada() {
  if ($("categoria").value === "__otra__") {
    return $("categoriaOtra").value.trim() || null;
  }
  return $("categoria").value || null;
}

// ---------- Tags de aromas (pirámide olfativa: salida / corazón / fondo) ----------
let notasSalida = [];
let notasCorazon = [];
let notasFondo = [];

function crearManejadorTags(wrapId, inputId, arrayRef, setArray) {
  function render() {
    document.querySelectorAll(`#${wrapId} .tag-chip`).forEach((el) => el.remove());
    const input = $(inputId);
    arrayRef().forEach((n, i) => {
      const chip = document.createElement("span");
      chip.className = "tag-chip";
      chip.innerHTML = `${n} <button type="button" data-i="${i}">×</button>`;
      $(wrapId).insertBefore(chip, input);
    });
    $(wrapId).querySelectorAll(".tag-chip button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const arr = arrayRef();
        arr.splice(parseInt(btn.dataset.i, 10), 1);
        setArray(arr);
        render();
      });
    });
  }

  function agregarDesdeInput() {
    const input = $(inputId);
    const valor = input.value.trim().replace(/,$/, "");
    if (valor) {
      const arr = arrayRef();
      if (!arr.includes(valor)) {
        arr.push(valor);
        setArray(arr);
      }
      render();
    }
    input.value = "";
  }

  $(inputId).addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      agregarDesdeInput();
    }
  });
  $(inputId).addEventListener("blur", agregarDesdeInput);

  return { render, agregarDesdeInput };
}

const tagsSalida = crearManejadorTags("tagsWrapSalida", "notaInputSalida", () => notasSalida, (v) => (notasSalida = v));
const tagsCorazon = crearManejadorTags("tagsWrapCorazon", "notaInputCorazon", () => notasCorazon, (v) => (notasCorazon = v));
const tagsFondo = crearManejadorTags("tagsWrapFondo", "notaInputFondo", () => notasFondo, (v) => (notasFondo = v));

function renderTodosLosTags() {
  tagsSalida.render();
  tagsCorazon.render();
  tagsFondo.render();
}

function agregarTodosLosPendientes() {
  tagsSalida.agregarDesdeInput();
  tagsCorazon.agregarDesdeInput();
  tagsFondo.agregarDesdeInput();
}

// Convierte la pirámide a texto para guardar en la base (compatible con el campo "notas" existente)
function piramideAJson() {
  return JSON.stringify({ salida: notasSalida, corazon: notasCorazon, fondo: notasFondo });
}

// Interpreta lo guardado: si es JSON de pirámide, lo separa; si es texto viejo separado por comas, lo pone todo en "corazón"
function jsonAPiramide(notasGuardadas) {
  if (!notasGuardadas) return { salida: [], corazon: [], fondo: [] };
  try {
    const obj = JSON.parse(notasGuardadas);
    if (obj && (obj.salida || obj.corazon || obj.fondo)) {
      return { salida: obj.salida || [], corazon: obj.corazon || [], fondo: obj.fondo || [] };
    }
  } catch (e) {
    // no era JSON: es formato viejo (texto separado por comas)
  }
  const viejo = notasGuardadas.split(",").map((n) => n.trim()).filter(Boolean);
  return { salida: [], corazon: viejo, fondo: [] };
}

// ---------- Compresión de imagen ----------
function comprimirImagen(file, maxWidth = 900, calidad = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.onload = () => {
        const escala = Math.min(1, maxWidth / img.width);
        const w = Math.round(img.width * escala);
        const h = Math.round(img.height * escala);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", calidad);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function subirArchivos(files) {
  const lista = Array.from(files).filter((f) => f.type.startsWith("image/"));
  if (lista.length === 0) return;
  mostrarMsg("formMsg", `Comprimiendo y subiendo ${lista.length} foto(s)...`, "ok");

  for (const file of lista) {
    try {
      const blob = await comprimirImagen(file);
      const res = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "image/jpeg",
          Authorization: `Bearer ${TOKEN}`,
        },
        body: blob,
      });
      const data = await res.json();
      if (!res.ok) {
        mostrarMsg("formMsg", data.error || "Error al subir una foto", "error");
        continue;
      }
      imagenesSubidas.push(data.url);
      renderGaleriaThumbs();
    } catch (err) {
      mostrarMsg("formMsg", "No se pudo subir una de las fotos.", "error");
    }
  }
  mostrarMsg("formMsg", "Fotos subidas ✓", "ok");
}

// ---------- Drag & drop para SUBIR fotos ----------
const dropZone = $("dropZone");

dropZone.addEventListener("click", () => $("imagenInput").click());

["dragenter", "dragover"].forEach((evento) => {
  dropZone.addEventListener(evento, (e) => {
    e.preventDefault();
    dropZone.classList.add("arrastrando");
  });
});

["dragleave", "drop"].forEach((evento) => {
  dropZone.addEventListener(evento, (e) => {
    e.preventDefault();
    dropZone.classList.remove("arrastrando");
  });
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    subirArchivos(e.dataTransfer.files);
  }
});

$("imagenInput").addEventListener("change", (e) => {
  subirArchivos(e.target.files);
  $("imagenInput").value = "";
});

// ---------- Reordenar fotos arrastrando las miniaturas ----------
function renderGaleriaThumbs() {
  const cont = $("galeriaThumbs");
  cont.innerHTML = imagenesSubidas
    .map(
      (url, i) => `
      <div class="galeria-thumb" draggable="true" data-i="${i}">
        <img src="${url}">
        <span class="orden-num">${i + 1}</span>
        <button type="button" data-borrar="${i}" title="Quitar">×</button>
      </div>`
    )
    .join("");

  cont.querySelectorAll(".galeria-thumb button").forEach((btn) => {
    btn.addEventListener("click", () => {
      imagenesSubidas.splice(parseInt(btn.dataset.borrar, 10), 1);
      renderGaleriaThumbs();
    });
  });

  cont.querySelectorAll(".galeria-thumb").forEach((thumb) => {
    thumb.addEventListener("dragstart", (e) => {
      indiceArrastrado = parseInt(thumb.dataset.i, 10);
      thumb.classList.add("arrastrando-item");
    });
    thumb.addEventListener("dragend", () => {
      thumb.classList.remove("arrastrando-item");
    });
    thumb.addEventListener("dragover", (e) => e.preventDefault());
    thumb.addEventListener("drop", (e) => {
      e.preventDefault();
      const destino = parseInt(thumb.dataset.i, 10);
      if (indiceArrastrado === null || indiceArrastrado === destino) return;
      const [movido] = imagenesSubidas.splice(indiceArrastrado, 1);
      imagenesSubidas.splice(destino, 0, movido);
      indiceArrastrado = null;
      renderGaleriaThumbs();
    });
  });
}

// ---------- Guardar (crear / editar) ----------
function limpiarForm() {
  $("nombre").value = "";
  $("marca").value = "";
  $("categoria").value = "";
  $("categoriaOtra").value = "";
  $("categoriaOtra").style.display = "none";
  $("precio").value = "";
  $("precioDescuento").value = "";
  $("enStock").checked = true;
  $("descripcion").value = "";
  $("infoUrl").value = "";
  $("imagenInput").value = "";
  imagenesSubidas = [];
  notasSalida = [];
  notasCorazon = [];
  notasFondo = [];
  renderGaleriaThumbs();
  renderTodosLosTags();
  editandoId = null;
  $("formTitle").textContent = "Nuevo perfume";
  $("btnCancelarEdicion").style.display = "none";
}

$("btnCancelarEdicion").addEventListener("click", limpiarForm);

// ---------- Generar descripción con IA ----------
$("btnGenerarDescripcion").addEventListener("click", async () => {
  agregarTodosLosPendientes();
  const btn = $("btnGenerarDescripcion");
  const textoOriginal = btn.textContent;
  btn.textContent = "Escribiendo...";
  btn.disabled = true;

  try {
    const res = await fetch(`${API_URL}/api/ia/descripcion`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({
        nombre: $("nombre").value.trim(),
        marca: $("marca").value.trim(),
        categoria: categoriaSeleccionada(),
        salida: notasSalida,
        corazon: notasCorazon,
        fondo: notasFondo,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      mostrarMsg("formMsg", data.error || "No se pudo generar la descripción.", "error");
      return;
    }
    $("descripcion").value = data.descripcion;
    mostrarMsg("formMsg", "Descripción generada ✓ (revisala y ajustala si querés)", "ok");
  } catch (e) {
    mostrarMsg("formMsg", "No se pudo conectar con la IA.", "error");
  } finally {
    btn.textContent = textoOriginal;
    btn.disabled = false;
  }
});

$("btnGuardar").addEventListener("click", async () => {
  agregarTodosLosPendientes();

  const body = {
    nombre: $("nombre").value.trim(),
    marca: $("marca").value.trim(),
    categoria: categoriaSeleccionada(),
    precio: parseFloat($("precio").value),
    precioDescuento: $("precioDescuento").value ? parseFloat($("precioDescuento").value) : null,
    enStock: $("enStock").checked,
    descripcion: $("descripcion").value.trim(),
    infoUrl: $("infoUrl").value.trim(),
    notas: piramideAJson(),
    imagenUrl: imagenesSubidas[0] || null,
    imagenes: imagenesSubidas,
  };

  if (!body.nombre || !body.marca || isNaN(body.precio)) {
    mostrarMsg("formMsg", "Completá al menos nombre, marca y precio.", "error");
    return;
  }

  const url = editandoId ? `${API_URL}/api/perfumes/${editandoId}` : `${API_URL}/api/perfumes`;
  const method = editandoId ? "PUT" : "POST";

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      mostrarMsg("formMsg", data.error || "Error al guardar", "error");
      return;
    }
    mostrarMsg("formMsg", "Guardado ✓", "ok");
    limpiarForm();
    cargarLista();
  } catch (e) {
    mostrarMsg("formMsg", "No se pudo guardar.", "error");
  }
});

// ---------- Listado / editar / borrar / duplicar ----------
async function cargarLista() {
  const res = await fetch(`${API_URL}/api/perfumes`);
  const lista = await res.json();
  $("lista").innerHTML = lista.map(itemHtml).join("") || `<p style="color:var(--muted)">Todavía no cargaste ningún perfume.</p>`;

  lista.forEach((p) => {
    document.getElementById(`edit-${p.id}`)?.addEventListener("click", () => cargarParaEditar(p));
    document.getElementById(`del-${p.id}`)?.addEventListener("click", () => borrar(p.id));
    document.getElementById(`dup-${p.id}`)?.addEventListener("click", () => duplicar(p.id));
  });
}

function itemHtml(p) {
  const foto = (p.imagenes && p.imagenes[0]) || p.imagenUrl || "";
  return `
    <div class="admin-list-item">
      <img src="${foto}" onerror="this.style.opacity=0">
      <div class="admin-list-info">
        <div class="nombre">${p.nombre}</div>
        <div class="meta">${p.marca}${p.categoria ? " · " + p.categoria : ""} · $${p.precio} ${p.enStock ? "· con stock" : "· sin stock"}</div>
      </div>
      <button class="badge-duplicar" id="dup-${p.id}">Duplicar</button>
      <button class="link-btn" id="edit-${p.id}">Editar</button>
      <button class="link-btn danger" id="del-${p.id}">Borrar</button>
    </div>
  `;
}

function cargarParaEditar(p) {
  editandoId = p.id;
  $("nombre").value = p.nombre;
  $("marca").value = p.marca;
  $("categoria").value = p.categoria || "";
  if (p.categoria && $("categoria").value !== p.categoria) {
    $("categoria").value = "__otra__";
    $("categoriaOtra").style.display = "block";
    $("categoriaOtra").value = p.categoria;
  } else {
    $("categoriaOtra").style.display = "none";
    $("categoriaOtra").value = "";
  }
  $("precio").value = p.precio;
  $("precioDescuento").value = p.precioDescuento ?? "";
  $("enStock").checked = p.enStock;
  $("descripcion").value = p.descripcion ?? "";
  $("infoUrl").value = p.infoUrl ?? "";
  imagenesSubidas = (p.imagenes && p.imagenes.length > 0) ? [...p.imagenes] : (p.imagenUrl ? [p.imagenUrl] : []);
  const piramide = jsonAPiramide(p.notas);
  notasSalida = piramide.salida;
  notasCorazon = piramide.corazon;
  notasFondo = piramide.fondo;
  renderGaleriaThumbs();
  renderTodosLosTags();
  $("formTitle").textContent = `Editando: ${p.nombre}`;
  $("btnCancelarEdicion").style.display = "inline-block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function borrar(id) {
  if (!confirm("¿Seguro que querés borrar este perfume?")) return;
  await fetch(`${API_URL}/api/perfumes/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  cargarLista();
}

async function duplicar(id) {
  await fetch(`${API_URL}/api/perfumes/${id}/duplicar`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  cargarLista();
}

// ---------- Estadísticas ----------
async function cargarStats() {
  try {
    const res = await fetch(`${API_URL}/api/stats`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    const data = await res.json();
    $("statVistas").textContent = data.totalVistas;
    $("statConsultas").textContent = data.totalConsultas;
    $("statsTablaBody").innerHTML = data.ranking
      .map((r) => `<tr><td>${r.nombre}</td><td>${r.vistas}</td><td>${r.consultas}</td></tr>`)
      .join("") || `<tr><td colspan="3" style="color:var(--muted)">Todavía no hay datos.</td></tr>`;
  } catch (e) {
    $("statsTablaBody").innerHTML = `<tr><td colspan="3" style="color:var(--rose)">No se pudieron cargar las estadísticas.</td></tr>`;
  }
}

// ---------- Init ----------
renderTodosLosTags();
if (TOKEN) mostrarPanel();

// ---------- Configuración del sitio ----------
let logoUrlActual = "favicon.png";

async function cargarConfigAdmin() {
  try {
    const res = await fetch(`${API_URL}/api/config`);
    const c = await res.json();
    $("configWhatsappNumero").value = c.whatsappNumero || "";
    $("configWhatsappMensaje").value = c.whatsappMensaje || "";
    $("configEmail").value = c.email || "";
    $("configInstagram").value = c.instagramUrl || "";
    $("configHeroEyebrow").value = c.heroEyebrow || "";
    $("configHeroTitulo").value = c.heroTitulo || "";
    $("configHeroParrafo").value = c.heroParrafo || "";
    $("configFooterTagline").value = c.footerTagline || "";
    $("configColorPrincipal").value = c.colorPrincipal || "#8B6BAE";
    $("configColorSecundario").value = c.colorSecundario || "#C4A6E0";
    logoUrlActual = c.logoUrl || "favicon.png";
    $("configLogoPreview").src = logoUrlActual;
  } catch (e) {
    mostrarMsg("configMsg", "No se pudo cargar la configuración actual.", "error");
  }
}

$("configLogoInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  mostrarMsg("configMsg", "Subiendo logo...", "ok");
  try {
    const blob = await comprimirImagen(file, 400, 0.85);
    $("configLogoPreview").src = URL.createObjectURL(blob);
    const res = await fetch(`${API_URL}/api/upload`, {
      method: "POST",
      headers: { "Content-Type": "image/jpeg", Authorization: `Bearer ${TOKEN}` },
      body: blob,
    });
    const data = await res.json();
    if (!res.ok) {
      mostrarMsg("configMsg", data.error || "Error al subir el logo", "error");
      return;
    }
    logoUrlActual = data.url;
    mostrarMsg("configMsg", "Logo subido ✓ (no te olvides de Guardar cambios)", "ok");
  } catch (err) {
    mostrarMsg("configMsg", "No se pudo subir el logo.", "error");
  }
});

$("btnGuardarConfig").addEventListener("click", async () => {
  const body = {
    whatsappNumero: $("configWhatsappNumero").value.trim(),
    whatsappMensaje: $("configWhatsappMensaje").value.trim(),
    email: $("configEmail").value.trim(),
    instagramUrl: $("configInstagram").value.trim(),
    heroEyebrow: $("configHeroEyebrow").value.trim(),
    heroTitulo: $("configHeroTitulo").value.trim(),
    heroParrafo: $("configHeroParrafo").value.trim(),
    footerTagline: $("configFooterTagline").value.trim(),
    colorPrincipal: $("configColorPrincipal").value,
    colorSecundario: $("configColorSecundario").value,
    logoUrl: logoUrlActual,
  };

  try {
    const res = await fetch(`${API_URL}/api/config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      mostrarMsg("configMsg", data.error || "No se pudo guardar.", "error");
      return;
    }
    mostrarMsg("configMsg", "Configuración guardada ✓", "ok");
  } catch (e) {
    mostrarMsg("configMsg", "No se pudo conectar con el servidor.", "error");
  }
});
