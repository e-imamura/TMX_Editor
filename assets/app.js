
// =========================
// Estado e UI
// =========================
const state = { tmxDoc: null, fileName: null };

function setStatus(msg) {
  const el = document.getElementById('status');
  if (el) el.textContent = msg || '';
}

function updateFileInfo() {
  const el = document.getElementById('fileInfo');
  if (el) el.textContent = state.fileName ? ('Arquivo: ' + state.fileName) : '';
}

// =========================
// Sanitização de XML (BOM + espaços iniciais)
// =========================
function sanitizeXml(xmlStr) {
  // Remove BOM (U+FEFF) e espaços/linhas no início
  return xmlStr.replace(/^\uFEFF/, '').replace(/^\s+/, '');
}

// =========================
/* Parse e Serialização de TMX */
// =========================
function parseTmx(xmlStr) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlStr, 'text/xml');
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    console.error('ParserError:', parserError.textContent);
    throw new Error('XML inválido: ' + parserError.textContent);
  }
  const tmxEl = doc.querySelector('tmx');
  if (!tmxEl) throw new Error('Arquivo TMX inválido: <tmx> não encontrado.');
  return doc;
}

function serializeTmx(doc) {
  const serializer = new XMLSerializer();
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + serializer.serializeToString(doc);
}

// =========================
// Download
// =========================
function downloadTmx(filename, xmlStr) {
  const blob = new Blob([xmlStr], { type: 'text/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename && filename.endsWith('.tmx') ? filename : (filename ? filename + '.tmx' : 'export.tmx');
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// =========================
// Garantir IDs nas TUs (id sequencial)
// =========================
function ensureids(doc) {
  const bodyEl = doc.querySelector('body');
  if (!bodyEl) return;
  const tuEls = Array.from(bodyEl.querySelectorAll(':scope > tu'));
  // Descobrir maior id existente para continuar a sequência
  let maxId = 0;
  for (const tu of tuEls) {
    const raw = tu.getAttribute('id') || tu.getAttribute('id');
    const n = raw ? parseInt(raw, 10) : NaN;
    if (!isNaN(n) && n > maxId) maxId = n;
  }
  // Atribuir id para TUs sem ID
  let nextId = maxId || 0;
  for (const tu of tuEls) {
    const hasId = tu.hasAttribute('id');
    if (!hasId) {
      nextId += 1;
      tu.setAttribute('id', String(nextId));
    }
  }
}

// =========================
/* Renderização da Tabela (TU ID, Source, Target)
   Source = primeiro <tuv>; Target = segundo <tuv> */
// =========================
function renderTable() {
  const tbody = document.querySelector('#Table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (!state.tmxDoc) return;

  const tuEls = Array.from(state.tmxDoc.querySelectorAll('body > tu'));

  tuEls.forEach(tuEl => {
    const id = tuEl.getAttribute('id') || '';
    const tuvEls = Array.from(tuEl.querySelectorAll(':scope > tuv'));
    const sourceSegEl = tuvEls[0]?.querySelector('seg');
    const targetSegEl = tuvEls[1]?.querySelector('seg');

    const source = sourceSegEl?.textContent || '';
    const target = targetSegEl?.textContent || '';

    const tr = document.createElement('tr');

    // === TU ID ===
    const tdId = document.createElement('td');
    tdId.textContent = id;

    // === SOURCE (somente leitura) ===
    const tdSource = document.createElement('td');
    const taSource = document.createElement('textarea');
    taSource.value = source;

    // Tornar somente leitura, mas ainda selecionável/copiar
    taSource.readOnly = true;
    taSource.setAttribute('aria-readonly', 'true');

    // Bloquear qualquer tentativa de editar/colar/soltar
    taSource.addEventListener('keydown', (e) => e.preventDefault());
    taSource.addEventListener('paste', (e) => e.preventDefault());
    taSource.addEventListener('drop', (e) => e.preventDefault());
    taSource.addEventListener('input', (e) => e.preventDefault());

    // Estilo opcional para indicar leitura
    taSource.style.background = '#f7f7f7';
    taSource.style.color = '#333';
    taSource.style.cursor = 'default';

    tdSource.appendChild(taSource);

    // === TARGET (editável) ===
    const tdTarget = document.createElement('td');
    const taTarget = document.createElement('textarea');
    taTarget.value = target;

    // Atualiza o <seg> do target no XML
    taTarget.addEventListener('input', () => {
      if (tuvEls[1]) {
        let segEl = tuvEls[1].querySelector('seg');
        if (!segEl) {
          segEl = state.tmxDoc.createElement('seg');
          tuvEls[1].appendChild(segEl);
        }
        segEl.textContent = taTarget.value;
      } else {
        // cria TUV target se não existir
        const newTuv = state.tmxDoc.createElement('tuv');
        const segEl = state.tmxDoc.createElement('seg');
        segEl.textContent = taTarget.value;
        newTuv.appendChild(segEl);
        tuEl.appendChild(newTuv);
        renderTable(); // re-render para refletir a nova estrutura
      }
    });

    tdTarget.appendChild(taTarget);

    tr.append(tdId, tdSource, tdTarget);
    tbody.appendChild(tr);
  });
}

// =========================
// Handlers de arquivo e drag & drop
// =========================
const fileInput = document.getElementById('fileInput');
const dropzone = document.getElementById('dropzone');
const exportBtn = document.getElementById('exportBtn');

if (fileInput) {
  fileInput.addEventListener('change', async e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const text = sanitizeXml(await file.text());
      const doc = parseTmx(text);
      ensureids(doc); // garante id nas TUs
      state.tmxDoc = doc;
      state.fileName = file.name;
      if (exportBtn) exportBtn.disabled = false;
      updateFileInfo();
      renderTable();
      setStatus('TMX carregado com sucesso.');
    } catch (err) {
      console.error(err);
      setStatus('Erro ao carregar TMX: ' + (err.message || err));
    }
  });
}

if (dropzone) {
  dropzone.addEventListener('dragover', e => e.preventDefault());
  dropzone.addEventListener('drop', async e => {
    e.preventDefault();
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!file) return;
    try {
      const text = sanitizeXml(await file.text());
      const doc = parseTmx(text);
      ensureids(doc); // garante id nas TUs
      state.tmxDoc = doc;
      state.fileName = file.name;
      if (exportBtn) exportBtn.disabled = false;
      updateFileInfo();
      renderTable();
      setStatus('TMX carregado com sucesso (drag & drop).');
    } catch (err) {
      console.error(err);
      setStatus('Erro ao carregar TMX: ' + (err.message || err));
    }
  });
}

// =========================
// Exportação
// =========================
if (exportBtn) {
  exportBtn.addEventListener('click', () => {
    if (!state.tmxDoc) return;
    try {
      const strip = document.getElementById('stripAttrs')?.checked;
      // Clonar o doc se for remover atributos, para não afetar a UI
      let docToExport = state.tmxDoc;
      if (strip) {
        docToExport = state.tmxDoc.cloneNode(true);
        stripAllAttributes(docToExport);
      }
      const xmlStr = serializeTmx(docToExport);
      downloadTmx(state.fileName || 'export', xmlStr);
      setStatus(strip ? 'TMX exportado sem atributos.' : 'TMX exportado.');
    } catch (err) {
      console.error(err);
      setStatus('Erro ao exportar TMX: ' + (err.message || err));
    }
  });
}

// =========================
// Estado inicial
// =========================
if (exportBtn) exportBtn.disabled = true;
setStatus('Abra um arquivo TMX para começar.');

/* ============================================
   Utilitário opcional: remover atributos
   (Se já existir no seu projeto, mantenha-o)
============================================ */
function stripAllAttributes(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null, false);
  let node = walker.currentNode;
  while (node) {
    // Remove todos os atributos do elemento atual
    if (node.attributes) {
      const attrs = Array.from(node.attributes);
      for (const a of attrs) node.removeAttribute(a.name);
    }
    node = walker.nextNode();
  }
}
