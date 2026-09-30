(() => {
  'use strict';

  // ---- icons -------------------------------------------------------------
  const ICON_PATHS = {
    search: '<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>',
    camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle>',
    trash: '<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line>',
    edit: '<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>',
    chevronLeft: '<polyline points="15 18 9 12 15 6"></polyline>',
    chevronRight: '<polyline points="9 18 15 12 9 6"></polyline>',
    x: '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>',
    percent: '<line x1="19" y1="5" x2="5" y2="19"></line><circle cx="6.5" cy="6.5" r="2.5"></circle><circle cx="17.5" cy="17.5" r="2.5"></circle>',
    printer: '<polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect>',
  };
  function icon(name, cls) {
    return `<svg class="${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name] || ''}</svg>`;
  }

  // ---- helpers -------------------------------------------------------------
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const sumPct = (ingredientes) => {
    let total = 0;
    (ingredientes || []).forEach((i) => { const v = parseFloat(i.porcentaje); if (!isNaN(v)) total += v; });
    return Math.round(total * 10) / 10;
  };
  const blankForm = () => ({
    id: null, nombre: '', tipo: 'esmalte', cono: '', atmosfera: '', color: '', acabado: '', opacidad: '',
    ingredientes: [{ material: '', porcentaje: '' }], etiquetas: [], notas: '', fotoDataUrl: null,
  });
  const blankCalc = () => ({
    modo: 'pct2g', // 'pct2g' (% -> gramos) | 'g2pct' (gramos -> %)
    recetaId: '',
    lote: '',
    filas: [{ material: '', valor: '' }],
  });

  // ---- persistence: IndexedDB (recipes can carry photos, too big for localStorage) --
  const DB_NAME = 'recetario-en-torno';
  const STORE = 'recetas';
  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function idbGetAll() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }
  async function idbPut(recipe) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(recipe);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  async function idbDelete(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ---- photo compression (downscale + jpeg, keeps IndexedDB entries small) --
  function compressImage(file, maxDim = 900, quality = 0.72) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) { height = Math.round(height * maxDim / width); width = maxDim; }
        else if (height >= width && height > maxDim) { width = Math.round(width * maxDim / height); height = maxDim; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen')); };
      img.src = url;
    });
  }

  // ---- state -----------------------------------------------------------
  const state = {
    section: 'recetario', // 'recetario' | 'calculadora'
    tab: 'lista', // 'lista' | 'detalle' | 'form'
    recetas: [],
    query: '',
    filtroTipo: 'todos',
    filtroTag: null,
    viewId: null,
    form: null,
    calc: blankCalc(),
    toast: null,
  };
  let toastTimer = null;

  function showToast(msg) {
    state.toast = msg;
    render();
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { state.toast = null; render(); }, 2200);
  }

  // ---- filtering ---------------------------------------------------------
  function getAllTags(recetas) {
    const set = new Set();
    recetas.forEach((r) => (r.etiquetas || []).forEach((t) => set.add(t)));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }
  function getFilteredRecipes(s) {
    const q = s.query.trim().toLowerCase();
    return s.recetas.filter((r) => {
      if (s.filtroTipo !== 'todos' && r.tipo !== s.filtroTipo) return false;
      if (s.filtroTag && !(r.etiquetas || []).includes(s.filtroTag)) return false;
      if (!q) return true;
      const haystack = [r.nombre, ...(r.ingredientes || []).map((i) => i.material)].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }

  // ---- CRUD ---------------------------------------------------------------
  async function saveRecipeFromForm() {
    syncFormFromDOM();
    const f = state.form;
    if (!f.nombre.trim()) { showToast('Ponle un nombre a la receta'); return; }
    const now = new Date().toISOString();
    const recipe = {
      id: f.id || uid(),
      nombre: f.nombre.trim(),
      tipo: f.tipo,
      cono: f.cono.trim(),
      atmosfera: f.atmosfera,
      color: f.color.trim(),
      acabado: f.acabado,
      opacidad: f.opacidad,
      ingredientes: (f.ingredientes || []).filter((i) => i.material && i.material.trim()),
      etiquetas: f.etiquetas || [],
      notas: f.notas.trim(),
      fotoDataUrl: f.fotoDataUrl || null,
      creado: f.creado || now,
      actualizado: now,
    };
    await idbPut(recipe);
    const idx = state.recetas.findIndex((r) => r.id === recipe.id);
    if (idx >= 0) state.recetas[idx] = recipe; else state.recetas.unshift(recipe);
    state.recetas.sort((a, b) => (b.actualizado || '').localeCompare(a.actualizado || ''));
    state.viewId = recipe.id;
    state.form = null;
    state.tab = 'detalle';
    showToast('Receta guardada');
  }

  async function deleteRecipe(id) {
    if (!confirm('¿Borrar esta receta? No se puede deshacer.')) return;
    await idbDelete(id);
    state.recetas = state.recetas.filter((r) => r.id !== id);
    state.tab = 'lista';
    state.viewId = null;
    render();
    showToast('Receta borrada');
  }

  async function duplicateRecipe(id) {
    const r = state.recetas.find((x) => x.id === id);
    if (!r) return;
    const now = new Date().toISOString();
    const copy = { ...r, id: uid(), nombre: r.nombre + ' (copia)', creado: now, actualizado: now };
    await idbPut(copy);
    state.recetas.unshift(copy);
    state.viewId = copy.id;
    render();
    showToast('Receta duplicada');
  }

  function goNewRecipe() { state.form = blankForm(); state.viewId = null; state.tab = 'form'; render(); }
  function goEditRecipe(id) {
    const r = state.recetas.find((x) => x.id === id);
    if (!r) return;
    state.form = { ...r, ingredientes: (r.ingredientes && r.ingredientes.length ? r.ingredientes.map((i) => ({ ...i })) : [{ material: '', porcentaje: '' }]), etiquetas: [...(r.etiquetas || [])] };
    state.tab = 'form';
    render();
  }

  // Re-reads every live form input into state.form. Must run before any render()
  // that happens while editing — render() rebuilds the form's HTML from state.form,
  // so anything typed but not yet synced would otherwise be wiped out.
  function syncFormFromDOM() {
    if (!state.form) return;
    const g = (id) => document.getElementById(id);
    if (g('fNombre')) state.form.nombre = g('fNombre').value;
    if (g('fCono')) state.form.cono = g('fCono').value;
    if (g('fColor')) state.form.color = g('fColor').value;
    if (g('fNotas')) state.form.notas = g('fNotas').value;
    const materials = Array.from(document.querySelectorAll('.ing-material'));
    const pcts = Array.from(document.querySelectorAll('.ing-pct'));
    if (materials.length) {
      state.form.ingredientes = materials.map((m, i) => ({
        material: m.value,
        porcentaje: pcts[i] && pcts[i].value !== '' ? parseFloat(pcts[i].value) : '',
      }));
    }
  }

  function addTagFromInput() {
    syncFormFromDOM();
    const inp = document.getElementById('tagInput');
    if (!inp) return;
    const val = inp.value.trim();
    if (!val) return;
    if (!state.form.etiquetas.includes(val)) state.form.etiquetas.push(val);
    render();
    const inp2 = document.getElementById('tagInput');
    if (inp2) inp2.focus();
  }

  // ---- calculadora de porcentajes ------------------------------------------
  // Pura: dado el modo, el lote (solo relevante en pct2g) y las filas {material, valor},
  // devuelve el resultado calculado por fila y los totales. La usan tanto el render
  // inicial como el recálculo en vivo mientras se escribe (sin re-renderizar).
  function computeCalcResults(modo, lote, filas) {
    const loteNum = parseFloat(lote);
    if (modo === 'pct2g') {
      const totalPct = filas.reduce((s, f) => { const v = parseFloat(f.valor); return s + (isNaN(v) ? 0 : v); }, 0);
      const rows = filas.map((f) => {
        const v = parseFloat(f.valor);
        const g = (!isNaN(v) && !isNaN(loteNum)) ? Math.round((v / 100) * loteNum * 10) / 10 : null;
        return { resultado: g };
      });
      return { rows, totalValor: Math.round(totalPct * 10) / 10, totalResultado: !isNaN(loteNum) ? Math.round(loteNum * 10) / 10 : null };
    }
    const totalG = filas.reduce((s, f) => { const v = parseFloat(f.valor); return s + (isNaN(v) ? 0 : v); }, 0);
    const rows = filas.map((f) => {
      const v = parseFloat(f.valor);
      const p = (!isNaN(v) && totalG > 0) ? Math.round((v / totalG) * 100 * 10) / 10 : null;
      return { resultado: p };
    });
    return { rows, totalValor: Math.round(totalG * 10) / 10, totalResultado: totalG > 0 ? 100 : null };
  }

  function syncCalcFromDOM() {
    const c = state.calc;
    const loteEl = document.getElementById('calcLote');
    if (loteEl) c.lote = loteEl.value;
    const materials = Array.from(document.querySelectorAll('.calc-material'));
    const valores = Array.from(document.querySelectorAll('.calc-valor'));
    if (materials.length) {
      c.filas = materials.map((m, i) => ({ material: m.value, valor: valores[i] ? valores[i].value : '' }));
    }
  }

  // Recalcula y repinta solo los resultados/totales en vivo mientras se escribe,
  // sin re-renderizar el formulario (para no perder el foco del campo activo).
  function recalcCalcUI() {
    const modo = state.calc.modo;
    const loteEl = document.getElementById('calcLote');
    const lote = loteEl ? loteEl.value : '';
    const materials = Array.from(document.querySelectorAll('.calc-material'));
    const valores = Array.from(document.querySelectorAll('.calc-valor'));
    const filas = materials.map((m, i) => ({ material: m.value, valor: valores[i] ? valores[i].value : '' }));
    const res = computeCalcResults(modo, lote, filas);
    document.querySelectorAll('.calc-result').forEach((span, i) => {
      const val = res.rows[i] ? res.rows[i].resultado : null;
      span.textContent = val == null ? '—' : val + (modo === 'pct2g' ? ' g' : ' %');
    });
    const totalesEl = document.getElementById('calcTotales');
    if (totalesEl) totalesEl.innerHTML = renderCalcTotales(res, modo);
  }

  // Genera una ficha imprimible con los datos de la calculadora y abre el
  // diálogo de impresión del sistema — en iPhone, "Imprimir" permite guardar
  // directamente como PDF sin necesidad de ninguna librería adicional.
  function exportCalcPdf() {
    syncCalcFromDOM();
    const c = state.calc;
    const filasValidas = c.filas.filter((f) => f.material && f.material.trim());
    if (!filasValidas.length) { showToast('Añade al menos un ingrediente'); return; }
    const res = computeCalcResults(c.modo, c.lote, c.filas);
    const receta = c.recetaId ? state.recetas.find((r) => r.id === c.recetaId) : null;
    const modoLabel = c.modo === 'pct2g' ? '% → gramos' : 'Gramos → %';
    const colValor = c.modo === 'pct2g' ? '%' : 'Gramos';
    const colResultado = c.modo === 'pct2g' ? 'Gramos' : '%';
    const rows = c.filas.map((f, i) => {
      if (!f.material || !f.material.trim()) return '';
      const r = res.rows[i];
      const resultado = r && r.resultado != null ? r.resultado : '—';
      const valor = f.valor === '' || f.valor == null ? '—' : f.valor;
      return `<tr><td>${esc(f.material)}</td><td>${valor}</td><td>${resultado}</td></tr>`;
    }).join('');
    const fecha = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
    const totalResultadoLabel = res.totalResultado == null ? '—' : res.totalResultado + (c.modo === 'pct2g' ? ' g' : ' %');
    const printArea = document.getElementById('print-area');
    printArea.innerHTML = `
      <div class="print-head">
        <img class="print-logo" src="assets/en-torno-logo.jpg" alt="">
        <div>
          <div class="print-brand">En-Torno · Taller</div>
          <div class="print-title">Ficha de cálculo (${modoLabel})</div>
        </div>
      </div>
      ${receta ? `<div class="print-sub"><strong>Receta:</strong> ${esc(receta.nombre)}</div>` : ''}
      ${c.modo === 'pct2g' ? `<div class="print-sub"><strong>Tamaño del lote:</strong> ${c.lote || '—'} g</div>` : ''}
      <table class="print-table">
        <thead><tr><th>Material</th><th>${colValor}</th><th>${colResultado}</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td>Total</td><td>${res.totalValor}${c.modo === 'pct2g' ? '%' : ' g'}</td><td>${totalResultadoLabel}</td></tr></tfoot>
      </table>
      <div class="print-date">Generado el ${fecha}</div>
    `;
    window.print();
  }

  // ---- export to Excel (una fila por receta) -------------------------------
  async function exportExcel() {
    const list = getFilteredRecipes(state);
    if (!list.length) { showToast('No hay recetas para exportar'); return; }
    const rows = list.map((r) => ({
      Nombre: r.nombre || '',
      Tipo: r.tipo === 'engobe' ? 'Engobe' : 'Esmalte',
      'Cono / Temp.': r.cono || '',
      Atmósfera: cap(r.atmosfera) || '',
      Color: r.color || '',
      Acabado: cap(r.acabado) || '',
      Opacidad: cap(r.opacidad) || '',
      Ingredientes: (r.ingredientes || []).map((i) => `${i.material} ${i.porcentaje !== '' && i.porcentaje != null ? i.porcentaje + '%' : ''}`.trim()).join(' | '),
      'Total %': sumPct(r.ingredientes),
      Etiquetas: (r.etiquetas || []).join(', '),
      Notas: r.notas || '',
      'Creado': r.creado ? r.creado.slice(0, 10) : '',
      'Actualizado': r.actualizado ? r.actualizado.slice(0, 10) : '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 24 }, { wch: 9 }, { wch: 12 }, { wch: 11 }, { wch: 16 }, { wch: 11 }, { wch: 13 },
      { wch: 46 }, { wch: 8 }, { wch: 20 }, { wch: 34 }, { wch: 11 }, { wch: 11 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Recetas');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const filename = `recetario-en-torno-${new Date().toISOString().slice(0, 10)}.xlsx`;
    const file = new File([blob], filename, { type: blob.type });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: filename }); return; } catch (e) { /* el usuario canceló o falló: probamos descarga directa */ }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  // ---- render: helpers -----------------------------------------------------
  function renderChipSelect(field, options, current, seg) {
    return options.map((opt) => `<button type="button" class="${seg ? 'seg-btn' : 'chip'}${current === opt.value ? ' active' : ''}" data-act="set-field" data-field="${field}" data-val="${opt.value}">${opt.label}</button>`).join('');
  }

  function renderEmptyState(s) {
    const hasAny = s.recetas.length > 0;
    return `<div class="empty-state">
      ${icon('image')}
      <div class="empty-state-title">${hasAny ? 'Sin resultados' : 'Aún no hay recetas'}</div>
      <div class="empty-state-body">${hasAny ? 'Prueba a cambiar la búsqueda o los filtros.' : 'Toca el botón + para añadir la primera receta de esmalte o engobe del taller.'}</div>
    </div>`;
  }

  function renderRecCard(r) {
    const thumb = r.fotoDataUrl ? `<img class="rec-thumb" src="${r.fotoDataUrl}">` : `<div class="rec-thumb-empty">${icon('image')}</div>`;
    return `
      <button type="button" class="rec-card" data-act="ver-receta" data-id="${r.id}">
        ${thumb}
        <div class="rec-body">
          <div class="rec-name">${esc(r.nombre || 'Sin nombre')}</div>
          <div class="rec-meta">
            <span class="rec-type-pill ${r.tipo}">${r.tipo === 'engobe' ? 'Engobe' : 'Esmalte'}</span>
            ${r.cono ? `<span class="rec-cono">Cono ${esc(r.cono)}</span>` : ''}
          </div>
        </div>
        <div class="rec-chevron">${icon('chevronRight')}</div>
      </button>`;
  }

  function renderLista(s) {
    const list = getFilteredRecipes(s);
    const allTags = getAllTags(s.recetas);
    return `
      <div class="hdr">
        <div>
          <div class="eyebrow">Taller En-Torno</div>
          <div class="title-serif">Recetario</div>
        </div>
        <div class="hdr-actions">
          <button class="hdr-btn" data-act="exportar" title="Exportar a Excel">${icon('upload')}</button>
        </div>
      </div>
      <div class="stack" style="padding-top:14px;gap:12px">
        <div class="search-row">
          ${icon('search')}
          <input class="search-input" id="searchInput" placeholder="Buscar por nombre o ingrediente..." value="${esc(s.query)}">
        </div>
        <div class="chip-row">
          ${['todos', 'esmalte', 'engobe'].map((t) => `<button type="button" class="chip${s.filtroTipo === t ? ' active' : ''}" data-act="set-filtro-tipo" data-val="${t}">${t === 'todos' ? 'Todos' : t === 'esmalte' ? 'Esmaltes' : 'Engobes'}</button>`).join('')}
        </div>
        ${allTags.length ? `<div class="chip-row">${allTags.map((t) => `<button type="button" class="chip tag-chip${s.filtroTag === t ? ' active' : ''}" data-act="set-filtro-tag" data-val="${esc(t)}">${esc(t)}</button>`).join('')}</div>` : ''}
        ${list.length ? `<div class="rec-list">${list.map(renderRecCard).join('')}</div>` : renderEmptyState(s)}
        <div style="height:64px"></div>
      </div>
      <button class="fab" data-act="nueva-receta" aria-label="Nueva receta">${icon('plus')}</button>
    `;
  }

  function renderDetalle(s) {
    const r = s.recetas.find((x) => x.id === s.viewId);
    if (!r) { state.tab = 'lista'; return renderLista(s); }
    const photo = r.fotoDataUrl ? `<img class="detail-photo" src="${r.fotoDataUrl}">` : `<div class="detail-photo-empty">${icon('image')}</div>`;
    const totalPct = sumPct(r.ingredientes);
    const ingRows = (r.ingredientes || []).filter((i) => i.material).map((i) => `
      <div class="ing-row"><span class="ing-name">${esc(i.material)}</span><span class="ing-pct-value">${i.porcentaje === '' || i.porcentaje == null ? '—' : i.porcentaje + '%'}</span></div>`).join('');
    const tags = (r.etiquetas || []).map((t) => `<span class="chip tag-chip" style="cursor:default">${esc(t)}</span>`).join('');
    return `
      <div class="hdr">
        <button class="hdr-btn" data-act="volver-lista">${icon('chevronLeft')}</button>
        <button class="hdr-btn btn-danger" data-act="borrar-receta" data-id="${r.id}">${icon('trash')}</button>
      </div>
      <div class="stack" style="padding-top:12px;gap:16px">
        ${photo}
        <div class="detail-title-row">
          <div>
            <span class="rec-type-pill ${r.tipo}">${r.tipo === 'engobe' ? 'Engobe' : 'Esmalte'}</span>
            <div class="detail-name">${esc(r.nombre || 'Sin nombre')}</div>
          </div>
        </div>
        ${tags ? `<div class="detail-tags">${tags}</div>` : ''}

        <div class="panel">
          <div class="panel-title">Datos de cocción</div>
          <div class="kv-row"><span class="kv-label">Cono / Temp.</span><span class="kv-value">${esc(r.cono) || '—'}</span></div>
          <div class="kv-row"><span class="kv-label">Atmósfera</span><span class="kv-value">${cap(r.atmosfera) || '—'}</span></div>
          <div class="kv-row"><span class="kv-label">Color</span><span class="kv-value">${esc(r.color) || '—'}</span></div>
          <div class="kv-row"><span class="kv-label">Acabado</span><span class="kv-value">${cap(r.acabado) || '—'}</span></div>
          <div class="kv-row"><span class="kv-label">Opacidad</span><span class="kv-value">${cap(r.opacidad) || '—'}</span></div>
        </div>

        ${ingRows ? `<div class="panel">
          <div class="panel-title">Ingredientes</div>
          <div class="ing-table">${ingRows}</div>
          <div class="ing-total-row"><span class="ing-total-label">Total</span><span class="ing-total-value" style="color:${Math.abs(totalPct - 100) < 0.51 ? 'var(--green)' : 'var(--sandd)'}">${totalPct}%</span></div>
        </div>` : ''}

        ${r.notas ? `<div class="panel"><div class="panel-title">Notas</div><div class="notes-text">${esc(r.notas)}</div></div>` : ''}

        <div class="detail-actions">
          <button class="btn-secondary" data-act="duplicar-receta" data-id="${r.id}">${icon('copy')}<span>Duplicar</span></button>
          <button class="btn-secondary" data-act="editar-receta" data-id="${r.id}">${icon('edit')}<span>Editar</span></button>
        </div>
        <div style="height:24px"></div>
      </div>
    `;
  }

  function renderIngredientesForm(ingredientes) {
    const rows = ingredientes.map((ing, i) => `
      <div class="ing-form-row">
        <input class="form-input ing-form-material ing-material" placeholder="Material (ej. Caolín)" value="${esc(ing.material)}">
        <input class="form-input ing-form-pct ing-pct" type="number" inputmode="decimal" step="0.1" min="0" placeholder="%" value="${ing.porcentaje === '' || ing.porcentaje == null ? '' : ing.porcentaje}">
        <button type="button" class="ing-form-del" data-act="del-ingrediente" data-idx="${i}">${icon('x')}</button>
      </div>`).join('');
    return `
      <div class="form-section">
        <div class="ing-total-bar"><span class="form-label">Ingredientes</span><span id="ingTotal" style="font:700 13px/1 'IBM Plex Mono',monospace;color:${Math.abs(sumPct(ingredientes) - 100) < 0.51 ? 'var(--green)' : 'var(--sandd)'}">${sumPct(ingredientes)}%</span></div>
        ${rows}
        <button type="button" class="ing-add-btn" data-act="add-ingrediente">${icon('plus')}<span>Añadir ingrediente</span></button>
      </div>`;
  }

  function renderTagsForm(etiquetas) {
    const chips = etiquetas.map((t) => `<span class="tag-chip-x">${esc(t)}<button type="button" data-act="del-tag" data-tag="${esc(t)}">${icon('x')}</button></span>`).join('');
    return `
      <div class="form-section">
        <span class="form-label">Etiquetas</span>
        <div class="tag-input-row">
          <input class="form-input" id="tagInput" placeholder="ej. mate, gres, favorito">
          <button type="button" class="tag-add-btn" data-act="add-tag">${icon('plus')}</button>
        </div>
        ${chips ? `<div class="tag-chip-list">${chips}</div>` : ''}
      </div>`;
  }

  function renderForm(f) {
    const isEdit = !!f.id;
    return `
      <div class="hdr">
        <button class="hdr-btn" data-act="volver">${icon('chevronLeft')}</button>
        <div></div>
      </div>
      <div class="eyebrow" style="margin-top:14px">${isEdit ? 'Editar receta' : 'Nueva receta'}</div>
      <div class="stack" style="padding-top:10px;gap:18px">
        <div class="form-section">
          <span class="form-label">Nombre</span>
          <input class="form-input" id="fNombre" placeholder="ej. Verde celadón mate" value="${esc(f.nombre || '')}">
        </div>

        <div class="form-section">
          <span class="form-label">Tipo</span>
          <div class="seg-row">${renderChipSelect('tipo', [{ value: 'esmalte', label: 'Esmalte' }, { value: 'engobe', label: 'Engobe' }], f.tipo, true)}</div>
        </div>

        <div class="form-row-2">
          <div class="form-section">
            <span class="form-label">Cono / Temp.</span>
            <input class="form-input" id="fCono" placeholder="ej. 06 ó 1240°C" value="${esc(f.cono || '')}">
          </div>
          <div class="form-section">
            <span class="form-label">Color</span>
            <input class="form-input" id="fColor" placeholder="ej. Verde musgo" value="${esc(f.color || '')}">
          </div>
        </div>

        <div class="form-section">
          <span class="form-label">Atmósfera</span>
          <div class="chip-row">${renderChipSelect('atmosfera', [{ value: 'oxidación', label: 'Oxidación' }, { value: 'reducción', label: 'Reducción' }, { value: 'neutra', label: 'Neutra' }], f.atmosfera, false)}</div>
        </div>

        <div class="form-section">
          <span class="form-label">Acabado</span>
          <div class="chip-row">${renderChipSelect('acabado', [{ value: 'mate', label: 'Mate' }, { value: 'satinado', label: 'Satinado' }, { value: 'brillante', label: 'Brillante' }, { value: 'otro', label: 'Otro' }], f.acabado, false)}</div>
        </div>

        <div class="form-section">
          <span class="form-label">Opacidad</span>
          <div class="chip-row">${renderChipSelect('opacidad', [{ value: 'opaco', label: 'Opaco' }, { value: 'semi-opaco', label: 'Semi-opaco' }, { value: 'transparente', label: 'Transparente' }], f.opacidad, false)}</div>
        </div>

        ${renderIngredientesForm(f.ingredientes)}
        ${renderTagsForm(f.etiquetas)}

        <div class="form-section">
          <span class="form-label">Foto de la baldosa</span>
          ${f.fotoDataUrl
            ? `<div class="photo-preview-wrap"><img class="photo-preview" src="${f.fotoDataUrl}"><button type="button" class="photo-remove" data-act="del-foto">${icon('x')}</button></div>`
            : `<button type="button" class="photo-picker" data-act="pick-foto">${icon('camera')}<span>Añadir foto</span></button>`}
        </div>

        <div class="form-section">
          <span class="form-label">Notas</span>
          <textarea class="form-textarea" id="fNotas" placeholder="Observaciones, resultados de pruebas...">${esc(f.notas || '')}</textarea>
        </div>

        <div class="form-actions">
          <button class="btn-secondary" data-act="volver"><span>Cancelar</span></button>
          <button class="btn-primary" style="flex:1" data-act="guardar-receta"><span>Guardar receta</span></button>
        </div>
        <div style="height:24px"></div>
      </div>
    `;
  }

  function renderToast() {
    if (!state.toast) return '';
    return `<div class="toast"><div class="toast-body">${esc(state.toast)}</div><button class="toast-close" data-act="toast-close">✕</button></div>`;
  }

  function renderCalcTotales(res, modo) {
    if (modo === 'pct2g') {
      const pctOk = Math.abs(res.totalValor - 100) < 0.51;
      return `
        <div class="kv-row"><span class="kv-label">Total %</span><span class="kv-value" style="color:${pctOk ? 'var(--green)' : 'var(--sandd)'}">${res.totalValor}%</span></div>
        <div class="kv-row"><span class="kv-label">Total del lote</span><span class="kv-value">${res.totalResultado == null ? '—' : res.totalResultado + ' g'}</span></div>
      `;
    }
    return `<div class="kv-row"><span class="kv-label">Total pesado</span><span class="kv-value">${res.totalValor} g</span></div>`;
  }

  function renderCalculadora(s) {
    const c = s.calc;
    const res = computeCalcResults(c.modo, c.lote, c.filas);
    const rows = c.filas.map((f, i) => {
      const r = res.rows[i];
      const resultado = r && r.resultado != null ? r.resultado + (c.modo === 'pct2g' ? ' g' : ' %') : '—';
      return `
        <div class="calc-row">
          <input class="form-input calc-material" placeholder="Material" value="${esc(f.material)}">
          <input class="form-input calc-valor" type="number" inputmode="decimal" step="0.1" min="0" placeholder="${c.modo === 'pct2g' ? '%' : 'g'}" value="${f.valor === '' || f.valor == null ? '' : f.valor}">
          <span class="calc-result">${resultado}</span>
          <button type="button" class="calc-del" data-act="calc-del-fila" data-idx="${i}">${icon('x')}</button>
        </div>`;
    }).join('');
    const recetaOptions = `<option value="">— Receta en blanco —</option>` + s.recetas.map((r) => `<option value="${r.id}"${c.recetaId === r.id ? ' selected' : ''}>${esc(r.nombre)}</option>`).join('');
    return `
      <div class="hdr">
        <div>
          <div class="eyebrow">Herramienta</div>
          <div class="title-serif">Calculadora</div>
        </div>
        <button class="hdr-btn" data-act="calc-limpiar" title="Limpiar">${icon('x')}</button>
      </div>
      <div class="stack" style="padding-top:14px;gap:16px">
        <div class="seg-row">
          <button type="button" class="seg-btn${c.modo === 'pct2g' ? ' active' : ''}" data-act="calc-set-modo" data-val="pct2g">% → gramos</button>
          <button type="button" class="seg-btn${c.modo === 'g2pct' ? ' active' : ''}" data-act="calc-set-modo" data-val="g2pct">Gramos → %</button>
        </div>

        <div class="form-section">
          <span class="form-label">Partir de</span>
          <select class="form-select" id="calcRecetaSelect">${recetaOptions}</select>
        </div>

        ${c.modo === 'pct2g' ? `
        <div class="form-section">
          <span class="form-label">Tamaño del lote (g)</span>
          <input class="form-input" id="calcLote" type="number" inputmode="decimal" step="1" min="0" placeholder="ej. 2000" value="${c.lote === '' || c.lote == null ? '' : c.lote}">
        </div>` : ''}

        <div class="form-section">
          <span class="form-label">Ingredientes</span>
          ${rows}
          <button type="button" class="ing-add-btn" data-act="calc-add-fila">${icon('plus')}<span>Añadir ingrediente</span></button>
        </div>

        <div class="panel" id="calcTotales">${renderCalcTotales(res, c.modo)}</div>

        <button type="button" class="export-btn" data-act="calc-exportar-pdf">${icon('printer')}<span>Exportar a PDF</span></button>
        <div style="height:24px"></div>
      </div>
    `;
  }

  function renderTabbar() {
    return `
      <button type="button" class="tab-btn${state.section === 'recetario' ? ' active' : ''}" data-act="set-section" data-section="recetario">${icon('book')}<span class="label">Recetario</span></button>
      <button type="button" class="tab-btn${state.section === 'calculadora' ? ' active' : ''}" data-act="set-section" data-section="calculadora">${icon('percent')}<span class="label">Calculadora</span></button>
    `;
  }

  // ---- main render -------------------------------------------------------
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="phone">
      <div class="brand-bar"><img src="assets/en-torno-logo.jpg" alt=""><span>En-Torno</span></div>
      <div class="screen" id="screen"></div>
      <div class="tabbar" id="tabbarSlot"></div>
    </div>`;
  const screenEl = document.getElementById('screen');
  const tabbarSlot = document.getElementById('tabbarSlot');

  function render() {
    // preserve focus/caret across full re-renders triggered by typing (e.g. search box)
    const active = document.activeElement;
    const activeId = active && active.id;
    const selStart = active && 'selectionStart' in active ? active.selectionStart : null;
    const selEnd = active && 'selectionEnd' in active ? active.selectionEnd : null;
    const scrollTop = screenEl.scrollTop;

    let body;
    if (state.section === 'calculadora') body = renderCalculadora(state);
    else if (state.tab === 'detalle') body = renderDetalle(state);
    else if (state.tab === 'form') body = renderForm(state.form);
    else body = renderLista(state);

    screenEl.innerHTML = renderToast() + body;
    tabbarSlot.innerHTML = renderTabbar();
    screenEl.scrollTop = scrollTop;

    if (activeId) {
      const el = document.getElementById(activeId);
      if (el) {
        el.focus();
        if (selStart != null && typeof el.setSelectionRange === 'function') {
          try { el.setSelectionRange(selStart, selEnd); } catch (e) { /* input type doesn't support selection range */ }
        }
      }
    }
  }

  function liveIngredientTotal() {
    let total = 0;
    document.querySelectorAll('.ing-pct').forEach((i) => { const v = parseFloat(i.value); if (!isNaN(v)) total += v; });
    return Math.round(total * 10) / 10;
  }
  function updateIngTotalUI() {
    const el = document.getElementById('ingTotal');
    if (!el) return;
    const total = liveIngredientTotal();
    el.textContent = total + '%';
    el.style.color = Math.abs(total - 100) < 0.51 ? 'var(--green)' : 'var(--sandd)';
  }

  // ---- event delegation ---------------------------------------------------
  app.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;

    // Any click while editing may trigger a re-render that rebuilds the form's
    // HTML from state.form — sync first so nothing typed gets lost.
    if (state.tab === 'form' && state.form && act !== 'volver' && act !== 'guardar-receta') syncFormFromDOM();
    // Same idea for the calculator: a structural click (add/del row, change mode...)
    // re-renders the rows from state.calc, so capture whatever's typed first.
    if (state.section === 'calculadora' && act !== 'calc-limpiar') syncCalcFromDOM();

    if (act === 'set-section') { state.section = el.dataset.section; return render(); }
    if (act === 'calc-set-modo') { state.calc.modo = el.dataset.val; return render(); }
    if (act === 'calc-add-fila') { state.calc.filas.push({ material: '', valor: '' }); return render(); }
    if (act === 'calc-del-fila') {
      state.calc.filas.splice(Number(el.dataset.idx), 1);
      if (!state.calc.filas.length) state.calc.filas.push({ material: '', valor: '' });
      return render();
    }
    if (act === 'calc-limpiar') { state.calc = blankCalc(); return render(); }
    if (act === 'calc-exportar-pdf') return exportCalcPdf();

    if (act === 'nueva-receta') return goNewRecipe();
    if (act === 'ver-receta') { state.viewId = el.dataset.id; state.tab = 'detalle'; return render(); }
    if (act === 'editar-receta') return goEditRecipe(el.dataset.id);
    if (act === 'duplicar-receta') return void duplicateRecipe(el.dataset.id);
    if (act === 'borrar-receta') return void deleteRecipe(el.dataset.id);
    if (act === 'volver') {
      state.form = null;
      state.tab = state.viewId ? 'detalle' : 'lista';
      return render();
    }
    if (act === 'volver-lista') { state.viewId = null; state.tab = 'lista'; return render(); }
    if (act === 'set-filtro-tipo') { state.filtroTipo = el.dataset.val; return render(); }
    if (act === 'set-filtro-tag') { state.filtroTag = state.filtroTag === el.dataset.val ? null : el.dataset.val; return render(); }
    if (act === 'exportar') return void exportExcel();
    if (act === 'toast-close') { clearTimeout(toastTimer); state.toast = null; return render(); }

    if (act === 'set-field') {
      const field = el.dataset.field, val = el.dataset.val;
      state.form[field] = state.form[field] === val ? '' : val;
      return render();
    }
    if (act === 'add-ingrediente') {
      state.form.ingredientes.push({ material: '', porcentaje: '' });
      return render();
    }
    if (act === 'del-ingrediente') {
      state.form.ingredientes.splice(Number(el.dataset.idx), 1);
      if (!state.form.ingredientes.length) state.form.ingredientes.push({ material: '', porcentaje: '' });
      return render();
    }
    if (act === 'add-tag') return addTagFromInput();
    if (act === 'del-tag') {
      state.form.etiquetas = state.form.etiquetas.filter((t) => t !== el.dataset.tag);
      return render();
    }
    if (act === 'pick-foto') return document.getElementById('fotoInput').click();
    if (act === 'del-foto') { state.form.fotoDataUrl = null; return render(); }
    if (act === 'guardar-receta') return void saveRecipeFromForm().then(render);
  });

  app.addEventListener('input', (e) => {
    if (e.target.id === 'searchInput') { state.query = e.target.value; return render(); }
    if (e.target.classList.contains('ing-pct')) return updateIngTotalUI();
    if (e.target.id === 'calcLote' || e.target.classList.contains('calc-valor')) return recalcCalcUI();
  });

  app.addEventListener('change', (e) => {
    if (e.target.id !== 'calcRecetaSelect') return;
    syncCalcFromDOM();
    const id = e.target.value;
    state.calc.recetaId = id;
    const receta = id ? state.recetas.find((r) => r.id === id) : null;
    if (receta && receta.ingredientes && receta.ingredientes.length) {
      state.calc.filas = receta.ingredientes.map((i) => ({
        material: i.material,
        valor: state.calc.modo === 'pct2g' && i.porcentaje !== '' && i.porcentaje != null ? i.porcentaje : '',
      }));
    } else {
      state.calc.filas = [{ material: '', valor: '' }];
    }
    render();
  });

  app.addEventListener('keydown', (e) => {
    if (e.target.id === 'tagInput' && e.key === 'Enter') { e.preventDefault(); addTagFromInput(); }
  });

  document.getElementById('fotoInput').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file || !state.form) return;
    try {
      const dataUrl = await compressImage(file);
      syncFormFromDOM();
      state.form.fotoDataUrl = dataUrl;
      render();
    } catch (err) {
      showToast('No se pudo procesar la foto');
    }
  });

  // ---- init ----------------------------------------------------------------
  async function init() {
    try { state.recetas = await idbGetAll(); } catch (e) { state.recetas = []; }
    state.recetas.sort((a, b) => (b.actualizado || '').localeCompare(a.actualizado || ''));
    render();
  }
  init();
})();
