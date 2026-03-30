const CHECKS = [
  'Rail Damaged (cracks, deformation etc.)',
  'Rung broken',
  'Rung Missing',
  'Rungs clean',
  'Rung distance uneven',
  'Bottom non-skid pad damaged/missing',
  'Top hook damaged/missing',
  'Rungs loose',
  'Non-slip bases',
  'Any other (specify)'
];

const checklistBody = document.getElementById('checklistBody');
const inspectorInput = document.getElementById('inspector');
const apiUrlInput = document.getElementById('apiUrl');
const apiPreview = document.getElementById('apiPreview');
const submitButton = document.getElementById('submitBtn');
const loadButton = document.getElementById('loadBtn');
const statusText = document.getElementById('statusText');
const statusRow = document.querySelector('.status-row');
const recordsList = document.getElementById('recordsList');
const recordsEmpty = document.getElementById('recordsEmpty');
const backendStatus = document.getElementById('backendStatus');
const backendHint = document.getElementById('backendHint');
const checkCount = document.getElementById('checkCount');
const recordsCount = document.getElementById('recordsCount');

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

    if (url.pathname === '/' || url.pathname === '') {
      url.pathname = '/api/submit';
    } else if (url.pathname === '/api' || url.pathname === '/api/') {
      url.pathname = '/api/submit';
    }

    return url.toString();
  } catch (error) {
    return rawValue;
  }
}

function getResponsesUrl() {
  const apiUrl = apiUrlInput.value.trim();

  if (!apiUrl) return '';

  try {
    const url = new URL(apiUrl);
    url.pathname = '/api/responses';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch (error) {
    return '';
  }
}

function getHealthUrl() {
  const apiUrl = apiUrlInput.value.trim();

  if (!apiUrl) return '';

  try {
    const url = new URL(apiUrl);
    url.pathname = '/api/health';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch (error) {
    return '';
  }
}

function updateApiPreview() {
  apiPreview.textContent = apiUrlInput.value.trim() || 'Not configured';
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

function renderChecklist() {
  checklistBody.innerHTML = CHECKS.map((item, index) => `
    <tr>
      <td data-label="Sr. No">${index + 1}</td>
      <td data-label="Description of Checks">${item}</td>
      <td data-label="Status">
        <select data-role="status">
          <option value="OK">OK</option>
          <option value="NOT OK">NOT OK</option>
        </select>
      </td>
      <td data-label="Remarks">
        <input data-role="remarks" type="text" placeholder="Add remarks" />
      </td>
    </tr>
  `).join('');

  checkCount.textContent = String(CHECKS.length);
}

function collectRows() {
  return Array.from(checklistBody.querySelectorAll('tr')).map((row, index) => ({
    label: CHECKS[index],
    status: row.querySelector('[data-role="status"]').value,
    remarks: row.querySelector('[data-role="remarks"]').value.trim()
  }));
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
    recordsEmpty.textContent = 'No submissions found in MongoDB.';
    recordsEmpty.hidden = false;
    return;
  }

  recordsEmpty.hidden = true;
  recordsList.innerHTML = records.map((record) => `
    <article class="record-card">
      <div class="record-meta">
        <strong>${record.inspector || 'Unknown inspector'}</strong>
        <span>${record.type || 'Checklist'}</span>
        <span>${formatDate(record.createdAt)}</span>
      </div>
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
  const healthUrl = getHealthUrl();

  if (!healthUrl) {
    updateBackendCard('Endpoint missing', 'Add a valid submit endpoint to enable health checks.', 'error');
    return;
  }

  updateBackendCard('Checking connection...', 'Querying the backend health endpoint.', '');

  try {
    const response = await fetch(healthUrl);
    const data = await response.json().catch(() => ({}));

    if (response.ok && data.ok) {
      updateBackendCard('Connected', 'Backend and database are available.', 'success');
      return;
    }

    if (response.status === 503 && data.databaseReady === false) {
      updateBackendCard('Database offline', 'Backend is running, but MongoDB is not connected.', 'error');
      return;
    }

    updateBackendCard('Backend issue', data.message || `Health check returned ${response.status}.`, 'error');
  } catch (error) {
    updateBackendCard('Unreachable', 'Unable to reach the backend from this frontend.', 'error');
  }
}

async function loadResponses() {
  const responsesUrl = getResponsesUrl();

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

  const payload = {
    inspector,
    type: 'A-Type Ladder',
    items: collectRows()
  };

  submitButton.disabled = true;
  setStatus('Submitting checklist...');

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    inspectorInput.value = '';
    checklistBody.querySelectorAll('[data-role="status"]').forEach((element) => {
      element.value = 'OK';
    });
    checklistBody.querySelectorAll('[data-role="remarks"]').forEach((element) => {
      element.value = '';
    });

    setStatus(data.message || 'Checklist submitted successfully.', 'success');
    await loadResponses();
    await checkBackendHealth();
  } catch (error) {
    setStatus(error.message || 'Unable to reach the backend.', 'error');
  } finally {
    submitButton.disabled = false;
  }
}

apiUrlInput.value = buildApiUrl('/api/submit');
apiUrlInput.addEventListener('blur', () => {
  apiUrlInput.value = getNormalizedSubmitUrl(apiUrlInput.value);
  updateApiPreview();
  checkBackendHealth();
});
apiUrlInput.addEventListener('input', updateApiPreview);

renderChecklist();
renderResponses([]);
updateApiPreview();
checkBackendHealth();

submitButton.addEventListener('click', submitChecklist);
loadButton.addEventListener('click', loadResponses);
