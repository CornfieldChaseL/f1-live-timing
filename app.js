const API_BASE = 'https://api.openf1.org/v1';

const TEAM_COLORS = {
  'Red Bull Racing': '#e8002d',
  'Mercedes': '#27f4d2',
  'Ferrari': '#e8002d',
  'McLaren': '#ff8000',
  'Aston Martin': '#229971',
  'Alpine': '#0093cc',
  'Williams': '#64c4ff',
  'RB': '#6692ff',
  'Kick Sauber': '#52e252',
  'Haas F1 Team': '#b6babd',
};

const TYRE_COLORS = {
  'SOFT': '#e8002d',
  'MEDIUM': '#ffd700',
  'HARD': '#ffffff',
  'INTERMEDIATE': '#43b02a',
  'WET': '#0067ff',
};

async function fetchDrivers(sessionKey) {
  const res = await fetch(`${API_BASE}/drivers?session_key=${sessionKey}`);
  return await res.json();
}

async function fetchPositions(sessionKey) {
  const res = await fetch(`${API_BASE}/position?session_key=${sessionKey}`);
  return await res.json();
}

async function fetchStints(sessionKey) {
  const res = await fetch(`${API_BASE}/stints?session_key=${sessionKey}`);
  return await res.json();
}

async function fetchIntervals(sessionKey) {
  const res = await fetch(`${API_BASE}/intervals?session_key=${sessionKey}`);
  return await res.json();
}

async function getLatestSession() {
  const res = await fetch(`${API_BASE}/sessions?session_type=Race&limit=1`);
  const data = await res.json();
  return data[data.length - 1];
}

function getLatestPerDriver(data, key) {
  const latest = {};
  for (const item of data) {
    latest[item[key]] = item;
  }
  return latest;
}

async function updateTiming() {
  try {
    const session = await getLatestSession();
    if (!session) return;
    const sessionKey = session.session_key;

    document.querySelector('.header h1').textContent =
      `🏁 ${session.meeting_name} — ${session.session_name}`;

    const [drivers, positions, stints, intervals] = await Promise.all([
      fetchDrivers(sessionKey),
      fetchPositions(sessionKey),
      fetchStints(sessionKey),
      fetchIntervals(sessionKey),
    ]);

    const driverMap = {};
    for (const d of drivers) driverMap[d.driver_number] = d;

    const latestPos = getLatestPerDriver(positions, 'driver_number');
    const latestInterval = getLatestPerDriver(intervals, 'driver_number');

    const activeStints = {};
    for (const s of stints) {
      if (!activeStints[s.driver_number] ||
          s.lap_start > activeStints[s.driver_number].lap_start) {
        activeStints[s.driver_number] = s;
      }
    }

    const sorted = Object.values(latestPos)
      .sort((a, b) => a.position - b.position);

    const tbody = document.getElementById('timing-body');
    tbody.innerHTML = '';

    for (const pos of sorted) {
      const dNum = pos.driver_number;
      const driver = driverMap[dNum] || {};
      const interval = latestInterval[dNum] || {};
      const stint = activeStints[dNum] || {};

      const teamColor = TEAM_COLORS[driver.team_name] || '#888';
      const tyre = stint.compound || '—';
      const tyreColor = TYRE_COLORS[tyre] || '#888';
      const gap = pos.position === 1 ? 'LEADER'
        : (interval.gap_to_leader != null
          ? `+${interval.gap_to_leader.toFixed(3)}s` : '—');

      const tr = document.createElement('tr');
      tr.className = `pos-${pos.position}`;
      tr.innerHTML = `
        <td>${pos.position}</td>
        <td>
          <span style="display:inline-block;width:3px;height:14px;
            background:${teamColor};margin-right:8px;
            vertical-align:middle;border-radius:2px"></span>
          ${driver.name_acronym || dNum}
        </td>
        <td style="color:#888;font-size:12px">${driver.team_name || '—'}</td>
        <td style="color:${pos.position === 1 ? '#e10600' : '#aaa'};
          font-weight:${pos.position === 1 ? 'bold' : 'normal'}">${gap}</td>
        <td style="font-family:monospace">—</td>
        <td>
          <span style="display:inline-block;width:18px;height:18px;
            background:${tyreColor};border-radius:50%;
            text-align:center;line-height:18px;font-size:9px;
            font-weight:bold;color:${tyre === 'HARD' ? '#000' : tyre === 'MEDIUM' ? '#000' : '#fff'}">
            ${tyre.charAt(0)}
          </span>
        </td>
      `;
      tbody.appendChild(tr);
    }

    if (sorted.