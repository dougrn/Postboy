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
        auth_config: {},
        pre_script: '',
        post_script: ''
    },
    activeTab: 'params',
    lastResponse: null,
    jsonEditor: null
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

    const reqData = await collectRequestData();
    const envId = document.getElementById('env-selector').value;

    // Handle GraphQL separately
    if (reqData.body_type === 'graphql') {
        const query = document.getElementById('graphql-query')?.value;
        const variables = document.getElementById('graphql-vars')?.value;

        if (!query) {
            alert('Please enter a GraphQL query');
            btn.disabled = false;
            btn.innerText = 'Send';
            return;
        }

        try {
            const res = await fetch('/api/execute-graphql', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    url: reqData.url,
                    query: query,
                    variables: variables ? JSON.parse(variables) : {}
                })
            });
            const result = await res.json();
            renderResponse({
                status: result.status_code,
                time: 0,
                size: JSON.stringify(result.body).length,
                body: result.body
            });
        } catch (e) {
            console.error('GraphQL request error:', e);
            document.getElementById('response-body').innerText = 'Error: ' + e.message;
        } finally {
            btn.disabled = false;
            btn.innerText = 'Send';
        }
        return;
    }

    // Regular HTTP request
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
                    <span class="action-btn" title="Add Request" onclick="addRequestToCollection('${col.id}', event)">+</span>
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
                        <div class="item-actions">
                            <span class="action-btn" title="Duplicate" onclick="event.stopPropagation(); duplicateRequest('${col.id}', '${item.id}')">📋</span>
                            <span class="action-btn" title="Rename" onclick="event.stopPropagation(); renameRequest('${col.id}', '${item.id}')">✏️</span>
                            <span class="action-btn" title="Delete" onclick="event.stopPropagation(); deleteRequest('${col.id}', '${item.id}', event)">🗑️</span>
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

// --- Logic ---
async function collectRequestData() {
    const bodyVal = document.getElementById('body-content').value;
    const bodyType = document.getElementById('body-type').value;
    const authType = document.getElementById('auth-type').value;
    const authConfig = {};

    if (authType === 'bearer') {
        const tokenEl = document.getElementById('bearer-token');
        if (tokenEl) authConfig.token = tokenEl.value;
    } else if (authType === 'basic') {
        const userEl = document.getElementById('basic-user');
        const passEl = document.getElementById('basic-pass');
        if (userEl) authConfig.username = userEl.value;
        if (passEl) authConfig.password = passEl.value;
    }

    let body = null;

    // Handle form-data with file uploads
    if (bodyType === 'form-data') {
        body = {};
        const container = document.getElementById('form-data-rows');
        if (container) {
            for (const row of container.querySelectorAll('.flex-row')) {
                const key = row.querySelector('.fd-key').value;
                const type = row.querySelector('.fd-type').value;
                if (!key) continue;

                if (type === 'file') {
                    const fileInput = row.querySelector('.fd-file');
                    if (fileInput && fileInput.files && fileInput.files[0]) {
                        const file = fileInput.files[0];
                        const base64 = await readFileAsBase64(file);
                        body[key] = { type: 'file', content: base64, filename: file.name };
                    }
                } else {
                    const valueInput = row.querySelector('.fd-value');
                    if (valueInput) body[key] = valueInput.value;
                }
            }
        }
    } else if (bodyType === 'graphql') {
        // GraphQL handled separately in sendRequest
        body = bodyVal;
    } else {
        body = bodyVal === "" ? null : bodyVal;
    }

    return {
        id: state.currentRequest.id || null,
        name: state.currentRequest.name || 'Untitled',
        method: document.getElementById('method').value,
        url: document.getElementById('url').value,
        headers: getRows('headers'),
        params: getRows('params'),
        body_type: bodyType,
        body: body,
        auth_type: authType,
        auth_config: authConfig
    };
}

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
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
        <div class="input-copy-wrapper" style="flex:1">
            <input type="text" class="key" placeholder="Key" value="${key}">
            <button class="copy-btn" title="Copy" onclick="copyValue(this)">📋</button>
        </div>
        <div class="input-copy-wrapper" style="flex:2">
            <input type="text" class="val" placeholder="Value" value="${value}">
            <button class="copy-btn" title="Copy" onclick="copyValue(this)">📋</button>
        </div>
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
    const graphqlContainer = document.getElementById('graphql-container');
    const formDataContainer = document.getElementById('form-data-container');

    area.classList.add('hidden');
    if (graphqlContainer) graphqlContainer.classList.add('hidden');
    if (formDataContainer) formDataContainer.classList.add('hidden');

    if (type === 'json' || type === 'text') {
        area.classList.remove('hidden');
    } else if (type === 'graphql') {
        if (graphqlContainer) graphqlContainer.classList.remove('hidden');
    } else if (type === 'form-data') {
        if (formDataContainer) formDataContainer.classList.remove('hidden');
    }
}

// --- Form Data ---
function addFormDataRow(key = '', value = '', fieldType = 'text') {
    const container = document.getElementById('form-data-rows');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'flex-row mt-2';
    const rowId = 'fd-' + Date.now();
    div.innerHTML = `
        <input type="text" class="fd-key" placeholder="Key" value="${key}" style="flex:1">
        <select class="fd-type" onchange="toggleFormFieldType(this, '${rowId}')" style="width:80px">
            <option value="text" ${fieldType === 'text' ? 'selected' : ''}>Text</option>
            <option value="file" ${fieldType === 'file' ? 'selected' : ''}>File</option>
        </select>
        <div id="${rowId}" style="flex:2">
            ${fieldType === 'file'
                ? '<input type="file" class="fd-file">'
                : '<input type="text" class="fd-value" placeholder="Value" value="' + value + '">'
            }
        </div>
        <button class="btn-outline" onclick="this.parentElement.remove()">x</button>
    `;
    container.appendChild(div);
}

function toggleFormFieldType(select, rowId) {
    const container = document.getElementById(rowId);
    if (!container) return;
    if (select.value === 'file') {
        container.innerHTML = '<input type="file" class="fd-file">';
    } else {
        container.innerHTML = '<input type="text" class="fd-value" placeholder="Value">';
    }
}

// --- WebSocket Client ---
let wsClient = null;
let wsState = { connected: false, client_id: null };

async function toggleWebSocket() {
    const btn = document.getElementById('ws-connect-btn');
    const url = document.getElementById('ws-url').value;
    const status = document.getElementById('ws-status');
    const log = document.getElementById('ws-log');

    if (!wsState.connected) {
        // Connect
        if (!url) {
            alert('Please enter a WebSocket URL');
            return;
        }

        // Create client ID
        wsState.client_id = 'client_' + Date.now();

        // Connect via backend proxy
        const socket = new WebSocket(`ws://${window.location.host}/ws/${wsState.client_id}`);

        socket.onopen = () => {
            socket.send(JSON.stringify({ type: 'connect', url: url }));
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'connect') {
                if (data.success) {
                    wsState.connected = true;
                    btn.innerText = 'Disconnect';
                    btn.className = 'btn btn-outline';
                    status.innerText = 'Connected';
                    status.style.color = 'var(--success)';
                    log.innerHTML += '<div style="color: #4ade80">Connected to ' + url + '</div>';
                } else {
                    log.innerHTML += '<div style="color: #f87171">Connection failed: ' + (data.msg || 'Unknown error') + '</div>';
                }
            } else if (data.type === 'message') {
                log.innerHTML += '<div style="color: #60a5fa">&lt; ' + data.data + '</div>';
            } else if (data.type === 'error') {
                log.innerHTML += '<div style="color: #f87171">Error: ' + data.msg + '</div>';
            } else if (data.type === 'status' && data.data === 'disconnected') {
                disconnectWebSocket();
            }
        };

        socket.onclose = () => {
            if (wsState.connected) disconnectWebSocket();
        };

        socket.onerror = () => {
            log.innerHTML += '<div style="color: #f87171">WebSocket error</div>';
        };

        wsClient = socket;
    } else {
        disconnectWebSocket();
    }
}

function disconnectWebSocket() {
    if (wsClient) {
        wsClient.close();
        wsClient = null;
    }
    const btn = document.getElementById('ws-connect-btn');
    const status = document.getElementById('ws-status');
    const log = document.getElementById('ws-log');

    wsState.connected = false;
    btn.innerText = 'Connect';
    btn.className = 'btn btn-primary';
    status.innerText = 'Disconnected';
    status.style.color = 'var(--text-secondary)';
    log.innerHTML += '<div style="color: #f87171">Disconnected</div>';
}

async function sendWSMessage() {
    const msgInput = document.getElementById('ws-message');
    const msg = msgInput.value;
    const log = document.getElementById('ws-log');

    if (!msg) return;
    if (!wsState.connected || !wsClient) {
        alert('Not connected to WebSocket');
        return;
    }

    // Send via backend proxy
    wsClient.send(JSON.stringify({ type: 'send', payload: msg }));
    log.innerHTML += '<div style="color: #fbbf24">&gt; ' + msg + '</div>';
    msgInput.value = '';
}

// --- Copy Button ---
function copyValue(btn) {
    const input = btn.parentElement.querySelector('input');
    if (!input) return;
    navigator.clipboard.writeText(input.value).then(() => {
        btn.innerText = '✓';
        setTimeout(() => btn.innerText = '📋', 1500);
    });
}

function copyValueById(id) {
    const input = document.getElementById(id);
    if (!input) return;
    navigator.clipboard.writeText(input.value).then(() => {
        const btn = input.parentElement.querySelector('.copy-btn');
        if (btn) {
            btn.innerText = '✓';
            setTimeout(() => btn.innerText = '📋', 1500);
        }
    });
}

function copyResponse() {
    const responseBody = document.getElementById('response-body');
    if (!responseBody) return;
    navigator.clipboard.writeText(responseBody.innerText).then(() => {
        const btn = event.target;
        btn.innerText = '✓';
        setTimeout(() => btn.innerText = '📋', 1500);
    });
}

// --- Auth Config Rendering ---
function renderAuthConfig() {
    const type = document.getElementById('auth-type').value;
    const container = document.getElementById('auth-config');
    if (!container) return;

    if (type === 'bearer') {
        container.innerHTML = `
            <div class="input-copy-wrapper mt-2">
                <input type="text" id="bearer-token" placeholder="Bearer Token" value="${state.currentRequest.auth_config?.token || ''}" style="flex:1">
                <button class="copy-btn" onclick="copyValue(this)">📋</button>
            </div>`;
    } else if (type === 'basic') {
        container.innerHTML = `
            <div class="flex-row mt-2">
                <input type="text" id="basic-user" placeholder="Username" value="${state.currentRequest.auth_config?.username || ''}" style="flex:1">
                <button class="copy-btn" onclick="copyValue(this)">📋</button>
            </div>
            <div class="flex-row mt-2">
                <input type="password" id="basic-pass" placeholder="Password" value="${state.currentRequest.auth_config?.password || ''}" style="flex:1">
                <button class="copy-btn" onclick="copyValue(this)">📋</button>
            </div>`;
    } else {
        container.innerHTML = '';
    }
}

// --- History Modal ---
async function showHistoryModal() {
    const modal = document.getElementById('history-modal');
    const list = document.getElementById('history-list');
    if (!modal || !list) return;

    try {
        const res = await fetch('/api/history');
        const history = await res.json();
        list.innerHTML = history.length === 0
            ? '<div style="padding:1rem;text-align:center;color:var(--text-secondary)">No history yet</div>'
            : history.map(h => `
                <div style="padding:0.75rem;border-bottom:1px solid var(--border-color);cursor:pointer" onclick="loadHistoryItem('${h.id}')">
                    <div style="display:flex;justify-content:space-between;align-items:center">
                        <strong>${h.method} ${h.url?.substring(0, 50) || 'Unknown'}</strong>
                        <span style="color:${h.status >= 200 && h.status < 300 ? 'var(--success)' : 'var(--error)'}">${h.status}</span>
                    </div>
                    <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:0.25rem">${new Date(h.timestamp).toLocaleString()}</div>
                </div>
            `).join('');
        modal.classList.remove('hidden');
    } catch (e) {
        console.error('Error loading history', e);
    }
}

function closeHistoryModal() {
    document.getElementById('history-modal').classList.add('hidden');
}

async function clearHistory() {
    showModal('Clear History', '<p>Are you sure you want to clear all history?</p>', async () => {
        await fetch('/api/history', { method: 'DELETE' });
        showHistoryModal();
    });
}

async function loadHistoryItem(id) {
    try {
        const res = await fetch(`/api/history/${id}`);
        const item = await res.json();
        // Load into current request view
        document.getElementById('method').value = item.method;
        document.getElementById('url').value = item.url || '';
        document.getElementById('headers-list').innerHTML = '';
        if (item.headers) item.headers.forEach(h => addRow('headers', h.key, h.value, h.enabled));
        if (item.params) item.params.forEach(p => addRow('params', p.key, p.value, p.enabled));
        closeHistoryModal();
    } catch (e) {
        console.error('Error loading history item', e);
    }
}

// --- Response Headers ---
function toggleResponseHeaders() {
    const el = document.getElementById('response-headers');
    if (el) el.classList.toggle('hidden');
}

// --- Request CRUD ---
async function duplicateRequest(colId, reqId) {
    const col = state.collections.find(c => c.id === colId);
    const req = col.items.find(r => r.id === reqId);
    if (!req) return;

    const newReq = { ...req, id: Date.now().toString(), name: req.name + ' (copy)' };
    col.items.push(newReq);

    const res = await fetch(`/api/collections/${colId}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(col)
    });
    if (res.ok) loadCollections();
}

async function renameRequest(colId, reqId) {
    const col = state.collections.find(c => c.id === colId);
    const req = col.items.find(r => r.id === reqId);
    if (!req) return;

    showModal('Rename Request', `<input type="text" value="${req.name}" id="rename-req-name">`, async (newName) => {
        if (!newName || newName === req.name) return;
        req.name = newName;
        await fetch(`/api/collections/${colId}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(col)
        });
        loadCollections();
    });
}

async function deleteRequest(colId, reqId, event) {
    if (event) event.stopPropagation();
    const col = state.collections.find(c => c.id === colId);
    showModal('Delete Request', `<p>Delete "${col.items.find(r => r.id === reqId)?.name}"?</p>`, async () => {
        col.items = col.items.filter(r => r.id !== reqId);
        await fetch(`/api/collections/${colId}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(col)
        });
        loadCollections();
    });
}

// Add request to collection
async function addRequestToCollection(colId) {
    state.currentRequest = {
        id: Date.now().toString(),
        name: 'New Request',
        method: 'GET',
        url: '',
        headers: [],
        params: [],
        body_type: 'none',
        body: '',
        auth_type: 'none',
        auth_config: {}
    };
    loadRequest(colId, state.currentRequest.id);
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
window.copyValue = copyValue;
window.copyValueById = copyValueById;
window.copyResponse = copyResponse;
window.renderAuthConfig = renderAuthConfig;
window.showHistoryModal = showHistoryModal;
window.closeHistoryModal = closeHistoryModal;
window.clearHistory = clearHistory;
window.loadHistoryItem = loadHistoryItem;
window.toggleResponseHeaders = toggleResponseHeaders;
window.renderResponse = renderResponse;
window.duplicateRequest = duplicateRequest;
window.renameRequest = renameRequest;
window.deleteRequest = deleteRequest;
window.addRequestToCollection = addRequestToCollection;

// --- Folders ---
async function createNewFolder() {
    const name = prompt('Nome da pasta:');
    if (!name) return;
    const folder = { id: Date.now().toString(), name: name, description: '', items: [] };
    const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(folder)
    });
    if (res.ok) {
        state.folders = state.folders || [];
        state.folders.push(folder);
        renderCollections();
    }
}

async function renameFolder(folderId) {
    const folder = state.folders?.find(f => f.id === folderId);
    if (!folder) return;
    const newName = prompt('Novo nome:', folder.name);
    if (!newName) return;
    folder.name = newName;
    await fetch(`/api/folders/${folderId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(folder) });
    renderCollections();
}

async function deleteFolder(folderId) {
    if (!confirm('Excluir pasta?')) return;
    await fetch(`/api/folders/${folderId}`, { method: 'DELETE' });
    state.folders = (state.folders || []).filter(f => f.id !== folderId);
    renderCollections();
}

window.createNewFolder = createNewFolder;
window.renameFolder = renameFolder;
window.deleteFolder = deleteFolder;
window.addFormDataRow = addFormDataRow;
window.toggleFormFieldType = toggleFormFieldType;
window.toggleWebSocket = toggleWebSocket;
window.sendWSMessage = sendWSMessage;

// ============================================
// 5 PENDING FEATURES - IMPLEMENTATION
// ============================================

// --- 1. SYNTAX HIGHLIGHTING (Monaco Editor) ---
let monacoInstance = null;

function initCodeEditor() {
    // Load Monaco from CDN if not present
    if (typeof monaco === 'undefined') {
        const loaderScript = document.createElement('script');
        loaderScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs/loader.min.js';
        loaderScript.onload = () => {
            require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' } });
            require(['vs/editor/editor.main'], function () {
                createEditors();
            });
        };
        document.head.appendChild(loaderScript);
    } else {
        createEditors();
    }
}

function createEditors() {
    // Body editor
    const bodyContainer = document.getElementById('body-editor');
    const bodyTextarea = document.getElementById('body-content');
    if (bodyContainer && bodyTextarea) {
        monacoInstance = monaco.editor.create(bodyContainer, {
            value: bodyTextarea.value || '',
            language: 'json',
            theme: 'vs-dark',
            minimap: { enabled: false },
            automaticLayout: true,
            fontSize: 13,
            fontFamily: "'Fira Code', monospace"
        });
        monacoInstance.onDidChangeModelContent(() => {
            bodyTextarea.value = monacoInstance.getValue();
        });
    }
}

function updateEditorLanguage(lang) {
    if (monacoInstance) {
        monaco.editor.setModelLanguage(monacoInstance.getModel(), lang);
    }
}

// --- 2. TABS WITH PERSISTENCE & SHORTCUTS ---
function setupTabs() {
    // Load saved tab from localStorage
    const savedTab = localStorage.getItem('postboy_activeTab');
    if (savedTab) {
        const tabEl = document.querySelector(`.tab[data-tab="${savedTab}"]`);
        if (tabEl) {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
            tabEl.classList.add('active');
            document.getElementById(`tab-${savedTab}`)?.classList.remove('hidden');
        }
    }

    document.querySelectorAll('.tab').forEach(tab => {
        tab.onclick = () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));

            tab.classList.add('active');
            const target = document.getElementById(`tab-${tab.dataset.tab}`);
            if (target) target.classList.remove('hidden');

            // Save to localStorage
            localStorage.setItem('postboy_activeTab', tab.dataset.tab);
        };
    });

    // Keyboard shortcuts (Ctrl+1 to Ctrl+7)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key >= '1' && e.key <= '7') {
            const tabs = ['params', 'headers', 'body', 'auth', 'scripts', 'websocket', 'console'];
            const idx = parseInt(e.key) - 1;
            if (tabs[idx]) {
                document.querySelector(`.tab[data-tab="${tabs[idx]}"]`)?.click();
            }
        }
    });
}

// --- 3. PRE/POST REQUEST SCRIPTS ---
async function runPreScript(request) {
    const script = document.getElementById('pre-script')?.value;
    if (!script) return request;

    try {
        const fn = new Function('request', 'console', script);
        fn(request, console);
    } catch (e) {
        console.error('Pre-script error:', e);
        alert('Pre-script error: ' + e.message);
        throw e;
    }
    return request;
}

async function runPostScript(response, tests) {
    const script = document.getElementById('post-script')?.value;
    if (!script) return;

    try {
        const fn = new Function('response', 'tests', 'console', script);
        fn(response, tests, console);
    } catch (e) {
        console.error('Post-script error:', e);
        tests['Script Error'] = { passed: false, message: e.message };
    }

    // Render test results
    const resultsEl = document.getElementById('test-results');
    if (resultsEl) {
        const results = Object.entries(tests).map(([name, result]) =>
            `<div style="color: ${result.passed ? '#4caf50' : '#f44336'}; margin: 2px 0;">${result.passed ? '✓' : '✗'} ${name}: ${result.message || ''}</div>`
        ).join('');
        resultsEl.innerHTML = results || '<span style="color: var(--text-secondary)">No tests defined</span>';
    }
}

// --- 4. JSON VIEWER (jsoneditor) ---
let jsonEditorInstance = null;

function renderResponse(result) {
    const statusEl = document.getElementById('res-status');
    const bodyEl = document.getElementById('response-body');
    const timeEl = document.getElementById('res-time');
    const sizeEl = document.getElementById('res-size');
    const headersEl = document.getElementById('response-headers');

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

    // Render headers
    if (result.headers) {
        headersEl.innerHTML = Object.entries(result.headers).map(([k, v]) =>
            `<div style="display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px dashed #333"><span style="color:var(--text-secondary)">${k}:</span><span style="color:var(--accent-color);word-break:break-all">${v}</span></div>`
        ).join('');
    }

    // Save response to state for console access
    state.lastResponse = result;

    // Render body with JSON viewer
    if (typeof result.body === 'object' && result.body !== null) {
        // Use jsoneditor if available
        if (typeof JSONEditor !== 'undefined' && !jsonEditorInstance) {
            try {
                jsonEditorInstance = new JSONEditor(bodyEl, {
                    mode: 'view',
                    modes: ['view', 'code'],
                    mainMenuBar: false,
                    navigationBar: false
                }, result.body);
            } catch (e) {
                bodyEl.innerText = JSON.stringify(result.body, null, 2);
            }
        } else if (jsonEditorInstance) {
            jsonEditorInstance.set(result.body);
        } else {
            bodyEl.innerText = JSON.stringify(result.body, null, 2);
        }
    } else {
        bodyEl.innerText = result.body || '';
    }
}

// --- 5. DEVELOPER CONSOLE ---
function runConsole() {
    const input = document.getElementById('console-input')?.value;
    const output = document.getElementById('console-output');
    if (!input || !output) return;

    // Create sandbox context
    const context = {
        request: state.currentRequest,
        response: state.lastResponse,
        state: state,
        console: {
            log: (...args) => appendConsoleOutput('log', args.join(' ')),
            error: (...args) => appendConsoleOutput('error', args.join(' ')),
            warn: (...args) => appendConsoleOutput('warn', args.join(' '))
        }
    };

    try {
        const fn = new Function(...Object.keys(context), input);
        fn(...Object.values(context));
    } catch (e) {
        appendConsoleOutput('error', e.message);
    }
}

function appendConsoleOutput(type, message) {
    const output = document.getElementById('console-output');
    if (!output) return;

    const colors = { log: '#ccc', error: '#f44336', warn: '#ff9800' };
    output.innerHTML += `<div style="color: ${colors[type] || '#ccc'}">${message}</div>`;
    output.scrollTop = output.scrollHeight;
}

window.runConsole = runConsole;

// ============================================
// MODIFY sendRequest TO RUN SCRIPTS
// ============================================

// Store original sendRequest
const originalSendRequest = sendRequest;

sendRequest = async function() {
    const btn = document.querySelector('.btn-primary');
    btn.disabled = true;
    btn.innerText = 'Sending...';

    const reqData = await collectRequestData();
    const envId = document.getElementById('env-selector').value;

    // Run pre-request script
    try {
        await runPreScript(reqData);
    } catch (e) {
        btn.disabled = false;
        btn.innerText = 'Send';
        return;
    }

    // Handle GraphQL
    if (reqData.body_type === 'graphql') {
        const query = document.getElementById('graphql-query')?.value;
        const variables = document.getElementById('graphql-vars')?.value;
        if (!query) {
            alert('Please enter a GraphQL query');
            btn.disabled = false;
            btn.innerText = 'Send';
            return;
        }
        try {
            const res = await fetch('/api/execute-graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: reqData.url, query: query, variables: variables ? JSON.parse(variables) : {} })
            });
            const result = await res.json();
            const fullResult = { status_code: result.status_code, time_ms: 0, size_bytes: JSON.stringify(result.body).length, body: result.body };
            renderResponse(fullResult);

            // Run post-script tests
            const tests = {};
            await runPostScript(fullResult, tests);
        } catch (e) {
            console.error('GraphQL error:', e);
        }
        btn.disabled = false;
        btn.innerText = 'Send';
        return;
    }

    // Regular HTTP - use original sendRequest which handles renderResponse
    try {
        await originalSendRequest(reqData, envId);

        // Run post-script tests with latest response
        if (state.lastResponse) {
            const tests = {};
            await runPostScript(state.lastResponse, tests);
        }
    } catch (err) {
        showModal('Error', `<p style="color:var(--error)">${err.message}</p>`, null, true);
    }

    btn.disabled = false;
    btn.innerText = 'Send';
};

// Update global scope
window.runPreScript = runPreScript;
window.runPostScript = runPostScript;

// Initialize code editor after page load
setTimeout(initCodeEditor, 500);

init();
