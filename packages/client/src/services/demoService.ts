import {
  DemoDocument,
  StepDocument,
  TourManifest,
  StepManifest,
  DOMSnapshot,
  uploadManifestToR2,
  uploadDOMSnapshotToR2
} from '@serverless-tour/common';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import {
  db,
  storage,
  callGetPresignedUploadUrl,
  callPublishTourManifest,
  uploadSnapshotToFirebaseStorage,
  downloadSnapshotFromFirebaseStorage,
  deleteDemoFromFirebaseStorage
} from './firebase';
import { getR2Config, isR2Configured, isFirebaseConfigured } from './configService';
import {
  getIdbSnapshot,
  saveIdbSnapshot,
  getIdbDraft,
  saveIdbDraft,
  deleteIdbDraft
} from './indexedDbService';

const LOCAL_STORAGE_DEMOS_KEY = 'serverless_tour_demos_db';
const LOCAL_STORAGE_STEPS_KEY = 'serverless_tour_steps_db';
const LOCAL_STORAGE_SNAPSHOTS_KEY = 'serverless_tour_snapshots_db';

// Local change listeners for offline cache synchronization
const localChangeListeners: Set<() => void> = new Set();
function notifyLocalChange() {
  localChangeListeners.forEach((fn) => fn());
}

/**
 * Get all demos
 */
export async function getDemos(authorId?: string): Promise<DemoDocument[]> {
  const firestoreDemos: DemoDocument[] = [];
  if (db && isFirebaseConfigured()) {
    try {
      const q = authorId
        ? query(collection(db, 'demos'), where('authorId', '==', authorId), orderBy('updatedAt', 'desc'))
        : query(collection(db, 'demos'), orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);
      firestoreDemos.push(...snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as DemoDocument)));
    } catch (e) {
      console.warn('Firestore fetch failed, using local store:', e);
    }
  }

  const raw = localStorage.getItem(LOCAL_STORAGE_DEMOS_KEY);
  if (!raw) return firestoreDemos;
  try {
    const map: Record<string, DemoDocument> = JSON.parse(raw);
    for (const localDemo of Object.values(map)) {
      if (!firestoreDemos.some((d) => d.id === localDemo.id)) {
        firestoreDemos.push(localDemo);
      }
    }
  } catch {}
  return firestoreDemos.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

/**
 * Subscribe to realtime demo updates
 */
export function subscribeDemos(authorId: string | undefined, callback: (demos: DemoDocument[]) => void): () => void {
  const mergeLocalDemos = (firestoreDemos: DemoDocument[]): DemoDocument[] => {
    const combined = [...firestoreDemos];
    const raw = localStorage.getItem(LOCAL_STORAGE_DEMOS_KEY);
    if (raw) {
      try {
        const localMap: Record<string, DemoDocument> = JSON.parse(raw);
        for (const localDemo of Object.values(localMap)) {
          const exists = combined.some((d) => d.id === localDemo.id || (d.slug && d.slug === localDemo.slug));
          if (!exists) {
            combined.push(localDemo);

            // Auto-sync local draft to Firestore in background
            if (db && isFirebaseConfigured()) {
              const cleanDemo = {
                ...localDemo,
                authorId: localDemo.authorId === 'local_creator' ? (authorId || 'creator') : (localDemo.authorId || authorId || 'creator')
              };
              setDoc(doc(db, 'demos', localDemo.id), cleanDemo, { merge: true }).catch(() => {});

              // Also sync steps from local storage to Firestore
              const stepsRaw = localStorage.getItem(LOCAL_STORAGE_STEPS_KEY);
              if (stepsRaw) {
                try {
                  const stepsMap: Record<string, StepDocument[]> = JSON.parse(stepsRaw);
                  const localSteps = stepsMap[localDemo.id];
                  if (localSteps && localSteps.length > 0) {
                    for (const st of localSteps) {
                      setDoc(doc(db, 'demos', localDemo.id, 'steps', st.id), st, { merge: true }).catch(() => {});
                    }
                  }
                } catch {}
              }
            }
          }
        }
      } catch {}
    }
    return combined.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  };

  if (db && isFirebaseConfigured()) {
    const q = collection(db, 'demos');

    return onSnapshot(
      q,
      (snapshot) => {
        const demos = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as DemoDocument));
        callback(mergeLocalDemos(demos));
      },
      (err) => {
        console.warn('Firestore subscription notice, falling back to local store:', err);
        callback(mergeLocalDemos([]));
      }
    );
  }

  const update = () => {
    callback(mergeLocalDemos([]));
  };

  update();
  localChangeListeners.add(update);
  return () => localChangeListeners.delete(update);
}

/**
 * Get a specific demo by ID
 */
/**
 * Helper to generate URL-safe slug from title
 */
export function generateSlugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Fetch a single Demo by ID or Slug
 */
export async function getDemo(demoIdOrSlug: string): Promise<DemoDocument | null> {
  if (db && isFirebaseConfigured()) {
    try {
      const docRef = doc(db, 'demos', demoIdOrSlug);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() } as DemoDocument;
      }

      // Check by slug in Firestore
      const q = query(collection(db, 'demos'), where('slug', '==', demoIdOrSlug));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        const first = qSnap.docs[0];
        return { id: first.id, ...first.data() } as DemoDocument;
      }
    } catch (e) {
      console.warn('Firestore getDoc/query failed:', e);
    }
  }

  const raw = localStorage.getItem(LOCAL_STORAGE_DEMOS_KEY);
  if (raw) {
    const map: Record<string, DemoDocument> = JSON.parse(raw);
    if (map[demoIdOrSlug]) return map[demoIdOrSlug];
    const foundBySlug = Object.values(map).find((d) => d.slug === demoIdOrSlug);
    if (foundBySlug) return foundBySlug;
  }

  // Fallback: Check high-capacity IndexedDB
  const idbDraft = await getIdbDraft(demoIdOrSlug);
  if (idbDraft?.demo) return idbDraft.demo;

  return null;
}

/**
 * Create a new Demo
 */
export async function createDemo(
  title: string,
  description = '',
  authorId = 'author_admin_local',
  authorEmail = ''
): Promise<DemoDocument> {
  const demoId = `demo_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
  const slug = generateSlugFromTitle(title) || demoId;
  const newDemo: DemoDocument = {
    id: demoId,
    title,
    slug,
    description,
    authorId,
    authorEmail,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    stepOrder: [],
    isPublished: false,
    tags: ['Draft'],
    theme: {
      primaryColor: '#3b82f6',
      badgeColor: '#38bdf8',
      showBackdrop: true,
      showStepCount: true,
      pulseAnimation: true
    }
  };

  if (db && isFirebaseConfigured()) {
    try {
      await setDoc(doc(db, 'demos', demoId), newDemo);
      return newDemo;
    } catch (e) {
      console.warn('Firestore createDemo failed, saving locally:', e);
    }
  }

  const raw = localStorage.getItem(LOCAL_STORAGE_DEMOS_KEY);
  const map: Record<string, DemoDocument> = raw ? JSON.parse(raw) : {};
  map[demoId] = newDemo;
  localStorage.setItem(LOCAL_STORAGE_DEMOS_KEY, JSON.stringify(map));

  const stepsRaw = localStorage.getItem(LOCAL_STORAGE_STEPS_KEY);
  const stepsMap: Record<string, StepDocument[]> = stepsRaw ? JSON.parse(stepsRaw) : {};
  stepsMap[demoId] = [];
  localStorage.setItem(LOCAL_STORAGE_STEPS_KEY, JSON.stringify(stepsMap));

  notifyLocalChange();
  return newDemo;
}

/**
 * Update demo metadata
 */
export async function updateDemo(demoId: string, updates: Partial<DemoDocument>): Promise<void> {
  const cleanUpdates = { ...updates, updatedAt: Date.now() };

  if (db && isFirebaseConfigured()) {
    try {
      await setDoc(doc(db, 'demos', demoId), cleanUpdates, { merge: true });
    } catch (e) {
      console.warn('Firestore setDoc failed, saving locally:', e);
    }
  }

  const raw = localStorage.getItem(LOCAL_STORAGE_DEMOS_KEY);
  const map: Record<string, DemoDocument> = raw ? JSON.parse(raw) : {};
  map[demoId] = { ...(map[demoId] || { id: demoId, title: 'Walkthrough', stepOrder: [], isPublished: false }), ...cleanUpdates };
  localStorage.setItem(LOCAL_STORAGE_DEMOS_KEY, JSON.stringify(map));
  notifyLocalChange();
}

/**
 * Delete a demo and all its steps
 */
export async function deleteDemo(demoId: string): Promise<void> {
  if (isFirebaseConfigured()) {
    deleteDemoFromFirebaseStorage(demoId).catch(console.warn);
  }
  deleteIdbDraft(demoId).catch(console.warn);

  if (db && isFirebaseConfigured()) {
    try {
      await deleteDoc(doc(db, 'demos', demoId));
      return;
    } catch (e) {
      console.warn('Firestore deleteDoc failed:', e);
    }
  }

  const raw = localStorage.getItem(LOCAL_STORAGE_DEMOS_KEY);
  const map: Record<string, DemoDocument> = raw ? JSON.parse(raw) : {};
  delete map[demoId];
  localStorage.setItem(LOCAL_STORAGE_DEMOS_KEY, JSON.stringify(map));

  const stepsRaw = localStorage.getItem(LOCAL_STORAGE_STEPS_KEY);
  const stepsMap: Record<string, StepDocument[]> = stepsRaw ? JSON.parse(stepsRaw) : {};
  delete stepsMap[demoId];
  localStorage.setItem(LOCAL_STORAGE_STEPS_KEY, JSON.stringify(stepsMap));

  notifyLocalChange();
}

/**
 * Duplicate a demo
 */
export async function duplicateDemo(demoId: string): Promise<DemoDocument> {
  const original = await getDemo(demoId);
  if (!original) throw new Error('Demo not found');

  const steps = await getSteps(demoId);
  const newDemo = await createDemo(
    `${original.title} (Copy)`,
    original.description,
    original.authorId,
    original.authorEmail
  );

  for (const step of steps) {
    const newStepId = `step_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const snapshot = await getDOMSnapshot(step.snapshotUrl);
    let snapshotUrl = step.snapshotUrl;
    if (snapshot) {
      snapshotUrl = await saveDOMSnapshot(newDemo.id, newStepId, snapshot);
    }

    await saveStep(newDemo.id, {
      ...step,
      id: newStepId,
      snapshotUrl
    });
  }

  return newDemo;
}

/**
 * Get all steps for a demo
 */
export async function getSteps(demoId: string): Promise<StepDocument[]> {
  if (db && isFirebaseConfigured()) {
    try {
      const snapshot = await getDocs(collection(db, 'demos', demoId, 'steps'));
      const steps = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as StepDocument));
      steps.sort((a, b) => a.stepNumber - b.stepNumber);
      return steps;
    } catch (e) {
      console.warn('Firestore getSteps failed:', e);
    }
  }

  const stepsRaw = localStorage.getItem(LOCAL_STORAGE_STEPS_KEY);
  if (stepsRaw) {
    const stepsMap: Record<string, StepDocument[]> = JSON.parse(stepsRaw);
    if (stepsMap[demoId] && stepsMap[demoId].length > 0) {
      return stepsMap[demoId].sort((a, b) => a.stepNumber - b.stepNumber);
    }
  }

  // Fallback: Check high-capacity IndexedDB
  const idbDraft = await getIdbDraft(demoId);
  if (idbDraft?.steps && idbDraft.steps.length > 0) {
    return idbDraft.steps.sort((a, b) => a.stepNumber - b.stepNumber);
  }

  return [];
}

/**
 * Save or update a step
 */
export async function saveStep(demoId: string, step: StepDocument): Promise<void> {
  const cleanStep = {
    ...step,
    updatedAt: Date.now()
  };

  if (db && isFirebaseConfigured()) {
    try {
      await setDoc(doc(db, 'demos', demoId, 'steps', step.id), cleanStep);
      // Update demo stepOrder if not present
      const demo = await getDemo(demoId);
      if (demo && !demo.stepOrder.includes(step.id)) {
        await setDoc(doc(db, 'demos', demoId), {
          stepOrder: [...demo.stepOrder, step.id],
          updatedAt: Date.now()
        }, { merge: true });
      }
      return;
    } catch (e) {
      console.warn('Firestore saveStep failed:', e);
    }
  }

  const stepsRaw = localStorage.getItem(LOCAL_STORAGE_STEPS_KEY);
  const stepsMap: Record<string, StepDocument[]> = stepsRaw ? JSON.parse(stepsRaw) : {};
  const currentList = stepsMap[demoId] || [];
  const existingIdx = currentList.findIndex((s) => s.id === step.id);

  if (existingIdx >= 0) {
    currentList[existingIdx] = cleanStep;
  } else {
    currentList.push(cleanStep);
  }

  stepsMap[demoId] = currentList;
  localStorage.setItem(LOCAL_STORAGE_STEPS_KEY, JSON.stringify(stepsMap));

  // Sync stepOrder
  const demosRaw = localStorage.getItem(LOCAL_STORAGE_DEMOS_KEY);
  const demosMap: Record<string, DemoDocument> = demosRaw ? JSON.parse(demosRaw) : {};
  if (demosMap[demoId]) {
    if (!demosMap[demoId].stepOrder.includes(step.id)) {
      demosMap[demoId].stepOrder.push(step.id);
    }
    demosMap[demoId].updatedAt = Date.now();
    localStorage.setItem(LOCAL_STORAGE_DEMOS_KEY, JSON.stringify(demosMap));
  }

  notifyLocalChange();
}

/**
 * Delete a step
 */
export async function deleteStep(demoId: string, stepId: string): Promise<void> {
  if (db && isFirebaseConfigured()) {
    try {
      await deleteDoc(doc(db, 'demos', demoId, 'steps', stepId));
      const demo = await getDemo(demoId);
      if (demo) {
        await setDoc(doc(db, 'demos', demoId), {
          stepOrder: demo.stepOrder.filter((id) => id !== stepId),
          updatedAt: Date.now()
        }, { merge: true });
      }
      return;
    } catch (e) {
      console.warn('Firestore deleteStep failed:', e);
    }
  }

  const stepsRaw = localStorage.getItem(LOCAL_STORAGE_STEPS_KEY);
  const stepsMap: Record<string, StepDocument[]> = stepsRaw ? JSON.parse(stepsRaw) : {};
  if (stepsMap[demoId]) {
    stepsMap[demoId] = stepsMap[demoId].filter((s) => s.id !== stepId);
    localStorage.setItem(LOCAL_STORAGE_STEPS_KEY, JSON.stringify(stepsMap));
  }

  const demosRaw = localStorage.getItem(LOCAL_STORAGE_DEMOS_KEY);
  const demosMap: Record<string, DemoDocument> = demosRaw ? JSON.parse(demosRaw) : {};
  if (demosMap[demoId]) {
    demosMap[demoId].stepOrder = demosMap[demoId].stepOrder.filter((id) => id !== stepId);
    demosMap[demoId].updatedAt = Date.now();
    localStorage.setItem(LOCAL_STORAGE_DEMOS_KEY, JSON.stringify(demosMap));
  }

  notifyLocalChange();
}

/**
 * Reorder steps
 */
export async function reorderSteps(demoId: string, newStepIds: string[]): Promise<void> {
  const steps = await getSteps(demoId);
  const stepMap = new Map(steps.map((s) => [s.id, s]));

  const updatedSteps: StepDocument[] = [];
  newStepIds.forEach((id, index) => {
    const step = stepMap.get(id);
    if (step) {
      const updated = { ...step, stepNumber: index + 1, updatedAt: Date.now() };
      updatedSteps.push(updated);
    }
  });

  if (db && isFirebaseConfigured()) {
    try {
      await setDoc(doc(db, 'demos', demoId), {
        stepOrder: newStepIds,
        updatedAt: Date.now()
      }, { merge: true });
      for (const step of updatedSteps) {
        await setDoc(doc(db, 'demos', demoId, 'steps', step.id), step);
      }
      return;
    } catch (e) {
      console.warn('Firestore reorderSteps failed:', e);
    }
  }

  const stepsRaw = localStorage.getItem(LOCAL_STORAGE_STEPS_KEY);
  const stepsMap: Record<string, StepDocument[]> = stepsRaw ? JSON.parse(stepsRaw) : {};
  stepsMap[demoId] = updatedSteps;
  localStorage.setItem(LOCAL_STORAGE_STEPS_KEY, JSON.stringify(stepsMap));

  const demosRaw = localStorage.getItem(LOCAL_STORAGE_DEMOS_KEY);
  const demosMap: Record<string, DemoDocument> = demosRaw ? JSON.parse(demosRaw) : {};
  if (demosMap[demoId]) {
    demosMap[demoId].stepOrder = newStepIds;
    demosMap[demoId].updatedAt = Date.now();
    localStorage.setItem(LOCAL_STORAGE_DEMOS_KEY, JSON.stringify(demosMap));
  }

  notifyLocalChange();
}

/**
 * Store / fetch DOM Snapshots
 */
export async function saveDOMSnapshot(demoId: string, stepId: string, snapshot: DOMSnapshot): Promise<string> {
  const localUrl = `local://snapshots/${demoId}/${stepId}`;
  const cleanStepId = stepId.replace(/^local:\/\/snapshots\/[^/]+\//, '').replace(/\.json$/, '');

  // 1. Always cache in high-capacity IndexedDB immediately
  await saveIdbSnapshot(localUrl, snapshot);
  await saveIdbSnapshot(stepId, snapshot);
  if (cleanStepId !== stepId) {
    await saveIdbSnapshot(cleanStepId, snapshot);
  }

  // 2. Dual Concurrent Cloud Sync (Firestore subcollection + Firebase Storage backup)
  if (isFirebaseConfigured()) {
    const rawJson = JSON.stringify(snapshot);
    const isLargePayload = rawJson.length > 800 * 1024; // > 800 KB

    // Save to Firebase Storage as durable master file in background
    if (storage) {
      uploadSnapshotToFirebaseStorage(demoId, cleanStepId, snapshot).catch(() => {});
      if (cleanStepId !== stepId) {
        uploadSnapshotToFirebaseStorage(demoId, stepId, snapshot).catch(() => {});
      }
    }

    // Save to Firestore subcollection for zero-CORS fast sync
    if (db) {
      try {
        if (!isLargePayload) {
          await setDoc(
            doc(db, 'demos', demoId, 'snapshots', cleanStepId),
            { snapshot, updatedAt: Date.now() },
            { merge: true }
          );
        } else {
          // Large payload: write metadata pointer so Incognito pulls from Storage
          await setDoc(
            doc(db, 'demos', demoId, 'snapshots', cleanStepId),
            { hasFullSnapshotInStorage: true, updatedAt: Date.now() },
            { merge: true }
          );
        }
      } catch (e) {
        console.warn('Firestore snapshot sync notice:', e);
      }
    }
  }

  // 4. Try secure Cloud Function presigned upload URL to R2
  const presigned = await callGetPresignedUploadUrl(demoId, stepId);
  if (presigned) {
    try {
      const uploadRes = await fetch(presigned.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(snapshot)
      });
      if (uploadRes.ok) {
        await saveIdbSnapshot(presigned.publicUrl, snapshot);
        return presigned.publicUrl;
      }
    } catch (err) {
      console.warn('Presigned upload failed, saved to IndexedDB:', err);
    }
  }

  // 5. Direct client-side R2 upload fallback (if credentials configured)
  const r2Config = getR2Config();
  if (isR2Configured()) {
    try {
      const r2Url = await uploadDOMSnapshotToR2(r2Config, demoId, stepId, snapshot);
      await saveIdbSnapshot(r2Url, snapshot);
      return r2Url;
    } catch (err) {
      console.warn('Cloudflare R2 snapshot upload failed, saved to IndexedDB:', err);
    }
  }

  return localUrl;
}

export async function getDOMSnapshot(snapshotUrl: string, demoId?: string): Promise<DOMSnapshot | null> {
  if (!snapshotUrl) {
    return null;
  }

  const stepFilename = snapshotUrl.split('/').pop()?.replace('.json', '') || '';
  const cleanStepId = snapshotUrl.replace(/^local:\/\/snapshots\/[^/]+\//, '').replace(/\.json$/, '');

  // 1. Check high-capacity IndexedDB store
  const idbSnap =
    (await getIdbSnapshot(snapshotUrl)) ||
    (cleanStepId ? await getIdbSnapshot(cleanStepId) : null) ||
    (stepFilename ? await getIdbSnapshot(stepFilename) : null);
  if (idbSnap) return idbSnap;

  // 2. Resolve targetDemoId
  let targetDemoId = demoId;
  if (!targetDemoId) {
    const match = snapshotUrl.match(/(?:local:\/\/snapshots\/|snap_)(demo_[^/_]+)/);
    if (match) targetDemoId = match[1];
  }

  // 3. Fetch from Firestore subcollection /demos/{demoId}/snapshots/{stepId}
  // ZERO CORS, instant cross-device and Incognito rehydration!
  if (db && isFirebaseConfigured() && targetDemoId) {
    const searchKeys = [cleanStepId, stepFilename, snapshotUrl].filter(Boolean);
    for (const key of searchKeys) {
      try {
        const snapDoc = await getDoc(doc(db, 'demos', targetDemoId, 'snapshots', key));
        if (snapDoc.exists() && snapDoc.data()?.snapshot) {
          const snap = snapDoc.data().snapshot as DOMSnapshot;
          // Cache in local IndexedDB for fast subsequent renders
          saveIdbSnapshot(snapshotUrl, snap).catch(() => {});
          if (cleanStepId) saveIdbSnapshot(cleanStepId, snap).catch(() => {});
          return snap;
        }
      } catch (e) {
        console.warn('Firestore snapshot getDoc notice:', e);
      }
    }
  }

  // 4. Fetch from Edge CDN / R2 if HTTP URL (for published guides)
  if (snapshotUrl.startsWith('http') && !snapshotUrl.includes('firebasestorage.googleapis.com')) {
    try {
      const res = await fetch(snapshotUrl);
      if (res.ok) {
        const snap = (await res.json()) as DOMSnapshot;
        saveIdbSnapshot(snapshotUrl, snap).catch(() => {});
        return snap;
      }
    } catch {
      // Network fallback
    }
  }

  // 5. Check legacy localStorage fallback
  const snapshotsRaw = localStorage.getItem(LOCAL_STORAGE_SNAPSHOTS_KEY);
  if (snapshotsRaw) {
    try {
      const snapshotsMap: Record<string, DOMSnapshot> = JSON.parse(snapshotsRaw);
      if (snapshotsMap[snapshotUrl]) return snapshotsMap[snapshotUrl];
      if (cleanStepId && snapshotsMap[cleanStepId]) return snapshotsMap[cleanStepId];
      if (stepFilename && snapshotsMap[stepFilename]) return snapshotsMap[stepFilename];
    } catch {}
  }

  // 6. Secondary fallback to Firebase Storage helper
  if (targetDemoId) {
    try {
      const storageSnap = await downloadSnapshotFromFirebaseStorage(targetDemoId, snapshotUrl);
      if (storageSnap) {
        saveIdbSnapshot(snapshotUrl, storageSnap).catch(() => {});
        if (stepFilename) saveIdbSnapshot(stepFilename, storageSnap).catch(() => {});
        return storageSnap as DOMSnapshot;
      }
    } catch (e) {
      console.warn('Firebase Storage draft snapshot fetch notice:', e);
    }
  }

  return null;
}

/**
 * Publish Tour Manifest to R2 (Zero-Database Public Pipeline)
 */
export async function publishDemo(
  demoId: string,
  onProgress?: (percent: number, message: string) => void
): Promise<{ manifestUrl: string; manifest: TourManifest }> {
  onProgress?.(10, 'Loading walkthrough configuration and steps...');
  const demo = await getDemo(demoId);
  if (!demo) throw new Error('Demo not found');

  const steps = await getSteps(demoId);
  if (steps.length === 0) throw new Error('Cannot publish demo without steps');

  onProgress?.(25, 'Ordering steps and verifying navigation flows...');
  // Order steps according to demo.stepOrder
  const orderedSteps: StepDocument[] = [];
  if (demo.stepOrder && demo.stepOrder.length > 0) {
    demo.stepOrder.forEach((id) => {
      const step = steps.find((s) => s.id === id);
      if (step) orderedSteps.push(step);
    });
  } else {
    orderedSteps.push(...steps);
  }

  const stepManifests: StepManifest[] = orderedSteps.map((step, idx) => ({
    stepId: step.id,
    stepIndex: idx,
    title: step.title,
    description: step.description,
    targetSelector: step.targetSelector,
    targetCoordinates: step.targetCoordinates,
    placement: step.placement,
    triggerType: step.triggerType,
    stepType: step.stepType || 'tooltip',
    showBeacon: step.showBeacon !== false,
    showSpotlight: step.showSpotlight === true,
    focusBackdrop: step.focusBackdrop,
    targetHighlight: step.targetHighlight,
    beaconConfig: step.beaconConfig,
    buttonText: step.buttonText,
    buttonLayout: step.buttonLayout,
    showBackButton: step.showBackButton,
    backButtonText: step.backButtonText,
    textAlign: step.textAlign,
    actions: step.actions,
    inputAction: step.inputAction,
    domModifications: step.domModifications,
    autoAdvanceSeconds: step.autoAdvanceSeconds,
    audioUrl: step.audioUrl,
    themeColor: step.themeColor,
    cardStyle: step.cardStyle,
    snapshotUrl: step.snapshotUrl
  }));

  const manifest: TourManifest = {
    version: '1.0.0',
    demoId: demo.id,
    slug: demo.slug,
    title: demo.title,
    description: demo.description,
    coverImageUrl: demo.coverImageUrl,
    isFeatured: demo.isFeatured,
    totalSteps: stepManifests.length,
    theme: demo.theme,
    displayMode: demo.displayMode || 'standard',
    showStepProgress: demo.showStepProgress ?? true,
    allowStepJumping: demo.allowStepJumping ?? true,
    globalDomModifications: demo.globalDomModifications,
    publishedAt: new Date().toISOString(),
    steps: stepManifests
  };

  // Collect all step DOM snapshots (which contain stripped-down HTML, inlined images, & styles)
  const snapshots: Record<string, DOMSnapshot> = {};
  for (let i = 0; i < orderedSteps.length; i++) {
    const step = orderedSteps[i];
    const progressPercent = 30 + Math.round(((i + 1) / orderedSteps.length) * 30);
    onProgress?.(progressPercent, `Packaging DOM snapshot ${i + 1} of ${orderedSteps.length}...`);
    if (step.snapshotUrl) {
      const snap = await getDOMSnapshot(step.snapshotUrl, demoId);
      if (snap) {
        snapshots[step.id] = snap;
      }
    }
  }

  let manifestUrl = '';

  onProgress?.(65, 'Deploying static bundles and snapshots to Cloudflare R2 Edge CDN...');
  // 1. Try secure Firebase Cloud Function server-side publish (uploads snapshots, manifest & edge catalog)
  const fnRes = await callPublishTourManifest(demoId, manifest, snapshots);
  if (fnRes && fnRes.manifestUrl) {
    manifestUrl = fnRes.manifestUrl;
  } else if (isR2Configured()) {
    // 2. Direct client-side R2 upload fallback
    const r2Config = getR2Config();
    const cleanPublicUrl = r2Config.publicUrl.replace(/\/$/, '');
    try {
      // Upload each snapshot to R2
      for (const [stepId, snapObj] of Object.entries(snapshots)) {
        await uploadDOMSnapshotToR2(r2Config, demoId, stepId, snapObj);
      }
      for (const step of stepManifests) {
        step.snapshotUrl = `${cleanPublicUrl}/demos/${demoId}/snapshots/${step.stepId}.json`;
      }
      manifestUrl = await uploadManifestToR2(r2Config, demoId, manifest);
    } catch (err) {
      console.warn('R2 manifest upload failed, using local published route:', err);
    }
  }

  onProgress?.(90, 'Updating Edge directory catalog & locking published state...');

  const vanityPath = demo.slug || demoId;
  if (!manifestUrl) {
    manifestUrl = `${window.location.origin}/view/${vanityPath}`;
  }

  // Update demo document in Firestore/LocalStorage
  await updateDemo(demoId, {
    isPublished: true,
    publishedManifestUrl: manifestUrl
  });

  // Store compiled manifest in local store for instantaneous zero-latency preview
  localStorage.setItem(`manifest_${demoId}`, JSON.stringify(manifest));
  if (demo.slug) {
    localStorage.setItem(`manifest_${demo.slug}`, JSON.stringify(manifest));
  }

  return { manifestUrl, manifest };
}

/**
 * Load static Edge Catalog for Zero-Database Public Portal Landing Page
 */
export async function loadPublicCatalog(): Promise<DemoDocument[]> {
  const r2Config = getR2Config();
  if (r2Config.publicUrl) {
    const catalogUrl = `${r2Config.publicUrl.replace(/\/$/, '')}/demos/catalog.json`;
    try {
      const res = await fetch(catalogUrl);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          return data.map((item: any) => ({
            id: item.id || item.demoId,
            slug: item.slug,
            title: item.title || 'Interactive Guide',
            description: item.description || '',
            coverImageUrl: item.coverImageUrl,
            isFeatured: item.isFeatured,
            tags: item.tags || [],
            stepOrder: item.stepOrder || [],
            createdAt: item.createdAt || Date.now(),
            updatedAt: item.updatedAt || Date.now(),
            isPublished: true,
            publishedManifestUrl: item.manifestUrl
          } as DemoDocument));
        }
      }
    } catch (e) {
      console.warn('Edge catalog fetch notice:', e);
    }
  }

  return [];
}

/**
 * Load static TourManifest for Zero-Database Public Player
 */
export async function loadPublicTourManifest(demoIdOrSlug: string): Promise<TourManifest> {
  // 1. Try local cached manifest
  const localCached = localStorage.getItem(`manifest_${demoIdOrSlug}`);
  if (localCached) {
    try {
      return JSON.parse(localCached);
    } catch {
      // Fallback
    }
  }

  // 2. Try R2 Direct ID URL
  const r2Config = getR2Config();
  if (r2Config.publicUrl) {
    const cleanPublicUrl = r2Config.publicUrl.replace(/\/$/, '');
    const r2ManifestUrl = `${cleanPublicUrl}/demos/${demoIdOrSlug}/manifest.json`;
    try {
      const res = await fetch(r2ManifestUrl);
      if (res.ok) {
        return (await res.json()) as TourManifest;
      }
    } catch {
      // Fallback
    }

    // 3. If accessing by custom slug, resolve against edge catalog.json
    try {
      const catalog = await loadPublicCatalog();
      const match = catalog.find((c) => c.slug === demoIdOrSlug || c.id === demoIdOrSlug);
      if (match) {
        const slugManifestUrl = `${cleanPublicUrl}/demos/${match.id}/manifest.json`;
        const res = await fetch(slugManifestUrl);
        if (res.ok) {
          return (await res.json()) as TourManifest;
        }
      }
    } catch {
      // Fallback
    }
  }

  // 4. Fallback to constructing manifest from local/Firestore store
  const demo = await getDemo(demoIdOrSlug);
  if (!demo) throw new Error(`Walkthrough "${demoIdOrSlug}" not found`);

  const steps = await getSteps(demo.id);
  return {
    version: '1.0.0',
    demoId: demo.id,
    slug: demo.slug,
    title: demo.title,
    description: demo.description,
    coverImageUrl: demo.coverImageUrl,
    isFeatured: demo.isFeatured,
    totalSteps: steps.length,
    theme: demo.theme,
    publishedAt: new Date().toISOString(),
    steps: steps.map((s, idx) => ({
      stepId: s.id,
      stepIndex: idx,
      title: s.title,
      description: s.description,
      targetSelector: s.targetSelector,
      targetCoordinates: s.targetCoordinates,
      placement: s.placement,
      triggerType: s.triggerType,
      stepType: s.stepType || 'tooltip',
      showBeacon: s.showBeacon !== false,
      showSpotlight: s.showSpotlight === true,
      beaconConfig: s.beaconConfig,
      buttonText: s.buttonText,
      showBackButton: s.showBackButton,
      actions: s.actions,
      inputAction: s.inputAction,
      domModifications: s.domModifications,
      autoAdvanceSeconds: s.autoAdvanceSeconds,
      audioUrl: s.audioUrl,
      themeColor: s.themeColor,
      cardStyle: s.cardStyle,
      snapshotUrl: s.snapshotUrl
    }))
  };
}
