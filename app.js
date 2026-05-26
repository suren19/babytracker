(function () {
  'use strict';

  // --- Constants ---
  const STORAGE_KEY = 'baby_tracker_events';
  const ICONS = { diaper: '👶', urine: '💧', motion: '💩', feeding: '🍼' };
  const LABELS = { diaper: 'Diaper Change', urine: 'Urine', motion: 'Motion', feeding: 'Feeding' };

  // --- State ---
  let activeFilter = 'all';

  // --- DOM refs ---
  const tabs = document.querySelectorAll('.tab');
  const views = document.querySelectorAll('.view');
  const actionBtns = document.querySelectorAll('.action-btn');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const historyList = document.getElementById('history-list');
  const clearBtn = document.getElementById('clear-history');
  const statsContent = document.getElementById('stats-content');
  const toast = document.getElementById('toast');

  // --- Storage ---
  function getEvents() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveEvents(events) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }

  function addEvent(type) {
    const events = getEvents();
    events.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      type,
      timestamp: new Date().toISOString()
    });
    saveEvents(events);
    renderHistory();
    renderStats();
  }

  function deleteEvent(id) {
    const events = getEvents().filter(e => e.id !== id);
    saveEvents(events);
    renderHistory();
    renderStats();
  }

  function clearAllEvents() {
    if (confirm('Delete all history? This cannot be undone.')) {
      localStorage.removeItem(STORAGE_KEY);
      renderHistory();
      renderStats();
      showToast('History cleared');
    }
  }

  // --- Tab Navigation ---
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      tabs.forEach(t => t.classList.remove('active'));
      views.forEach(v => v.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(target + '-view').classList.add('active');
    });
  });

  // --- Action Buttons ---
  actionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      addEvent(type);
      showToast(LABELS[type] + ' logged');
    });
  });

  // --- Filters ---
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.filter;
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderHistory();
    });
  });



  // --- History Rendering ---
  function renderHistory() {
    const allEvents = getEvents();
    const events = activeFilter === 'all'
      ? allEvents
      : allEvents.filter(e => e.type === activeFilter);

    if (events.length === 0) {
      historyList.innerHTML = '<p class="empty-state">' +
        (allEvents.length === 0 ? 'No events logged yet' : 'No matching events') + '</p>';
      clearBtn.classList.add('hidden');
      return;
    }

    clearBtn.classList.remove('hidden');
    let html = '';
    let lastDate = '';

    events.forEach(event => {
      const date = new Date(event.timestamp);
      const dateStr = formatDate(date);

      if (dateStr !== lastDate) {
        html += '<div class="date-separator">' + dateStr + '</div>';
        lastDate = dateStr;
      }

      html += '<div class="history-item">';
      html += '<span class="history-icon">' + ICONS[event.type] + '</span>';
      html += '<div class="history-details">';
      html += '<div class="history-type">' + LABELS[event.type] + '</div>';
      html += '<div class="history-time">' + formatTime(date) + '</div>';
      html += '</div>';
      html += '<button class="history-delete" data-id="' + event.id + '" aria-label="Delete">×</button>';
      html += '</div>';
    });

    historyList.innerHTML = html;

    // Attach delete handlers
    historyList.querySelectorAll('.history-delete').forEach(btn => {
      btn.addEventListener('click', () => deleteEvent(btn.dataset.id));
    });
  }

  clearBtn.addEventListener('click', clearAllEvents);

  // --- Formatting ---
  function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function formatDate(date) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (isSameDay(date, today)) return 'Today';
    if (isSameDay(date, yesterday)) return 'Yesterday';
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
  }

  // --- Toast ---
  function showToast(message) {
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2000);
  }

  // --- Service Worker Registration ---
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // --- Stats Rendering ---
  function renderStats() {
    const events = getEvents();
    if (events.length === 0) {
      statsContent.innerHTML = '<p class="empty-state">No events logged yet</p>';
      return;
    }

    // Group events by date
    const days = {};
    events.forEach(event => {
      const date = new Date(event.timestamp);
      const key = date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      if (!days[key]) days[key] = { diaper: 0, urine: 0, motion: 0, feeding: 0 };
      days[key][event.type]++;
    });

    let html = '';
    Object.entries(days).forEach(([dateStr, counts]) => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      // Check if this is today/yesterday for nicer labels
      const firstEvent = events.find(e => {
        const d = new Date(e.timestamp);
        return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) === dateStr;
      });
      const eventDate = new Date(firstEvent.timestamp);
      let label = dateStr;
      if (isSameDay(eventDate, today)) label = 'Today';
      else if (isSameDay(eventDate, yesterday)) label = 'Yesterday';

      html += '<div class="stats-day">';
      html += '<div class="stats-date">' + label + '</div>';
      html += '<div class="stats-grid">';
      html += '<div class="stat-item"><span class="stat-icon">👶</span><span class="stat-count">' + counts.diaper + '</span></div>';
      html += '<div class="stat-item"><span class="stat-icon">💧</span><span class="stat-count">' + counts.urine + '</span></div>';
      html += '<div class="stat-item"><span class="stat-icon">💩</span><span class="stat-count">' + counts.motion + '</span></div>';
      html += '<div class="stat-item"><span class="stat-icon">🍼</span><span class="stat-count">' + counts.feeding + '</span></div>';
      html += '</div></div>';
    });

    statsContent.innerHTML = html;
  }

  // --- Init ---
  renderHistory();
  renderStats();
})();
