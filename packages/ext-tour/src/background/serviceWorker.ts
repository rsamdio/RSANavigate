import { uploadDOMSnapshotToR2, R2Config, DOMSnapshot, DemoDocument, StepDocument, APP_PRODUCTION_URL } from '@serverless-tour/common';

interface RecordingSession {
  isRecording: boolean;
  demoId: string | null;
  demoTitle: string;
  stepCount: number;
  initialStepOffset?: number;
  isAppend?: boolean;
  steps: StepDocument[];
  snapshots: Record<string, DOMSnapshot>;
}

let session: RecordingSession = {
  isRecording: false,
  demoId: null,
  demoTitle: 'New Walkthrough',
  stepCount: 0,
  initialStepOffset: 0,
  isAppend: false,
  steps: [],
  snapshots: {}
};

// Startup: Restore active session & purge stale/ghost test recordings
chrome.storage.local.get(['activeTourSession', 'studioDemos', 'recordedTours'], (res) => {
  if (res.activeTourSession && res.activeTourSession.isRecording) {
    session = {
      ...session,
      ...res.activeTourSession,
      steps: res.activeTourSession.steps || [],
      snapshots: res.activeTourSession.snapshots || {}
    };
  } else {
    session = {
      isRecording: false,
      demoId: null,
      demoTitle: 'New Walkthrough',
      stepCount: 0,
      initialStepOffset: 0,
      isAppend: false,
      steps: [],
      snapshots: {}
    };
    chrome.storage.local.set({ activeTourSession: null });
  }

  // Purge any orphaned legacy recordings
  const studioDemos = Array.isArray(res.studioDemos) ? res.studioDemos : [];
  const validIds = new Set(studioDemos.map((d: any) => d.id));
  const recordedTours = res.recordedTours || {};
  const cleanTours: Record<string, any> = {};

  for (const [id, tour] of Object.entries(recordedTours)) {
    if (validIds.has(id)) {
      cleanTours[id] = tour;
    }
  }
  chrome.storage.local.set({ recordedTours: cleanTours });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_RECORDING_STATE') {
    chrome.storage.local.get(['activeTourSession'], (res) => {
      sendResponse({ session: res.activeTourSession || session });
    });
    return true;
  }

  if (message.type === 'SYNC_STUDIO_DEMOS') {
    const demos = Array.isArray(message.demos) ? message.demos : [];
    const validDemoIds = new Set(demos.map((d: any) => d.id));

    chrome.storage.local.get(['recordedTours'], (res) => {
      const recordedTours = res.recordedTours || {};
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

  if (message.type === 'CLEAR_GHOST_RECORDINGS') {
    chrome.storage.local.set({ recordedTours: {} });
    sendResponse({ success: true });
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
        // Filter out dummy/ghost recordings from legacy test runs
        tours = Object.entries(recordedTours)
          .filter(([_, data]: [string, any]) => {
            const title = data?.demo?.title || '';
            return title && !title.startsWith('New Web Recording') && !title.startsWith('New Walkthrough');
          })
          .map(([id, data]: [string, any]) => ({
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

    chrome.storage.local.get(['recordedTours', 'studioDemos'], (res) => {
      const recordedTours = res.recordedTours || {};
      const studioDemos = res.studioDemos || [];
      const existingRecorded = isAppend && demoId ? recordedTours[demoId] : null;
      const matchedStudioDemo = isAppend && demoId ? studioDemos.find((d: any) => d.id === demoId) : null;

      const existingSteps = existingRecorded?.steps || [];
      const initialStepCount = existingSteps.length > 0
        ? existingSteps.length
        : (matchedStudioDemo?.stepCount || 0);

      session = {
        isRecording: true,
        demoId,
        demoTitle: existingRecorded?.demo?.title || matchedStudioDemo?.title || title,
        stepCount: initialStepCount,
        initialStepOffset: initialStepCount,
        isAppend,
        steps: [...existingSteps],
        snapshots: existingRecorded?.snapshots ? { ...existingRecorded.snapshots } : {}
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
    if (!snapshot) {
      sendResponse({ success: false });
      return true;
    }

    chrome.storage.local.get(['activeTourSession'], (res) => {
      const currentSession = res.activeTourSession || session;
      if (!currentSession || !currentSession.isRecording || !currentSession.demoId) {
        sendResponse({ success: false });
        return;
      }

      const stepIndex = (currentSession.steps?.length || 0) + 1;
      const displayStepNumber = (currentSession.initialStepOffset || 0) + (currentSession.isAppend && currentSession.steps?.length === 0 ? 1 : stepIndex);
      const stepId = `step_${currentSession.demoId}_${Date.now()}_${stepIndex}`;
      const snapshotUrl = `snap_${currentSession.demoId}_${Date.now()}_${stepIndex}`;

      let stepTitle = `Step ${displayStepNumber}`;
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
        stepNumber: displayStepNumber,
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
        showBackButton: displayStepNumber > 1,
        snapshotUrl: snapshotUrl,
        createdAt: Date.now()
      };

      if (!currentSession.steps) currentSession.steps = [];
      if (!currentSession.snapshots) currentSession.snapshots = {};

      currentSession.steps.push(newStep);
      currentSession.snapshots[snapshotUrl] = snapshot;
      currentSession.stepCount = displayStepNumber;
      session = currentSession;

      chrome.storage.local.set({ activeTourSession: currentSession });

      // Notify tabs
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { type: 'RECORDING_STATUS_CHANGED', session: currentSession }).catch(() => {});
          }
        });
      });

      if (r2Config && currentSession.demoId) {
        uploadDOMSnapshotToR2(r2Config, currentSession.demoId, stepId, snapshot)
          .then((uploadedUrl) => {
            newStep.snapshotUrl = uploadedUrl;
            sendResponse({ success: true, stepCount: displayStepNumber });
          })
          .catch(() => {
            sendResponse({ success: true, stepCount: displayStepNumber });
          });
        return;
      }

      sendResponse({ success: true, stepCount: displayStepNumber });
    });
    return true;
  }

  if (message.type === 'STOP_RECORDING') {
    chrome.storage.local.get(['activeTourSession', 'recordedTours'], (res) => {
      const activeSession = res.activeTourSession || session;
      const recordedTours = res.recordedTours || {};

      if (activeSession && activeSession.demoId && activeSession.steps?.length > 0) {
        const isAppend = !!activeSession.isAppend;
        const existingTour = recordedTours[activeSession.demoId];
        
        let mergedSteps = activeSession.steps;
        let mergedSnapshots = activeSession.snapshots || {};

        if (isAppend && existingTour?.steps) {
          const existingIds = new Set(existingTour.steps.map((s: any) => s.id));
          const newSteps = activeSession.steps.filter((s: any) => !existingIds.has(s.id));
          mergedSteps = [...existingTour.steps, ...newSteps];
          mergedSnapshots = { ...(existingTour.snapshots || {}), ...activeSession.snapshots };
        }

        const finishedDemo: DemoDocument = {
          id: activeSession.demoId,
          title: activeSession.demoTitle,
          description: `Captured walkthrough containing ${mergedSteps.length} interactive steps.`,
          authorId: 'local_creator',
          authorEmail: 'creator@demo-platform.local',
          createdAt: existingTour?.demo?.createdAt || Date.now(),
          updatedAt: Date.now(),
          stepOrder: mergedSteps.map((s: any) => s.id),
          isPublished: existingTour?.demo?.isPublished || false,
          tags: existingTour?.demo?.tags || []
        };

        recordedTours[activeSession.demoId] = {
          demo: finishedDemo,
          steps: mergedSteps,
          snapshots: mergedSnapshots,
          isAppend
        };

        // Open studio with merged data
        openStudioWithRecordedData(activeSession.demoId, finishedDemo, activeSession.steps, activeSession.snapshots, isAppend);
      }

      // Reset in-memory session and explicitly clear activeTourSession in storage
      session = {
        isRecording: false,
        demoId: null,
        demoTitle: 'New Walkthrough',
        stepCount: 0,
        initialStepOffset: 0,
        isAppend: false,
        steps: [],
        snapshots: {}
      };
      chrome.storage.local.set({ recordedTours, activeTourSession: null });

      // Notify all tabs that recording has completely stopped
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
  snapshots: Record<string, DOMSnapshot>,
  isAppend: boolean = false
) {
  const baseUrl = import.meta.env.VITE_STUDIO_URL || APP_PRODUCTION_URL;
  const targetUrl = `${baseUrl}/admin/editor/${demoId}?source=extension`;

  chrome.tabs.create({ url: targetUrl }, (tab) => {
    if (!tab.id) return;

    const listener = (tabId: number, info: chrome.tabs.TabChangeInfo) => {
      if (tabId === tab.id && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);

        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (dId: string, dDoc: any, sList: any, sMap: any, appendMode: boolean) => {
            // 1. Merge into localStorage without wiping existing steps
            try {
              const DEMOS_KEY = 'serverless_tour_demos_db';
              const STEPS_KEY = 'serverless_tour_steps_db';
              const demos: Record<string, any> = JSON.parse(localStorage.getItem(DEMOS_KEY) || '{}');
              const stepsObj: Record<string, any> = JSON.parse(localStorage.getItem(STEPS_KEY) || '{}');

              let finalSteps = sList;
              if (appendMode && stepsObj[dId] && Array.isArray(stepsObj[dId]) && stepsObj[dId].length > 0) {
                const existingIds = new Set(stepsObj[dId].map((s: any) => s.id));
                const newUnique = sList.filter((s: any) => !existingIds.has(s.id));
                finalSteps = [...stepsObj[dId], ...newUnique].map((s: any, idx: number) => ({ ...s, stepNumber: idx + 1 }));
              }

              const existingDemo = demos[dId];
              const finalDemo = {
                ...(existingDemo || dDoc),
                id: dId,
                title: existingDemo?.title || dDoc?.title || 'Interactive Walkthrough',
                description: existingDemo?.description || dDoc?.description,
                stepOrder: finalSteps.map((s: any) => s.id),
                updatedAt: Date.now()
              };

              demos[dId] = finalDemo;
              stepsObj[dId] = finalSteps;

              localStorage.setItem(DEMOS_KEY, JSON.stringify(demos));
              localStorage.setItem(STEPS_KEY, JSON.stringify(stepsObj));
            } catch (e) {
              console.warn('localStorage sync note:', e);
            }

            // 2. Merge into IndexedDB
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

                const getReq = draftStore.get(dId);
                getReq.onsuccess = () => {
                  const existingDraft = getReq.result;
                  let finalSteps = sList;
                  if (appendMode && existingDraft && existingDraft.steps && Array.isArray(existingDraft.steps)) {
                    const existingIds = new Set(existingDraft.steps.map((s: any) => s.id));
                    const newUniqueSteps = sList.filter((s: any) => !existingIds.has(s.id));
                    finalSteps = [...existingDraft.steps, ...newUniqueSteps].map((s: any, idx: number) => ({ ...s, stepNumber: idx + 1 }));
                  }

                  const finalDemo = {
                    ...(existingDraft?.demo || dDoc),
                    id: dId,
                    stepOrder: finalSteps.map((s: any) => s.id),
                    totalSteps: finalSteps.length
                  };

                  draftStore.put({ demo: finalDemo, steps: finalSteps }, dId);
                  for (const [key, snap] of Object.entries(sMap)) {
                    snapStore.put(snap, key);
                  }

                  tx.oncomplete = () => {
                    window.postMessage({
                      type: 'NAVIGATE_STUDIO_RECORDED_TOUR_RESPONSE',
                      demoId: dId,
                      isAppend: appendMode,
                      tourData: { demo: finalDemo, steps: sList, snapshots: sMap }
                    }, '*');
                    window.dispatchEvent(new CustomEvent('navigate-tour-ready', { detail: { demoId: dId } }));
                  };
                };
              } catch (err) {
                console.warn('IndexedDB injection note:', err);
              }
            };
          },
          args: [demoId, demo, steps, snapshots, isAppend]
        }).catch((err) => console.warn('Script injection notice:', err));
      }
    };

    chrome.tabs.onUpdated.addListener(listener);
  });
}
