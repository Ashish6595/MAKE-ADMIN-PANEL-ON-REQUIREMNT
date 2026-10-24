// SmartHome Manager Client-Side Controller
let state = {
  token: localStorage.getItem('smarthome_token') || null,
  user: JSON.parse(localStorage.getItem('smarthome_user') || 'null'),
  rooms: [],
  devices: [],
  routines: [],
  groups: [],
  alerts: [],
  selectedRoomFilter: 'all',
  emergencyMode: false
};

const API_BASE = '/api';

// Helper for authenticated fetch
async function apiCall(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  const options = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'API request failed');
    }
    return data;
  } catch (err) {
    alert(err.message);
    throw err;
  }
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  setupAuthListeners();
  setupNavigationTabs();
  setupVoiceCommand();
  setupEmergencyControls();

  if (state.token && state.user) {
    showMainApp();
    refreshAllData();
  } else {
    showAuthModal();
  }
});

// Auth Handlers
function setupAuthListeners() {
  const authModal = document.getElementById('authModal');
  const showLoginBtn = document.getElementById('showLoginBtn');
  const showRegisterBtn = document.getElementById('showRegisterBtn');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const logoutBtn = document.getElementById('logoutBtn');

  showLoginBtn.addEventListener('click', () => {
    showLoginBtn.classList.add('active');
    showRegisterBtn.classList.remove('active');
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
  });

  showRegisterBtn.addEventListener('click', () => {
    showRegisterBtn.classList.add('active');
    showLoginBtn.classList.remove('active');
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
      const data = await apiCall('/auth/login', 'POST', { email, password });
      saveSession(data.token, data.user);
      showMainApp();
      refreshAllData();
    } catch (err) {
      console.error(err);
    }
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('regUsername').value;
    const householdName = document.getElementById('regHouseholdName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const role = document.getElementById('regRole').value;

    try {
      const data = await apiCall('/auth/register', 'POST', {
        username,
        householdName,
        email,
        password,
        role
      });
      saveSession(data.token, data.user);
      showMainApp();
      refreshAllData();
    } catch (err) {
      console.error(err);
    }
  });

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('smarthome_token');
    localStorage.removeItem('smarthome_user');
    state.token = null;
    state.user = null;
    document.getElementById('appContainer').classList.add('hidden');
    showAuthModal();
  });
}

function saveSession(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem('smarthome_token', token);
  localStorage.setItem('smarthome_user', JSON.stringify(user));
}

function showAuthModal() {
  document.getElementById('authModal').classList.remove('hidden');
  document.getElementById('appContainer').classList.add('hidden');
}

function showMainApp() {
  document.getElementById('authModal').classList.add('hidden');
  document.getElementById('appContainer').classList.remove('hidden');
  document.getElementById('userBadge').textContent = state.user.role.toUpperCase();
  document.getElementById('userBadge').className = `badge role-${state.user.role}`;
}

// Navigation Tabs
function setupNavigationTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const targetPane = document.getElementById(tab.dataset.tab);
      if (targetPane) targetPane.classList.add('active');

      // refresh tab-specific data
      if (tab.dataset.tab === 'energyTab') loadEnergyReport();
      if (tab.dataset.tab === 'aiInsightsTab') loadSmartInsights();
      if (tab.dataset.tab === 'routinesTab') loadRoutinesAndGroups();
    });
  });

  // room filter change
  document.getElementById('roomFilterSelect').addEventListener('change', (e) => {
    state.selectedRoomFilter = e.target.value;
    renderDevices();
  });

  // forms
  document.getElementById('createDeviceForm').addEventListener('submit', handleCreateDevice);
  document.getElementById('createRoomForm').addEventListener('submit', handleCreateRoom);
  document.getElementById('addMemberForm').addEventListener('submit', handleAddMember);
}

// Voice Command System
function setupVoiceCommand() {
  const input = document.getElementById('voiceInput');
  const sendBtn = document.getElementById('voiceSendBtn');
  const feedback = document.getElementById('voiceFeedback');
  const feedbackText = document.getElementById('voiceFeedbackText');

  const executeCommand = async () => {
    const command = input.value.trim();
    if (!command) return;

    try {
      const data = await apiCall('/smart/voice-command', 'POST', { command });
      feedbackText.textContent = `"${data.commandReceived}" → ${data.assistantResponse}`;
      feedback.classList.remove('hidden');
      input.value = '';

      refreshAllData();

      setTimeout(() => {
        feedback.classList.add('hidden');
      }, 7000);
    } catch (err) {
      console.error(err);
    }
  };

  sendBtn.addEventListener('click', executeCommand);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') executeCommand();
  });
}

// Emergency Mode
function setupEmergencyControls() {
  const toggleBtn = document.getElementById('emergencyToggleBtn');
  const banner = document.getElementById('emergencyBanner');
  const deactivateBtn = document.getElementById('deactivateEmergencyBtn');

  toggleBtn.addEventListener('click', async () => {
    if (confirm('🚨 ACTIVATE EMERGENCY MODE? This will immediately turn OFF all appliances and lock all security doors.')) {
      try {
        const data = await apiCall('/smart/emergency/activate', 'POST');
        state.emergencyMode = true;
        banner.classList.remove('hidden');
        refreshAllData();
      } catch (err) {
        console.error(err);
      }
    }
  });

  deactivateBtn.addEventListener('click', async () => {
    try {
      await apiCall('/smart/emergency/deactivate', 'POST');
      state.emergencyMode = false;
      banner.classList.add('hidden');
      refreshAllData();
    } catch (err) {
      console.error(err);
    }
  });
}

// Core Data Fetchers
async function refreshAllData() {
  await loadRooms();
  await loadDevices();
  await loadAlerts();
}

async function loadRooms() {
  try {
    const data = await apiCall('/rooms');
    state.rooms = data.rooms || [];

    // update room select in create device form and filter
    const roomSelect = document.getElementById('newDevRoom');
    const filterSelect = document.getElementById('roomFilterSelect');

    roomSelect.innerHTML = state.rooms.map(r => `<option value="${r._id}">${r.name}</option>`).join('');

    filterSelect.innerHTML = '<option value="all">All Rooms</option>' +
      state.rooms.map(r => `<option value="${r._id}">${r.name}</option>`).join('');

    renderRooms();
  } catch (err) {
    console.error(err);
  }
}

async function loadDevices() {
  try {
    const data = await apiCall('/devices');
    state.devices = data.devices || [];
    renderDevices();
  } catch (err) {
    console.error(err);
  }
}

async function loadAlerts() {
  try {
    const data = await apiCall('/energy/alerts');
    state.alerts = data.alerts || [];
    renderAlerts();
  } catch (err) {
    console.error(err);
  }
}

// Render Devices
function renderDevices() {
  const grid = document.getElementById('deviceGrid');
  if (!grid) return;

  let filtered = state.devices;
  if (state.selectedRoomFilter !== 'all') {
    filtered = filtered.filter(d => (d.roomId?._id || d.roomId) === state.selectedRoomFilter);
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 48px; color: var(--text-muted);">
        <p style="font-size: 18px; margin-bottom: 8px;">No smart devices found</p>
        <p style="font-size: 14px;">Go to the "Create Device" tab to add simulated smart appliances to your home.</p>
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map(dev => {
    const isConnected = dev.connectionStatus === 'connected';
    const isOn = dev.powerState === 'on';
    const isMal = dev.isMalfunctioning;
    const roomName = dev.roomId?.name || 'Unassigned';

    // dynamic controls based on device type
    let customControlHtml = '';

    if (isConnected) {
      if (dev.deviceType === 'lamp') {
        customControlHtml = `
          <div class="control-slider-group">
            <label>Brightness: <span>${dev.features.brightness}%</span></label>
            <input type="range" min="0" max="100" value="${dev.features.brightness}" 
              onchange="handleUpdateBrightness('${dev._id}', this.value)">
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; color:var(--text-muted); margin-top:4px;">
            <span>Mode: <strong>${dev.features.colorMode}</strong></span>
            <button class="small-btn" onclick="toggleLampColorMode('${dev._id}', '${dev.features.colorMode}')">Switch Hue</button>
          </div>`;
      } else if (dev.deviceType === 'fan') {
        customControlHtml = `
          <div class="speed-selector-group">
            <button class="speed-btn ${dev.features.speed === 'Low' ? 'active' : ''}" onclick="handleSetFanSpeed('${dev._id}', 'Low')">Low</button>
            <button class="speed-btn ${dev.features.speed === 'Medium' ? 'active' : ''}" onclick="handleSetFanSpeed('${dev._id}', 'Medium')">Med</button>
            <button class="speed-btn ${dev.features.speed === 'High' ? 'active' : ''}" onclick="handleSetFanSpeed('${dev._id}', 'High')">High</button>
          </div>`;
      } else if (dev.deviceType === 'thermostat' || dev.deviceType === 'ac') {
        customControlHtml = `
          <div class="temp-control-group">
            <button class="temp-btn" onclick="handleAdjustTemp('${dev._id}', ${dev.features.temperature - 1})">-</button>
            <span class="temp-display">${dev.features.temperature}°C</span>
            <button class="temp-btn" onclick="handleAdjustTemp('${dev._id}', ${dev.features.temperature + 1})">+</button>
          </div>
          <p style="text-align:center; font-size:12px; color:var(--text-muted); margin-top:4px;">Limits: ${dev.features.minTemp}°C - ${dev.features.maxTemp}°C</p>`;
      } else if (dev.deviceType === 'door') {
        const locked = dev.features.isLocked;
        customControlHtml = `
          <div style="text-align: center; margin: 8px 0;">
            <button class="primary-btn" style="background: ${locked ? '#ef4444' : '#10b981'}" 
              onclick="handleToggleLock('${dev._id}', ${!locked})">
              ${locked ? '🔒 Locked' : '🔓 Unlocked'}
            </button>
          </div>`;
      }
    }

    return `
      <div class="device-card ${isOn ? 'is-on' : ''} ${isMal ? 'is-malfunctioning' : ''}">
        <div>
          <div class="card-top">
            <div class="card-title-group">
              <h3>${getDeviceIcon(dev.deviceType)} ${dev.name}</h3>
              <span class="card-room-badge">${roomName} • ${dev.wattage}W</span>
            </div>
            <span class="status-badge status-${dev.status.replace(/\s+/g, '-')}">${dev.status}</span>
          </div>

          <div class="card-controls">
            ${customControlHtml}
          </div>
        </div>

        <div class="card-footer">
          ${!isConnected ? `
            <button class="connect-btn" onclick="handleConnectDevice('${dev._id}')">🔗 Connect to Network</button>
          ` : `
            <div class="card-actions">
              <button class="power-toggle-btn ${isOn ? 'power-btn-on' : 'power-btn-off'}" 
                onclick="handleTogglePower('${dev._id}', '${isOn ? 'off' : 'on'}')">
                ${isOn ? 'Power ON' : 'Standby'}
              </button>
              
              ${isMal ? `
                <button class="reset-btn" onclick="handleResetMalfunction('${dev._id}')">🔄 Reset Safety</button>
              ` : `
                <button class="malfunction-btn" title="Simulate malfunction" onclick="handleTriggerMalfunction('${dev._id}')">⚠️ Glitch</button>
              `}
              
              <button class="malfunction-btn" title="Disconnect device" onclick="handleDisconnectDevice('${dev._id}')">⏏️</button>
            </div>
          `}
        </div>
      </div>
    `;
  }).join('');
}

function getDeviceIcon(type) {
  const icons = {
    lamp: '💡',
    fan: '🌀',
    thermostat: '🌡️',
    ac: '❄️',
    heater: '🔥',
    door: '🚪',
    coffeemaker: '☕',
    tv: '📺',
    general: '🔌'
  };
  return icons[type] || '🔌';
}

// Device Actions
async function handleConnectDevice(id) {
  try {
    await apiCall(`/devices/${id}/connect`, 'PATCH');
    await loadDevices();
  } catch (err) {
    console.error(err);
  }
}

async function handleDisconnectDevice(id) {
  try {
    await apiCall(`/devices/${id}/disconnect`, 'PATCH');
    await loadDevices();
  } catch (err) {
    console.error(err);
  }
}

async function handleTogglePower(id, state) {
  try {
    await apiCall(`/devices/${id}/control`, 'PUT', { powerState: state });
    await loadDevices();
  } catch (err) {
    console.error(err);
  }
}

async function handleUpdateBrightness(id, val) {
  try {
    await apiCall(`/devices/${id}/control`, 'PUT', { features: { brightness: Number(val) } });
    await loadDevices();
  } catch (err) {
    console.error(err);
  }
}

async function toggleLampColorMode(id, currentMode) {
  const modes = ['Warm', 'Cold', 'Daylight'];
  const nextMode = modes[(modes.indexOf(currentMode) + 1) % modes.length];
  try {
    await apiCall(`/devices/${id}/control`, 'PUT', { features: { colorMode: nextMode } });
    await loadDevices();
  } catch (err) {
    console.error(err);
  }
}

async function handleSetFanSpeed(id, speed) {
  try {
    await apiCall(`/devices/${id}/control`, 'PUT', { features: { speed } });
    await loadDevices();
  } catch (err) {
    console.error(err);
  }
}

async function handleAdjustTemp(id, target) {
  try {
    await apiCall(`/devices/${id}/control`, 'PUT', { features: { temperature: target } });
    await loadDevices();
  } catch (err) {
    console.error(err);
  }
}

async function handleToggleLock(id, lockStatus) {
  try {
    await apiCall(`/devices/${id}/control`, 'PUT', { features: { isLocked: lockStatus } });
    await loadDevices();
  } catch (err) {
    console.error(err);
  }
}

async function handleTriggerMalfunction(id) {
  try {
    await apiCall(`/devices/${id}/simulate-malfunction`, 'POST', {
      reason: 'Voltage fluctuation & abnormal sensor communication timeout'
    });
    await loadDevices();
    await loadAlerts();
  } catch (err) {
    console.error(err);
  }
}

async function handleResetMalfunction(id) {
  try {
    await apiCall(`/devices/${id}/reset-malfunction`, 'POST');
    await loadDevices();
    await loadAlerts();
  } catch (err) {
    console.error(err);
  }
}

// Create Device Form
async function handleCreateDevice(e) {
  e.preventDefault();
  const name = document.getElementById('newDevName').value;
  const deviceType = document.getElementById('newDevType').value;
  const roomId = document.getElementById('newDevRoom').value;
  const wattage = document.getElementById('newDevWattage').value;

  try {
    await apiCall('/devices', 'POST', {
      name,
      deviceType,
      roomId,
      wattage: wattage ? Number(wattage) : undefined
    });
    alert(`Device '${name}' created! Remember to click 'Connect' on the dashboard to link it.`);
    document.getElementById('createDeviceForm').reset();
    document.querySelector('.nav-tab[data-tab="dashboardTab"]').click();
    await loadDevices();
  } catch (err) {
    console.error(err);
  }
}

// Rooms Tab
function renderRooms() {
  const container = document.getElementById('roomsList');
  if (!container) return;

  container.innerHTML = state.rooms.map(r => `
    <div class="stack-item">
      <div>
        <strong>🚪 ${r.name}</strong>
        <p>${r.description || 'Household room'}</p>
      </div>
      <button class="small-btn" style="background:#ef4444" onclick="handleDeleteRoom('${r._id}')">Delete</button>
    </div>
  `).join('');
}

async function handleCreateRoom(e) {
  e.preventDefault();
  const name = document.getElementById('newRoomName').value;
  const description = document.getElementById('newRoomDesc').value;

  try {
    await apiCall('/rooms', 'POST', { name, description });
    document.getElementById('createRoomForm').reset();
    await loadRooms();
  } catch (err) {
    console.error(err);
  }
}

async function handleDeleteRoom(id) {
  if (confirm('Delete room and all appliances inside it?')) {
    try {
      await apiCall(`/rooms/${id}`, 'DELETE');
      await refreshAllData();
    } catch (err) {
      console.error(err);
    }
  }
}

// Routines & Groups Tab
async function loadRoutinesAndGroups() {
  try {
    const [routinesData, groupsData] = await Promise.all([
      apiCall('/routines'),
      apiCall('/groups')
    ]);

    state.routines = routinesData.routines || [];
    state.groups = groupsData.groups || [];

    renderRoutines();
    renderGroups();
  } catch (err) {
    console.error(err);
  }
}

function renderRoutines() {
  const list = document.getElementById('routinesList');
  if (!list) return;

  if (state.routines.length === 0) {
    list.innerHTML = `
      <p style="color:var(--text-muted); font-size:13px;">No routines created yet.</p>
      <button class="primary-btn" style="margin-top:8px;" onclick="seedDemoRoutine()">Seed Demo Night Routine</button>`;
    return;
  }

  list.innerHTML = state.routines.map(rt => `
    <div class="stack-item">
      <div>
        <strong>⏰ ${rt.name} (${rt.scheduledTime})</strong>
        <p>Actions: ${rt.actions?.length || 0} devices automated</p>
      </div>
      <div style="display:flex; gap:6px;">
        <button class="small-btn" onclick="handleExecuteRoutine('${rt._id}')">▶ Run</button>
        <button class="small-btn" style="background:#ef4444" onclick="handleDeleteRoutine('${rt._id}')">✕</button>
      </div>
    </div>
  `).join('');
}

function renderGroups() {
  const list = document.getElementById('groupsList');
  if (!list) return;

  if (state.groups.length === 0) {
    list.innerHTML = `
      <p style="color:var(--text-muted); font-size:13px;">No device groups created yet.</p>
      <button class="primary-btn" style="margin-top:8px;" onclick="seedDemoGroup()">Seed Demo Morning Group</button>`;
    return;
  }

  list.innerHTML = state.groups.map(grp => `
    <div class="stack-item">
      <div>
        <strong>🗂️ ${grp.name}</strong>
        <p>${grp.deviceIds?.length || 0} grouped devices</p>
      </div>
      <div style="display:flex; gap:6px;">
        <button class="small-btn" onclick="handleTriggerGroup('${grp._id}', 'on')">Turn ON</button>
        <button class="small-btn" style="background:#64748b" onclick="handleTriggerGroup('${grp._id}', 'off')">OFF</button>
      </div>
    </div>
  `).join('');
}

async function handleExecuteRoutine(id) {
  try {
    const res = await apiCall(`/routines/${id}/execute`, 'POST');
    alert(`Executed: ${res.message}`);
    await loadDevices();
  } catch (err) {
    console.error(err);
  }
}

async function handleDeleteRoutine(id) {
  try {
    await apiCall(`/routines/${id}`, 'DELETE');
    await loadRoutinesAndGroups();
  } catch (err) {
    console.error(err);
  }
}

async function handleTriggerGroup(id, powerState) {
  try {
    const res = await apiCall(`/groups/${id}/trigger`, 'POST', { powerState });
    alert(res.message);
    await loadDevices();
  } catch (err) {
    console.error(err);
  }
}

async function seedDemoRoutine() {
  if (state.devices.length === 0) {
    alert('Please create at least one device first.');
    return;
  }
  try {
    await apiCall('/routines', 'POST', {
      name: 'Midnight Sleep Mode',
      scheduledTime: '23:59',
      actions: [
        { deviceId: state.devices[0]._id, targetPowerState: 'off' }
      ]
    });
    await loadRoutinesAndGroups();
  } catch (err) {
    console.error(err);
  }
}

async function seedDemoGroup() {
  if (state.devices.length === 0) {
    alert('Please create at least one device first.');
    return;
  }
  try {
    await apiCall('/groups', 'POST', {
      name: 'All Living Room Lights',
      deviceIds: state.devices.map(d => d._id)
    });
    await loadRoutinesAndGroups();
  } catch (err) {
    console.error(err);
  }
}

// Energy Tab
async function loadEnergyReport() {
  try {
    const data = await apiCall('/energy/report');
    document.getElementById('totalEnergyKWh').textContent = `${data.summary.totalEnergyConsumedKWh} kWh`;
    document.getElementById('estimatedCost').textContent = `$${data.summary.estimatedCostUSD}`;
    document.getElementById('monitoredCount').textContent = data.summary.totalDevices;

    const tbody = document.getElementById('energyTableBody');
    tbody.innerHTML = (data.deviceBreakdown || []).map(row => `
      <tr>
        <td><strong>${row.name}</strong></td>
        <td>${row.room}</td>
        <td>${row.wattage} W</td>
        <td>${row.runHours} hrs</td>
        <td><strong style="color:#38bdf8">${row.energyConsumedKWh} kWh</strong></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

// Smart AI Insights Tab
async function loadSmartInsights() {
  try {
    const [predData, recoData] = await Promise.all([
      apiCall('/smart/usage-prediction'),
      apiCall('/smart/energy-recommendations')
    ]);

    const pList = document.getElementById('predictionsList');
    pList.innerHTML = (predData.predictions || []).map(p => `
      <div class="stack-item">
        <div>
          <strong>🎯 ${p.deviceName} (Confidence: ${p.confidence})</strong>
          <p style="margin: 4px 0;"><strong>Pattern:</strong> ${p.pattern}</p>
          <p style="color: #60a5fa;">💡 ${p.suggestion}</p>
        </div>
      </div>
    `).join('');

    const rList = document.getElementById('recommendationsList');
    rList.innerHTML = (recoData.recommendations || []).map(r => `
      <div class="stack-item">
        <div>
          <strong>🌱 ${r.category} • <span style="color:#34d399">${r.potentialSavings}</span></strong>
          <p style="margin-top: 4px;">${r.recommendation}</p>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

// Family Roles Tab
async function handleAddMember(e) {
  e.preventDefault();
  const username = document.getElementById('memberUsername').value;
  const email = document.getElementById('memberEmail').value;
  const password = document.getElementById('memberPassword').value;
  const role = document.getElementById('memberRole').value;

  try {
    const res = await apiCall('/auth/add-member', 'POST', { username, email, password, role });
    alert(res.message);
    document.getElementById('addMemberForm').reset();
  } catch (err) {
    console.error(err);
  }
}

// Alerts Banner
function renderAlerts() {
  const container = document.getElementById('alertContainer');
  if (!container) return;

  if (state.alerts.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = state.alerts.map(a => `
    <div class="alert-pill">
      <div>
        <strong>⚠️ ${a.type.toUpperCase()}:</strong> ${a.message}
      </div>
      <button class="small-btn" style="background:#f59e0b; color:#000;" onclick="handleResolveAlert('${a._id}')">Dismiss</button>
    </div>
  `).join('');
}

async function handleResolveAlert(id) {
  try {
    await apiCall(`/energy/alerts/${id}/resolve`, 'PATCH');
    await loadAlerts();
  } catch (err) {
    console.error(err);
  }
}
