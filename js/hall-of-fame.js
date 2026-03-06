'use strict';

const SODA_BASE = 'https://data.kcmo.org/resource/d4px-6rwg.json';

function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function parseAdditionalQuestions(raw) {
  if (!raw) return '';
  try {
    const obj = JSON.parse(raw);
    return Object.entries(obj)
      .map(([k, v]) => `${escapeHtml(k)}: ${escapeHtml(v)}`)
      .join('; ');
  } catch {
    return escapeHtml(raw);
  }
}

function addressLink(r) {
  const addr = escapeHtml(r.incident_address || 'N/A');
  if (r.latitude && r.longitude) {
    return `<a href="index.html?lat=${r.latitude}&lng=${r.longitude}" class="address-link">${addr}</a>`;
  }
  return addr;
}

function ticketLink(r) {
  if (!r.reported_issue) return 'N/A';
  return `<a href="https://data.kcmo.org/resource/d4px-6rwg.json?reported_issue=${r.reported_issue}" target="_blank">${escapeHtml(r.reported_issue)}</a>`;
}

function daysBetween(dateStr) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

async function fetchAndRender(query, tableId, loadingId, errorId, renderRow) {
  const loading = document.getElementById(loadingId);
  const error = document.getElementById(errorId);
  const table = document.getElementById(tableId);

  try {
    const response = await fetch(`${SODA_BASE}?${query}`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();

    loading.classList.add('hidden');

    if (data.length === 0) {
      error.textContent = 'No records found.';
      error.classList.remove('hidden');
      return;
    }

    table.classList.remove('hidden');
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = data.map((r, i) => renderRow(r, i + 1)).join('');
  } catch (err) {
    loading.classList.add('hidden');
    error.textContent = 'Unable to fetch data. Please try again later.';
    error.classList.remove('hidden');
  }
}

// --- Still Waiting: longest currently open ---
const openParams = new URLSearchParams({
  '$where': "issue_type='A Pothole' AND current_status='received'",
  '$order': 'open_date_time ASC',
  '$limit': '50',
  '$select': 'reported_issue,open_date_time,incident_address,latitude,longitude,issue_sub_type,additional_questions'
});

fetchAndRender(openParams.toString(), 'open-table', 'open-loading', 'open-error', (r, rank) => {
  const daysOpen = r.open_date_time ? daysBetween(r.open_date_time) : 'N/A';
  const date = r.open_date_time ? new Date(r.open_date_time).toLocaleDateString() : 'N/A';
  const details = [
    r.issue_sub_type || '',
    parseAdditionalQuestions(r.additional_questions)
  ].filter(Boolean).join(' — ');

  return `<tr>
    <td>${rank}</td>
    <td>${ticketLink(r)}</td>
    <td>${addressLink(r)}</td>
    <td class="days-cell">${daysOpen}</td>
    <td>${date}</td>
    <td>${escapeHtml(details)}</td>
  </tr>`;
});

// --- Hall of Shame: slowest ever resolved ---
const resolvedParams = new URLSearchParams({
  '$where': "issue_type='A Pothole' AND current_status='resolved'",
  '$order': 'days_to_close DESC',
  '$limit': '50',
  '$select': 'reported_issue,open_date_time,resolved_date,days_to_close,incident_address,latitude,longitude,issue_sub_type,additional_questions'
});

fetchAndRender(resolvedParams.toString(), 'resolved-table', 'resolved-loading', 'resolved-error', (r, rank) => {
  const openDate = r.open_date_time ? new Date(r.open_date_time).toLocaleDateString() : 'N/A';
  const resolvedDate = r.resolved_date ? new Date(r.resolved_date).toLocaleDateString() : 'N/A';
  const details = [
    r.issue_sub_type || '',
    parseAdditionalQuestions(r.additional_questions)
  ].filter(Boolean).join(' — ');

  return `<tr>
    <td>${rank}</td>
    <td>${ticketLink(r)}</td>
    <td>${addressLink(r)}</td>
    <td class="days-cell">${r.days_to_close || 'N/A'}</td>
    <td>${openDate}</td>
    <td>${resolvedDate}</td>
    <td>${escapeHtml(details)}</td>
  </tr>`;
});
