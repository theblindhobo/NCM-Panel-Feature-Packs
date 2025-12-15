document.addEventListener('DOMContentLoaded', function () {
  var ajax = window.ncmSiteNoticeAjax;
  if (!ajax || !ajax.url) {
    console.log('NCM: no ncmSiteNoticeAjax config found');
    return;
  }

  var container    = document.getElementById('site-notice');
  if (!container) {
    console.log('NCM: #site-notice container not found');
    return;
  }

  var messageInner = container.querySelector('.site-notice__message-inner');
  var dismissBtn   = container.querySelector('.site-notice__dismiss');

  if (!messageInner) {
    console.log('NCM: .site-notice__message-inner not found');
    return;
  }

  // --- CONFIG: keep these in sync with your CSS ---
  var TICKER_DURATION_DESKTOP = 35; // must match desktop CSS animation-duration
  var TICKER_DURATION_MOBILE  = 25; // must match mobile CSS animation-duration

  var GAP_THRESHOLD_SECONDS   = 2;
  var REWIND_SECONDS          = 3;

  var STORAGE_PREFIX_START     = 'ncmSiteNoticeTickerStart_';
  var STORAGE_PREFIX_LAST_SEEN = 'ncmSiteNoticeTickerLast_';

  function normalizeNotices(list) {
    if (!Array.isArray(list)) return [];
    return list.map(function (n, idx) {
      var copy = Object.assign({}, n || {});
      if (!copy.id) {
        copy.id = 'auto-' + idx;
      }
      return copy;
    });
  }

  function getTickerDuration() {
    if (window.matchMedia('(max-width: 767px)').matches) {
      return TICKER_DURATION_MOBILE;
    }
    return TICKER_DURATION_DESKTOP;
  }

  function nowMs() {
    return Date.now();
  }

  function applyTickerOffset(noticeId) {
    if (!noticeId) return;

    var duration = getTickerDuration();
    var now      = nowMs();

    var startKey    = STORAGE_PREFIX_START + noticeId;
    var lastSeenKey = STORAGE_PREFIX_LAST_SEEN + noticeId;

    var startTs = null;
    var lastTs  = null;

    try {
      var rawStart = localStorage.getItem(startKey);
      if (rawStart) startTs = parseInt(rawStart, 10);
    } catch (e) {}

    try {
      var rawLast = localStorage.getItem(lastSeenKey);
      if (rawLast) lastTs = parseInt(rawLast, 10);
    } catch (e) {}

    if (!startTs || isNaN(startTs)) {
      startTs = now;
      try { localStorage.setItem(startKey, String(startTs)); } catch (e) {}
    }

    var elapsed = (now - startTs) / 1000;
    var isResume = false;

    if (lastTs && !isNaN(lastTs)) {
      var gap = (now - lastTs) / 1000;
      if (gap > GAP_THRESHOLD_SECONDS) {
        isResume = true;
      }
    }

    if (isResume) {
      elapsed = Math.max(0, elapsed - REWIND_SECONDS);
    }

    var offset = - (elapsed % duration);
    messageInner.style.animationDelay = offset + 's';

    try {
      localStorage.setItem(lastSeenKey, String(now));
    } catch (e) {}
  }

  function renderNotice(notices) {
    notices = normalizeNotices(notices);
    if (!notices.length) {
      console.log('NCM: no notices returned from AJAX');
      return;
    }

    var notice = notices[0];

    container.dataset.noticeId = notice.id;

    if (notice.html) {
      messageInner.innerHTML = notice.html;
    }

    applyTickerOffset(notice.id);

    // --- SHOW: step 1 — make it participate in layout
    container.style.visibility = 'visible';

    // --- SHOW: step 2 — next frame, add class to slide it up
    requestAnimationFrame(function () {
      container.classList.add('is-visible');
    });

    document.body.classList.add('ncm-site-notice-active');

    if (dismissBtn) {
      dismissBtn.addEventListener('click', function () {
        container.classList.remove('is-visible');
      });
    }
  }

  var body = 'action=' + encodeURIComponent(ajax.action);

  fetch(ajax.url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body
  })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      if (!data || !data.enabled) {
        console.log('NCM: notice disabled or no data');
        return;
      }
      renderNotice(data.notices || []);
    })
    .catch(function (err) {
      console.error('NCM site notice AJAX error', err);
    });
});
