let state = {
    collections: [],
    environments: [],
    currentRequest: {
        id: null,
        name: '',
        method: 'GET',
        url: '',
        headers: [],
        params: [],
        body_type: 'none',
        body: '',
        auth_type: 'none',
        auth_config: {}
    },
    activeTab: 'params'
};

// --- Initialization ---
async function init() {
    await loadCollections();
    await loadEnvironments();
    setupTabs();
    // Use timeout to ensure DOM is fully rendered
    setTimeout(() => {
        addRow('params');
        addRow('headers');
    }, 100);
}

// --- API Calls ---
async function loadCollections() {
    try {
        const res = await fetch('/api/collections');
        state.collections = await res.json();
        renderCollections();
    } catch (e) { console.error("Error loading collections", e); }
}

async function loadEnvironments() {
    try {
        const res = await fetch('/api/environments');
        state.environments = await res.json();
        renderEnvironments();
    } catch (e) { console.error("Error loading environments", e); }
}

async function sendRequest() {
    const btn = document.querySelector('.btn-primary');
    btn.disabled = true;
    btn.innerText = 'Sending...';

    const reqData = collectRequestData();
    const envId = document.getElementById('env-selector').value;

    try {
        const res = await fetch(`/api/execute${envId ? '?env_id=' + envId : ''}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reqData)
        });
        const result = await res.json();
        renderResponse(result);
    } catch (err) {
        showModal('Error', `<p style="color:var(--error)">${err.message}</p>`, null, true);
    } finally {
        btn.disabled = false;
        btn.innerText = 'Send';
    }
}

// --- Modal System ---
function showModal(title, bodyHTML, onConfirm, isAlert = false) {
    const modal = document.getElementById('modal-container');
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-body').innerHTML = bodyHTML;
    
    const confirmBtn = document.getElementById('modal-confirm');
    const cancelBtn = document.getElementById('modal-cancel');
    
    if (isAlert) {
        cancelBtn.classList.add('hidden');
        confirmBtn.innerText = 'OK';
    } else {
        cancelBtn.classList.remove('hidden');
        confirmBtn.innerText = 'Confirm';
    }
    
    modal.classList.remove('hidden');
    
    const close = () => modal.classList.add('hidden');
    
    cancelBtn.onclick = close;
    confirmBtn.onclick = () => {
        if (onConfirm) {
            const inputs = document.getElementById('modal-body').querySelectorAll('input, textarea, select');
            const values = Array.from(inputs).map(i => i.value);
            onConfirm(values.length === 1 ? values[0] : values);
        }
        close();
    };
}

// --- UI Rendering ---
function renderCollections() {
    const list = document.getElementById('collections-list');
    if (state.collections.length === 0) {
        list.innerHTML = '<div style="padding: 10px; font-size: 0.8rem; color: var(--text-secondary);">No collections yet</div>';
        return;
    }
    list.innerHTML = state.collections.map(col => `
        <div class="collection-group">
            <div class="list-item" onclick="toggleCollection('${col.id}')">
                <div class="flex-row">📁 ${col.name}</div>
                <div class="item-actions">
                    <span class="action-btn" title="Rename" onclick="renameCollection('${col.id}', event)">✏️</span>
                    <span class="action-btn" title="Delete" onclick="deleteCollection('${col.id}', event)">🗑️</span>
                </div>
            </div>
            <div id="col-items-${col.id}" class="hidden" style="padding-left: 1rem;">
                ${col.items.map(item => `
                    <div class="list-item" onclick="loadRequest('${col.id}', '${item.id}')">
                        <div class="flex-row">
                            <span style="color: var(--accent-color); font-weight: bold; font-size: 0.7rem; width: 35px; display: inline-block;">${item.method}</span>
                            ${item.name}
                        </div>
                    </div>
                `).join('')}
                ${col.items.length === 0 ? '<div style="padding: 5px; font-size: 0.7rem; color: var(--text-secondary);">Empty</div>' : ''}
            </div>
        </div>
    `).join('');
}

function renderEnvironments() {
    const selector = document.getElementById('env-selector');
    const currentVal = selector.value;
    selector.innerHTML = '<option value="">No Environment</option>' + 
        state.environments.map(env => `<option value="${env.id}">${env.name}</option>`).join('');
    selector.value = currentVal;
    
    const list = document.getElementById('envs-list');
    list.innerHTML = state.environments.map(env => `
        <div class="list-item">
            <div class="flex-row">🌐 ${env.name}</div>
            <div class="item-actions">
                <span class="action-btn" title="Edit Variables" onclick="editEnvironment('${env.id}', event)">✏️</span>
                <span class="action-btn" title="Delete" onclick="deleteEnvironment('${env.id}', event)">🗑️</span>
            </div>
        </div>
    `).join('');
}

function renderResponse(result) {
    const statusEl = document.getElementById('res-status');
    const bodyEl = document.getElementById('response-body');
    
    if (result.error) {
        statusEl.innerText = 'ERROR';
        statusEl.className = 'status-code error';
        bodyEl.innerText = result.error;
        return;
    }

    statusEl.innerText = `${result.status_code} ${result.status_text || ''}`;
    statusEl.className = `status-code ${result.status_code < 400 ? 'success' : 'error'}`;
    
    document.getElementById('res-time').innerText = result.time_ms || 0;
    document.getElementById('res-size').innerText = result.size_bytes || 0;

    if (typeof result.body === 'object') {
        bodyEl.innerText = JSON.stringify(result.body, null, 4);
    } else {
        bodyEl.innerText = result.body;
    }
}

// --- Logic ---
function collectRequestData() {
    const bodyVal = document.getElementById('body-content').value;
    return {
        id: state.currentRequest.id || null,
        name: state.currentRequest.name || 'Untitled',
        method: document.getElementById('method').value,
        url: document.getElementById('url').value,
        headers: getRows('headers'),
        params: getRows('params'),
        body_type: document.getElementById('body-type').value,
        body: bodyVal === "" ? null : bodyVal,
        auth_type: document.getElementById('auth-type').value,
        auth_config: {}
    };
}

function getRows(type) {
    const container = document.getElementById(`${type}-list`);
    const rows = [];
    if (!container) return rows;
    container.querySelectorAll('.flex-row').forEach(row => {
        const key = row.querySelector('.key').value;
        const val = row.querySelector('.val').value;
        const enabled = row.querySelector('input[type="checkbox"]').checked;
        if (key) rows.push({ key, value: val, enabled });
    });
    return rows;
}

function addRow(type, key = '', value = '', enabled = true) {
    const container = document.getElementById(`${type}-list`);
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'flex-row mt-2';
    div.innerHTML = `
        <input type="checkbox" ${enabled ? 'checked' : ''}>
        <input type="text" class="key" placeholder="Key" value="${key}" style="flex:1">
        <input type="text" class="val" placeholder="Value" value="${value}" style="flex:2">
        <button class="btn-outline" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(div);
}

function setupTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.onclick = () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
            
            tab.classList.add('active');
            const target = document.getElementById(`tab-${tab.dataset.tab}`);
            if (target) target.classList.remove('hidden');
        };
    });
}

function toggleCollection(id) {
    const el = document.getElementById(`col-items-${id}`);
    if (el) el.classList.toggle('hidden');
}

function createNewCollection() {
    showModal('New Collection', '<input type="text" placeholder="Collection Name" id="new-col-name">', async (name) => {
        if (!name) return;
        const res = await fetch('/api/collections', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ name, items: [] })
        });
        if (res.ok) await loadCollections();
    });
}

function createNewEnvironment() {
    showModal('New Environment', '<input type="text" placeholder="Environment Name" id="new-env-name">', async (name) => {
        if (!name) return;
        const res = await fetch('/api/environments', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ name, variables: [] })
        });
        if (res.ok) await loadEnvironments();
    });
}

function renameCollection(id, event) {
    if (event) event.stopPropagation();
    const col = state.collections.find(c => c.id === id);
    showModal('Rename Collection', `<input type="text" value="${col.name}" id="rename-col-name">`, async (newName) => {
        if (!newName || newName === col.name) return;
        col.name = newName;
        const res = await fetch(`/api/collections/${id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(col)
        });
        if (res.ok) await loadCollections();
    });
}

function deleteCollection(id, event) {
    if (event) event.stopPropagation();
    showModal('Delete Collection', '<p>Are you sure you want to delete this collection?</p>', async () => {
        const res = await fetch(`/api/collections/${id}`, { method: 'DELETE' });
        if (res.ok) await loadCollections();
    });
}

function deleteEnvironment(id, event) {
    if (event) event.stopPropagation();
    showModal('Delete Environment', '<p>Are you sure you want to delete this environment?</p>', async () => {
        const res = await fetch(`/api/environments/${id}`, { method: 'DELETE' });
        if (res.ok) await loadEnvironments();
    });
}

function editEnvironment(id, event) {
    if (event) event.stopPropagation();
    const env = state.environments.find(e => e.id === id);
    const varsText = env.variables.map(v => `${v.key}=${v.value}`).join("\n");
    showModal('Edit Variables', `<p>Format: key=value (one per line)</p><textarea style="height:200px" id="env-vars-edit">${varsText}</textarea>`, async (result) => {
        const newVars = result.split("\n").filter(line => line.includes("=")).map(line => {
            const [k, ...v] = line.split("=");
            return { key: k.trim(), value: v.join("=").trim(), enabled: true };
        });
        env.variables = newVars;
        await fetch(`/api/environments/${id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(env)
        });
        loadEnvironments();
    });
}

function saveRequest() {
    if (state.collections.length === 0) {
        showModal('Alert', '<p>Create a collection first!</p>', null, true);
        return;
    }

    const colOptions = state.collections.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    const bodyHTML = `
        <label>Select Collection:</label>
        <select id="save-col-id">${colOptions}</select>
        <label class="mt-2 block">Request Name:</label>
        <input type="text" id="save-req-name" value="${state.currentRequest.name || 'New Request'}">
    `;

    showModal('Save Request', bodyHTML, async (vals) => {
        const [colId, reqName] = vals;
        const col = state.collections.find(c => c.id === colId);
        const data = collectRequestData();
        data.name = reqName;
        if (!data.id) data.id = Date.now().toString();

        const existingIdx = col.items.findIndex(item => item.id === data.id);
        if (existingIdx !== -1) {
            col.items[existingIdx] = data;
        } else {
            col.items.push(data);
        }
        
        const res = await fetch(`/api/collections/${colId}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(col)
        });
        if (res.ok) await loadCollections();
    });
}

async function importPostman() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = async event => {
            try {
                const json = JSON.parse(event.target.result);
                const res = await fetch('/api/import-postman', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(json)
                });
                if (res.ok) {
                    showModal('Success', '<p>Imported successfully!</p>', null, true);
                    await loadCollections();
                } else {
                    const err = await res.json();
                    showModal('Error', `<p>Import failed: ${err.detail}</p>`, null, true);
                }
            } catch (err) {
                showModal('Error', '<p>Invalid JSON file</p>', null, true);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function loadRequest(colId, reqId) {
    const col = state.collections.find(c => c.id === colId);
    const req = col.items.find(r => r.id === reqId);
    
    document.getElementById('method').value = req.method;
    document.getElementById('url').value = req.url;
    document.getElementById('body-type').value = req.body_type;
    
    const area = document.getElementById('body-content');
    area.value = typeof req.body === 'string' ? req.body : (req.body ? JSON.stringify(req.body, null, 2) : '');
    toggleBodyType();
    
    document.getElementById('headers-list').innerHTML = '';
    if (req.headers.length === 0) addRow('headers');
    else req.headers.forEach(h => addRow('headers', h.key, h.value, h.enabled));
    
    document.getElementById('params-list').innerHTML = '';
    if (req.params.length === 0) addRow('params');
    else req.params.forEach(p => addRow('params', p.key, p.value, p.enabled));
    
    state.currentRequest = req;
}

function toggleBodyType() {
    const type = document.getElementById('body-type').value;
    const area = document.getElementById('body-content');
    if (type === 'none') area.classList.add('hidden');
    else area.classList.remove('hidden');
}

// Global scope for HTML
window.createNewCollection = createNewCollection;
window.createNewEnvironment = createNewEnvironment;
window.renameCollection = renameCollection;
window.deleteCollection = deleteCollection;
window.deleteEnvironment = deleteEnvironment;
window.editEnvironment = editEnvironment;
window.saveRequest = saveRequest;
window.sendRequest = sendRequest;
window.addRow = addRow;
window.toggleCollection = toggleCollection;
window.toggleBodyType = toggleBodyType;
window.importPostman = importPostman;
window.loadRequest = loadRequest;

init();
