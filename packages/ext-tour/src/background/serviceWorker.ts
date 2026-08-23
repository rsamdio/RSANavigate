import { uploadDOMSnapshotToR2, R2Config, DOMSnapshot, DemoDocument, StepDocument, APP_PRODUCTION_URL } from '@serverless-tour/common';

interface RecordingSession {
  isRecording: boolean;
  demoId: string | null;
  demoTitle: string;
  stepCount: number;
  steps: StepDocument[];
  snapshots: Record<string, DOMSnapshot>;
}

let session: RecordingSession = {
  isRecording: false,
  demoId: null,
  demoTitle: 'New Walkthrough',
  stepCount: 0,
  steps: [],
  snapshots: {}
};

// Restore active session on startup
chrome.storage.local.get(['activeTourSession', 'recordedTours'], (res) => {
  if (res.activeTourSession) {
    session = {
      ...session,
      ...res.activeTourSession,
      steps: res.activeTourSession.steps || [],
      snapshots: res.activeTourSession.snapshots || {}
    };
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_RECORDING_STATE') {
    sendResponse({ session });
    return true;
  }

  if (message.type === 'SYNC_STUDIO_DEMOS') {
    const demos = Array.isArray(message.demos) ? message.demos : [];
    chrome.storage.local.get(['recordedTours'], (res) => {
      const recordedTours = res.recordedTours || {};
      const validDemoIds = new Set(demos.map((d: any) => d.id));
      
      // Prune orphaned recordings that no longer exist in Studio
      const prunedTours: Record<string, any> = {};
      for (const [id, tour] of Object.entries(recordedTours)) {
        if (validDemoIds.has(id)) {
          prunedTours[id] = tour;
        }
      }

      chrome.storage.local.set({
        studioDemos: demos,
        recordedTours: prunedTours
      });
      sendResponse({ success: true, count: demos.length });
    });
    return true;
  }

  if (message.type === 'SYNC_ACTIVE_STUDIO_DEMO') {
    if (message.activeDemo) {
      chrome.storage.local.set({ activeStudioDemo: message.activeDemo });
    }
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'LIST_RECORDED_DEMOS') {
    chrome.storage.local.get(['studioDemos', 'recordedTours', 'activeStudioDemo'], (res) => {
      const studioDemos = Array.isArray(res.studioDemos) ? res.studioDemos : [];
      const recordedTours = res.recordedTours || {};
      const activeStudioDemo = res.activeStudioDemo || null;

      let tours: any[] = [];
      if (studioDemos.length > 0) {
        // Authoritative source: Dashboard & Live Studio Demos
        tours = studioDemos;
      } else {
        // Fallback to local recorded tours if user has not loaded dashboard yet
        tours = Object.entries(recordedTours).map(([id, data]: [string, any]) => ({
          id,
          title: data?.demo?.title || 'Walkthrough',
          stepCount: data?.steps?.length || 0,
          isPublished: false,
          updatedAt: data?.demo?.updatedAt || Date.now()
        }));
      }

      sendResponse({
        success: true,
        tours,
        activeDemoId: activeStudioDemo?.id || (tours.length > 0 ? tours[0].id : null)
      });
    });
    return true;
  }

  if (message.type === 'START_RECORDING') {
    const demoId = message.demoId || `demo_rec_${Date.now().toString(36)}`;
    const title = message.demoTitle || 'My Rotary Walkthrough';
    const isAppend = message.isAppend || false;

    chrome.storage.local.get(['recordedTours'], (res) => {
      const recordedTours = res.recordedTours || {};
      const existing = isAppend && demoId ? recordedTours[demoId] : null;

      session = {
        isRecording: true,
        demoId,
        demoTitle: existing?.demo?.title || title,
        stepCount: existing?.steps?.length || 0,
        steps: existing?.steps ? [...existing.steps] : [],
        snapshots: existing?.snapshots ? { ...existing.snapshots } : {}
      };

      chrome.storage.local.set({ activeTourSession: session });

      // Notify all tabs
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { type: 'RECORDING_STATUS_CHANGED', session }).catch(() => {});
          }
        });
      });

      sendResponse({ success: true, session });
    });
    return true;
  }

  if (message.type === 'STEP_RECORDED') {
    const { snapshot, r2Config } = message.payload as { snapshot: DOMSnapshot; r2Config?: R2Config };
    if (!snapshot || !session.demoId) {
      sendResponse({ success: false });
      return true;
    }

    const stepIndex = session.steps.length + 1;
    const stepId = `step_${session.demoId}_${stepIndex}`;
    const snapshotUrl = `snap_${session.demoId}_${stepIndex}`;

    // Compute title from clicked element or page title
    let stepTitle = `Step ${stepIndex}`;
    let stepDesc = 'Click on this element to proceed.';
    if (snapshot.clickedElement) {
      const textSnippet = (snapshot.clickedElement.text || '').trim();
      const tag = snapshot.clickedElement.tagName.toLowerCase();
      if (textSnippet && textSnippet.length < 50) {
        stepTitle = `Click "${textSnippet}"`;
      } else if (tag === 'input') {
        stepTitle = 'Enter Input Value';
        stepDesc = 'Click on the input field and fill in details.';
      } else if (tag === 'button' || tag === 'a') {
        stepTitle = `Select ${tag.toUpperCase()} Option`;
      }
    }

    const newStep: StepDocument = {
      id: stepId,
      stepNumber: stepIndex,
      title: stepTitle,
      description: stepDesc,
      targetSelector: snapshot.clickedElement?.selector || snapshot.clickedElement?.tagName || 'body',
      targetCoordinates: snapshot.clickedElement?.rect || {
        x: snapshot.clickCoordinates?.x || 100,
        y: snapshot.clickCoordinates?.y || 100,
        width: 200,
        height: 60
      },
      placement: 'bottom',
      triggerType: 'click',
      stepType: 'tooltip',
      showBeacon: true,
      buttonText: 'Next Step',
      showBackButton: stepIndex > 1,
      snapshotUrl: snapshotUrl,
      createdAt: Date.now()
    };

    session.steps.push(newStep);
    session.snapshots[snapshotUrl] = snapshot;
    session.stepCount = session.steps.length;

    chrome.storage.local.set({ activeTourSession: session });

    // Handle optional direct R2 upload if configured
    if (r2Config && session.demoId) {
      uploadDOMSnapshotToR2(r2Config, session.demoId, stepId, snapshot)
        .then((uploadedUrl) => {
          newStep.snapshotUrl = uploadedUrl;
          sendResponse({ success: true, stepCount: session.stepCount });
        })
        .catch(() => {
          sendResponse({ success: true, stepCount: session.stepCount });
        });
      return true;
    }

    sendResponse({ success: true, stepCount: session.stepCount });
    return true;
  }

  if (message.type === 'STOP_RECORDING') {
    session.isRecording = false;

    // Create final DemoDocument
    if (session.demoId && session.steps.length > 0) {
      const finishedDemo: DemoDocument = {
        id: session.demoId,
        title: session.demoTitle,
        description: `Captured walkthrough containing ${session.steps.length} interactive steps.`,
        authorId: 'local_creator',
        authorEmail: 'creator@demo-platform.local',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        stepOrder: session.steps.map((s) => s.id),
        isPublished: false,
        tags: ['Rotary Guide', 'Web Walkthrough']
      };

      // Save to extension storage (with unlimitedStorage permission)
      chrome.storage.local.get(['recordedTours'], (res) => {
        const recordedTours = res.recordedTours || {};
        recordedTours[session.demoId!] = {
          demo: finishedDemo,
          steps: session.steps,
          snapshots: session.snapshots
        };
        chrome.storage.local.set({ recordedTours, activeTourSession: session });
      });

      // Open Studio and transfer data via IndexedDB bridge
      openStudioWithRecordedData(session.demoId, finishedDemo, session.steps, session.snapshots);
    }

    // Notify tabs
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { type: 'RECORDING_STATUS_CHANGED', session }).catch(() => {});
        }
      });
    });

    sendResponse({ success: true, session });
    return true;
  }
});

// Support direct query from the Studio Web App via externally_connectable
chrome.runtime.onMessageExternal?.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_RECORDED_DEMO') {
    const requestedId = message.demoId;
    chrome.storage.local.get(['recordedTours'], (res) => {
      const recordedTours = res.recordedTours || {};
      if (requestedId && recordedTours[requestedId]) {
        sendResponse({ success: true, tourData: recordedTours[requestedId] });
      } else if (!requestedId && session.demoId && recordedTours[session.demoId]) {
        sendResponse({ success: true, tourData: recordedTours[session.demoId] });
      } else {
        sendResponse({ success: false, error: 'Tour not found in extension storage.' });
      }
    });
    return true; // Async sendResponse
  }

  if (message.type === 'LIST_RECORDED_DEMOS') {
    chrome.storage.local.get(['recordedTours'], (res) => {
      const recordedTours = res.recordedTours || {};
      sendResponse({ success: true, tours: Object.keys(recordedTours) });
    });
    return true;
  }
});

// Helper: Open Studio and inject recorded tour into high-capacity IndexedDB
function openStudioWithRecordedData(
  demoId: string,
  demo: DemoDocument,
  steps: StepDocument[],
  snapshots: Record<string, DOMSnapshot>
) {
  const baseUrl = import.meta.env.VITE_STUDIO_URL || APP_PRODUCTION_URL;
  const targetUrl = `${baseUrl}/admin/editor/${demoId}?source=extension`;

  chrome.tabs.create({ url: targetUrl }, (tab) => {
    if (!tab.id) return;

    const listener = (tabId: number, info: chrome.tabs.TabChangeInfo) => {
      if (tabId === tab.id && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);

        // Inject script to populate IndexedDB directly (bypassing the 5MB localStorage limit)
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (dId: string, dDoc: any, sList: any, sMap: any) => {
            // 1. Open/Create high-capacity IndexedDB in the Studio origin
            const req = indexedDB.open('NavigateStudioDB', 1);
            req.onupgradeneeded = (e: any) => {
              const idb = e.target.result;
              if (!idb.objectStoreNames.contains('snapshots')) {
                idb.createObjectStore('snapshots');
              }
              if (!idb.objectStoreNames.contains('drafts')) {
                idb.createObjectStore('drafts');
              }
            };
            req.onsuccess = (e: any) => {
              try {
                const idb = e.target.result;
                const tx = idb.transaction(['snapshots', 'drafts'], 'readwrite');
                const snapStore = tx.objectStore('snapshots');
                const draftStore = tx.objectStore('drafts');

                draftStore.put({ demo: dDoc, steps: sList }, dId);
                for (const [key, snap] of Object.entries(sMap)) {
                  snapStore.put(snap, key);
                }

                tx.oncomplete = () => {
                  window.postMessage({ type: 'NAVIGATE_EXTENSION_TOUR_LOADED', demoId: dId }, '*');
                  window.dispatchEvent(new CustomEvent('navigate-tour-ready', { detail: { demoId: dId } }));
                };
              } catch (err) {
                console.warn('IndexedDB injection note:', err);
              }
            };

            // 2. Also save lightweight metadata to localStorage as secondary pointer
            try {
              const DEMOS_KEY = 'serverless_tour_demos_db';
              const STEPS_KEY = 'serverless_tour_steps_db';
              const demos: Record<string, any> = JSON.parse(localStorage.getItem(DEMOS_KEY) || '{}');
              const stepsObj: Record<string, any> = JSON.parse(localStorage.getItem(STEPS_KEY) || '{}');

              demos[dId] = dDoc;
              stepsObj[dId] = sList;

              localStorage.setItem(DEMOS_KEY, JSON.stringify(demos));
              localStorage.setItem(STEPS_KEY, JSON.stringify(stepsObj));
              window.dispatchEvent(new Event('storage'));
            } catch (e) {
              console.warn('localStorage pointer note:', e);
            }
          },
          args: [demoId, demo, steps, snapshots]
        }).catch((err) => console.warn('Script injection notice:', err));
      }
    };

    chrome.tabs.onUpdated.addListener(listener);
  });
}
