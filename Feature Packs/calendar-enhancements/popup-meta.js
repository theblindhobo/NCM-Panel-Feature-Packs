document.addEventListener('DOMContentLoaded', function () {
  const cfg = window.ncmCalendarEnhance || {};

  const calendarEl = document.querySelector(cfg.calendarSelector || '#ha-ec-fc1f1e9');
  const popupWrapper = document.querySelector(cfg.popupSelector || '.ha-ec-popup-wrapper');
  const eventsData = window[cfg.eventsJsonKey || 'HaECjsonfc1f1e9'] || [];
  const FALLBACK_LABEL = cfg.fallbackLabel || 'Phoenix';

  if (!calendarEl || !popupWrapper || !Array.isArray(eventsData)) return;

  const metaCache = {};
  let currentEventUrl = null;

  async function fetchEventMeta(eventUrl) {
    if (!eventUrl) return { mapUrl: null, dateText: null };
    if (metaCache[eventUrl]) return metaCache[eventUrl];

    let mapUrl = null;
    let dateText = null;

    try {
      const response = await fetch(eventUrl, { credentials: 'same-origin' });
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');

      const gmap = doc.querySelector('.tribe-events-gmap');
      if (gmap) mapUrl = gmap.href;

      if (!mapUrl) {
        const iframe = doc.querySelector('.tribe-events-venue-map iframe');
        if (iframe) mapUrl = iframe.src;
      }

      const dateSpan = doc.querySelector('.tribe-event-date-start');
      if (dateSpan) {
        const raw = dateSpan.textContent.trim();
        dateText = raw.split('@')[0].trim();
      }
    } catch (err) {
      console.warn('Could not fetch TEC meta:', err);
    }

    const meta = { mapUrl, dateText };
    metaCache[eventUrl] = meta;
    return meta;
  }

  function findEventByUrl(url) {
    if (!url) return null;
    // Normalize trailing slash
    const u = url.replace(/\/$/, '');
    return eventsData.find(ev => (ev.url || '').replace(/\/$/, '') === u) || null;
  }

  function enhancePopup(meta, eventUrlAppliedFor) {
    if (eventUrlAppliedFor !== currentEventUrl) return;

    const { mapUrl, dateText } = meta || {};

    const timeTitleEl = popupWrapper.querySelector('.ha-ec-time-title');
    if (timeTitleEl && dateText) timeTitleEl.textContent = dateText;

    const locationEl = popupWrapper.querySelector('.ha-ec-event-location');
    if (locationEl && mapUrl && !locationEl.closest('a')) {
      const locText = locationEl.textContent.trim();
      if (locText) {
        const link = document.createElement('a');
        link.href = mapUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.className = locationEl.className + ' ha-ec-event-location-link';
        link.textContent = locText;
        locationEl.replaceWith(link);
      }
    }

    const readmore = popupWrapper.querySelector('.ha-ec-popup-readmore-link');
    if (readmore && mapUrl) {
      readmore.href = mapUrl;
      readmore.textContent = 'Open in Google Maps';
    }
  }

  async function applyMeta(eventUrl) {
    const meta = await fetchEventMeta(eventUrl);
    if (eventUrl !== currentEventUrl) return;
    enhancePopup(meta, eventUrl);
  }

  calendarEl.addEventListener('click', function (e) {
    const eventLink = e.target.closest('a.fc-daygrid-event, a.fc-event');
    if (!eventLink) return;

    const clickedUrl = eventLink.getAttribute('href') || '';
    const eventData = findEventByUrl(clickedUrl);

    // Reset fallback immediately
    const timeTitleEl = popupWrapper.querySelector('.ha-ec-time-title');
    if (timeTitleEl) timeTitleEl.textContent = FALLBACK_LABEL;

    if (!eventData || !eventData.url) return;

    currentEventUrl = eventData.url;
    setTimeout(() => applyMeta(currentEventUrl), 150);
  });
});
