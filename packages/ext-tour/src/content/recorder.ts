import { captureDOMSnapshot, DOMSnapshot } from '@serverless-tour/common';

let isRecordingActive = false;
let currentDemoId: string | null = null;
let recordedStepsCount = 0;
let floatingWidgetEl: HTMLDivElement | null = null;

// Initialize and check storage
chrome.storage.local.get(['activeTourSession'], (res) => {
  if (res.activeTourSession && res.activeTourSession.isRecording) {
    startInPageRecording(res.activeTourSession.demoId, res.activeTourSession.stepCount || 0);
  }
});

// Listen for status changes from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'RECORDING_STATUS_CHANGED') {
    if (message.session && message.session.isRecording) {
      startInPageRecording(message.session.demoId, message.session.stepCount);
    } else {
      stopInPageRecording();
    }
  }
});

function startInPageRecording(demoId: string, initialCount = 0) {
  if (isRecordingActive) return;
  isRecordingActive = true;
  currentDemoId = demoId;
  recordedStepsCount = initialCount;

  injectFloatingWidget();
  attachCaptureListeners();
}

function stopInPageRecording() {
  isRecordingActive = false;
  removeFloatingWidget();
  detachCaptureListeners();
}

function injectFloatingWidget() {
  if (floatingWidgetEl) return;

  floatingWidgetEl = document.createElement('div');
  floatingWidgetEl.id = 'navigate-tour-recorder-widget';
  floatingWidgetEl.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483647;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 20px;
    padding: 10px 16px;
    box-shadow: 0 20px 30px -10px rgba(12, 60, 96, 0.25), 0 8px 12px -4px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    gap: 12px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #0f172a;
    user-select: none;
  `;

  floatingWidgetEl.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <div style="width: 10px; height: 10px; border-radius: 50%; background: #ef4444; box-shadow: 0 0 10px #ef4444;"></div>
      <span style="font-size: 12px; font-weight: 800; color: #0c3c60;">NAVIGATE</span>
      <span id="navigate-step-badge" style="font-size: 11px; font-weight: 700; font-family: monospace; background: #eff6ff; color: #1d4ed8; padding: 2px 8px; border-radius: 9999px; border: 1px solid #bfdbfe;">
        ${recordedStepsCount} Steps
      </span>
    </div>

    <div style="width: 1px; height: 18px; background: #e2e8f0;"></div>

    <button id="navigate-capture-now-btn" style="background: #eff6ff; color: #0c3c60; border: 1px solid #bfdbfe; border-radius: 10px; padding: 5px 10px; font-size: 11px; font-weight: 700; cursor: pointer;">
      Capture View
    </button>

    <button id="navigate-finish-btn" style="background: #0c3c60; color: white; border: none; border-radius: 10px; padding: 6px 14px; font-size: 11px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 6px -1px rgba(12, 60, 96, 0.3);">
      Finish Recording
    </button>
  `;

  document.body.appendChild(floatingWidgetEl);

  document.getElementById('navigate-capture-now-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    handleManualCapture();
  });

  document.getElementById('navigate-finish-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
    stopInPageRecording();
  });
}

function removeFloatingWidget() {
  if (floatingWidgetEl) {
    floatingWidgetEl.remove();
    floatingWidgetEl = null;
  }
}

function updateWidgetStepCount(count: number) {
  recordedStepsCount = count;
  const badge = document.getElementById('navigate-step-badge');
  if (badge) {
    badge.innerText = `${count} Steps`;
  }
}

function handleManualCapture() {
  if (floatingWidgetEl) {
    floatingWidgetEl.style.display = 'none';
  }
  const snapshot = captureDOMSnapshot(null, undefined, { inlineStyles: true });
  if (floatingWidgetEl) {
    floatingWidgetEl.style.display = 'flex';
  }
  recordStepSnapshot(snapshot);
}

function handleUserClick(e: MouseEvent) {
  if (!isRecordingActive) return;

  const target = e.target as Element;
  // Ignore clicks inside the recorder widget
  if (floatingWidgetEl && floatingWidgetEl.contains(target)) return;

  // Flash clicked element with subtle visual indicator
  if (target && target instanceof HTMLElement) {
    const prevOutline = target.style.outline;
    target.style.outline = '2px solid #3b82f6';
    setTimeout(() => {
      target.style.outline = prevOutline;
    }, 400);
  }

  // Momentarily hide recorder widget during snapshot creation so it is 100% absent from DOM
  if (floatingWidgetEl) {
    floatingWidgetEl.style.display = 'none';
  }

  const coords = { x: e.pageX, y: e.pageY };
  const snapshot = captureDOMSnapshot(target, coords, { inlineStyles: true });

  if (floatingWidgetEl) {
    floatingWidgetEl.style.display = 'flex';
  }

  recordStepSnapshot(snapshot);
}

function recordStepSnapshot(snapshot: DOMSnapshot) {
  chrome.runtime.sendMessage(
    {
      type: 'STEP_RECORDED',
      payload: {
        snapshot,
        demoId: currentDemoId
      }
    },
    (res) => {
      if (res && res.stepCount) {
        updateWidgetStepCount(res.stepCount);
      }
    }
  );
}

let widgetObserver: MutationObserver | null = null;

function attachCaptureListeners() {
  document.addEventListener('click', handleUserClick, true);
  window.addEventListener('popstate', handleSPAUpdate);
  window.addEventListener('hashchange', handleSPAUpdate);

  // Observer to ensure the widget isn't removed by aggressive SPA frameworks
  widgetObserver = new MutationObserver((mutations) => {
    if (isRecordingActive && !document.getElementById('navigate-tour-recorder-widget')) {
      floatingWidgetEl = null;
      injectFloatingWidget();
    }
  });
  widgetObserver.observe(document.body, { childList: true });
}

function detachCaptureListeners() {
  document.removeEventListener('click', handleUserClick, true);
  window.removeEventListener('popstate', handleSPAUpdate);
  window.removeEventListener('hashchange', handleSPAUpdate);
  if (widgetObserver) {
    widgetObserver.disconnect();
    widgetObserver = null;
  }
}

function handleSPAUpdate() {
  if (isRecordingActive && currentDemoId) {
    // Re-verify session with background
    chrome.storage.local.get(['activeTourSession'], (res) => {
      if (!res.activeTourSession || !res.activeTourSession.isRecording) {
        stopInPageRecording();
      } else {
        // Just ensure widget is there
        if (!document.getElementById('navigate-tour-recorder-widget')) {
          floatingWidgetEl = null;
          injectFloatingWidget();
        }
      }
    });
  }
}

// ==============================================================================
// Studio Web App Bridge: Allow NAVIGATE Studio to request recorded tour data
// ==============================================================================
window.addEventListener('message', (event) => {
  if (event.data?.type === 'NAVIGATE_STUDIO_REQUEST_RECORDED_TOUR') {
    const targetDemoId = event.data.demoId;
    chrome.storage.local.get(['recordedTours'], (res) => {
      const recordedTours = res.recordedTours || {};
      if (targetDemoId && recordedTours[targetDemoId]) {
        window.postMessage({
          type: 'NAVIGATE_STUDIO_RECORDED_TOUR_RESPONSE',
          demoId: targetDemoId,
          tourData: recordedTours[targetDemoId]
        }, '*');
      }
    });
  }

  if (event.data?.type === 'NAVIGATE_STUDIO_CHECK_EXTENSION') {
    window.postMessage({ type: 'NAVIGATE_EXTENSION_INSTALLED', version: '1.0.0' }, '*');
  }
});

// If current tab is NAVIGATE Studio with a recorded demo, auto-sync IndexedDB
if (window.location.pathname.includes('/admin/editor/demo_rec_') || window.location.search.includes('source=extension')) {
  const match = window.location.pathname.match(/\/admin\/editor\/(demo_rec_[^/?#]+)/);
  const demoIdFromUrl = match ? match[1] : null;
  if (demoIdFromUrl) {
    chrome.storage.local.get(['recordedTours'], (res) => {
      const recordedTours = res.recordedTours || {};
      const tour = recordedTours[demoIdFromUrl];
      if (tour) {
        // Sync to IndexedDB
        const req = indexedDB.open('NavigateStudioDB', 1);
        req.onupgradeneeded = (e: any) => {
          const idb = e.target.result;
          if (!idb.objectStoreNames.contains('snapshots')) idb.createObjectStore('snapshots');
          if (!idb.objectStoreNames.contains('drafts')) idb.createObjectStore('drafts');
        };
        req.onsuccess = (e: any) => {
          try {
            const idb = e.target.result;
            const tx = idb.transaction(['snapshots', 'drafts'], 'readwrite');
            const snapStore = tx.objectStore('snapshots');
            const draftStore = tx.objectStore('drafts');

            draftStore.put({ demo: tour.demo, steps: tour.steps }, demoIdFromUrl);
            for (const [key, snap] of Object.entries(tour.snapshots || {})) {
              snapStore.put(snap, key);
            }

            tx.oncomplete = () => {
              window.postMessage({
                type: 'NAVIGATE_STUDIO_RECORDED_TOUR_RESPONSE',
                demoId: demoIdFromUrl,
                tourData: tour
              }, '*');
              window.dispatchEvent(new CustomEvent('navigate-tour-ready', { detail: { demoId: demoIdFromUrl } }));
            };
          } catch (err) {
            console.warn('Auto-sync IndexedDB note:', err);
          }
        };
      }
    });
  }
}
