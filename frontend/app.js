const CHECKLISTS = {
  ladder: {
    label: 'A-Type Ladder',
    items: [
      { label: 'Rail damaged or deformed' },
      { label: 'Rung broken' },
      { label: 'Rung missing' },
      { label: 'Rungs clean' },
      { label: 'Rung distance uneven' },
      { label: 'Bottom non-skid pad damaged or missing' },
      { label: 'Top hook damaged or missing' },
      { label: 'Rungs loose' },
      { label: 'Non-slip bases' },
      { label: 'Any other issue' }
    ]
  },
  wah: {
    label: 'WAH General Checklist',
    items: [
      {
        label: 'Safety harness',
        note: 'Check condition, manufacturing date, and approved make. Damaged harness or more than 3 years old should be rejected.'
      },
      {
        label: 'STD / Suspension trauma device',
        note: 'Ensure the number of suspension trauma devices matches the number of safety harnesses.'
      },
      {
        label: 'Tool lanyard',
        note: 'Must be ensured for all workmen using tools while working at height.'
      },
      {
        label: 'Safety net',
        note: 'Damaged net should be segregated or rejected.'
      },
      {
        label: 'Manila rope',
        note: 'Inspect general condition before use.'
      },
      {
        label: 'Wire rope / lifeline',
        note: 'Inspect for wear, damage, and safe usability.'
      },
      {
        label: 'A-type ladder',
        note: 'Confirm the ladder is safe and suitable for use.'
      }
    ]
  }
};

const checklistBody = document.getElementById('checklistBody');
const inspectorInput = document.getElementById('inspector');
const checklistTypeInput = document.getElementById('checklistType');
const apiUrlInput = document.getElementById('apiUrl');
const submitButton = document.getElementById('submitBtn');
const loadButton = document.getElementById('loadBtn');
const statusText = document.getElementById('statusText');
const statusRow = document.querySelector('.status-row');
const recordsList = document.getElementById('recordsList');
const recordsEmpty = document.getElementById('recordsEmpty');
const backendStatus = document.getElementById('backendStatus');
const backendHint = document.getElementById('backendHint');
const recordsCount = document.getElementById('recordsCount');

function getSelectedChecklist() {
  return CHECKLISTS[checklistTypeInput.value] || CHECKLISTS.ladder;
}

function getConfiguredApiBaseUrl() {
  const configuredBaseUrl = window.APP_CONFIG?.API_BASE_URL?.trim();

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, '');
  }

  if (
    window.location.port === '3000' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  ) {
    return `${window.location.protocol}//${window.location.hostname}:5001`;
  }

  return window.location.origin;
}

function buildApiUrl(pathname) {
  return `${getConfiguredApiBaseUrl()}${pathname}`;
}

function getNormalizedSubmitUrl(value) {
  const rawValue = value.trim();

  if (!rawValue) return '';

  try {
    const url = new URL(rawValue);

    if (url.pathname === '/' || url.pathname === '' || url.pathname === '/api' || url.pathname === '/api/') {
      url.pathname = '/api/submit';
    }

    return url.toString();
  } catch (error) {
    return rawValue;
  }
}

function buildSiblingUrl(pathname) {
  const apiUrl = apiUrlInput.value.trim();

  if (!apiUrl) return '';

  try {
    const url = new URL(apiUrl);
    url.pathname = pathname;
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch (error) {
    return '';
  }
}

function updateBackendCard(message, note = '', tone = '') {
  backendStatus.textContent = message;
  backendHint.textContent = note;
  backendStatus.className = tone ? `tone-${tone}` : '';
}

function setStatus(message, type = '') {
  statusText.textContent = message;
  statusRow.className = `status-row ${type}`.trim();
}

function createChecklistCard(item, index) {
  return `
    <article class="check-card" data-index="${index}">
      <div class="check-card-top">
        <span class="check-number">${String(index + 1).padStart(2, '0')}</span>
        <div>
          <p class="check-label">${item.label}</p>
          ${item.note ? `<p class="check-note">${item.note}</p>` : ''}
        </div>
      </div>
      <div class="status-toggle" role="group" aria-label="${item.label}">
        <button type="button" class="toggle-btn is-active" data-role="status-btn" data-value="OK">OK</button>
        <button type="button" class="toggle-btn" data-role="status-btn" data-value="NOT OK">NOT OK</button>
      </div>
      <input data-role="status" type="hidden" value="OK" />
      <label class="remarks-field">
        <span>Remarks</span>
        <input data-role="remarks" type="text" placeholder="Optional remarks" />
      </label>
    </article>
  `;
}

function renderChecklistTypes() {
  checklistTypeInput.innerHTML = Object.entries(CHECKLISTS)
    .map(([value, checklist]) => `<option value="${value}">${checklist.label}</option>`)
    .join('');
  checklistTypeInput.value = CHECKLISTS.wah ? 'wah' : Object.keys(CHECKLISTS)[0];
}

function renderChecklist() {
  checklistBody.innerHTML = getSelectedChecklist().items.map(createChecklistCard).join('');
}

function collectRows() {
  return Array.from(checklistBody.querySelectorAll('.check-card')).map((card, index) => ({
    label: getSelectedChecklist().items[index].label,
    status: card.querySelector('[data-role="status"]').value,
    remarks: card.querySelector('[data-role="remarks"]').value.trim()
  }));
}

function resetChecklist() {
  checklistBody.querySelectorAll('.check-card').forEach((card) => {
    card.querySelector('[data-role="status"]').value = 'OK';
    card.querySelectorAll('[data-role="status-btn"]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.value === 'OK');
    });
    card.querySelector('[data-role="remarks"]').value = '';
  });
}

function formatDate(value) {
  if (!value) return 'Unknown time';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

function renderResponses(records) {
  recordsCount.textContent = String(records.length);

  if (!records.length) {
    recordsList.innerHTML = '';
    recordsEmpty.textContent = 'No records loaded yet.';
    recordsEmpty.hidden = false;
    return;
  }

  recordsEmpty.hidden = true;
  recordsList.innerHTML = records.map((record) => `
    <article class="record-card">
      <div class="record-head">
        <strong>${record.inspector || 'Unknown inspector'}</strong>
        <span>${formatDate(record.createdAt)}</span>
      </div>
      <p class="record-type">${record.type || 'Checklist'}</p>
      <div class="record-items">
        ${(record.items || []).map((item) => `
          <div class="record-item">
            <span>${item.label}</span>
            <span class="pill ${item.status === 'NOT OK' ? 'pill-bad' : 'pill-good'}">${item.status || 'OK'}</span>
            <span>${item.remarks || '-'}</span>
          </div>
        `).join('')}
      </div>
    </article>
  `).join('');
}

async function checkBackendHealth() {
  const healthUrl = buildSiblingUrl('/api/health');

  if (!healthUrl) {
    updateBackendCard('Missing', 'Add a valid submit endpoint.', 'error');
    return;
  }

  try {
    const response = await fetch(healthUrl);
    const data = await response.json().catch(() => ({}));

    if (response.ok && data.ok) {
      updateBackendCard('Connected', 'Database is available.', 'success');
      return;
    }

    if (response.status === 503 && data.databaseReady === false) {
      updateBackendCard('Database offline', 'Backend is up, MongoDB is not connected.', 'error');
      return;
    }

    updateBackendCard('Issue', data.message || `Health check returned ${response.status}.`, 'error');
  } catch (error) {
    updateBackendCard('Unreachable', 'Unable to reach backend.', 'error');
  }
}

async function loadResponses() {
  const responsesUrl = buildSiblingUrl('/api/responses');

  if (!responsesUrl) {
    setStatus('Enter a valid API URL first.', 'error');
    apiUrlInput.focus();
    return;
  }

  loadButton.disabled = true;
  setStatus('Loading saved data...');

  try {
    const response = await fetch(responsesUrl);
    const data = await response.json().catch(() => []);

    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    renderResponses(Array.isArray(data) ? data : []);
    setStatus('Saved data loaded.', 'success');
  } catch (error) {
    setStatus(error.message || 'Unable to load saved data.', 'error');
  } finally {
    loadButton.disabled = false;
  }
}

async function submitChecklist() {
  const inspector = inspectorInput.value.trim();
  const apiUrl = apiUrlInput.value.trim();

  if (!inspector) {
    setStatus('Inspector name is required.', 'error');
    inspectorInput.focus();
    return;
  }

  if (!apiUrl) {
    setStatus('API URL is required.', 'error');
    apiUrlInput.focus();
    return;
  }

  submitButton.disabled = true;
  setStatus('Submitting checklist...');

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inspector,
        type: getSelectedChecklist().label,
        items: collectRows()
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    inspectorInput.value = '';
    resetChecklist();
    setStatus(data.message || 'Checklist submitted successfully.', 'success');
    await loadResponses();
    await checkBackendHealth();
  } catch (error) {
    setStatus(error.message || 'Unable to reach the backend.', 'error');
  } finally {
    submitButton.disabled = false;
  }
}

checklistBody.addEventListener('click', (event) => {
  const button = event.target.closest('[data-role="status-btn"]');
  if (!button) return;

  const card = button.closest('.check-card');
  const statusInput = card.querySelector('[data-role="status"]');
  statusInput.value = button.dataset.value;

  card.querySelectorAll('[data-role="status-btn"]').forEach((action) => {
    action.classList.toggle('is-active', action === button);
  });
});

apiUrlInput.value = buildApiUrl('/api/submit');
apiUrlInput.addEventListener('blur', () => {
  apiUrlInput.value = getNormalizedSubmitUrl(apiUrlInput.value);
  checkBackendHealth();
});

renderChecklistTypes();
renderChecklist();
renderResponses([]);
checkBackendHealth();

submitButton.addEventListener('click', submitChecklist);
loadButton.addEventListener('click', loadResponses);
checklistTypeInput.addEventListener('change', () => {
  renderChecklist();
  setStatus(`${getSelectedChecklist().label} loaded.`);
});
