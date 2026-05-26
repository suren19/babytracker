(function () {
  'use strict';

  // --- Constants ---
  const STORAGE_KEY = 'baby_tracker_events';
  const ICONS = { diaper: '🧷', urine: '💧', motion: '💩', feeding: '🍼' };
  const LABELS = { diaper: 'Diaper Change', urine: 'Urine', motion: 'Motion', feeding: 'Feeding' };

  // --- State ---
  let timerInterval = null;
  let timerStart = null;

  // --- DOM refs ---
  const tabs = document.querySelectorAll('.tab');
  const views = document.querySelectorAll('.view');
  const actionBtns = document.querySelectorAll('.action-btn');
  const timerPanel = document.getElementById('timer-panel');
  const timerDisplay = document.getElementById('timer-display');
  const timerStartBtn = document.getElementById('timer-start');
  const timerStopBtn = document.getElementById('timer-stop');
  const timerCancelBtn = document.getElementById('timer-cancel');
  const historyList = document.getElementById('history-list');
  const clearBtn = document.getElementById('clear-history');
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

  function addEvent(type, duration) {
    const events = getEvents();
    events.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      type,
      timestamp: new Date().toISOString(),
      duration: duration || null
    });
    saveEvents(events);
    renderHistory();
  }

  function deleteEvent(id) {
    const events = getEvents().filter(e => e.id !== id);
    saveEvents(events);
    renderHistory();
  }

  function clearAllEvents() {
    if (confirm('Delete all history? This cannot be undone.')) {
      localStorage.removeItem(STORAGE_KEY);
      renderHistory();
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
      if (type === 'feeding') {
        showTimer();
      } else {
        addEvent(type);
        showToast(LABELS[type] + ' logged');
      }
    });
  });

  // --- Timer ---
  function showTimer() {
    timerPanel.classList.remove('hidden');
    timerDisplay.textContent = '00:00';
    timerStartBtn.classList.remove('hidden');
    timerStopBtn.classList.add('hidden');
  }

  function hideTimer() {
    timerPanel.classList.add('hidden');
    stopTimer();
  }

  function startTimer() {
    timerStart = Date.now();
    timerStartBtn.classList.add('hidden');
    timerStopBtn.classList.remove('hidden');
    timerInterval = setInterval(updateTimerDisplay, 1000);
    updateTimerDisplay();
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    if (timerStart) {
      const duration = Math.round((Date.now() - timerStart) / 1000);
      timerStart = null;
      return duration;
    }
    timerStart = null;
    return 0;
  }

  function updateTimerDisplay() {
    if (!timerStart) return;
    const elapsed = Math.round((Date.now() - timerStart) / 1000);
    const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const secs = (elapsed % 60).toString().padStart(2, '0');
    timerDisplay.textContent = mins + ':' + secs;
  }

  timerStartBtn.addEventListener('click', startTimer);

  timerStopBtn.addEventListener('click', () => {
    const duration = stopTimer();
    hideTimer();
    if (duration > 0) {
      addEvent('feeding', duration);
      showToast('Feeding logged (' + formatDuration(duration) + ')');
    }
  });

  timerCancelBtn.addEventListener('click', () => {
    stopTimer();
    hideTimer();
  });

  // --- History Rendering ---
  function renderHistory() {
    const events = getEvents();

    if (events.length === 0) {
      historyList.innerHTML = '<p class="empty-state">No events logged yet</p>';
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
      if (event.duration) {
        html += '<div class="history-duration">' + formatDuration(event.duration) + '</div>';
      }
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
  function formatDuration(seconds) {
    if (seconds < 60) return seconds + 's';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins + 'm' + (secs > 0 ? ' ' + secs + 's' : '');
  }

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

  // --- Init ---
  renderHistory();
})();
