import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  Save,
  Globe,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  RefreshCw,
  Eye,
  CheckCircle,
  Share2,
  ExternalLink,
  Code,
  Sliders,
  Maximize2,
  Smartphone,
  Tablet,
  Monitor,
  MousePointer,
  HelpCircle,
  Lock,
  EyeOff,
  Type,
  Volume2,
  Clock,
  Send,
  Shield,
  Layers,
  Info,
  Hand,
  Star,
  Bookmark,
  Palette,
  Compass,
  Undo,
  Redo,
  Layout,
  Sun,
  Moon,
  Droplet,
  Check,
  ZoomIn,
  ZoomOut,
  Settings,
  Image as ImageIcon,
  Upload,
  Video,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  DemoDocument,
  StepDocument,
  StepAction,
  DOMModification,
  DOMSnapshot,
  GlobalStepSettings,
  HotspotPlacement,
  HotspotTriggerType,
  StepElementType,
  FocusBackdropType,
  TargetHighlightType,
  TargetCoordinates,
  rehydrateIframeSnapshot,
  generateCssSelector,
  generateXPath,
  getElementCoordinates,
  computeTooltipPosition,
  computeBeaconPosition,
  computeCardEdgePoint,
  findElementInSnapshot,
  applyDOMModifications,
  simulateTypingInElement
} from '@serverless-tour/common';
import {
  getDemo,
  getSteps,
  saveStep,
  deleteStep,
  reorderSteps,
  getDOMSnapshot,
  saveDOMSnapshot,
  publishDemo,
  unpublishDemo,
  updateDemo,
  saveDemoAndStepsBatch,
  generateSlugFromTitle,
  validateSlug
} from '../../services/demoService';
import { CustomSelect } from '../common/CustomSelect';
import { LabelInput } from '../common/LabelInput';
import { uploadCoverImage } from '../../utils/imageUtils';
import { getLocalUser } from '../../services/firebase';

interface LiveTargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
  isVisible?: boolean;
}

const PRESET_THEME_COLORS = [
  { name: 'RSA Navy', hex: '#0c3c60' },
  { name: 'Royal Blue', hex: '#2563eb' },
  { name: 'Indigo Violet', hex: '#4f46e5' },
  { name: 'Emerald', hex: '#059669' },
  { name: 'Amber Gold', hex: '#d97706' },
  { name: 'Ruby Crimson', hex: '#dc2626' },
  { name: 'Charcoal Slate', hex: '#1e293b' }
];

const createDefaultBlankSnapshot = (stepId: string): DOMSnapshot => ({
  id: `snap_${Date.now()}`,
  stepId,
  url: 'https://navigate.rotaractsouthasia.org',
  title: 'Blank Canvas',
  capturedAt: Date.now(),
  viewport: { width: 1280, height: 800, scrollX: 0, scrollY: 0 },
  styles: [
    `body { margin: 0; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; min-height: 100vh; display: flex; align-items: center; justify-content: center; color: #0f172a; }
    .canvas-card { text-align: center; padding: 48px 32px; border: 2px dashed #cbd5e1; border-radius: 24px; max-width: 520px; background: white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .canvas-title { font-size: 20px; font-weight: 800; color: #0c3c60; margin: 0 0 8px 0; }
    .canvas-desc { font-size: 13px; color: #64748b; margin: 0; line-height: 1.5; }`
  ],
  html: `<!DOCTYPE html><html><head><title>Canvas</title></head><body><div id="starter-canvas-target" class="canvas-card"><h2 class="canvas-title">Interactive Guide Canvas</h2><p class="canvas-desc">Click anywhere to target an element, or use the NAVIGATE Chrome Extension to record live website workflows.</p></div></body></html>`
});

export const StudioEditor: React.FC = () => {
  const { demoId } = useParams<{ demoId: string }>();
  const navigate = useNavigate();

  // State
  const [demo, setDemo] = useState<DemoDocument | null>(null);
  const [steps, setSteps] = useState<StepDocument[]>([]);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [currentSnapshot, setCurrentSnapshot] = useState<DOMSnapshot | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [snapshotLoading, setSnapshotLoading] = useState<boolean>(true);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string>('Initializing Studio Workspace...');
  const [saving, setSaving] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [applyDefaultsToAllExistingSteps, setApplyDefaultsToAllExistingSteps] = useState<boolean>(true);
  const [settingsTab, setSettingsTab] = useState<'general' | 'branding'>('general');
  const [elementDefaultsTab, setElementDefaultsTab] = useState<'tooltip' | 'beacon' | 'modal'>('tooltip');
  const [canvasMode, setCanvasMode] = useState<'target' | 'addStep' | 'domEdit' | 'browse'>('target');
  const [targetFeedback, setTargetFeedback] = useState<string | null>(null);
  const [manualSelectorInput, setManualSelectorInput] = useState<string>('');
  const [canvasViewport, setCanvasViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [viewportScaleMode, setViewportScaleMode] = useState<'fit' | '100'>('fit');
  const canvasOuterRef = useRef<HTMLDivElement | null>(null);
  const [wrapperDimensions, setWrapperDimensions] = useState<{ width: number; height: number }>({ width: 1000, height: 700 });
  const [liveTargetRect, setLiveTargetRect] = useState<LiveTargetRect | null>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'design' | 'advanced'>('content');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);

  // History for Undo/Redo
  const [history, setHistory] = useState<StepDocument[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const skipHistoryRef = useRef<boolean>(false);

  // Drag and Drop state for timeline reordering
  const [draggedStepIndex, setDraggedStepIndex] = useState<number | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{ index: number; position: 'before' | 'after' } | null>(null);
  const draggedIndexRef = useRef<number | null>(null);
  const scrollTargetVelocityRef = useRef<number>(0);
  const scrollCurrentVelocityRef = useRef<number>(0);
  const lastScrollTimeRef = useRef<number>(0);
  const scrollAnimationIdRef = useRef<number | null>(null);
  const timelineContainerRef = useRef<HTMLDivElement | null>(null);

  // DOM Modification Action Modal
  const [selectedDomEl, setSelectedDomEl] = useState<{ selector: string; text: string; element?: HTMLElement } | null>(null);
  const [hoveredPrivacySelector, setHoveredPrivacySelector] = useState<string | null>(null);
  const [newTextValue, setNewTextValue] = useState<string>('');

  // Publish & Test Player State
  const [isOpeningTestPlayer, setIsOpeningTestPlayer] = useState(false);
  const [isConfirmPublishModalOpen, setIsConfirmPublishModalOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState(0);
  const [publishProgressText, setPublishProgressText] = useState('');
  const [publishedUrl, setPublishedUrl] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Append Recording Modal
  const [isAppendRecordModalOpen, setIsAppendRecordModalOpen] = useState(false);
  const [appendTargetUrl, setAppendTargetUrl] = useState('https://my.rotary.org');

  // ResizeObserver for center canvas auto-scaling
  useEffect(() => {
    if (!canvasOuterRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setWrapperDimensions({ width, height });
        }
      }
    });
    observer.observe(canvasOuterRef.current);
    return () => observer.disconnect();
  }, []);

  const targetWidth =
    canvasViewport === 'desktop'
      ? currentSnapshot?.viewport?.width || 1440
      : canvasViewport === 'tablet'
        ? 768
        : 375;

  const targetHeight =
    canvasViewport === 'desktop'
      ? currentSnapshot?.viewport?.height || 900
      : canvasViewport === 'tablet'
        ? 1024
        : 812;

  const fitScale = useMemo(() => {
    const padX = 32;
    const padY = 32;
    const availW = Math.max(300, wrapperDimensions.width - padX);
    const availH = Math.max(300, wrapperDimensions.height - padY);
    const scaleW = availW / targetWidth;
    const scaleH = availH / targetHeight;
    return Math.min(scaleW, scaleH, 1);
  }, [wrapperDimensions, targetWidth, targetHeight]);

  const effectiveScale = viewportScaleMode === 'fit' ? fitScale * zoomLevel : zoomLevel;

  // Unscaled layout coordinate space for canvas overlays (SVG line, beacons, and tooltip)
  // Perfectly matches the iframe's internal dimensions regardless of zoom/scale.
  const canvasContainerWidth = targetWidth;
  const canvasContainerHeight = Math.max(300, targetHeight - (isPreviewMode ? 0 : 32));
  const canvasLayoutSize = useMemo(
    () => ({ width: canvasContainerWidth, height: canvasContainerHeight }),
    [canvasContainerWidth, canvasContainerHeight]
  );

  // Active step
  const activeStep = steps[activeStepIndex] || null;

  // Refs for zero-stale-closure iframe event handlers
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasModeRef = useRef<'target' | 'addStep' | 'domEdit' | 'browse'>(canvasMode);
  const activeStepRef = useRef<StepDocument | null>(activeStep);
  const activeStepIndexRef = useRef<number>(activeStepIndex);
  const stepsRef = useRef<StepDocument[]>(steps);
  const iframeListenersCleanupRef = useRef<(() => void) | null>(null);
  const rafRef = useRef<number | null>(null);
  const loadIdRef = useRef<number>(0);

  // Keep refs synchronized on every state update
  useEffect(() => {
    canvasModeRef.current = canvasMode;
  }, [canvasMode]);

  useEffect(() => {
    activeStepRef.current = activeStep;
    activeStepIndexRef.current = activeStepIndex;
    stepsRef.current = steps;
    if (activeStep) {
      setManualSelectorInput(activeStep.targetSelector || 'body');
    }
  }, [activeStep, activeStepIndex, steps]);

  // Real-time dynamic target tracking on scroll & resize inside the canvas iframe
  const updateTargetCoordinates = useCallback(() => {
    const iframe = iframeRef.current;
    const container = canvasContainerRef.current;
    const currentStep = activeStepRef.current || activeStep;
    if (!iframe || !container || !currentStep) {
      setLiveTargetRect((prev) => (prev ? null : prev));
      return;
    }

    // Modal steps are standalone centered cards — they never anchor to page elements
    if (currentStep.stepType === 'modal') {
      setLiveTargetRect((prev) => (prev ? null : prev));
      return;
    }

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    // Inside the unscaled canvas container, the iframe begins at (0, 0)
    const iframeOriginX = iframe.offsetLeft || 0;
    const iframeOriginY = iframe.offsetTop || 0;

    const win = iframe.contentWindow;
    const scrollY =
      (win && typeof win.scrollY === 'number' && win.scrollY > 0)
        ? win.scrollY
        : doc.scrollingElement?.scrollTop || doc.documentElement?.scrollTop || doc.body?.scrollTop || 0;
    const scrollX =
      (win && typeof win.scrollX === 'number' && win.scrollX > 0)
        ? win.scrollX
        : doc.scrollingElement?.scrollLeft || doc.documentElement?.scrollLeft || doc.body?.scrollLeft || 0;
    const viewportHeight = iframe.clientHeight || window.innerHeight;

    // If no meaningful selector (body/html/empty), check if element can be resolved via coordinates
    const isBodyTarget =
      !currentStep.targetSelector ||
      currentStep.targetSelector === 'body' ||
      currentStep.targetSelector === 'html';

    let targetEl: Element | null = null;
    if (!isBodyTarget) {
      targetEl = findElementInSnapshot(doc, currentStep.targetSelector, currentStep.targetCoordinates);
    } else if (currentStep.targetCoordinates && currentStep.targetCoordinates.x !== undefined) {
      // Auto-heal: If targetSelector was saved as 'body' or blank, locate the element at stored coordinates!
      targetEl = findElementInSnapshot(doc, undefined, currentStep.targetCoordinates);
      if (targetEl && targetEl !== doc.body && targetEl !== doc.documentElement) {
        const healedSelector = generateCssSelector(targetEl);
        if (healedSelector && healedSelector !== 'body' && healedSelector !== 'html') {
          currentStep.targetSelector = healedSelector;
          setSteps((prevSteps) => {
            const copy = [...prevSteps];
            if (copy[activeStepIndexRef.current]) {
              copy[activeStepIndexRef.current] = {
                ...copy[activeStepIndexRef.current],
                targetSelector: healedSelector
              };
            }
            return copy;
          });
          if (demoId) {
            saveStep(demoId, { ...currentStep, targetSelector: healedSelector }).catch(() => {});
          }
        }
      }
    }

    if (targetEl && targetEl !== doc.body && targetEl !== doc.documentElement) {
      const rect = targetEl.getBoundingClientRect();
      const scrollAllowance = 80;
      const isVisible = (rect.top + rect.height) > -scrollAllowance && rect.top < (viewportHeight + scrollAllowance);
      const nextRect = {
        top: rect.top + iframeOriginY,
        left: rect.left + iframeOriginX,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom + iframeOriginY,
        right: rect.right + iframeOriginX,
        isVisible
      };

      // Precision Optimization: only update React state if coordinates actually changed
      // Prevents 60fps component re-render thrashing when idle
      setLiveTargetRect((prev) => {
        if (!prev) return nextRect;
        if (
          Math.abs(prev.top - nextRect.top) < 0.5 &&
          Math.abs(prev.left - nextRect.left) < 0.5 &&
          Math.abs(prev.width - nextRect.width) < 0.5 &&
          Math.abs(prev.height - nextRect.height) < 0.5 &&
          prev.isVisible === nextRect.isVisible
        ) {
          return prev;
        }
        return nextRect;
      });
      return;
    }

    // Coordinate fallback: use stored page-absolute coords, subtract current scroll
    const coords = currentStep.targetCoordinates;
    if (coords && coords.x !== undefined && coords.y !== undefined && coords.width && coords.height) {
      const top = coords.y - scrollY + iframeOriginY;
      const left = coords.x - scrollX + iframeOriginX;
      const scrollAllowance = 80;
      const isVisible = (top + coords.height) > -scrollAllowance && top < (viewportHeight + scrollAllowance);
      const nextRect = {
        top,
        left,
        width: coords.width,
        height: coords.height,
        bottom: top + coords.height,
        right: left + coords.width,
        isVisible
      };

      setLiveTargetRect((prev) => {
        if (!prev) return nextRect;
        if (
          Math.abs(prev.top - nextRect.top) < 0.5 &&
          Math.abs(prev.left - nextRect.left) < 0.5 &&
          Math.abs(prev.width - nextRect.width) < 0.5 &&
          Math.abs(prev.height - nextRect.height) < 0.5 &&
          prev.isVisible === nextRect.isVisible
        ) {
          return prev;
        }
        return nextRect;
      });
    } else {
      // No specific element target — clear the rect cleanly
      setLiveTargetRect((prev) => (prev ? null : prev));
    }
  }, [activeStep]);

  // Keep a ref to the latest updateTargetCoordinates to avoid stale closures in the RAF loop.
  // Declared after useCallback so the initial value is the real function.
  const updateTargetCoordinatesRef = useRef(updateTargetCoordinates);
  useEffect(() => { updateTargetCoordinatesRef.current = updateTargetCoordinates; });

  // 1.3: RAF loop — uses ref to avoid stale closures when activeStep updates mid-tick
  useEffect(() => {
    if (!activeStep) return;

    let running = true;
    const tick = () => {
      if (!running) return;
      updateTargetCoordinatesRef.current();
      rafRef.current = requestAnimationFrame(tick);
    };
    // Short delay to let iframe settle after snapshot write
    const timeout = setTimeout(() => {
      rafRef.current = requestAnimationFrame(tick);
    }, 80);

    return () => {
      running = false;
      clearTimeout(timeout);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [activeStep?.id]); // only restart RAF when the step itself changes, not on every property edit

  // Load demo and steps
  useEffect(() => {
    if (!demoId) return;

    async function loadData() {
      setLoading(true);
      try {
        let d = await getDemo(demoId!);
        let sList = await getSteps(demoId!);

        // If not found in primary store, check local storage directly
        if (!d || sList.length === 0) {
          const rawDemos = localStorage.getItem('serverless_tour_demos_db');
          const rawSteps = localStorage.getItem('serverless_tour_steps_db');
          if (rawDemos) {
            const demosMap = JSON.parse(rawDemos);
            if (demosMap[demoId!]) d = demosMap[demoId!];
          }
          if (rawSteps) {
            const stepsMap = JSON.parse(rawSteps);
            if (stepsMap[demoId!]) sList = stepsMap[demoId!];
          }
        }

        // Request recorded tour or appended steps from the extension if marked or fresh
        const isFromExtension = window.location.search.includes('source=extension') || demoId!.startsWith('demo_rec_');

        if (isFromExtension || sList.length === 0) {
          setSyncStatusMessage('Connecting to extension & importing your guide...');
          // Request recorded data directly from extension content script bridge
          window.postMessage({ type: 'NAVIGATE_STUDIO_REQUEST_RECORDED_TOUR', demoId }, '*');
        } else {
          setSyncStatusMessage('Loading walkthrough details & steps...');
        }

        const authorUser = getLocalUser();
        if (!d) {
          d = {
            id: demoId!,
            title: isFromExtension ? 'Captured Walkthrough' : 'New Interactive Walkthrough',
            description: 'Created with NAVIGATE Studio',
            authorId: authorUser?.uid || 'creator',
            authorEmail: authorUser?.email || '',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            stepOrder: [],
            isPublished: false,
            tags: []
          };
          await updateDemo(demoId!, d);
        } else if (authorUser && d.authorId !== authorUser.uid) {
          d = {
            ...d,
            authorId: authorUser.uid,
            authorEmail: authorUser.email || d.authorEmail
          };
          await updateDemo(demoId!, d);
        }
        setDemo(d);

        // Only insert a starter sample step if this is a fresh manual guide, NOT a recorded walkthrough
        if (sList.length === 0 && !isFromExtension) {
          const initialStepId = `step_${Date.now()}_1`;
          const starterSnapshot = createDefaultBlankSnapshot(initialStepId);
          const savedUrl = await saveDOMSnapshot(demoId!, initialStepId, starterSnapshot);

          const starterStep: StepDocument = {
            id: initialStepId,
            stepNumber: 1,
            title: 'Welcome to the Interactive Guide',
            description: 'Click on any element in the canvas to target it for this step.',
            targetSelector: '#starter-canvas-target',
            targetCoordinates: { x: 380, y: 250, width: 520, height: 200, scrollX: 0, scrollY: 0 },
            placement: 'bottom',
            triggerType: 'click',
            stepType: 'tooltip',
            showBeacon: true,
            buttonText: 'Next Step',
            showBackButton: false,
            snapshotUrl: savedUrl,
            createdAt: Date.now()
          };

          await saveStep(demoId!, starterStep);
          sList = [starterStep];
        }

        if (sList.length > 0) {
          setSteps(sList);
          setHistory([sList]);
          setHistoryIndex(0);
          setActiveStepIndex(0);

          // Auto-repair demo.stepOrder if out of sync with actual step documents
          if (d && (!d.stepOrder || d.stepOrder.length !== sList.length)) {
            d = {
              ...d,
              stepOrder: sList.map((s) => s.id),
              updatedAt: Date.now()
            };
            setDemo(d);
            updateDemo(demoId!, d).catch(() => { });
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadData();

    const handleWindowMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'NAVIGATE_STUDIO_RECORDED_TOUR_RESPONSE' && event.data?.demoId === demoId) {
        const tour = event.data.tourData;
        const isPlaceholderOnly =
          stepsRef.current.length === 1 &&
          (stepsRef.current[0].targetSelector === '#starter-canvas-target' ||
            stepsRef.current[0].title === 'Welcome to the Interactive Guide');

        const isAppend =
          !isPlaceholderOnly &&
          (event.data?.isAppend === true || (stepsRef.current.length > 0 && tour?.steps?.length > 0));

        if (tour) {
          // Always persist any snapshots coming from the extension immediately
          if (tour.snapshots) {
            for (const [sKey, sObj] of Object.entries(tour.snapshots)) {
              saveDOMSnapshot(demoId, sKey, sObj as any).catch(() => {});
            }
          }

          if (tour.steps && tour.steps.length > 0) {
            const existingSteps = isPlaceholderOnly ? [] : stepsRef.current;
            const existingIds = new Set(existingSteps.map((s) => s.id));
            const newSteps = tour.steps.filter((s: StepDocument) => !existingIds.has(s.id));

            // If no new steps to add and steps are already loaded, check if active snapshot needs rehydration
            if (existingSteps.length > 0 && newSteps.length === 0) {
              const activeStepObj = stepsRef.current[activeStepIndexRef.current];
              if (activeStepObj && tour.snapshots) {
                const s =
                  tour.snapshots[activeStepObj.snapshotUrl] ||
                  tour.snapshots[activeStepObj.id] ||
                  Object.values(tour.snapshots)[0];
                if (s && !currentSnapshot) {
                  setCurrentSnapshot(s as any);
                  if (iframeRef.current) {
                    rehydrateIframeSnapshot(iframeRef.current, s as any, { disableNavigation: true });
                  }
                }
              }
              return;
            }

            setSyncStatusMessage('Recorded session received! Updating interactive canvas...');

            let mergedSteps: StepDocument[];
            let targetStepIdx = 0;

            if (existingSteps.length > 0 && isAppend) {
              const numberedNewSteps = newSteps.map((s: StepDocument, i: number) => ({
                ...s,
                stepNumber: existingSteps.length + i + 1
              }));
              mergedSteps = [...existingSteps, ...numberedNewSteps];
              targetStepIdx = existingSteps.length; // Focus on the first newly appended step
            } else {
              mergedSteps = tour.steps.map((s: StepDocument, i: number) => ({ ...s, stepNumber: i + 1 }));
              targetStepIdx = 0;
            }

            // 2. Update demo metadata preserving existing title & description, updating stepOrder
            const currentDemo = (await getDemo(demoId)) || demo;
            const authorUser = getLocalUser();
            const updatedDemo: DemoDocument = {
              ...(currentDemo || tour.demo),
              id: demoId,
              title: currentDemo?.title || tour.demo?.title || 'Interactive Walkthrough',
              description:
                currentDemo?.description ||
                tour.demo?.description ||
                `Captured walkthrough containing ${mergedSteps.length} interactive steps.`,
              authorId: authorUser?.uid || currentDemo?.authorId || 'creator',
              authorEmail: authorUser?.email || currentDemo?.authorEmail || '',
              stepOrder: mergedSteps.map((s) => s.id),
              updatedAt: Date.now()
            };

            setDemo(updatedDemo);
            setSteps(mergedSteps);
            setHistory([mergedSteps]);
            setHistoryIndex(0);
            setActiveStepIndex(targetStepIdx);

            // 3. Persist to Firestore and IndexedDB
            await updateDemo(demoId, updatedDemo);
            for (const st of mergedSteps) {
              await saveStep(demoId, st);
            }

            if (tour.snapshots) {
              const activeStepObj = mergedSteps[targetStepIdx];
              const activeSnapKey = activeStepObj?.snapshotUrl;
              if (activeSnapKey && tour.snapshots[activeSnapKey]) {
                const s = tour.snapshots[activeSnapKey];
                setCurrentSnapshot(s);
                if (iframeRef.current) {
                  rehydrateIframeSnapshot(iframeRef.current, s, { disableNavigation: true });
                }
              }
            }

            // Clean up source=extension from URL without page reload
            if (window.location.search.includes('source=extension')) {
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          }
        }
      }
    };

    window.addEventListener('message', handleWindowMessage);

    return () => {
      window.removeEventListener('message', handleWindowMessage);
    };
  }, [demoId]);

  // Sync active demo with Chrome Extension
  useEffect(() => {
    if (demo) {
      try {
        const activeSummary = {
          id: demo.id,
          title: demo.title || 'Untitled Walkthrough',
          stepCount: steps.length,
          isPublished: !!demo.isPublished,
          updatedAt: demo.updatedAt || Date.now()
        };
        window.postMessage({ type: 'NAVIGATE_STUDIO_ACTIVE_DEMO', activeDemo: activeSummary }, '*');
        localStorage.setItem('navigate_studio_active_demo_cache', JSON.stringify(activeSummary));
      } catch (e) {
        // Safe fallback
      }
    }
  }, [demo?.id, demo?.title, steps.length]);

  // Load snapshot for active step and rehydrate iframe
  useEffect(() => {
    if (!activeStep) {
      setSnapshotLoading(false);
      return;
    }

    let isActive = true;

    async function loadSnapshot() {
      const currentLoadId = ++loadIdRef.current;
      setSnapshotLoading(true);
      setSyncStatusMessage(`Loading Step ${activeStep?.stepNumber || 1}...`);
      try {
        let snap = await getDOMSnapshot(activeStep!.snapshotUrl, demoId, activeStep?.id);
        if (!isActive || loadIdRef.current !== currentLoadId) return;

        // Self-Healing Fallback: If snapshot is missing or corrupted, auto-recover!
        if (!snap) {
          // 1. Try to borrow snapshot from another step in this walkthrough
          for (const otherStep of steps) {
            if (otherStep.id !== activeStep!.id && otherStep.snapshotUrl) {
              snap = await getDOMSnapshot(otherStep.snapshotUrl, demoId, otherStep.id);
              if (snap) break;
            }
          }
          // 2. If no other step has a snapshot, create a clean starter snapshot
          if (!snap) {
            snap = createDefaultBlankSnapshot(activeStep!.id);
          }

          // In-memory recovery: display fallback in canvas without destroying original snapshot reference
        }

        if (snap) {
          setCurrentSnapshot(snap);
          if (iframeRef.current) {
            const allModifications = [
              ...(demo?.globalDomModifications || []),
              ...(activeStep?.domModifications || [])
            ];

            await rehydrateIframeSnapshot(iframeRef.current, snap, {
              disableNavigation: true,
              modifications: allModifications
            });

            if (!isActive || loadIdRef.current !== currentLoadId) return;

            // 1.4: Setup iframe listeners (will be re-attached when canvasMode changes)
            if (iframeListenersCleanupRef.current) {
              iframeListenersCleanupRef.current();
            }
            iframeListenersCleanupRef.current = setupIframeListeners() || null;

            scrollToTarget();
            setTimeout(() => {
              if (loadIdRef.current === currentLoadId) {
                scrollToTarget();
                updateTargetCoordinates();
              }
            }, 60);
            setTimeout(() => {
              if (loadIdRef.current === currentLoadId) {
                scrollToTarget();
                updateTargetCoordinates();
              }
            }, 250);
          }
        }
      } catch (err) {
        console.error('Failed to load snapshot:', err);
      } finally {
        if (loadIdRef.current === currentLoadId) {
          setSnapshotLoading(false);
        }
      }
    }

    loadSnapshot();

    return () => {
      isActive = false;
    };
  }, [activeStep?.id, activeStep?.snapshotUrl]);

  // Fast live update for DOM modifications without re-rendering or flickering the iframe
  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (doc && activeStep) {
      const allMods = [
        ...(demo?.globalDomModifications || []),
        ...(activeStep?.domModifications || [])
      ];
      applyDOMModifications(doc, allMods);
    }
  }, [activeStep?.domModifications, demo?.globalDomModifications]);

  // Highlight hovered privacy modification in the iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    // Remove old highlight
    const oldHighlight = doc.getElementById('navigate-privacy-highlight');
    if (oldHighlight) {
      oldHighlight.remove();
    }

    if (hoveredPrivacySelector) {
      try {
        const el = doc.querySelector(hoveredPrivacySelector);
        if (el) {
          const rect = el.getBoundingClientRect();
          const highlight = doc.createElement('div');
          highlight.id = 'navigate-privacy-highlight';
          highlight.style.position = 'absolute';
          highlight.style.top = `${rect.top + (iframe.contentWindow?.scrollY || 0)}px`;
          highlight.style.left = `${rect.left + (iframe.contentWindow?.scrollX || 0)}px`;
          highlight.style.width = `${rect.width}px`;
          highlight.style.height = `${rect.height}px`;
          highlight.style.border = '2px dashed #f59e0b';
          highlight.style.backgroundColor = 'rgba(245, 158, 11, 0.2)';
          highlight.style.pointerEvents = 'none';
          highlight.style.zIndex = '2147483647';
          highlight.style.transition = 'all 0.2s ease';
          doc.body.appendChild(highlight);

          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } catch (err) {
        console.warn('Invalid selector for privacy highlight:', hoveredPrivacySelector);
      }
    }
  }, [hoveredPrivacySelector, currentSnapshot, activeStep]);

  // 1.4: Re-attach iframe listeners when canvasMode changes so click handlers read current mode
  useEffect(() => {
    if (!iframeRef.current?.contentDocument) return;

    // Clean up previous listeners
    if (iframeListenersCleanupRef.current) {
      iframeListenersCleanupRef.current();
    }

    // Re-attach with current canvasMode
    iframeListenersCleanupRef.current = setupIframeListeners() || null;

    return () => {
      if (iframeListenersCleanupRef.current) {
        iframeListenersCleanupRef.current();
        iframeListenersCleanupRef.current = null;
      }
    };
  }, [canvasMode]);

  // Scroll iframe smoothly to target element
  const scrollToTarget = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe || !activeStep) return;

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    const iframeWin = iframe.contentWindow;
    if (!doc || !iframeWin) return;

    const targetEl = findElementInSnapshot(doc, activeStep.targetSelector, activeStep.targetCoordinates);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    } else if (activeStep.targetCoordinates) {
      // Fallback: scroll to coordinates if element not found by selector
      const coords = activeStep.targetCoordinates;
      const y = Math.max(0, coords.y - iframeWin.innerHeight / 2 + (coords.height || 0) / 2);
      const x = Math.max(0, coords.x - iframeWin.innerWidth / 2 + (coords.width || 0) / 2);
      iframeWin.scrollTo({ top: y, left: x, behavior: 'smooth' });
    }
  }, [activeStep, currentSnapshot]);

  // Setup inspector listeners inside iframe
  const setupIframeListeners = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    let highlightedEl: HTMLElement | null = null;

    const pierceWrapper = (el: HTMLElement, clientX: number, clientY: number): HTMLElement => {
      let current = el;
      const win = doc.defaultView || window;
      const vw = win.innerWidth;
      const vh = win.innerHeight;

      // Drill down up to 5 levels of transparent wrappers
      for (let i = 0; i < 5; i++) {
        if (!current || current === doc.body || current === doc.documentElement) {
          const deepEl = doc.elementFromPoint(clientX, clientY) as HTMLElement | null;
          if (deepEl && deepEl !== current && deepEl !== doc.body && deepEl !== doc.documentElement) {
            current = deepEl;
            continue;
          }
          break;
        }

        const rect = current.getBoundingClientRect();
        // If it covers >90% of the viewport, it's likely a wrapper trap
        if (rect.width >= vw * 0.9 && rect.height >= vh * 0.9) {
          const prev = current.style.pointerEvents;
          current.style.pointerEvents = 'none';
          const deepEl = doc.elementFromPoint(clientX, clientY) as HTMLElement | null;
          current.style.pointerEvents = prev;

          if (deepEl && deepEl !== current && deepEl !== doc.body && deepEl !== doc.documentElement) {
            current = deepEl;
          } else {
            break;
          }
        } else {
          break;
        }
      }
      return current;
    };

    const handleMouseOver = (e: MouseEvent) => {
      let target = e.target as HTMLElement;
      target = pierceWrapper(target, e.clientX, e.clientY);

      if (!target || target === doc.body || target === doc.documentElement) return;

      // Smart semantic resolution: expand to interactive button/link/input if hovering inside
      const interactiveAncestor = target.closest('button, a, input, select, textarea, [role="button"], [role="link"], [role="menuitem"], [role="tab"]') as HTMLElement | null;
      if (interactiveAncestor && interactiveAncestor !== doc.body && interactiveAncestor !== doc.documentElement) {
        target = interactiveAncestor;
      }

      if (highlightedEl && highlightedEl !== target) {
        highlightedEl.classList.remove('tour-element-hovered');
      }
      target.classList.add('tour-element-hovered');
      highlightedEl = target;
    };

    const handleMouseOut = (e: MouseEvent) => {
      let target = e.target as HTMLElement;
      target = pierceWrapper(target, e.clientX, e.clientY);

      if (target) {
        target.classList.remove('tour-element-hovered');
      }
    };

    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      let target = e.target as HTMLElement;
      if (!target) return;

      // CRITICAL: Pierce through any full-screen transparent overlays 
      // (like React roots or modals) to grab the actual interactive element beneath.
      target = pierceWrapper(target, e.clientX, e.clientY);

      if (target === doc.body || target === doc.documentElement) {
        // Truly clicked empty body area - reject for all modes
        setTargetFeedback('⚠️ Clicked empty area. Please click directly on a visible element.');
        setTimeout(() => setTargetFeedback(null), 3000);
        return;
      }

      // Smart semantic resolution: expand to interactive container (button, link, input)
      const interactiveAncestor = target.closest('button, a, input, select, textarea, [role="button"], [role="link"], [role="menuitem"], [role="tab"]') as HTMLElement | null;
      if (interactiveAncestor && interactiveAncestor !== doc.body && interactiveAncestor !== doc.documentElement) {
        target = interactiveAncestor;
      }

      // Read from ref to always get current mode & step without stale closures
      const currentMode = canvasModeRef.current;
      const currentStep = activeStepRef.current;
      const currentIndex = activeStepIndexRef.current;

      // Centered Modal steps have zero page targets — ignore clicks unless explicitly adding a step or editing DOM
      if (currentStep?.stepType === 'modal' && currentMode !== 'addStep' && currentMode !== 'domEdit') {
        return;
      }

      const selector =
        currentMode === 'target' || currentMode === 'addStep'
          ? generateCssSelector(target)
          : `xpath:${generateXPath(target)}`;

      const coords = getElementCoordinates(target);

      // Tag target element in DOM for rock-solid precision
      try {
        target.setAttribute('data-navigate-target', 'true');
      } catch {}

      if (currentMode === 'target') {
        if (!currentStep) return;

        const updatedStep: StepDocument = {
          ...currentStep,
          targetSelector: selector,
          targetCoordinates: coords,
          updatedAt: Date.now()
        };

        const newSteps = [...stepsRef.current];
        newSteps[currentIndex] = updatedStep;

        pushToHistory(newSteps);
        setSteps(newSteps);
        setManualSelectorInput(selector);
        setIsDirty(true);
        setSaveSuccess(false);
        activeStepRef.current = updatedStep;

        // Immediately persist to Firestore in background so changes are never lost
        if (demoId) {
          saveStep(demoId, updatedStep).catch(console.error);
        }

        // Immediately set liveTargetRect from clicked element so tooltip instantly snaps to it.
        // Must translate from iframe-viewport space to canvasContainer-local space.
        const container = canvasContainerRef.current;
        const iframe = iframeRef.current;
        if (container && iframe) {
          const containerRect = container.getBoundingClientRect();
          const iframePageRect = iframe.getBoundingClientRect();
          const iframeOriginX = iframePageRect.left - containerRect.left;
          const iframeOriginY = iframePageRect.top - containerRect.top;
          const rect = target.getBoundingClientRect();
          setLiveTargetRect({
            top: rect.top + iframeOriginY,
            left: rect.left + iframeOriginX,
            width: rect.width,
            height: rect.height,
            bottom: rect.bottom + iframeOriginY,
            right: rect.right + iframeOriginX,
            isVisible: true
          });
        }

        const shortName = selector.split(' > ').pop() || selector;
        setTargetFeedback(`🎯 Target updated: ${shortName}`);
        setTimeout(() => setTargetFeedback(null), 3000);

        setTimeout(updateTargetCoordinates, 30);
      } else if (currentMode === 'addStep') {
        handleCreateStepAtElement(selector, coords);
      } else if (currentMode === 'domEdit') {
        // Reject body/html selectors for privacy modifications
        if (selector === 'body' || selector === 'html') {
          setTargetFeedback('⚠️ Cannot apply privacy rule to the entire page. Click a specific element.');
          setTimeout(() => setTargetFeedback(null), 3000);
          return;
        }
        setSelectedDomEl({
          selector,
          text: target.textContent || '',
          element: target
        });
        setNewTextValue(''); // Clear it so they HAVE to type something new
      }
    };

    doc.addEventListener('mouseover', handleMouseOver);
    doc.addEventListener('mouseout', handleMouseOut);
    doc.addEventListener('click', handleClick, true);

    // Bind native scroll and resize listeners for zero-lag sticky 60fps tracking
    const iframeWin = iframe.contentWindow;
    const handleIframeScrollOrResize = () => {
      updateTargetCoordinatesRef.current();
    };
    if (iframeWin) {
      iframeWin.addEventListener('scroll', handleIframeScrollOrResize, { passive: true });
      iframeWin.addEventListener('resize', handleIframeScrollOrResize, { passive: true });
    }
    doc.addEventListener('scroll', handleIframeScrollOrResize, { passive: true, capture: true });

    return () => {
      doc.removeEventListener('mouseover', handleMouseOver);
      doc.removeEventListener('mouseout', handleMouseOut);
      doc.removeEventListener('click', handleClick, true);
      if (iframeWin) {
        iframeWin.removeEventListener('scroll', handleIframeScrollOrResize);
        iframeWin.removeEventListener('resize', handleIframeScrollOrResize);
      }
      doc.removeEventListener('scroll', handleIframeScrollOrResize, true as any);
    };
  };

  // Create a brand new step anchored directly to a clicked element on screen
  const handleCreateStepAtElement = async (selector: string, coords: TargetCoordinates) => {
    if (!demoId) return;

    const newStepId = `step_${Date.now()}_${steps.length + 1}`;
    const starterSnapshot = currentSnapshot || createDefaultBlankSnapshot(newStepId);
    const snapshotUrl = await saveDOMSnapshot(demoId, newStepId, starterSnapshot);

    const newStep: StepDocument = {
      id: newStepId,
      stepNumber: steps.length + 1,
      title: `Step ${steps.length + 1}`,
      description: 'Add a helpful explanation for this step.',
      targetSelector: selector,
      targetCoordinates: coords,
      placement: 'bottom',
      triggerType: 'click',
      stepType: 'tooltip',
      showBeacon: true,
      buttonText: 'Next Step',
      buttonLayout: 'right',
      showBackButton: true,
      snapshotUrl,
      createdAt: Date.now()
    };

    const updatedSteps = [...steps, newStep];
    setSteps(updatedSteps);
    setActiveStepIndex(updatedSteps.length - 1);
    setCanvasMode('target');
    setIsDirty(true);

    const shortName = selector.split(' > ').pop() || selector;
    setTargetFeedback(`✨ Created Step ${updatedSteps.length} anchored to: ${shortName}!`);
    setTimeout(() => setTargetFeedback(null), 3500);

    await saveStep(demoId, newStep);
    await updateDemo(demoId, {
      stepOrder: updatedSteps.map((s) => s.id)
    });
  };

  // Add DOM Modification (Blur, Hide, Text Rewrite) with immediate iframe update
  const handleAddDomModification = (type: 'blur' | 'hide' | 'replaceText', value?: string) => {
    if (!selectedDomEl || !activeStep) return;

    let desc = selectedDomEl.text.trim();
    if (desc.length > 25) desc = desc.substring(0, 25) + '...';
    if (!desc) {
      if (selectedDomEl.element) {
        const tagName = selectedDomEl.element.tagName.toLowerCase();
        const rawClass = selectedDomEl.element.getAttribute('class') || '';
        const className = typeof rawClass === 'string' ? rawClass.split(' ')[0] : '';
        desc = `<${tagName}${className ? ' class="' + className + '"' : ''}>`;
      } else {
        desc = selectedDomEl.selector.split(' > ').pop() || 'Element';
      }
    }

    const newMod: DOMModification = {
      id: `mod_${Date.now()}`,
      selector: selectedDomEl.selector,
      type,
      value: type === 'replaceText' ? value : undefined,
      elementDescription: desc
    };

    const currentMods = activeStep.domModifications || [];
    const updatedMods = [...currentMods, newMod];

    handleUpdateActiveStep({
      domModifications: updatedMods
    });

    // Apply rules across whole iframe document (preserving global modifications)
    const doc = iframeRef.current?.contentDocument;
    if (doc) {
      const allMods = [
        ...(demo?.globalDomModifications || []),
        ...updatedMods
      ];
      applyDOMModifications(doc, allMods);
    }

    setSelectedDomEl(null);
  };

  const handleRemoveDomModification = (index: number) => {
    if (!activeStep) return;
    const currentMods = activeStep.domModifications || [];
    const updated = currentMods.filter((_, i) => i !== index);
    handleUpdateActiveStep({ domModifications: updated });

    const doc = iframeRef.current?.contentDocument;
    if (doc) {
      const allMods = [
        ...(demo?.globalDomModifications || []),
        ...updated
      ];
      applyDOMModifications(doc, allMods);
    }
  };

  // Undo/Redo logic
  const pushToHistory = (newSteps: StepDocument[]) => {
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false;
      return;
    }
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newSteps);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      skipHistoryRef.current = true;
      setSteps(history[prevIndex]);
      // Also save the reverted step to the backend (or we could wait for manual save)
      const revertedStep = history[prevIndex][activeStepIndex];
      if (revertedStep && demoId) {
        saveStep(demoId, revertedStep).catch(console.error);
      }
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      skipHistoryRef.current = true;
      setSteps(history[nextIndex]);
      // Save restored step
      setIsDirty(true);
    }
  };

  // Update active step locally without firing network requests on every stroke
  const handleUpdateActiveStep = (updates: Partial<StepDocument>) => {
    if (!activeStep) return;

    const updatedStep: StepDocument = {
      ...activeStep,
      ...updates,
      updatedAt: Date.now()
    };

    const newSteps = [...steps];
    newSteps[activeStepIndex] = updatedStep;

    pushToHistory(newSteps);
    setSteps(newSteps);
    setIsDirty(true);
    setSaveSuccess(false);
  };

  // Explicit Save Changes Handler (Zero-Lag Local -> Persisted Store)
  const handleSaveAll = async (overrideSteps?: StepDocument[] | React.MouseEvent) => {
    if (!demoId || !demo) return;
    const stepsToSave = Array.isArray(overrideSteps) ? overrideSteps : steps;
    setSaving(true);
    try {
      // Condense Demo Metadata and ALL Steps into a single O(1) Batch Write
      await saveDemoAndStepsBatch(demoId, {
        title: demo.title,
        description: demo.description,
        slug: demo.slug,
        tags: demo.tags,
        theme: demo.theme,
        coverImageUrl: demo.coverImageUrl,
        isFeatured: demo.isFeatured,
        displayMode: demo.displayMode || 'standard',
        showStepProgress: demo.showStepProgress ?? true,
        allowStepJumping: demo.allowStepJumping ?? true,
        globalDomModifications: demo.globalDomModifications || [],
        defaultStepSettings: demo.defaultStepSettings,
        stepOrder: stepsToSave.map((s) => s.id)
      }, stepsToSave);

      setIsDirty(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to save changes:', err);
    } finally {
      setSaving(false);
    }
  };

  // Zero Auto-Save: Strictly manual save to preserve Firestore write limits
  // Warn user on tab close or navigation if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Add a new step
  const handleAddStep = async () => {
    if (!demoId) return;

    const newStepId = `step_${Date.now()}_${steps.length + 1}`;
    const starterSnapshot = currentSnapshot || createDefaultBlankSnapshot(newStepId);
    const snapshotUrl = await saveDOMSnapshot(demoId, newStepId, starterSnapshot);

    const defaults = demo?.defaultStepSettings;
    const defaultStepType = defaults?.stepType || 'tooltip';
    const themeColor = defaults?.themeColor || demo?.theme?.primaryColor || '#0c3c60';

    let seededPlacement: HotspotPlacement = defaults?.tooltipDefaults?.placement || defaults?.placement || 'bottom';
    let seededCardStyle: 'solid' | 'glass' | 'dark' | 'outline' = defaults?.tooltipDefaults?.cardStyle || defaults?.cardStyle || 'solid';
    let seededFocusBackdrop: FocusBackdropType = defaults?.tooltipDefaults?.focusBackdrop || defaults?.focusBackdrop || 'none';
    let seededTargetHighlight: TargetHighlightType = defaults?.tooltipDefaults?.targetHighlight || defaults?.targetHighlight || 'none';
    let seededShowBeacon = defaults?.tooltipDefaults?.showBeacon !== undefined ? defaults.tooltipDefaults.showBeacon : (defaults?.showBeacon !== undefined ? defaults.showBeacon : true);
    let seededBeaconConfig = defaults?.tooltipDefaults?.beaconConfig ? { ...defaults.tooltipDefaults.beaconConfig } : defaults?.beaconConfig ? { ...defaults.beaconConfig } : undefined;

    if (defaultStepType === 'modal') {
      seededCardStyle = defaults?.modalDefaults?.cardStyle || defaults?.cardStyle || 'solid';
      seededFocusBackdrop = defaults?.modalDefaults?.focusBackdrop || defaults?.focusBackdrop || 'dim';
      seededTargetHighlight = 'none';
      seededShowBeacon = false;
      seededBeaconConfig = undefined;
    } else if (defaultStepType === 'beacon') {
      seededCardStyle = 'solid';
      seededFocusBackdrop = defaults?.beaconDefaults?.focusBackdrop || defaults?.focusBackdrop || 'none';
      seededTargetHighlight = defaults?.beaconDefaults?.targetHighlight || defaults?.targetHighlight || 'none';
      seededShowBeacon = true;
      seededBeaconConfig = {
        alignment: defaults?.beaconDefaults?.alignment || defaults?.beaconConfig?.alignment || 'center',
        style: defaults?.beaconDefaults?.style || defaults?.beaconConfig?.style || 'pulse',
        icon: defaults?.beaconDefaults?.icon !== undefined ? defaults.beaconDefaults.icon : defaults?.beaconConfig?.icon,
        color: defaults?.beaconDefaults?.color || themeColor
      };
    }

    const newStep: StepDocument = {
      id: newStepId,
      stepNumber: steps.length + 1,
      title: `Step ${steps.length + 1}`,
      description: 'Add a helpful explanation for this step.',
      targetSelector: '',
      targetCoordinates: undefined,
      placement: seededPlacement,
      triggerType: 'click',
      stepType: defaultStepType,
      showBeacon: seededShowBeacon,
      beaconConfig: seededBeaconConfig,
      cardStyle: seededCardStyle,
      themeColor,
      focusBackdrop: seededFocusBackdrop,
      targetHighlight: seededTargetHighlight,
      buttonText: 'Next Step',
      buttonLayout: 'right',
      showBackButton: true,
      snapshotUrl,
      createdAt: Date.now()
    };

    const updatedSteps = [...steps, newStep];
    setSteps(updatedSteps);
    setActiveStepIndex(updatedSteps.length - 1);
    setCanvasMode(defaultStepType === 'modal' ? 'browse' : 'target');
    setIsDirty(true);
    setTargetFeedback(defaultStepType === 'modal' ? '✨ Modal step added! Customize your announcement text below.' : '✨ Step added! Click any button, link, or section in the canvas to anchor it.');
    setTimeout(() => setTargetFeedback(null), 4000);

    await saveStep(demoId, newStep);
    await updateDemo(demoId, {
      stepOrder: updatedSteps.map((s) => s.id)
    });
  };

  // Update global default step settings on the demo
  const handleUpdateDefaultStepSettings = (updates: Partial<GlobalStepSettings>) => {
    if (!demo) return;
    const currentDefaults = demo.defaultStepSettings || {};
    const updatedDefaults: GlobalStepSettings = {
      ...currentDefaults,
      ...updates
    };
    setDemo({
      ...demo,
      defaultStepSettings: updatedDefaults,
      theme: updates.themeColor ? { ...demo.theme, primaryColor: updates.themeColor } : demo.theme
    });
    setIsDirty(true);
  };

  // Helper: Apply defaults to any step list in memory
  const applyDefaultsToSteps = (
    inputSteps: StepDocument[],
    defaults: GlobalStepSettings,
    themePrimaryColor?: string
  ): StepDocument[] => {
    if (!defaults || inputSteps.length === 0) return inputSteps;
    const themeColor = defaults.themeColor || themePrimaryColor || '#0c3c60';

    return inputSteps.map((s) => {
      const type = s.stepType || defaults.stepType || 'tooltip';

      if (type === 'modal') {
        const md = defaults.modalDefaults;
        return {
          ...s,
          themeColor,
          cardStyle: md?.cardStyle || defaults.cardStyle || s.cardStyle || 'solid',
          focusBackdrop: md?.focusBackdrop !== undefined ? md.focusBackdrop : (defaults.focusBackdrop !== undefined ? defaults.focusBackdrop : s.focusBackdrop)
        };
      } else if (type === 'beacon') {
        const bd = defaults.beaconDefaults;
        return {
          ...s,
          themeColor,
          targetHighlight: bd?.targetHighlight !== undefined ? bd.targetHighlight : (defaults.targetHighlight !== undefined ? defaults.targetHighlight : s.targetHighlight),
          focusBackdrop: bd?.focusBackdrop !== undefined ? bd.focusBackdrop : (defaults.focusBackdrop !== undefined ? defaults.focusBackdrop : s.focusBackdrop),
          beaconConfig: {
            ...s.beaconConfig,
            alignment: bd?.alignment || defaults.beaconConfig?.alignment || s.beaconConfig?.alignment || 'center',
            style: bd?.style || defaults.beaconConfig?.style || s.beaconConfig?.style || 'pulse',
            icon: bd?.icon !== undefined ? bd.icon : (defaults.beaconConfig?.icon !== undefined ? defaults.beaconConfig.icon : s.beaconConfig?.icon),
            color: bd?.color || themeColor
          }
        };
      } else { // tooltip
        const td = defaults.tooltipDefaults;
        return {
          ...s,
          themeColor,
          cardStyle: td?.cardStyle || defaults.cardStyle || s.cardStyle || 'solid',
          placement: s.placement || td?.placement || defaults.placement || 'bottom',
          targetHighlight: td?.targetHighlight !== undefined ? td.targetHighlight : (defaults.targetHighlight !== undefined ? defaults.targetHighlight : s.targetHighlight),
          focusBackdrop: td?.focusBackdrop !== undefined ? td.focusBackdrop : (defaults.focusBackdrop !== undefined ? defaults.focusBackdrop : s.focusBackdrop),
          showBeacon: td?.showBeacon !== undefined ? td.showBeacon : (defaults.showBeacon !== undefined ? defaults.showBeacon : s.showBeacon),
          beaconConfig: {
            ...s.beaconConfig,
            alignment: td?.beaconConfig?.alignment || defaults.beaconConfig?.alignment || s.beaconConfig?.alignment || 'center',
            style: td?.beaconConfig?.style || defaults.beaconConfig?.style || s.beaconConfig?.style || 'pulse',
            icon: td?.beaconConfig?.icon !== undefined ? td.beaconConfig.icon : s.beaconConfig?.icon,
            color: td?.beaconConfig?.color || themeColor
          }
        };
      }
    });
  };

  // Bulk-apply default step settings across all existing steps intelligently by stepType
  const handleApplyDefaultsToAllSteps = () => {
    const defaults = demo?.defaultStepSettings;
    if (!defaults || steps.length === 0) return;

    const updatedSteps = applyDefaultsToSteps(steps, defaults, demo?.theme?.primaryColor);
    setSteps(updatedSteps);
    setIsDirty(true);
    setTargetFeedback(`✨ Successfully applied design defaults to all ${steps.length} steps!`);
    setTimeout(() => setTargetFeedback(null), 4000);
  };

  // Delete a step
  const handleDeleteStep = async (stepId: string) => {
    if (!demoId || steps.length <= 1) return;

    const filtered = steps.filter((s) => s.id !== stepId);
    // Resequence step numbers so they remain contiguous after deletion
    const updatedSteps = filtered.map((s, idx) => ({ ...s, stepNumber: idx + 1 }));
    const deletedIdx = steps.findIndex((s) => s.id === stepId);
    let newIndex = activeStepIndex;
    if (deletedIdx === activeStepIndex) {
      newIndex = Math.min(activeStepIndex, updatedSteps.length - 1);
    } else if (deletedIdx < activeStepIndex) {
      newIndex = activeStepIndex - 1;
    }
    setSteps(updatedSteps);
    setActiveStepIndex(Math.max(0, newIndex));
    setIsDirty(true);

    await deleteStep(demoId, stepId);
    await updateDemo(demoId, {
      stepOrder: updatedSteps.map((s) => s.id)
    });
  };

  // Duplicate a step
  const handleDuplicateStep = async (indexToDup?: number) => {
    if (!demoId) return;
    const targetIdx = indexToDup !== undefined ? indexToDup : activeStepIndex;
    const stepToDup = steps[targetIdx];
    if (!stepToDup) return;

    const newStepId = `step_${Date.now()}_dup`;
    const insertPosition = targetIdx + 1;
    const duplicatedStep: StepDocument = {
      ...stepToDup,
      id: newStepId,
      stepNumber: insertPosition + 1, // will be resequenced below
      title: `${stepToDup.title} (Copy)`,
      createdAt: Date.now()
    };

    // Clone snapshot into a new independent key so the copy doesn't share with the original
    try {
      const originalSnap = await getDOMSnapshot(stepToDup.snapshotUrl, demoId, stepToDup.id);
      if (originalSnap) {
        const clonedSnap = { ...originalSnap, id: `snap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}` };
        const newSnapshotUrl = await saveDOMSnapshot(demoId, newStepId, clonedSnap);
        duplicatedStep.snapshotUrl = newSnapshotUrl;
      }
    } catch (e) {
      console.warn('[NAVIGATE] Snapshot clone notice:', e);
    }

    const inserted = [...steps];
    inserted.splice(insertPosition, 0, duplicatedStep);
    // Resequence so step numbers remain contiguous after insertion
    const updatedSteps = inserted.map((s, idx) => ({ ...s, stepNumber: idx + 1 }));
    setSteps(updatedSteps);
    setActiveStepIndex(insertPosition);
    setIsDirty(true);

    await saveStep(demoId, updatedSteps[insertPosition]);
    await updateDemo(demoId, {
      stepOrder: updatedSteps.map((s) => s.id)
    });
  };

  // Move step left/right (or up/down)
  const handleMoveStep = async (fromIndex: number, delta: number) => {
    const toIndex = fromIndex + delta;
    if (!demoId || toIndex < 0 || toIndex >= steps.length) return;

    const reordered = [...steps];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    const updated = reordered.map((s, idx) => ({ ...s, stepNumber: idx + 1 }));

    setSteps(updated);
    setActiveStepIndex(toIndex);
    setIsDirty(true);

    reorderSteps(
      demoId,
      updated.map((s) => s.id)
    ).catch(console.warn);
  };

  // High-Precision Physics-Based Smooth Horizontal Auto-Scrolling Engine (Time/Delta Normalized)
  const startScrollLoop = useCallback(() => {
    if (scrollAnimationIdRef.current !== null) return;
    lastScrollTimeRef.current = performance.now();

    const scrollStep = (now: number) => {
      const deltaMs = Math.min(now - lastScrollTimeRef.current, 50);
      lastScrollTimeRef.current = now;
      const deltaSeconds = deltaMs / 1000;

      // Exponential smoothing (lerp) toward target velocity for natural acceleration and deceleration
      const lerpFactor = Math.min(1, deltaSeconds * 14);
      scrollCurrentVelocityRef.current += (scrollTargetVelocityRef.current - scrollCurrentVelocityRef.current) * lerpFactor;

      if (Math.abs(scrollCurrentVelocityRef.current) > 2 && timelineContainerRef.current) {
        timelineContainerRef.current.scrollLeft += scrollCurrentVelocityRef.current * deltaSeconds;
        scrollAnimationIdRef.current = requestAnimationFrame(scrollStep);
      } else {
        scrollCurrentVelocityRef.current = 0;
        if (scrollTargetVelocityRef.current === 0) {
          if (scrollAnimationIdRef.current !== null) {
            cancelAnimationFrame(scrollAnimationIdRef.current);
            scrollAnimationIdRef.current = null;
          }
        } else {
          scrollAnimationIdRef.current = requestAnimationFrame(scrollStep);
        }
      }
    };

    scrollAnimationIdRef.current = requestAnimationFrame(scrollStep);
  }, []);

  const stopScrollLoop = useCallback(() => {
    scrollTargetVelocityRef.current = 0;
    scrollCurrentVelocityRef.current = 0;
    if (scrollAnimationIdRef.current !== null) {
      cancelAnimationFrame(scrollAnimationIdRef.current);
      scrollAnimationIdRef.current = null;
    }
  }, []);

  const checkTimelineAutoScroll = useCallback((clientX: number) => {
    if (!timelineContainerRef.current) return;
    const { left, right, width } = timelineContainerRef.current.getBoundingClientRect();
    // Wide acceleration zone (260px or 40% of container width)
    const scrollThreshold = Math.min(260, width * 0.4);

    if (clientX < left + scrollThreshold) {
      // Left side: distIntoZone increases as cursor approaches or passes beyond left edge
      const distIntoZone = (left + scrollThreshold) - clientX;
      const proximity = Math.max(0.05, distIntoZone / scrollThreshold);
      // Smooth exponential curve: starts at ~140px/s and ramps smoothly up to ~2200px/s at extreme left
      const targetSpeed = Math.round(140 + Math.pow(proximity, 1.65) * 1600);
      scrollTargetVelocityRef.current = -targetSpeed;
      startScrollLoop();
    } else if (clientX > right - scrollThreshold) {
      // Right side: distIntoZone increases as cursor approaches or passes beyond right edge
      const distIntoZone = clientX - (right - scrollThreshold);
      const proximity = Math.max(0.05, distIntoZone / scrollThreshold);
      const targetSpeed = Math.round(140 + Math.pow(proximity, 1.65) * 1600);
      scrollTargetVelocityRef.current = targetSpeed;
      startScrollLoop();
    } else {
      scrollTargetVelocityRef.current = 0;
    }
  }, [startScrollLoop]);

  // Global dragover capture to ensure auto-scroll never stalls if cursor drifts slightly above bottom bar
  useEffect(() => {
    if (draggedStepIndex === null) return;

    const handleGlobalDragOver = (e: DragEvent) => {
      checkTimelineAutoScroll(e.clientX);
    };

    window.addEventListener('dragover', handleGlobalDragOver);
    return () => {
      window.removeEventListener('dragover', handleGlobalDragOver);
    };
  }, [draggedStepIndex, checkTimelineAutoScroll]);

  // Clean up auto-scroll animation loop on unmount
  useEffect(() => {
    return () => {
      stopScrollLoop();
    };
  }, [stopScrollLoop]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedStepIndex(index);
    draggedIndexRef.current = index;
    setDragOverTarget(null);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragEnd = useCallback(() => {
    setDraggedStepIndex(null);
    draggedIndexRef.current = null;
    setDragOverTarget(null);
    stopScrollLoop();
  }, [stopScrollLoop]);

  const executeStepReorder = useCallback((fromIndex: number, targetIndex: number, position: 'before' | 'after') => {
    if (!demoId || fromIndex < 0 || fromIndex >= steps.length || targetIndex < 0 || targetIndex >= steps.length) {
      return;
    }

    let destinationIndex = position === 'before' ? targetIndex : targetIndex + 1;
    if (fromIndex < destinationIndex) {
      destinationIndex -= 1;
    }

    destinationIndex = Math.max(0, Math.min(destinationIndex, steps.length - 1));

    if (fromIndex === destinationIndex) {
      return;
    }

    const reordered = [...steps];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(destinationIndex, 0, moved);

    const updated = reordered.map((s, idx) => ({ ...s, stepNumber: idx + 1 }));
    setSteps(updated);
    setActiveStepIndex(destinationIndex);
    setIsDirty(true);

    reorderSteps(
      demoId,
      updated.map((s) => s.id)
    ).catch(console.warn);
  }, [demoId, steps]);

  const handleCardDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    checkTimelineAutoScroll(e.clientX);

    const fromIdx = draggedIndexRef.current ?? draggedStepIndex;
    if (fromIdx === null) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const midpoint = rect.left + rect.width / 2;
    const position: 'before' | 'after' = e.clientX < midpoint ? 'before' : 'after';

    setDragOverTarget({ index, position });
  };

  const handleCardDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();

    const dataIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    const fromIdx = draggedIndexRef.current ?? (draggedStepIndex !== null ? draggedStepIndex : dataIndex);
    const currentTarget = dragOverTarget;
    handleDragEnd();

    if (isNaN(fromIdx) || fromIdx < 0 || fromIdx >= steps.length) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const midpoint = rect.left + rect.width / 2;
    const position = currentTarget?.index === index ? currentTarget.position : (e.clientX < midpoint ? 'before' : 'after');

    executeStepReorder(fromIdx, index, position);
  };

  const handleTimelineDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    checkTimelineAutoScroll(e.clientX);
  };

  const handleTimelineDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const dataIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    const fromIdx = draggedIndexRef.current ?? (draggedStepIndex !== null ? draggedStepIndex : dataIndex);
    const currentTarget = dragOverTarget;
    handleDragEnd();

    if (isNaN(fromIdx) || fromIdx < 0 || fromIdx >= steps.length) return;

    if (currentTarget) {
      executeStepReorder(fromIdx, currentTarget.index, currentTarget.position);
    } else {
      executeStepReorder(fromIdx, steps.length - 1, 'after');
    }
  };

  // Live in-editor testing of form typing simulation
  const handleTestTyping = () => {
    const iframe = iframeRef.current;
    if (!iframe || !activeStep?.inputAction?.textToType) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    const targetEl = findElementInSnapshot(doc, activeStep.targetSelector, activeStep.targetCoordinates);
    const isTextInput =
      targetEl &&
      (targetEl.tagName === 'INPUT' ||
        targetEl.tagName === 'TEXTAREA' ||
        Boolean((targetEl as HTMLElement).isContentEditable));

    if (targetEl && isTextInput) {
      simulateTypingInElement(targetEl as any, activeStep.inputAction.textToType, activeStep.inputAction.typingSpeedMs || 45);
    } else {
      alert('Target element is not an input box. Select a text input or textarea on the canvas to test typing simulation.');
    }
  };

  // Test Player Handler (Provides instant visual feedback & saves changes first if dirty)
  const handleTestPlayer = async () => {
    if (isOpeningTestPlayer) return;
    setIsOpeningTestPlayer(true);
    try {
      if (isDirty) {
        await handleSaveAll();
      }
      window.open(`/${demo?.slug || demoId}?preview=true`, '_blank');
    } catch (err) {
      console.error('Failed to open test player:', err);
    } finally {
      // Keep loading badge visible briefly to prevent jumpy layout if pop-up opens instantly
      setTimeout(() => {
        setIsOpeningTestPlayer(false);
      }, 500);
    }
  };

  // Revert published walkthrough back to Draft mode
  const handleUnpublish = async () => {
    if (!demoId) return;
    if (!window.confirm('Are you sure you want to unpublish this walkthrough and revert it to Draft? It will no longer appear on the public directory.')) return;
    try {
      await unpublishDemo(demoId);
      setDemo((prev) => (prev ? { ...prev, isPublished: false, publishedManifestUrl: undefined } : prev));
      setPublishedUrl('');
    } catch (err: any) {
      alert(err.message || 'Failed to unpublish walkthrough');
    }
  };

  // 2.2: Keyboard Shortcuts (Cmd+S / Ctrl+S for Save, Cmd+Z for Undo/Redo, Cmd+D Duplicate)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input, textarea, select, or contenteditable element
      const target = e.target as HTMLElement | null;
      if (
        !target ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable ||
        (target.closest && Boolean(target.closest('input, textarea, select, [contenteditable="true"]')))
      ) {
        return;
      }

      if (e.key === 'Escape') {
        if (isSettingsModalOpen) setIsSettingsModalOpen(false);
        if (isConfirmPublishModalOpen) setIsConfirmPublishModalOpen(false);
        if (isPublishModalOpen) setIsPublishModalOpen(false);
        if (isAppendRecordModalOpen) setIsAppendRecordModalOpen(false);
        if (selectedDomEl) setSelectedDomEl(null);
        if (canvasMode !== 'browse') setCanvasMode('browse');
        return;
      }

      const hasModifier = e.ctrlKey || e.metaKey;

      if (hasModifier && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleRedo();
      } else if (hasModifier && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (hasModifier && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveAll();
      } else if (hasModifier && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDuplicateStep();
      } else if (hasModifier && (e.key === 'Backspace' || e.key === 'Delete')) {
        if (activeStep && steps.length > 1) {
          e.preventDefault();
          handleDeleteStep(activeStep.id);
        }
      } else if (!hasModifier && !e.altKey) {
        if (e.key.toLowerCase() === 't') {
          setCanvasMode('target');
        } else if (e.key.toLowerCase() === 'd') {
          setCanvasMode('domEdit');
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (activeStepIndex > 0) setActiveStepIndex(activeStepIndex - 1);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (activeStepIndex < steps.length - 1) setActiveStepIndex(activeStepIndex + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isSettingsModalOpen, isConfirmPublishModalOpen, isPublishModalOpen, isAppendRecordModalOpen,
    selectedDomEl, canvasMode, history, historyIndex, handleUndo, handleRedo, handleDuplicateStep,
    handleDeleteStep, activeStep, steps.length, activeStepIndex
  ]);

  // Add custom action button
  const handleAddActionButton = () => {
    if (!activeStep) return;
    const currentActions = activeStep.actions || [];
    const newAction: StepAction = {
      id: `act_${Date.now()}`,
      label: 'Explore Section',
      actionType: 'next',
      style: 'primary'
    };
    handleUpdateActiveStep({ actions: [...currentActions, newAction] });
  };

  const handleUpdateActionButton = (index: number, updates: Partial<StepAction>) => {
    if (!activeStep) return;
    const currentActions = activeStep.actions || [];
    const updated = [...currentActions];
    updated[index] = { ...updated[index], ...updates };
    handleUpdateActiveStep({ actions: updated });
  };

  const handleRemoveActionButton = (index: number) => {
    if (!activeStep) return;
    const currentActions = activeStep.actions || [];
    const updated = currentActions.filter((_, i) => i !== index);
    handleUpdateActiveStep({ actions: updated });
  };

  // Open Double-Confirmation Modal
  const handlePublishClick = async () => {
    if (!demoId) return;
    if (isDirty) {
      await handleSaveAll();
    }
    setIsConfirmPublishModalOpen(true);
  };

  // Execute Publish to Edge CDN with Screen-Locking Progress
  const executePublish = async () => {
    if (!demoId) return;
    setIsConfirmPublishModalOpen(false);
    setPublishing(true);
    setPublishProgress(10);
    setPublishProgressText('Initializing compilation & verifying step configurations...');

    try {
      await publishDemo(demoId, (percent, msg) => {
        setPublishProgress(percent);
        setPublishProgressText(msg);
      });
      const publicLiveUrl = `${window.location.origin}/${demo?.slug || demoId}`;
      setPublishedUrl(publicLiveUrl);
      setPublishProgress(100);
      setPublishProgressText('Complete! Your guide is live worldwide.');
      setTimeout(() => {
        setPublishing(false);
        try {
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        } catch (e) { }
      }, 400);
    } catch (err: any) {
      alert(err.message || 'Failed to publish walkthrough');
      setPublishing(false);
    }
  };

  // Cover Image WebP Upload Handler
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !demoId || !demo) return;
    setUploadingCover(true);
    try {
      const coverUrl = await uploadCoverImage(demoId, file);
      setDemo({ ...demo, coverImageUrl: coverUrl });
      setIsDirty(true);
    } catch (err: any) {
      alert('Failed to process/upload cover image: ' + (err.message || err));
    } finally {
      setUploadingCover(false);
    }
  };

  // Calculate live Tooltip position inside the canvas iframe
  // 1.2: canvasContainerSize is now measured dynamically via ResizeObserver (see state above)
  const targetRectForTooltip = liveTargetRect || {
    top: 150,
    left: 150,
    width: 200,
    height: 60,
    bottom: 210,
    right: 350
  };

  const globalDefaults = demo?.defaultStepSettings;
  const currentStepType = activeStep?.stepType || globalDefaults?.stepType || 'tooltip';

  const isModalMode = currentStepType === 'modal';
  const isBeaconOnlyMode = currentStepType === 'beacon';
  const showTooltip = !isBeaconOnlyMode && !isModalMode;

  const td = globalDefaults?.tooltipDefaults;
  const bd = globalDefaults?.beaconDefaults;
  const md = globalDefaults?.modalDefaults;

  const focusBackdrop: FocusBackdropType =
    activeStep?.focusBackdrop ||
    (currentStepType === 'modal'
      ? md?.focusBackdrop
      : currentStepType === 'beacon'
      ? bd?.focusBackdrop
      : td?.focusBackdrop) ||
    globalDefaults?.focusBackdrop ||
    (activeStep?.showSpotlight || activeStep?.stepType === 'spotlight' ? 'dim' : 'none');

  const targetHighlight: TargetHighlightType =
    activeStep?.targetHighlight ||
    (currentStepType === 'beacon'
      ? bd?.targetHighlight
      : td?.targetHighlight) ||
    globalDefaults?.targetHighlight ||
    (focusBackdrop !== 'none' ? 'solid' : 'none');

  const showBeacon =
    currentStepType === 'beacon' ||
    (currentStepType === 'tooltip' &&
      (activeStep?.showBeacon !== undefined
        ? activeStep.showBeacon
        : td?.showBeacon !== undefined
        ? td.showBeacon
        : globalDefaults?.showBeacon !== undefined
        ? globalDefaults.showBeacon
        : true));

  const beaconAlignment =
    activeStep?.beaconConfig?.alignment ||
    (currentStepType === 'beacon'
      ? bd?.alignment
      : td?.beaconConfig?.alignment) ||
    globalDefaults?.beaconConfig?.alignment ||
    'center';

  const beaconStyle =
    activeStep?.beaconConfig?.style ||
    (currentStepType === 'beacon'
      ? bd?.style
      : td?.beaconConfig?.style) ||
    globalDefaults?.beaconConfig?.style ||
    'pulse';

  const beaconIcon =
    activeStep?.beaconConfig?.icon !== undefined
      ? activeStep.beaconConfig.icon
      : currentStepType === 'beacon'
      ? bd?.icon
      : td?.beaconConfig?.icon !== undefined
      ? td.beaconConfig.icon
      : globalDefaults?.beaconConfig?.icon;

  const tooltipPlacement =
    activeStep?.placement ||
    td?.placement ||
    globalDefaults?.placement ||
    'bottom';

  const tooltipPosition = computeTooltipPosition(
    targetRectForTooltip,
    canvasLayoutSize,
    tooltipPlacement,
    { width: 340, height: 190 },
    26,
    beaconAlignment
  );

  // Active theme styling
  const themeColor =
    activeStep?.themeColor ||
    globalDefaults?.themeColor ||
    demo?.theme?.primaryColor ||
    '#0c3c60';

  const cardStyle =
    activeStep?.cardStyle ||
    (currentStepType === 'modal' ? md?.cardStyle : td?.cardStyle) ||
    globalDefaults?.cardStyle ||
    'solid'; // 'solid' | 'glass' | 'dark' | 'outline'

  const beaconColor =
    activeStep?.beaconConfig?.color ||
    (currentStepType === 'beacon' ? bd?.color : td?.beaconConfig?.color) ||
    globalDefaults?.beaconConfig?.color ||
    themeColor;

  const renderBeaconIcon = (iconName?: string) => {
    switch (iconName) {
      case 'question':
        return <HelpCircle className="w-3.5 h-3.5" />;
      case 'info':
        return <Info className="w-3.5 h-3.5" />;
      case 'hand':
        return <Hand className="w-3.5 h-3.5" />;
      case 'plus':
        return <Plus className="w-3.5 h-3.5" />;
      case 'star':
        return <Star className="w-3.5 h-3.5" />;
      default:
        return <div className="w-2 h-2 rounded-full bg-white animate-ping" />;
    }
  };

  const renderBeaconControls = () => {
    if (!activeStep) return null;
    return (
      <div className="pt-2 border-t border-slate-200 space-y-2.5">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
              Beacon Placement
            </label>
            <span className="text-[10px] text-slate-500 font-mono capitalize">
              {activeStep.beaconConfig?.alignment || 'center'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border border-slate-200 text-center font-bold">
            {(['left', 'center', 'right'] as const).map((al) => (
              <button
                key={al}
                type="button"
                onClick={() =>
                  handleUpdateActiveStep({
                    beaconConfig: { ...activeStep.beaconConfig, alignment: al }
                  })
                }
                className={`py-1 rounded-lg text-[10px] font-bold capitalize transition-colors cursor-pointer ${(activeStep.beaconConfig?.alignment || 'center') === al
                    ? 'bg-[#0c3c60] text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                  }`}
              >
                {al}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
              Beacon Style
            </label>
            <span className="text-[10px] text-slate-500 font-mono capitalize">
              {activeStep.beaconConfig?.style || 'pulse'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border border-slate-200 text-center font-bold">
            {(['pulse', 'dot', 'icon'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() =>
                  handleUpdateActiveStep({
                    beaconConfig: { ...activeStep.beaconConfig, style: st }
                  })
                }
                className={`py-1 rounded-lg text-[10px] font-bold capitalize transition-colors cursor-pointer ${(activeStep.beaconConfig?.style || 'pulse') === st
                    ? 'bg-[#0c3c60] text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                  }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {activeStep.beaconConfig?.style === 'icon' && (
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
              Beacon Icon
            </label>
            <div className="grid grid-cols-5 gap-1 bg-white p-1 rounded-xl border border-slate-200">
              {(['question', 'info', 'hand', 'plus', 'star'] as const).map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() =>
                    handleUpdateActiveStep({
                      beaconConfig: { ...activeStep.beaconConfig, icon: ic }
                    })
                  }
                  className={`p-1.5 rounded-lg border text-center font-bold transition-colors cursor-pointer ${activeStep.beaconConfig?.icon === ic
                      ? 'border-blue-600 bg-blue-50 text-[#0c3c60]'
                      : 'border-transparent text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  {ic === 'question' && '?'}
                  {ic === 'info' && 'i'}
                  {ic === 'hand' && '👆'}
                  {ic === 'plus' && '+'}
                  {ic === 'star' && '★'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="flex flex-col items-center gap-3 p-8 bg-white border border-slate-200 rounded-3xl shadow-xl w-80">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-[#0c3c60] flex items-center justify-center animate-spin mb-2">
            <Compass className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-800 text-center">{syncStatusMessage || 'Initializing Studio Workspace...'}</p>
          <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden relative">
            <div className="absolute top-0 left-0 h-full bg-[#0c3c60] rounded-full w-1/2 animate-[pulse_1s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen max-h-screen bg-slate-100 text-slate-900 flex flex-col overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Studio Header Bar */}
      <header className="h-14 bg-white border-b border-slate-200 px-5 flex items-center justify-between z-30 shrink-0 shadow-2xs">
        {/* Left: Navigation, Title & Guide Settings Trigger */}
        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors border border-slate-200"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={demo?.title || ''}
              onChange={(e) => {
                const newTitle = e.target.value;
                if (demo) {
                  const currentAutoSlug = generateSlugFromTitle(demo.title);
                  const shouldAutoUpdateSlug = !demo.slug || demo.slug === currentAutoSlug;
                  setDemo({
                    ...demo,
                    title: newTitle,
                    slug: shouldAutoUpdateSlug ? generateSlugFromTitle(newTitle) : demo.slug
                  });
                }
                setIsDirty(true);
              }}
              placeholder="Walkthrough Title (e.g. Club Invoices)..."
              className="font-extrabold text-sm text-slate-900 bg-slate-50 hover:bg-white focus:bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 focus:border-[#0c3c60] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all min-w-[220px] max-w-xs sm:max-w-sm"
            />

            {/* Guide Settings Modal Trigger */}
            <button
              onClick={() => {
                setElementDefaultsTab((demo?.defaultStepSettings?.stepType as any) || 'tooltip');
                setIsSettingsModalOpen(true);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 border border-slate-200 transition-colors cursor-pointer"
              title="Configure Overall Guide Settings & Custom URL"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Guide Settings</span>
            </button>
          </div>
        </div>

        {/* Right: Explicit Save Button, Viewport Switcher, Test & Publish Actions */}
        <div className="flex items-center gap-2.5">
          {/* Explicit Save Changes Button */}
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${saving
                ? 'bg-slate-100 text-slate-500 border border-slate-200'
                : saveSuccess
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                  : isDirty
                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/25 ring-2 ring-amber-300/50'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
              }`}
            title="Save changes to walkthrough (Ctrl+S / Cmd+S)"
          >
            {saving ? (
              <>
                <Compass className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>Saving...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                {isDirty ? (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                  </span>
                ) : (
                  <Save className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>{isDirty ? 'Save Changes' : 'Saved'}</span>
              </>
            )}
          </button>

          <div className="hidden lg:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setCanvasViewport('desktop')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${canvasViewport === 'desktop' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              title="Desktop Canvas"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCanvasViewport('tablet')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${canvasViewport === 'tablet' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              title="Tablet Canvas"
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCanvasViewport('mobile')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${canvasViewport === 'mobile' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              title="Mobile Canvas"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handleTestPlayer}
            disabled={isOpeningTestPlayer || saving}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
              isOpeningTestPlayer
                ? 'bg-blue-50 text-blue-800 border-blue-200 cursor-wait'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-200 cursor-pointer'
            }`}
            title="Preview standalone player (auto-saves)"
          >
            {isOpeningTestPlayer ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-blue-700 border-t-transparent rounded-full animate-spin shrink-0" />
                <span>Opening Test...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current text-blue-600" />
                <span>Test Player</span>
              </>
            )}
          </button>

          <button
            onClick={handlePublishClick}
            disabled={publishing}
            className="px-4 py-1.5 rounded-xl bg-[#0c3c60] hover:bg-[#092b45] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-950/20 transition-all cursor-pointer hover:scale-105"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{publishing ? 'Publishing...' : 'Publish Guide'}</span>
          </button>
        </div>
      </header>

      {/* Editor Main Section: Expansive Center Canvas + Right Step Inspector */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* ================= Center Visual Canvas Workspace ================= */}
        <div className="flex-1 min-h-0 bg-slate-100 flex flex-col overflow-hidden relative">
          {/* Canvas Floating Toolbar */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-200 shadow-md flex-wrap max-w-[calc(100%-2rem)]">
            {/* Mode 1: Target Selector Mode */}
            <button
              onClick={() => setCanvasMode('target')}
              className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${canvasMode === 'target'
                  ? 'bg-[#0c3c60] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              title="Click on any element in the snapshot to re-target active step"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>Targeting Mode</span>
            </button>

            {/* Mode 2: Quick Click to Add Step Mode */}
            <button
              onClick={() => setCanvasMode('addStep')}
              className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${canvasMode === 'addStep'
                  ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-300'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              title="Click anywhere on the screen to instantly create and place a new step"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Click-to-Add Step</span>
            </button>

            {/* Mode 3: Privacy Redaction & Text Rewriting Mode */}
            <button
              onClick={() => setCanvasMode('domEdit')}
              className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${canvasMode === 'domEdit'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              title="Click any element to blur, hide, or rewrite text"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Privacy & Redactor</span>
            </button>

            <span className="w-px h-4 bg-slate-200 hidden sm:inline" />

            {/* Viewport Scaling & Zoom Controls */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-100 rounded-xl p-0.5">
              <button
                onClick={() => {
                  setViewportScaleMode('fit');
                  setZoomLevel(1);
                }}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${viewportScaleMode === 'fit' && zoomLevel === 1
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
                title="Fit full desktop recording to screen"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Fit</span>
              </button>

              <button
                onClick={() => {
                  setViewportScaleMode('100');
                  setZoomLevel(1);
                }}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${viewportScaleMode === '100' && zoomLevel === 1
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
                title="View 100% 1:1 Pixel Native Resolution"
              >
                <Monitor className="w-3 h-3" />
                <span>100%</span>
              </button>

              <span className="w-px h-3.5 bg-slate-200 mx-0.5" />

              <button
                onClick={() => setZoomLevel(Math.max(0.25, zoomLevel - 0.15))}
                className="p-1 hover:bg-white rounded hover:shadow-xs transition-all cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5 text-slate-600" />
              </button>
              <span className="text-[11px] font-mono font-medium text-slate-600 w-12 text-center select-none">
                {Math.round(effectiveScale * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel(Math.min(2.0, zoomLevel + 0.15))}
                className="p-1 hover:bg-white rounded hover:shadow-xs transition-all cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5 text-slate-600" />
              </button>
            </div>

            <span className="w-px h-4 bg-slate-200 hidden sm:inline" />

            {/* Preview Mode Toggle */}
            <button
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${isPreviewMode
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isPreviewMode ? 'Exit Preview' : 'Preview'}</span>
            </button>
          </div>

          {/* Interactive Guideline Banner or Success Toast */}
          {!isPreviewMode && (
            <div className="absolute top-16 left-4 z-20 pointer-events-none animate-fade-in flex items-center gap-2">
              {targetFeedback ? (
                <div className="bg-emerald-600 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-lg flex items-center gap-2 pointer-events-auto">
                  <Check className="w-4 h-4" />
                  <span>{targetFeedback}</span>
                </div>
              ) : canvasMode === 'target' ? (
                <div className="bg-slate-900/90 text-white text-[11px] font-semibold px-3 py-1.5 rounded-xl shadow-md backdrop-blur-xs flex items-center gap-2 border border-slate-700 pointer-events-auto">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>Targeting Mode: Hover & click any button, link, or card below to set anchor for Step #{activeStepIndex + 1}.</span>
                </div>
              ) : canvasMode === 'addStep' ? (
                <div className="bg-blue-600 text-white text-[11px] font-semibold px-3 py-1.5 rounded-xl shadow-md backdrop-blur-xs flex items-center gap-2 border border-blue-400 pointer-events-auto">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Click-to-Add: Click any element below to create a brand new step anchored there!</span>
                </div>
              ) : (
                <div className="bg-amber-600 text-white text-[11px] font-semibold px-3 py-1.5 rounded-xl shadow-md backdrop-blur-xs flex items-center gap-2 border border-amber-400 pointer-events-auto">
                  <Shield className="w-3.5 h-3.5" />
                  <span>DOM Privacy: Click any element to mask sensitive data, hide elements, or rewrite text.</span>
                </div>
              )}
            </div>
          )}

          {/* Iframe Canvas Area with Native Resolution Preservation */}
          <div
            ref={canvasOuterRef}
            className={`flex-1 min-h-0 flex items-center justify-center p-4 sm:p-6 overflow-auto ${isPreviewMode ? 'bg-slate-800' : 'bg-slate-200/50'
              }`}
          >
            <div
              className={`bg-white rounded-2xl overflow-hidden shadow-2xl relative transition-transform duration-150 flex flex-col shrink-0 ${!isPreviewMode ? 'border border-slate-300 ring-1 ring-slate-900/5' : ''
                }`}
              style={{
                width: `${targetWidth}px`,
                height: `${targetHeight}px`,
                transform: `scale(${effectiveScale})`,
                transformOrigin: 'center center'
              }}
            >
              {/* Fake Chrome Bar */}
              {!isPreviewMode && (
                <div className="h-8 bg-slate-50 border-b border-slate-200 px-3 flex items-center justify-between shrink-0 select-none">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-rose-400" />
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>
                  <div className="flex-1 max-w-xs mx-auto bg-white border border-slate-200 rounded px-2 py-0.5 text-[10px] text-slate-500 font-mono flex items-center gap-1 truncate">
                    <Lock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                    <span className="truncate">{currentSnapshot?.url || 'https://my.rotary.org/'}</span>
                  </div>
                  <div className="w-6" />
                </div>
              )}

              {/* Sandboxed Iframe Container */}
              <div ref={canvasContainerRef} className="flex-1 min-h-0 relative w-full h-full bg-white overflow-hidden">
                <iframe
                  ref={iframeRef}
                  title="DOM Snapshot Preview"
                  className={`w-full h-full border-0 bg-white transition-opacity duration-300 ${snapshotLoading ? 'opacity-0' : 'opacity-100'
                    }`}
                  sandbox="allow-same-origin"
                />

                {/* In-Canvas Loading Overlay & Feedback */}
                {snapshotLoading && (
                  <div className="absolute inset-0 z-30 bg-slate-50/95 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-fade-in select-none">
                    <div className="relative mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-md flex items-center justify-center text-[#0c3c60]">
                        <Compass className="w-7 h-7 animate-spin text-blue-600" style={{ animationDuration: '2.5s' }} />
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900">
                      {activeStep ? `Loading Step ${activeStep.stepNumber}` : 'Preparing Your Guide'}
                    </h3>
                    <p className="text-xs text-slate-500 max-w-xs mt-1 leading-relaxed">
                      {syncStatusMessage || 'Setting up the interactive canvas...'}
                    </p>

                    <div className="w-48 h-1 bg-slate-200 rounded-full overflow-hidden mt-4">
                      <div className="h-full bg-gradient-to-r from-[#0c3c60] via-blue-600 to-indigo-600 rounded-full animate-pulse w-3/4" />
                    </div>
                  </div>
                )}

                {/* 0. Full Modal Backdrop when in Modal mode */}
                {isModalMode && (
                  <div className="absolute inset-0 z-15 bg-slate-900/55 backdrop-blur-xs pointer-events-none animate-fade-in" />
                )}

                {/* 1. Backdrop Focus Overlay (Dim or Frosted Blur with SVG Cutout Hole) */}
                {focusBackdrop !== 'none' && liveTargetRect && !isModalMode && (
                  <div className="absolute inset-0 pointer-events-none z-10 animate-fade-in overflow-hidden">
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                      <defs>
                        <mask id="studio-spotlight-mask">
                          <rect x="0" y="0" width="100%" height="100%" fill="white" />
                          <rect
                            x={liveTargetRect.left - 6}
                            y={liveTargetRect.top - 6}
                            width={liveTargetRect.width + 12}
                            height={liveTargetRect.height + 12}
                            rx="12"
                            ry="12"
                            fill="black"
                          />
                        </mask>
                      </defs>
                    </svg>
                    <div
                      className="absolute inset-0 pointer-events-none transition-all duration-100 ease-out"
                      style={{
                        mask: 'url(#studio-spotlight-mask)',
                        WebkitMask: 'url(#studio-spotlight-mask)',
                        backdropFilter: focusBackdrop === 'blur' ? 'blur(8px) brightness(0.7)' : undefined,
                        WebkitBackdropFilter: focusBackdrop === 'blur' ? 'blur(8px) brightness(0.7)' : undefined,
                        backgroundColor: focusBackdrop === 'blur' ? 'rgba(12, 30, 50, 0.4)' : 'rgba(15, 23, 42, 0.55)'
                      }}
                    />
                  </div>
                )}

                {/* 2. Target Outline / Highlight Box (Customizable Border without Beacon) */}
                {targetHighlight !== 'none' && liveTargetRect && !isModalMode && liveTargetRect.isVisible !== false && (
                  <div
                    className={`absolute pointer-events-none z-10 ${targetHighlight === 'ring' ? 'animate-pulse' : ''
                      } ${targetHighlight === 'bubble'
                        ? 'rounded-2xl'
                        : targetHighlight === 'glow'
                          ? 'rounded-xl'
                          : targetHighlight === 'dashed'
                            ? 'rounded-lg'
                            : 'rounded-xl'
                      }`}
                    style={{
                      top: `${liveTargetRect.top - (targetHighlight === 'bubble' ? 8 : 6)}px`,
                      left: `${liveTargetRect.left - (targetHighlight === 'bubble' ? 8 : 6)}px`,
                      width: `${liveTargetRect.width + (targetHighlight === 'bubble' ? 16 : 12)}px`,
                      height: `${liveTargetRect.height + (targetHighlight === 'bubble' ? 16 : 12)}px`,
                      border:
                        targetHighlight === 'dashed'
                          ? `2.5px dashed ${themeColor}`
                          : targetHighlight === 'ring'
                            ? `2px solid ${themeColor}`
                            : targetHighlight === 'bubble'
                              ? `2.5px solid ${themeColor}`
                              : targetHighlight === 'glow'
                                ? `1.5px solid ${themeColor}99`
                                : `2.5px solid ${themeColor}`,
                      backgroundColor:
                        targetHighlight === 'bubble'
                          ? `${themeColor}0d`
                          : targetHighlight === 'glow'
                            ? `${themeColor}15`
                            : undefined,
                      boxShadow:
                        targetHighlight === 'ring'
                          ? `0 0 0 4px ${themeColor}33, 0 0 16px ${themeColor}44`
                          : targetHighlight === 'glow'
                            ? `0 0 20px 4px ${themeColor}55, inset 0 0 12px ${themeColor}22`
                            : targetHighlight === 'bubble'
                              ? `0 4px 14px ${themeColor}25`
                              : undefined
                    }}
                  />
                )}

                {/* 3. Live Sticky Beacon in Studio Canvas */}
                {showBeacon && liveTargetRect && !isModalMode && liveTargetRect.isVisible !== false && (() => {
                  const { x: targetX } = computeBeaconPosition(liveTargetRect, beaconAlignment);
                  const beaconLeft = targetX - 14; // Center the 28px wide beacon

                  return (
                    <div
                      className="absolute z-30 pointer-events-none group"
                      style={{
                        top: `${liveTargetRect.top + liveTargetRect.height / 2 - 14}px`,
                        left: `${beaconLeft}px`
                      }}
                    >
                      <div className="relative">
                        {beaconStyle === 'pulse' && (
                          <div
                            className="absolute inset-0 rounded-full animate-ping opacity-75"
                            style={{ background: beaconColor }}
                          />
                        )}
                        <div
                          className={`relative w-7 h-7 rounded-full text-white flex items-center justify-center shadow-lg ring-3 ring-white/95`}
                          style={{
                            background: beaconColor,
                            boxShadow: `0 0 16px ${beaconColor}`
                          }}
                        >
                          {renderBeaconIcon(activeStep?.beaconConfig?.icon)}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 3.1: Floating Edge Beacon Nudge in Studio Canvas (When Target Beacon Scrolls Off-Screen in Beacon-Only Mode) */}
                {isBeaconOnlyMode && liveTargetRect && !isModalMode && liveTargetRect.isVisible === false && (() => {
                  const { x: targetX } = computeBeaconPosition(liveTargetRect, beaconAlignment);

                  const isTargetAbove = (liveTargetRect.top + liveTargetRect.height) < 0;
                  const clampedX = Math.max(120, Math.min(canvasContainerWidth - 120, targetX));

                  return (
                    <div
                      className={`absolute z-30 pointer-events-auto transition-all duration-300 animate-fade-in ${
                        isTargetAbove ? 'top-16' : 'bottom-16'
                      }`}
                      style={{
                        left: `${clampedX}px`,
                        transform: 'translateX(-50%)'
                      }}
                    >
                      <button
                        type="button"
                        onClick={scrollToTarget}
                        className="flex items-center gap-2 px-3.5 py-2 bg-white/95 backdrop-blur-md text-[#0c3c60] font-bold text-xs rounded-full shadow-2xl border-2 border-blue-200 hover:border-[#0c3c60] hover:bg-blue-50 transition-all cursor-pointer group hover:scale-105 active:scale-95"
                        style={{
                          boxShadow: '0 8px 24px rgba(12, 60, 96, 0.22)'
                        }}
                        title="Click to scroll back to target beacon"
                      >
                        <div
                          className="relative flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold"
                          style={{ background: beaconColor }}
                        >
                          <span
                            className="absolute inset-0 rounded-full animate-ping opacity-75"
                            style={{ background: beaconColor }}
                          />
                          {isTargetAbove ? '↑' : '↓'}
                        </div>
                        <span className="tracking-tight font-bold">📍 Return to highlight</span>
                      </button>
                    </div>
                  );
                })()}

                {/* 2.6: Active Target Overlay during Targeting Mode */}
                {canvasMode === 'target' && !isModalMode && liveTargetRect && liveTargetRect.isVisible !== false && (
                  <div
                    className="absolute z-10 pointer-events-none rounded"
                    style={{
                      top: `${liveTargetRect.top}px`,
                      left: `${liveTargetRect.left}px`,
                      width: `${liveTargetRect.width}px`,
                      height: `${liveTargetRect.height}px`,
                      backgroundColor: 'rgba(12, 60, 96, 0.1)',
                      border: '2px solid rgba(12, 60, 96, 0.5)'
                    }}
                  />
                )}

                {/* 2.6: Connector SVG Line between Tooltip and Target/Beacon (Continuous Reference Trail) */}
                {showTooltip && activeStep && !isModalMode && liveTargetRect && (() => {
                  const { x: targetX, y: targetY } = computeBeaconPosition(liveTargetRect, beaconAlignment);
                  
                  // When target scrolls off-screen, clamp reference endpoint to container boundary
                  // so the dashed line remains visible as a continuous directional leash/reference back to the element.
                  const clampedTargetX = Math.max(16, Math.min(canvasContainerWidth - 16, targetX));
                  const clampedTargetY = Math.max(0, Math.min(canvasContainerHeight, targetY));

                  const cardRect = {
                    left: tooltipPosition.left,
                    top: tooltipPosition.top,
                    width: 340,
                    height: 180
                  };
                  const cardEdge = computeCardEdgePoint(cardRect, { x: clampedTargetX, y: clampedTargetY });

                  return (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" style={{ zIndex: 20 }}>
                      <defs>
                        <filter id="studio-line-glow" x="-20%" y="-20%" width="140%" height="140%">
                          <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.4" />
                        </filter>
                      </defs>
                      {/* High-contrast solid white underlay for crystal-clear visibility against any background */}
                      <line
                        x1={cardEdge.x}
                        y1={cardEdge.y}
                        x2={clampedTargetX}
                        y2={clampedTargetY}
                        stroke="rgba(255, 255, 255, 0.95)"
                        strokeWidth="4.5"
                        strokeDasharray="6 6"
                        strokeLinecap="round"
                        filter="url(#studio-line-glow)"
                      />
                      {/* Vibrant theme/brand colored dashed line */}
                      <line
                        x1={cardEdge.x}
                        y1={cardEdge.y}
                        x2={clampedTargetX}
                        y2={clampedTargetY}
                        stroke={themeColor}
                        strokeWidth="2.5"
                        strokeDasharray="6 6"
                        strokeLinecap="round"
                      />
                    </svg>
                  );
                })()}

                {/* 3. Anchored Tooltip Callout (Tooltip Mode) */}
                {showTooltip && activeStep && !isModalMode && liveTargetRect && (
                  <div
                    className="absolute pointer-events-none transition-opacity duration-200"
                    style={{
                      zIndex: 35,
                      top: `${tooltipPosition.top}px`,
                      left: `${tooltipPosition.left}px`,
                      width: '340px',
                      opacity: liveTargetRect && liveTargetRect.isVisible === false ? 0.9 : 1
                    }}
                  >
                    <div
                      className={`relative rounded-2xl p-5 shadow-2xl text-slate-900 pointer-events-auto border transition-all ${cardStyle === 'glass'
                          ? 'bg-white/90 backdrop-blur-md border-white/60 shadow-blue-900/10'
                          : cardStyle === 'dark'
                            ? 'bg-slate-900 text-white border-slate-800 shadow-2xl'
                            : cardStyle === 'outline'
                              ? 'bg-white border-2 text-slate-900 shadow-lg'
                              : 'bg-white border-slate-200 shadow-xl'
                        }`}
                      style={{
                        borderColor: cardStyle === 'outline' ? themeColor : undefined,
                        borderTop: cardStyle === 'solid' ? `4px solid ${themeColor}` : undefined
                      }}
                    >
                      {/* Off-screen Target Center Indicator */}
                      {liveTargetRect && liveTargetRect.isVisible === false && (
                        <button
                          type="button"
                          onClick={scrollToTarget}
                          className="mb-3 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#0c3c60] text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 w-full cursor-pointer transition-colors shadow-2xs border border-blue-200"
                        >
                          <Crosshair className="w-3.5 h-3.5 text-blue-600" />
                          <span>📍 Return to highlight</span>
                        </button>
                      )}
                      <div className="flex items-center justify-between mb-1">
                        <div className="invisible">
                          {/* Step counter removed for cleaner UI */}
                        </div>
                      </div>
                      <h4
                        className={`font-bold text-base ${cardStyle === 'dark' ? 'text-white' : 'text-slate-900'} ${activeStep.textAlign === 'center'
                            ? 'text-center'
                            : activeStep.textAlign === 'right'
                              ? 'text-right'
                              : 'text-left'
                          }`}
                      >
                        {activeStep.title}
                      </h4>
                      <p
                        className={`text-xs mt-1.5 leading-relaxed ${cardStyle === 'dark' ? 'text-slate-300' : 'text-slate-600'
                          } ${activeStep.textAlign === 'center'
                            ? 'text-center'
                            : activeStep.textAlign === 'right'
                              ? 'text-right'
                              : 'text-left'
                          }`}
                      >
                        {activeStep.description}
                      </p>

                      {/* Custom Action Button Preview in Studio */}
                      {activeStep.actions && activeStep.actions.length > 0 ? (
                        <div className="mt-3 pt-2 border-t border-slate-100 flex flex-wrap gap-1.5 justify-end">
                          {activeStep.actions.map((act) => (
                            <span
                              key={act.id}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${act.style === 'secondary'
                                  ? 'bg-slate-100 text-slate-700'
                                  : act.style === 'outline'
                                    ? 'bg-white border border-slate-200 text-slate-700'
                                    : 'text-white shadow-xs'
                                }`}
                              style={{
                                background: act.style === 'primary' ? themeColor : undefined
                              }}
                            >
                              {act.label}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div
                          className={`mt-3 pt-2 border-t border-slate-100 flex items-center gap-2 ${activeStep.buttonLayout === 'full'
                              ? 'flex-col w-full'
                              : activeStep.buttonLayout === 'center'
                                ? 'justify-center'
                                : activeStep.buttonLayout === 'left'
                                  ? 'justify-start'
                                  : 'justify-end'
                            }`}
                        >
                          {activeStep.showBackButton && (
                            <span
                              className={`px-3 py-1.5 rounded-xl text-slate-500 hover:text-slate-800 text-[11px] font-bold border border-slate-200 bg-slate-50 cursor-pointer ${activeStep.buttonLayout === 'full' ? 'w-full text-center' : ''
                                }`}
                            >
                              {activeStep.backButtonText || 'Back'}
                            </span>
                          )}
                          <span
                            className={`px-4 py-2 rounded-xl text-white text-[11px] font-bold shadow-sm text-center cursor-pointer ${activeStep.buttonLayout === 'full' ? 'w-full' : ''
                              }`}
                            style={{ background: themeColor }}
                          >
                            {activeStep.buttonText || 'Next Step'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 3.1 Unattached Target Guidance Prompt when in Tooltip/Beacon mode with no target */}
                {!isModalMode && activeStep && !liveTargetRect && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                    <div className="bg-white/95 backdrop-blur-sm border border-blue-200 shadow-xl rounded-2xl p-5 max-w-xs text-center pointer-events-auto space-y-2.5">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0c3c60] flex items-center justify-center mx-auto text-xl shadow-2xs">
                        🎯
                      </div>
                      <div className="font-bold text-slate-800 text-sm">No Target Element Attached</div>
                      <div className="text-xs text-slate-500 leading-relaxed">
                        Click below and tap any element on the preview to anchor this step.
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCanvasMode('target');
                          setTargetFeedback('🎯 Click any element on the canvas to anchor this step!');
                          setTimeout(() => setTargetFeedback(null), 3500);
                        }}
                        className="mt-1 px-3.5 py-1.5 bg-[#0c3c60] hover:bg-[#092c47] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-sm inline-flex items-center gap-1.5"
                      >
                        <Crosshair className="w-3.5 h-3.5" />
                        <span>Select Target Element</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. Live Centered Announcement Modal Dialog (Modal Mode) */}
                {isModalMode && activeStep && (
                  <div className="absolute inset-0 z-25 flex items-center justify-center p-6 pointer-events-none animate-fade-in">
                    <div
                      className={`rounded-3xl p-8 max-w-lg w-full shadow-2xl text-center relative max-h-[85vh] flex flex-col pointer-events-auto border transition-all ${
                        cardStyle === 'glass'
                          ? 'bg-white/90 backdrop-blur-md border-white/60 shadow-blue-900/10 text-slate-900'
                          : cardStyle === 'dark'
                          ? 'bg-slate-900 text-white border-slate-800 shadow-2xl'
                          : cardStyle === 'outline'
                          ? 'bg-white border-2 text-slate-900 shadow-lg'
                          : 'bg-white border-slate-200 shadow-2xl text-slate-900'
                      }`}
                      style={{
                        borderColor: cardStyle === 'outline' ? themeColor : undefined,
                        borderTop: cardStyle === 'solid' ? `5px solid ${themeColor}` : undefined
                      }}
                    >
                      <h3
                        className={`font-extrabold text-lg md:text-xl tracking-tight ${
                          cardStyle === 'dark' ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        {activeStep.title}
                      </h3>

                      <p
                        className={`text-xs md:text-sm mt-2.5 leading-relaxed ${
                          cardStyle === 'dark' ? 'text-slate-300' : 'text-slate-600'
                        }`}
                      >
                        {activeStep.description}
                      </p>

                      {/* Custom Action Button Preview in Modal */}
                      {activeStep.actions && activeStep.actions.length > 0 ? (
                        <div className="mt-6 flex flex-wrap gap-2 justify-center">
                          {activeStep.actions.map((act) => (
                            <span
                              key={act.id}
                              className={`px-4 py-2 rounded-xl text-xs font-bold ${
                                act.style === 'secondary'
                                  ? cardStyle === 'dark'
                                    ? 'bg-slate-800 text-slate-200 border border-slate-700'
                                    : 'bg-slate-100 text-slate-700'
                                  : act.style === 'outline'
                                  ? cardStyle === 'dark'
                                    ? 'bg-slate-800/80 border border-slate-700 text-slate-200'
                                    : 'bg-white border border-slate-300 text-slate-700'
                                  : 'text-white shadow-md'
                              }`}
                              style={{
                                background: act.style === 'primary' ? themeColor : undefined
                              }}
                            >
                              {act.label}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-6 flex items-center justify-center gap-3">
                          {activeStep.showBackButton && (
                            <span
                              className={`px-4 py-2 rounded-xl text-xs font-bold border ${
                                cardStyle === 'dark'
                                  ? 'bg-slate-800 text-slate-300 border-slate-700'
                                  : 'bg-slate-50 text-slate-600 border-slate-200'
                              }`}
                            >
                              {activeStep.backButtonText || 'Previous'}
                            </span>
                          )}
                          <span
                            className="px-6 py-2.5 rounded-xl text-white text-xs font-bold shadow-md shadow-blue-900/20"
                            style={{ background: themeColor }}
                          >
                            {activeStep.buttonText || 'Continue Walkthrough'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick DOM Mutation Action Modal (when clicking elements in DOM Edit mode) */}
          {selectedDomEl && (
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-fade-in">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-amber-600" />
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">Privacy & DOM Redactor</h3>
                      <p className="text-[10px] text-slate-500 font-mono">Mask sensitive data & edit page content</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedDomEl(null)} className="text-slate-400 hover:text-slate-700 font-bold">
                    ✕
                  </button>
                </div>

                <div className="text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-mono truncate">
                  <span className="text-slate-500 font-bold">Target:</span> {selectedDomEl.selector}
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">Rewrite Text Content</label>
                  <input
                    type="text"
                    value={newTextValue}
                    onChange={(e) => setNewTextValue(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                    placeholder="Enter customized text..."
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2">
                  <button
                    onClick={() => handleAddDomModification('blur')}
                    className="py-2.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex flex-col items-center gap-1.5 border border-blue-200 transition-all cursor-pointer hover:scale-102"
                  >
                    <EyeOff className="w-4 h-4" />
                    <span>Blur Data</span>
                  </button>

                  <button
                    onClick={() => handleAddDomModification('hide')}
                    className="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex flex-col items-center gap-1.5 border border-rose-200 transition-all cursor-pointer hover:scale-102"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Hide Element</span>
                  </button>

                  <button
                    onClick={() => handleAddDomModification('replaceText', newTextValue)}
                    className="py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold flex flex-col items-center gap-1.5 border border-emerald-200 transition-all cursor-pointer hover:scale-102"
                  >
                    <Type className="w-4 h-4" />
                    <span>Rewrite</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================= Pane 3: Step & Element Settings Inspector ================= */}
        {activeStep && (
          <div className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-y-auto">
            {/* Inspector Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                  Step Inspector
                </h3>
                <p className="text-[10px] text-slate-500 font-mono">Step #{activeStepIndex + 1} Configuration</p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleDuplicateStep()}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Duplicate Step"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteStep(activeStep.id)}
                  className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Delete Step"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Inspector Tab Switcher */}
            <div className="flex border-b border-slate-200 bg-slate-100/70 p-1">
              <button
                onClick={() => setActiveTab('content')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${activeTab === 'content' ? 'bg-white text-[#0c3c60] shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                Content
              </button>
              <button
                onClick={() => setActiveTab('design')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${activeTab === 'design' ? 'bg-white text-[#0c3c60] shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                Design & Style
              </button>
              <button
                onClick={() => setActiveTab('advanced')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${activeTab === 'advanced' ? 'bg-white text-[#0c3c60] shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                Interactive
              </button>
            </div>

            <div className="p-4 space-y-5 text-xs">
              {activeTab === 'content' && (
                <>
                  {/* 0. Target Anchor Element Card */}
                  {isModalMode ? (
                    <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-[#0c3c60]">
                        <span className="text-base">📢</span>
                        <div>
                          <div className="font-bold text-slate-800">Centered Modal Dialog</div>
                          <div className="text-[10px] text-slate-500">No page element target required</div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          handleUpdateActiveStep({ stepType: 'tooltip', placement: 'bottom', showBeacon: true });
                          setCanvasMode('target');
                          setTargetFeedback('🎯 Click any element on the canvas to anchor this step!');
                          setTimeout(() => setTargetFeedback(null), 3500);
                        }}
                        className="px-2.5 py-1 text-[10px] font-bold bg-white text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-lg cursor-pointer transition-colors shadow-2xs"
                      >
                        Attach Target
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <Crosshair className="w-3.5 h-3.5 text-blue-600" />
                          <span>Target Element</span>
                        </span>
                        <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 truncate max-w-[140px]">
                          {activeStep.targetSelector || 'body'}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setCanvasMode('target');
                          setTargetFeedback('🎯 Click any element or section in the canvas to anchor this step!');
                        }}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${canvasMode === 'target'
                            ? 'bg-[#0c3c60] text-white shadow-sm ring-2 ring-blue-300'
                            : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                          }`}
                      >
                        <Crosshair className="w-4 h-4" />
                        <span>{canvasMode === 'target' ? '🎯 Targeting Active (Click Element)' : '🎯 Pick Element on Screen'}</span>
                      </button>
                    </div>
                  )}

                  {/* 1. Step Element Type Selector (3 primary options) */}
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5 text-[11px]">
                      Element Style
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                      <button
                        onClick={() => {
                          handleUpdateActiveStep({
                            stepType: 'tooltip',
                            placement: activeStep.placement === 'center' ? 'bottom' : (activeStep.placement || 'bottom'),
                            showBeacon: false
                          });
                          if (!activeStep.targetSelector && !activeStep.targetCoordinates) {
                            setCanvasMode('target');
                            setTargetFeedback('🎯 Click any element on the canvas to anchor this tooltip!');
                            setTimeout(() => setTargetFeedback(null), 3500);
                          } else {
                            setTimeout(updateTargetCoordinates, 30);
                          }
                        }}
                        className={`py-1.5 px-2 rounded-lg font-bold transition-colors cursor-pointer text-center text-xs ${activeStep.stepType === 'tooltip' || (!activeStep.stepType && activeStep.stepType !== 'modal' && activeStep.stepType !== 'beacon')
                            ? 'bg-[#0c3c60] text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                          }`}
                      >
                        <span>📌 Tooltip</span>
                      </button>

                      <button
                        onClick={() => {
                          handleUpdateActiveStep({
                            stepType: 'beacon',
                            showBeacon: true,
                            placement: activeStep.placement === 'center' ? 'bottom' : (activeStep.placement || 'bottom')
                          });
                          if (!activeStep.targetSelector && !activeStep.targetCoordinates) {
                            setCanvasMode('target');
                            setTargetFeedback('🎯 Click any element on the canvas to place the beacon!');
                            setTimeout(() => setTargetFeedback(null), 3500);
                          } else {
                            setTimeout(updateTargetCoordinates, 30);
                          }
                        }}
                        className={`py-1.5 px-2 rounded-lg font-bold transition-colors cursor-pointer text-center text-xs ${activeStep.stepType === 'beacon'
                            ? 'bg-[#0c3c60] text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                          }`}
                      >
                        <span>🎯 Beacon</span>
                      </button>

                      <button
                        onClick={() => {
                          handleUpdateActiveStep({
                            stepType: 'modal',
                            placement: 'center',
                            showBeacon: false
                          });
                          setCanvasMode('browse');
                          setLiveTargetRect(null);
                        }}
                        className={`py-1.5 px-2 rounded-lg font-bold transition-colors cursor-pointer text-center text-xs ${activeStep.stepType === 'modal'
                            ? 'bg-[#0c3c60] text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                          }`}
                      >
                        <span>📢 Modal</span>
                      </button>
                    </div>
                  </div>

                  {/* 1.1 Target Highlight Box & Page Focus Options (when not Modal) */}
                  {!isModalMode && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                      {/* Target Highlight Box Option */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                            Target Outline Box
                          </label>
                          <span className="text-[10px] text-slate-500 font-mono capitalize">
                            {targetHighlight}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border border-slate-200 text-center font-bold">
                          {[
                            { id: 'none', label: 'None' },
                            { id: 'solid', label: '🔲 Box' },
                            { id: 'bubble', label: '🫧 Bubble' },
                            { id: 'ring', label: '💫 Ring' },
                            { id: 'glow', label: '✨ Glow' },
                            { id: 'dashed', label: '📐 Dashed' }
                          ].map((hl) => (
                            <button
                              key={hl.id}
                              onClick={() => handleUpdateActiveStep({ targetHighlight: hl.id as any })}
                              className={`py-1.5 rounded-lg text-[10px] transition-colors cursor-pointer ${targetHighlight === hl.id
                                  ? 'bg-[#0c3c60] text-white shadow-2xs'
                                  : 'text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                              {hl.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Page Backdrop Focus Option */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                            Page Focus & Backdrop
                          </label>
                          <span className="text-[10px] text-slate-500 font-mono capitalize">
                            {focusBackdrop}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border border-slate-200 text-center font-bold">
                          {[
                            { id: 'none', label: 'Natural' },
                            { id: 'dim', label: '💡 Dim' },
                            { id: 'blur', label: '🌫️ Blur' }
                          ].map((fb) => (
                            <button
                              key={fb.id}
                              onClick={() =>
                                handleUpdateActiveStep({
                                  focusBackdrop: fb.id as any,
                                  showSpotlight: fb.id !== 'none'
                                })
                              }
                              className={`py-1 rounded-lg text-[10px] transition-colors cursor-pointer ${focusBackdrop === fb.id
                                  ? 'bg-[#0c3c60] text-white shadow-2xs'
                                  : 'text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                              {fb.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Beacon Hotspot Placement & Styling for Beacon Mode */}
                      {activeStep.stepType === 'beacon' && renderBeaconControls()}

                      {/* Hotspot Beacon Toggle & Inline Placement for Tooltip mode */}
                      {activeStep.stepType !== 'beacon' && (
                        <div className="pt-2 border-t border-slate-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-700">Display Pulsing Beacon</span>
                            <input
                              type="checkbox"
                              checked={activeStep.showBeacon === true}
                              onChange={(e) => handleUpdateActiveStep({ showBeacon: e.target.checked })}
                              className="w-4 h-4 text-blue-600 rounded cursor-pointer accent-[#0c3c60]"
                            />
                          </div>

                          {activeStep.showBeacon === true && renderBeaconControls()}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 2. Step Title & Description with Text Alignment */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                          Title
                        </label>
                        <div className="flex items-center gap-1 bg-slate-100 rounded-md p-0.5 border border-slate-200">
                          {(['left', 'center', 'right'] as const).map((align) => (
                            <button
                              key={align}
                              onClick={() => handleUpdateActiveStep({ textAlign: align })}
                              className={`px-1.5 py-0.5 rounded text-[10px] capitalize font-bold transition-colors cursor-pointer ${(activeStep.textAlign || 'left') === align
                                  ? 'bg-[#0c3c60] text-white shadow-2xs'
                                  : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                              {align}
                            </button>
                          ))}
                        </div>
                      </div>
                      <input
                        type="text"
                        value={activeStep.title}
                        onChange={(e) => handleUpdateActiveStep({ title: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[11px]">
                        Description
                      </label>
                      <textarea
                        rows={3}
                        value={activeStep.description}
                        onChange={(e) => handleUpdateActiveStep({ description: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 resize-none leading-relaxed"
                      />
                    </div>
                  </div>

                  {/* 3. Placement Selector (Top, Bottom, Left, Right) - Tooltips only */}
                  {showTooltip && (
                    <div>
                      <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5 text-[11px]">
                        Callout Placement
                      </label>
                      <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-center font-bold">
                        {(['top', 'bottom', 'left', 'right'] as const).map((p) => (
                          <button
                            key={p}
                            onClick={() => handleUpdateActiveStep({ placement: p })}
                            className={`py-1.5 rounded-lg capitalize transition-colors cursor-pointer ${activeStep.placement === p
                                ? 'bg-[#0c3c60] text-white shadow-2xs'
                                : 'text-slate-600 hover:bg-white'
                              }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 4. Action Button Customization */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <label className="block font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                      Button Customization
                    </label>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Primary Button Text
                      </label>
                      <input
                        type="text"
                        value={activeStep.buttonText || 'Next Step'}
                        onChange={(e) => handleUpdateActiveStep({ buttonText: e.target.value })}
                        placeholder="e.g. Next Step, Continue, Got it"
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Button Layout & Alignment
                      </label>
                      <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-center font-bold">
                        {[
                          { id: 'full', label: 'Full Width' },
                          { id: 'right', label: 'Right' },
                          { id: 'center', label: 'Center' },
                          { id: 'left', label: 'Left' }
                        ].map((layout) => (
                          <button
                            key={layout.id}
                            onClick={() => handleUpdateActiveStep({ buttonLayout: layout.id as any })}
                            className={`py-1 rounded-lg text-[10px] transition-colors cursor-pointer ${(activeStep.buttonLayout || 'right') === layout.id
                                ? 'bg-[#0c3c60] text-white shadow-2xs'
                                : 'text-slate-600 hover:bg-white'
                              }`}
                          >
                            {layout.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Back Button Options */}
                    <div className="pt-2 border-t border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700">Show Back Button</span>
                        <input
                          type="checkbox"
                          checked={activeStep.showBackButton !== false}
                          onChange={(e) => handleUpdateActiveStep({ showBackButton: e.target.checked })}
                          className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                        />
                      </div>
                      {activeStep.showBackButton !== false && (
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Back Button Text
                          </label>
                          <input
                            type="text"
                            value={activeStep.backButtonText || 'Back'}
                            onChange={(e) => handleUpdateActiveStep({ backButtonText: e.target.value })}
                            placeholder="e.g. Back, Previous"
                            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'design' && (
                <>
                  {/* Theme Color Picker */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                    <label className="block font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                      Theme Accent Color
                    </label>
                    <div className="grid grid-cols-7 gap-1">
                      {PRESET_THEME_COLORS.map((col) => (
                        <button
                          key={col.hex}
                          onClick={() => handleUpdateActiveStep({ themeColor: col.hex })}
                          className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center cursor-pointer shadow-xs"
                          style={{
                            backgroundColor: col.hex,
                            borderColor: activeStep.themeColor === col.hex ? '#ffffff' : 'transparent'
                          }}
                          title={col.name}
                        >
                          {activeStep.themeColor === col.hex && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="color"
                        value={activeStep.themeColor || '#0c3c60'}
                        onChange={(e) => handleUpdateActiveStep({ themeColor: e.target.value })}
                        className="w-8 h-8 p-0.5 rounded cursor-pointer border border-slate-300"
                        title="Custom Hex Color"
                      />
                      <input
                        type="text"
                        value={activeStep.themeColor || '#0c3c60'}
                        onChange={(e) => handleUpdateActiveStep({ themeColor: e.target.value })}
                        placeholder="#000000"
                        className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-[11px] uppercase font-mono text-slate-700 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Card Surface Style */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                    <label className="block font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                      Card Surface Style
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: 'solid', label: 'Solid White' },
                        { id: 'glass', label: 'Frosted Glass' },
                        { id: 'dark', label: 'Sleek Dark' },
                        { id: 'outline', label: 'Border Outline' }
                      ].map((st) => (
                        <button
                          key={st.id}
                          onClick={() => handleUpdateActiveStep({ cardStyle: st.id as any })}
                          className={`py-2 px-2.5 rounded-xl font-bold text-xs border text-left transition-colors cursor-pointer ${(activeStep.cardStyle || 'solid') === st.id
                              ? 'bg-[#0c3c60] text-white border-[#0c3c60] shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>


                  {/* Beacon & Hotspot Customizer */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                        Beacon Hotspot
                      </span>
                      <input
                        type="checkbox"
                        checked={Boolean(activeStep.showBeacon || activeStep.stepType === 'beacon')}
                        onChange={(e) => handleUpdateActiveStep({ showBeacon: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded cursor-pointer accent-[#0c3c60]"
                      />
                    </div>

                    {(Boolean(activeStep.showBeacon) || activeStep.stepType === 'beacon') && renderBeaconControls()}
                  </div>
                </>
              )}

              {activeTab === 'advanced' && (
                <>
                  {/* Auto-Play Timer */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                        Auto-Advance Timer
                      </span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="60"
                          value={activeStep.autoAdvanceSeconds || 0}
                          onChange={(e) =>
                            handleUpdateActiveStep({
                              autoAdvanceSeconds: parseInt(e.target.value) || 0
                            })
                          }
                          className="w-16 bg-white border border-slate-300 rounded px-2 py-1 text-xs text-center font-bold"
                        />
                        <span className="text-[10px] text-slate-500 font-bold">sec</span>
                      </div>
                    </div>
                  </div>

                  {/* Multi-Button Action Builder & Branching */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                        Custom Action Buttons
                      </span>
                      <button
                        onClick={handleAddActionButton}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-white px-2 py-0.5 rounded border border-slate-200 cursor-pointer"
                      >
                        + Button
                      </button>
                    </div>

                    {activeStep.actions && activeStep.actions.length > 0 ? (
                      <div className="space-y-2">
                        {activeStep.actions.map((act, actIdx) => (
                          <div key={act.id} className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                              <input
                                type="text"
                                value={act.label}
                                onChange={(e) => handleUpdateActionButton(actIdx, { label: e.target.value })}
                                className="font-bold text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 w-32"
                              />
                              <button
                                onClick={() => handleRemoveActionButton(actIdx)}
                                className="text-rose-500 hover:text-rose-700 text-xs font-bold"
                              >
                                ✕
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-1 text-[10px]">
                              <CustomSelect
                                value={act.actionType}
                                onChange={(val) => handleUpdateActionButton(actIdx, { actionType: val as any })}
                                options={[
                                  { value: 'next', label: 'Next Step' },
                                  { value: 'prev', label: 'Previous Step' },
                                  { value: 'jumpToStep', label: 'Jump to Step' },
                                  { value: 'openUrl', label: 'External Link' }
                                ]}
                                buttonClassName="px-2 py-1 text-[11px] rounded-lg"
                              />

                              {act.actionType === 'jumpToStep' ? (
                                <CustomSelect
                                  value={act.targetStepId || ''}
                                  onChange={(val) => handleUpdateActionButton(actIdx, { targetStepId: val })}
                                  placeholder="Select step..."
                                  options={steps.map((s, si) => ({
                                    value: s.id,
                                    label: `Step ${si + 1}: ${s.title || 'Untitled'}`
                                  }))}
                                  buttonClassName="px-2 py-1 text-[11px] rounded-lg"
                                />
                              ) : act.actionType === 'openUrl' ? (
                                <input
                                  type="text"
                                  value={act.url || ''}
                                  onChange={(e) => handleUpdateActionButton(actIdx, { url: e.target.value })}
                                  placeholder="https://..."
                                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] focus:bg-white focus:outline-none"
                                />
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div>
                          <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                            CTA Button Text
                          </label>
                          <input
                            type="text"
                            value={activeStep.buttonText || ''}
                            onChange={(e) => handleUpdateActiveStep({ buttonText: e.target.value })}
                            placeholder="e.g. Next Step"
                            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                          />
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="font-semibold text-slate-600 text-[11px]">Show Back Button</span>
                          <input
                            type="checkbox"
                            checked={Boolean(activeStep.showBackButton)}
                            onChange={(e) => handleUpdateActiveStep({ showBackButton: e.target.checked })}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Simulated Input Typing */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <Type className="w-3.5 h-3.5 text-blue-600" />
                        Simulated Input Typing
                      </span>
                      {activeStep.inputAction?.textToType ? (
                        <button
                          type="button"
                          onClick={handleTestTyping}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200 cursor-pointer flex items-center gap-1 hover:bg-blue-50 transition-colors shadow-2xs"
                          title="Simulate typing into the targeted input element on the canvas"
                        >
                          <Play className="w-2.5 h-2.5 fill-current" />
                          Test in Canvas
                        </button>
                      ) : null}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Auto-type text into the targeted input or textarea when this step is reached.
                    </p>

                    <div className="space-y-2">
                      <div>
                        <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                          Text to Type
                        </label>
                        <input
                          type="text"
                          value={activeStep.inputAction?.textToType || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleUpdateActiveStep({
                              inputAction: val
                                ? {
                                    textToType: val,
                                    typingSpeedMs: activeStep.inputAction?.typingSpeedMs || 45
                                  }
                                : undefined
                            });
                          }}
                          placeholder="e.g. support@rotaractsouthasia.org"
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                        />
                      </div>

                      {Boolean(activeStep.inputAction?.textToType) && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                              Typing Speed ({activeStep.inputAction?.typingSpeedMs || 45}ms / char)
                            </label>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min="15"
                              max="150"
                              step="5"
                              value={activeStep.inputAction?.typingSpeedMs || 45}
                              onChange={(e) => {
                                handleUpdateActiveStep({
                                  inputAction: {
                                    textToType: activeStep.inputAction?.textToType || '',
                                    typingSpeedMs: parseInt(e.target.value, 10) || 45
                                  }
                                });
                              }}
                              className="flex-1 accent-[#0c3c60] cursor-pointer"
                            />
                            <span className="text-[10px] font-mono font-bold text-slate-600 w-10 text-right">
                              {activeStep.inputAction?.typingSpeedMs || 45}ms
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Audio Narration */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                        Audio Narration
                      </span>
                      {activeStep.audioUrl && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Stream voice narration when a visitor navigates to this step (MP3, AAC, WebM).
                    </p>

                    <div className="space-y-2">
                      <div>
                        <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                          Audio Stream URL
                        </label>
                        <input
                          type="url"
                          value={activeStep.audioUrl || ''}
                          onChange={(e) => handleUpdateActiveStep({ audioUrl: e.target.value.trim() || undefined })}
                          placeholder="https://.../narration-step1.mp3"
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>

                      {activeStep.audioUrl && (
                        <div className="p-2 bg-white rounded-xl border border-slate-200 space-y-1">
                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                            Preview Audio
                          </span>
                          <audio
                            controls
                            src={activeStep.audioUrl}
                            className="w-full h-8"
                            onError={() => console.warn('Audio preview error for URL:', activeStep.audioUrl)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* 8. Active Step DOM Privacy Modifications */}
              {activeStep.domModifications && activeStep.domModifications.length > 0 && (
                <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-2xl space-y-2">
                  <span className="font-bold text-amber-900 uppercase tracking-wider text-[10px] block">
                    Active DOM Privacy Rules ({activeStep.domModifications.length})
                  </span>

                  <div className="space-y-1.5">
                    {activeStep.domModifications.map((mod, mi) => (
                      <div
                        key={mi}
                        onMouseEnter={() => setHoveredPrivacySelector(mod.selector)}
                        onMouseLeave={() => setHoveredPrivacySelector(null)}
                        className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-amber-200/60 text-[10px] cursor-help hover:bg-amber-50 transition-colors"
                      >
                        <span className="font-bold capitalize text-amber-800">{mod.type}</span>
                        <span className="font-mono text-slate-500 truncate max-w-[120px]" title={mod.selector}>
                          {mod.elementDescription || mod.selector}
                        </span>
                        <button
                          onClick={() => handleRemoveDomModification(mi)}
                          className="text-rose-500 hover:text-rose-700 font-bold cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ================= Bottom Horizontal Filmstrip Steps Timeline ================= */}
      <div
        onDragOver={handleTimelineDragOver}
        onDrop={handleTimelineDrop}
        className="h-24 bg-white border-t border-slate-200 px-4 py-2 flex items-center gap-3.5 z-20 shrink-0 select-none shadow-md"
      >
        {/* Left: Add Step Action & Record More */}
        <div className="shrink-0 flex items-center gap-2">
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={handleAddStep}
              className="px-3.5 py-1.5 rounded-xl bg-[#0c3c60] hover:bg-[#092b45] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-900/15 transition-all cursor-pointer hover:scale-105"
              title="Add a blank step to walkthrough"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Step</span>
            </button>
            <span className="text-[10px] font-mono text-slate-500 font-bold">
              {steps.length} {steps.length === 1 ? 'Step' : 'Steps'}
            </span>
          </div>

          <button
            onClick={() => setIsAppendRecordModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0c3c60] text-xs font-bold flex items-center gap-1.5 border border-blue-200 transition-all cursor-pointer hover:scale-105"
            title="Record more steps directly on the live website"
          >
            <Video className="w-3.5 h-3.5" />
            <span>Record More</span>
          </button>
        </div>

        <div className="h-10 w-px bg-slate-200 shrink-0" />

        {/* Scroll Left Button */}
        <button
          type="button"
          onClick={() => timelineContainerRef.current?.scrollBy({ left: -260, behavior: 'smooth' })}
          className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-[#0c3c60] border border-slate-200 transition-colors shadow-2xs cursor-pointer shrink-0 hidden sm:flex items-center justify-center"
          title="Scroll Timeline Left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Center: Horizontally Scrollable Step Cards with Drag and Drop */}
        <div
          ref={timelineContainerRef}
          onDragOver={handleTimelineDragOver}
          onDrop={handleTimelineDrop}
          onWheel={(e) => {
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && e.deltaY !== 0) {
              e.currentTarget.scrollLeft += e.deltaY;
            }
          }}
          className="flex-1 min-w-0 flex items-center gap-2.5 overflow-x-auto py-1.5 px-1 scroll-smooth scrollbar-thin"
        >
          {steps.map((step, idx) => {
            const isActive = idx === activeStepIndex;
            const isDragging = draggedStepIndex === idx;
            const showDropIndicatorBefore =
              draggedStepIndex !== null &&
              draggedStepIndex !== idx &&
              dragOverTarget?.index === idx &&
              dragOverTarget.position === 'before';
            const showDropIndicatorAfter =
              draggedStepIndex !== null &&
              draggedStepIndex !== idx &&
              dragOverTarget?.index === idx &&
              dragOverTarget.position === 'after';

            return (
              <React.Fragment key={step.id}>
                {/* Drop Insertion Bar Indicator (Before) */}
                {showDropIndicatorBefore && (
                  <div className="shrink-0 w-2 h-18 flex items-center justify-center -mx-1 z-30 pointer-events-none animate-scale-in">
                    <div className="w-1.5 h-16 bg-blue-600 rounded-full shadow-lg shadow-blue-500/60 ring-2 ring-blue-300" />
                  </div>
                )}

                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleCardDragOver(e, idx)}
                  onDrop={(e) => handleCardDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  onClick={() => setActiveStepIndex(idx)}
                  className={`shrink-0 w-48 h-18 rounded-xl p-2.5 transition-all cursor-grab active:cursor-grabbing flex flex-col justify-between border relative group select-none ${
                    isDragging
                      ? 'opacity-35 scale-95 ring-2 ring-blue-500 border-dashed bg-blue-50/40'
                      : isActive
                      ? 'bg-blue-50/70 border-blue-600 shadow-md ring-2 ring-blue-600/30'
                      : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-sm'
                  }`}
                >
                  {/* Top Row: Number badge & Title */}
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-4.5 h-4.5 rounded-full text-[10px] font-extrabold flex items-center justify-center shrink-0 ${
                        isActive ? 'bg-[#0c3c60] text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="font-bold text-xs text-slate-900 truncate flex-1">
                      {step.title || `Step ${idx + 1}`}
                    </span>
                  </div>

                  {/* Bottom Row: Target selector & element type badge */}
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span className="font-mono truncate max-w-[95px]" title={step.targetSelector || 'body'}>
                      {step.targetSelector ? step.targetSelector.split(' > ').pop() : 'body'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-100 text-slate-600">
                      {step.stepType || 'tooltip'}
                    </span>
                  </div>

                  {/* Quick Action Overlay on Hover */}
                  <div className="absolute top-1 right-1 hidden group-hover:flex items-center gap-0.5 bg-white/95 backdrop-blur-xs rounded-lg p-0.5 shadow-xs border border-slate-200 z-10">
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveStep(idx, -1);
                        }}
                        className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-900 cursor-pointer"
                        title="Move Left 1 Step"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                    )}
                    {idx < steps.length - 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveStep(idx, 1);
                        }}
                        className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-900 cursor-pointer"
                        title="Move Right 1 Step"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateStep(idx);
                      }}
                      className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600 cursor-pointer"
                      title="Duplicate Step"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    {steps.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteStep(step.id);
                        }}
                        className="p-1 hover:bg-red-50 rounded text-slate-500 hover:text-red-600 cursor-pointer"
                        title="Delete Step"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Drop Insertion Bar Indicator (After) */}
                {showDropIndicatorAfter && (
                  <div className="shrink-0 w-2 h-18 flex items-center justify-center -mx-1 z-30 pointer-events-none animate-scale-in">
                    <div className="w-1.5 h-16 bg-blue-600 rounded-full shadow-lg shadow-blue-500/60 ring-2 ring-blue-300" />
                  </div>
                )}
              </React.Fragment>
            );
          })}

          {/* Trailing Drop Slot at End of Timeline */}
          {draggedStepIndex !== null && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                checkTimelineAutoScroll(e.clientX);
                setDragOverTarget({ index: steps.length - 1, position: 'after' });
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const dataIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
                const fromIdx = draggedIndexRef.current ?? (draggedStepIndex !== null ? draggedStepIndex : dataIndex);
                handleDragEnd();
                if (!isNaN(fromIdx) && fromIdx >= 0 && fromIdx < steps.length) {
                  executeStepReorder(fromIdx, steps.length - 1, 'after');
                }
              }}
              className={`shrink-0 w-36 h-18 border-2 border-dashed rounded-xl flex items-center justify-center gap-1.5 transition-all text-xs font-bold ${
                dragOverTarget?.index === steps.length - 1 && dragOverTarget.position === 'after'
                  ? 'border-blue-600 bg-blue-100/70 text-blue-700 scale-105 shadow-md ring-2 ring-blue-400'
                  : 'border-slate-300 bg-slate-50/70 text-slate-500 hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-600'
              }`}
            >
              <Plus className="w-4 h-4 text-blue-600" />
              <span>Drop at End</span>
            </div>
          )}
        </div>

        {/* Scroll Right Button */}
        <button
          type="button"
          onClick={() => timelineContainerRef.current?.scrollBy({ left: 260, behavior: 'smooth' })}
          className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-[#0c3c60] border border-slate-200 transition-colors shadow-2xs cursor-pointer shrink-0 hidden sm:flex items-center justify-center"
          title="Scroll Timeline Right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 1. Double-Confirmation "Go Live" Modal */}
      {isConfirmPublishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 flex items-start gap-4 bg-gradient-to-br from-blue-50/60 via-slate-50/40 to-white">
              <div className="w-12 h-12 rounded-2xl bg-[#0c3c60]/10 border border-[#0c3c60]/20 flex items-center justify-center text-[#0c3c60] shrink-0">
                <Globe className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100/80 text-blue-900 text-[10px] font-bold tracking-wide uppercase mb-1.5">
                  Ready to Go Live
                </div>
                <h3 className="text-lg font-black text-slate-900 leading-snug">
                  Publish "{demo?.title || 'Interactive Guide'}"
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Are you ready to publish this walkthrough to the public guide portal?
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Public URL Path:</span>
                  <span className="font-mono font-bold text-[#0c3c60]">
                    /{demo?.slug || demoId}
                  </span>
                </div>

                {/* Direct shortcut to customize slug in Guide Settings */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                  <span className="text-[11px] text-slate-500">Want a custom public link?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsConfirmPublishModalOpen(false);
                      setSettingsTab('general');
                      setIsSettingsModalOpen(true);
                    }}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>Edit slug in Guide Settings</span> &rarr;
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500 font-medium">Interactive Steps:</span>
                  <span className="font-bold text-slate-800">{steps.length} steps</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Current Status:</span>
                  {demo?.isPublished ? (
                    <span className="font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Live (Updates will be republished)
                    </span>
                  ) : (
                    <span className="font-bold text-amber-700 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Draft (Unpublished)
                    </span>
                  )}
                </div>
              </div>

              <div className="text-[11px] text-slate-600 bg-blue-50/60 border border-blue-100 rounded-xl p-3 flex items-start gap-2">
                <Globe className="w-4 h-4 text-[#0c3c60] shrink-0 mt-0.5" />
                <span>
                  Clicking <strong>Go Live Now</strong> compiles this walkthrough to Cloudflare R2 Edge CDN and makes it publicly accessible worldwide at <strong>{window.location.origin}/{demo?.slug || demoId}</strong>.
                </span>
              </div>

              <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsConfirmPublishModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executePublish}
                  className="px-5 py-2 rounded-xl bg-[#0c3c60] hover:bg-[#092b45] text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-950/20 transition-all cursor-pointer hover:scale-105 active:scale-95"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Go Live Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Screen-Locking Upload & Compilation Progress Modal */}
      {publishing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-fade-in select-none">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-center p-8">
            <div className="relative w-16 h-16 mx-auto mb-5 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-blue-100 animate-ping opacity-30" />
              <div className="absolute inset-0 rounded-full border-4 border-t-[#0c3c60] border-r-[#0c3c60] border-b-transparent border-l-transparent animate-spin" />
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-[#0c3c60]">
                <Globe className="w-6 h-6 animate-pulse" />
              </div>
            </div>

            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              Publishing Walkthrough...
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 min-h-[32px] flex items-center justify-center px-4">
              {publishProgressText || 'Packaging snapshots and compiling static manifest...'}
            </p>

            {/* Animated Progress Bar */}
            <div className="mt-6 mb-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1.5 px-1">
                <span>Progress</span>
                <span className="font-mono text-[#0c3c60]">{publishProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 p-0.5 overflow-hidden border border-slate-200/80 shadow-inner">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#0c3c60] via-blue-600 to-indigo-600 transition-all duration-300 shadow-sm"
                  style={{ width: `${Math.max(8, publishProgress)}%` }}
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-400">
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              <span>Screen is locked to ensure uninterrupted bundle compilation</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Publish Celebration Modal */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl">
            <div className="p-6 text-center bg-gradient-to-b from-blue-50/80 to-white border-b border-slate-200">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center mb-3">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">Your Guide is Now Live!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Your interactive walkthrough is published and ready to be shared with members.
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Direct Guide Public URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={publishedUrl}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(publishedUrl);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#0c3c60] hover:bg-[#092b45] text-white text-xs font-bold shrink-0 transition-colors cursor-pointer"
                  >
                    {copiedLink ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                <button
                  onClick={() => setIsPublishModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Done
                </button>
                <a
                  href={publishedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-2 rounded-xl bg-[#0c3c60] hover:bg-[#092b45] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-900/20"
                >
                  <span>Open Live Walkthrough</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overall Guide Settings Modal */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Overall Guide Settings</h3>
                  <p className="text-[11px] text-slate-500">Configure global playback and appearance</p>
                </div>
              </div>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 2-Tab Navigation: General vs Design & Branding */}
            <div className="flex border-b border-slate-200 bg-slate-50/70 p-1.5 gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setSettingsTab('general')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  settingsTab === 'general'
                    ? 'bg-white text-[#0c3c60] shadow-2xs border border-slate-200/80'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>General Settings</span>
              </button>
              <button
                type="button"
                onClick={() => setSettingsTab('branding')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  settingsTab === 'branding'
                    ? 'bg-white text-[#0c3c60] shadow-2xs border border-slate-200/80'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Design & Branding</span>
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {settingsTab === 'general' ? (
                <>
                  {/* Title */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Guide Title</label>
                    <input
                      type="text"
                      value={demo?.title || ''}
                      onChange={(e) => {
                        const newTitle = e.target.value;
                        if (demo) {
                          // If slug was never customized or equals previous generated slug, auto-update it
                          const currentAutoSlug = generateSlugFromTitle(demo.title);
                          const shouldAutoUpdateSlug = !demo.slug || demo.slug === currentAutoSlug;
                          setDemo({
                            ...demo,
                            title: newTitle,
                            slug: shouldAutoUpdateSlug ? generateSlugFromTitle(newTitle) : demo.slug
                          });
                        }
                        setIsDirty(true);
                      }}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Custom URL Slug (Direct Public Link) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Custom URL Slug (Direct Public Link)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          if (demo?.title) {
                            const generated = generateSlugFromTitle(demo.title);
                            setDemo({ ...demo, slug: generated });
                            setIsDirty(true);
                          }
                        }}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Auto-generate from title</span>
                      </button>
                    </div>

                    <div className={`flex items-center rounded-xl bg-slate-50 border focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500 overflow-hidden shadow-2xs transition-colors ${
                      demo?.slug && !validateSlug(demo.slug).valid
                        ? 'border-rose-400 focus-within:ring-rose-300'
                        : 'border-slate-300 focus-within:border-blue-500'
                    }`}>
                      <span className="px-3 text-xs font-mono font-semibold text-slate-500 select-none bg-slate-100/80 border-r border-slate-200 py-2">
                        /
                      </span>
                      <input
                        type="text"
                        value={demo?.slug || ''}
                        onChange={(e) => {
                          const sanitized = e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-_]/g, '-');
                          if (demo) setDemo({ ...demo, slug: sanitized });
                          setIsDirty(true);
                        }}
                        placeholder={generateSlugFromTitle(demo?.title || '') || 'guide-slug'}
                        className="w-full px-3 py-2 text-xs font-mono font-bold text-slate-900 bg-transparent focus:outline-none"
                      />
                    </div>

                    {/* Slug validation feedback */}
                    {demo?.slug && (() => {
                      const v = validateSlug(demo.slug);
                      return !v.valid ? (
                        <p className="mt-1 text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                          <span>⚠</span> {v.reason}
                        </p>
                      ) : (
                        <p className="mt-1 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                          <span>✓</span> Slug looks good
                        </p>
                      );
                    })()}

                    <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-500">
                      <span className="truncate">
                        Public Link:{' '}
                        <span className="font-mono text-blue-700 font-bold">
                          {window.location.origin}/{demo?.slug || generateSlugFromTitle(demo?.title || '') || demo?.id || 'guide-slug'}
                        </span>
                      </span>
                      <span className="shrink-0 text-slate-400">Direct clean URL</span>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={demo?.description || ''}
                      onChange={(e) => {
                        if (demo) setDemo({ ...demo, description: e.target.value });
                        setIsDirty(true);
                      }}
                      placeholder="Briefly describe what members will learn from this walkthrough..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Dynamic Labels & Tags */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Labels & Tags</label>
                    <LabelInput
                      labels={demo?.tags || []}
                      onChange={(newLabels) => {
                        if (demo) setDemo({ ...demo, tags: newLabels });
                        setIsDirty(true);
                      }}
                      placeholder="Type label & press Enter..."
                    />
                  </div>

                  {/* Cover / Preview Image Upload (WebP) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700">Preview & Cover Image (WebP)</label>
                      {demo?.coverImageUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            if (demo) setDemo({ ...demo, coverImageUrl: undefined });
                            setIsDirty(true);
                          }}
                          className="text-[11px] font-bold text-rose-600 hover:text-rose-800 transition-colors cursor-pointer"
                        >
                          Remove Image
                        </button>
                      )}
                    </div>

                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleCoverUpload}
                      className="hidden"
                    />

                    {demo?.coverImageUrl ? (
                      <div className="relative rounded-2xl overflow-hidden border border-slate-200 group aspect-video bg-slate-900">
                        <img
                          src={demo.coverImageUrl}
                          alt="Cover Preview"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-2xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => coverInputRef.current?.click()}
                            disabled={uploadingCover}
                            className="px-3 py-1.5 rounded-xl bg-white text-slate-900 text-xs font-bold shadow-md hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>{uploadingCover ? 'Optimizing WebP...' : 'Change Cover'}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => coverInputRef.current?.click()}
                        disabled={uploadingCover}
                        className="w-full p-4 border-2 border-dashed border-slate-300 hover:border-[#0c3c60] rounded-2xl bg-slate-50 hover:bg-blue-50/40 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer text-slate-600 group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 group-hover:text-[#0c3c60] group-hover:scale-110 transition-all shadow-2xs">
                          {uploadingCover ? <RefreshCw className="w-5 h-5 animate-spin text-[#0c3c60]" /> : <ImageIcon className="w-5 h-5" />}
                        </div>
                        <div className="text-center">
                          <span className="text-xs font-bold text-slate-800 block">
                            {uploadingCover ? 'Converting to WebP...' : 'Upload Preview / Cover Image'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            PNG, JPG, or WebP. Automatically converted to high-efficiency WebP format.
                          </span>
                        </div>
                      </button>
                    )}
                  </div>

                  {/* Featured Guide Toggle */}
                  <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-blue-50/70 to-slate-50 border border-blue-200/80 rounded-2xl">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#0c3c60] text-white flex items-center justify-center shrink-0">
                        <Bookmark className="w-4 h-4 fill-current" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-900">Featured Guide on Homepage</label>
                        <p className="text-[10px] text-slate-500">
                          Spotlights this walkthrough prominently in the Hero Banner on the public portal.
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={demo?.isFeatured === true}
                      onChange={(e) => {
                        if (demo) setDemo({ ...demo, isFeatured: e.target.checked });
                        setIsDirty(true);
                      }}
                      className="rounded border-slate-300 text-[#0c3c60] focus:ring-[#0c3c60] w-4 h-4 cursor-pointer accent-[#0c3c60]"
                    />
                  </div>

                  {/* Playback Display Mode */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Playback Display Mode</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (demo) setDemo({ ...demo, displayMode: 'standard' });
                          setIsDirty(true);
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${(demo?.displayMode || 'standard') === 'standard'
                            ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-extrabold text-xs text-slate-900">Standard Desktop</span>
                            <Lock className="w-3.5 h-3.5 text-blue-600" />
                          </div>
                          <p className="text-[10px] text-slate-500 leading-normal">
                            Locks the exact recorded desktop layout on all devices (Auto-scaled). Recommended.
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (demo) setDemo({ ...demo, displayMode: 'responsive' });
                          setIsDirty(true);
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${demo?.displayMode === 'responsive'
                            ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-extrabold text-xs text-slate-900">Fluid Responsive</span>
                            <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                          </div>
                          <p className="text-[10px] text-slate-500 leading-normal">
                            Allows the page to fluidly adjust breakpoints according to viewer screen size.
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Global Navigation Pill */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <div>
                      <label className="block text-xs font-bold text-slate-900 mb-0.5">Show Global Navigation Pill</label>
                      <p className="text-[10px] text-slate-500">
                        Displays the global progress bar and Prev/Next buttons at the bottom of the screen.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={demo?.showStepProgress !== false}
                      onChange={(e) => {
                        if (demo) setDemo({ ...demo, showStepProgress: e.target.checked });
                        setIsDirty(true);
                      }}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer accent-[#0c3c60]"
                    />
                  </div>

                  {/* Viewer Controls */}
                  <div className="pt-2 border-t border-slate-100 space-y-2.5">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-xs font-semibold text-slate-700">Show Progress Bar & Step Numbers</span>
                      <input
                        type="checkbox"
                        checked={demo?.showStepProgress ?? true}
                        onChange={(e) => {
                          if (demo) setDemo({ ...demo, showStepProgress: e.target.checked });
                          setIsDirty(true);
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-[#0c3c60]"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-xs font-semibold text-slate-700">Allow Viewers to Jump Steps</span>
                      <input
                        type="checkbox"
                        checked={demo?.allowStepJumping ?? true}
                        onChange={(e) => {
                          if (demo) setDemo({ ...demo, allowStepJumping: e.target.checked });
                          setIsDirty(true);
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-[#0c3c60]"
                      />
                    </label>
                  </div>

                  {/* Walkthrough Status / Unpublish Control */}
                  {demo?.isPublished && (
                    <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Walkthrough is Live
                        </span>
                        <p className="text-[10px] text-amber-800 mt-0.5">
                          Revert this guide to Draft mode to remove it from the public directory.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleUnpublish}
                        className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-900 text-xs font-bold hover:bg-amber-100 cursor-pointer transition-colors shrink-0 shadow-2xs"
                      >
                        Unpublish Guide
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  {/* Informational Header Banner */}
                  <div className="p-3 bg-blue-50/60 border border-blue-200/80 rounded-2xl flex items-start gap-2.5">
                    <Palette className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-blue-950">Global Design & Styling Defaults</h4>
                      <p className="text-[10px] text-blue-800/80 leading-relaxed mt-0.5">
                        These establish the default visual theme for all steps. Individual steps can still override any of these options in the step inspector.
                      </p>
                    </div>
                  </div>

                  {/* 1. Theme Accent Color with Custom Hex Code Picker */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700">Brand Accent Color</label>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {demo?.defaultStepSettings?.themeColor || demo?.theme?.primaryColor || '#0c3c60'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      {PRESET_THEME_COLORS.map((col) => (
                        <button
                          key={col.hex}
                          type="button"
                          onClick={() => handleUpdateDefaultStepSettings({ themeColor: col.hex })}
                          className={`w-7 h-7 rounded-full transition-transform cursor-pointer flex items-center justify-center ${(demo?.defaultStepSettings?.themeColor || demo?.theme?.primaryColor || '#0c3c60') === col.hex ? 'ring-2 ring-offset-2 ring-blue-600 scale-110' : 'hover:scale-105'
                            }`}
                          style={{ background: col.hex }}
                          title={col.name}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={demo?.defaultStepSettings?.themeColor || demo?.theme?.primaryColor || '#0c3c60'}
                        onChange={(e) => handleUpdateDefaultStepSettings({ themeColor: e.target.value })}
                        className="w-8 h-8 p-0.5 rounded cursor-pointer border border-slate-300"
                        title="Custom Hex Color"
                      />
                      <input
                        type="text"
                        value={demo?.defaultStepSettings?.themeColor || demo?.theme?.primaryColor || '#0c3c60'}
                        onChange={(e) => handleUpdateDefaultStepSettings({ themeColor: e.target.value })}
                        placeholder="#000000"
                        className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-[11px] uppercase font-mono text-slate-700 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* 2. Element Styling Defaults & Default Element Type for New Steps */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Element Styling Defaults</h4>
                        <p className="text-[10px] text-slate-500">Configure visual defaults for each element type.</p>
                      </div>
                    </div>

                    {/* Unified Element Tabs: [ 📌 Tooltip ] [ 🎯 Beacon ] [ 📢 Modal ] */}
                    <div className="flex rounded-xl bg-white p-1 border border-slate-200 shadow-2xs gap-1">
                      {[
                        { id: 'tooltip', label: '📌 Tooltip' },
                        { id: 'beacon', label: '🎯 Beacon' },
                        { id: 'modal', label: '📢 Modal' }
                      ].map((t) => {
                        const isSelected = elementDefaultsTab === t.id;
                        const isDefault = (demo?.defaultStepSettings?.stepType || 'tooltip') === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setElementDefaultsTab(t.id as any)}
                            className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                              isSelected
                                ? 'bg-[#0c3c60] text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                          >
                            <span>{t.label}</span>
                            {isDefault && (
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                                  isSelected ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
                                }`}
                                title="Default element type when adding new steps"
                              >
                                Default
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Status / Default for New Steps Indicator Bar */}
                    <div className="flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 text-[11px]">Default for new steps:</span>
                        <span className="font-bold text-slate-800 capitalize font-mono text-[11px]">
                          {demo?.defaultStepSettings?.stepType || 'tooltip'}
                        </span>
                      </div>
                      {(demo?.defaultStepSettings?.stepType || 'tooltip') !== elementDefaultsTab ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateDefaultStepSettings({ stepType: elementDefaultsTab })}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          Set {elementDefaultsTab} as default &rarr;
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                          <Check className="w-3.5 h-3.5" /> Active default
                        </span>
                      )}
                    </div>

                    {/* 3A: Tooltip Defaults Sub-Panel */}
                    {elementDefaultsTab === 'tooltip' && (
                      <div className="space-y-3.5 pt-1">
                        {/* Tooltip Card Surface Style */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-bold text-slate-700">Card Surface Style</label>
                            <span className="text-[10px] text-slate-500 font-mono capitalize">
                              {demo?.defaultStepSettings?.tooltipDefaults?.cardStyle || demo?.defaultStepSettings?.cardStyle || 'solid'}
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-1.5 bg-white p-1 rounded-xl border border-slate-200 text-center font-bold">
                            {(['solid', 'glass', 'dark', 'outline'] as const).map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() =>
                                  handleUpdateDefaultStepSettings({
                                    tooltipDefaults: {
                                      ...(demo?.defaultStepSettings?.tooltipDefaults || {}),
                                      cardStyle: st
                                    },
                                    cardStyle: st
                                  })
                                }
                                className={`py-1.5 rounded-lg text-xs capitalize transition-colors cursor-pointer ${(demo?.defaultStepSettings?.tooltipDefaults?.cardStyle || demo?.defaultStepSettings?.cardStyle || 'solid') === st
                                    ? 'bg-[#0c3c60] text-white shadow-2xs'
                                    : 'text-slate-600 hover:bg-slate-100'
                                  }`}
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Tooltip Callout Placement */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-bold text-slate-700">Default Callout Placement</label>
                            <span className="text-[10px] text-slate-500 font-mono capitalize">
                              {demo?.defaultStepSettings?.tooltipDefaults?.placement || demo?.defaultStepSettings?.placement || 'bottom'}
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-1 bg-white p-1 rounded-xl border border-slate-200 text-center font-bold">
                            {(['top', 'bottom', 'left', 'right'] as const).map((p) => (
                              <button
                                key={p}
                                type="button"
                                onClick={() =>
                                  handleUpdateDefaultStepSettings({
                                    tooltipDefaults: {
                                      ...(demo?.defaultStepSettings?.tooltipDefaults || {}),
                                      placement: p
                                    },
                                    placement: p
                                  })
                                }
                                className={`py-1.5 rounded-lg capitalize transition-colors cursor-pointer text-xs ${(demo?.defaultStepSettings?.tooltipDefaults?.placement || demo?.defaultStepSettings?.placement || 'bottom') === p
                                    ? 'bg-[#0c3c60] text-white shadow-2xs'
                                    : 'text-slate-600 hover:bg-slate-100'
                                  }`}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Tooltip Target Outline Box */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-bold text-slate-700">Target Outline Box</label>
                            <span className="text-[10px] text-slate-500 font-mono capitalize">
                              {demo?.defaultStepSettings?.tooltipDefaults?.targetHighlight || demo?.defaultStepSettings?.targetHighlight || 'none'}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border border-slate-200 text-center font-bold">
                            {[
                              { id: 'none', label: 'None' },
                              { id: 'solid', label: '🔲 Box' },
                              { id: 'bubble', label: '🫧 Bubble' },
                              { id: 'ring', label: '💫 Ring' },
                              { id: 'glow', label: '✨ Glow' },
                              { id: 'dashed', label: '📐 Dashed' }
                            ].map((hl) => (
                              <button
                                key={hl.id}
                                type="button"
                                onClick={() =>
                                  handleUpdateDefaultStepSettings({
                                    tooltipDefaults: {
                                      ...(demo?.defaultStepSettings?.tooltipDefaults || {}),
                                      targetHighlight: hl.id as any
                                    },
                                    targetHighlight: hl.id as any
                                  })
                                }
                                className={`py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${(demo?.defaultStepSettings?.tooltipDefaults?.targetHighlight || demo?.defaultStepSettings?.targetHighlight || 'none') === hl.id
                                    ? 'bg-[#0c3c60] text-white shadow-2xs'
                                    : 'text-slate-600 hover:bg-slate-100'
                                  }`}
                              >
                                {hl.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Tooltip Page Focus & Backdrop */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-bold text-slate-700">Page Focus & Backdrop</label>
                            <span className="text-[10px] text-slate-500 font-mono capitalize">
                              {demo?.defaultStepSettings?.tooltipDefaults?.focusBackdrop || demo?.defaultStepSettings?.focusBackdrop || 'none'}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border border-slate-200 text-center font-bold">
                            {[
                              { id: 'none', label: 'Natural' },
                              { id: 'dim', label: '💡 Dim' },
                              { id: 'blur', label: '🌫️ Blur' }
                            ].map((fb) => (
                              <button
                                key={fb.id}
                                type="button"
                                onClick={() =>
                                  handleUpdateDefaultStepSettings({
                                    tooltipDefaults: {
                                      ...(demo?.defaultStepSettings?.tooltipDefaults || {}),
                                      focusBackdrop: fb.id as any
                                    },
                                    focusBackdrop: fb.id as any
                                  })
                                }
                                className={`py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${(demo?.defaultStepSettings?.tooltipDefaults?.focusBackdrop || demo?.defaultStepSettings?.focusBackdrop || 'none') === fb.id
                                    ? 'bg-[#0c3c60] text-white shadow-2xs'
                                    : 'text-slate-600 hover:bg-slate-100'
                                  }`}
                              >
                                {fb.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Tooltip Pulsing Beacon Toggle & Placement */}
                        <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="block text-xs font-bold text-slate-900">Display Pulsing Beacon on Tooltips</span>
                              <p className="text-[10px] text-slate-500">Renders animated hotspot beacon alongside anchored tooltips.</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={demo?.defaultStepSettings?.tooltipDefaults?.showBeacon !== undefined ? demo.defaultStepSettings.tooltipDefaults.showBeacon : (demo?.defaultStepSettings?.showBeacon !== false)}
                              onChange={(e) =>
                                handleUpdateDefaultStepSettings({
                                  tooltipDefaults: {
                                    ...(demo?.defaultStepSettings?.tooltipDefaults || {}),
                                    showBeacon: e.target.checked
                                  },
                                  showBeacon: e.target.checked
                                })
                              }
                              className="w-4 h-4 text-blue-600 rounded cursor-pointer accent-[#0c3c60]"
                            />
                          </div>

                          {(demo?.defaultStepSettings?.tooltipDefaults?.showBeacon !== false && demo?.defaultStepSettings?.showBeacon !== false) && (
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Beacon Pin Position:</span>
                              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-0.5 rounded-lg">
                                {(['left', 'center', 'right'] as const).map((al) => (
                                  <button
                                    key={al}
                                    type="button"
                                    onClick={() =>
                                      handleUpdateDefaultStepSettings({
                                        tooltipDefaults: {
                                          ...(demo?.defaultStepSettings?.tooltipDefaults || {}),
                                          beaconConfig: {
                                            ...(demo?.defaultStepSettings?.tooltipDefaults?.beaconConfig || demo?.defaultStepSettings?.beaconConfig || { style: 'pulse' }),
                                            alignment: al
                                          }
                                        },
                                        beaconConfig: {
                                          ...(demo?.defaultStepSettings?.beaconConfig || { style: 'pulse' }),
                                          alignment: al
                                        }
                                      })
                                    }
                                    className={`px-2 py-0.5 rounded text-[11px] font-bold capitalize transition-colors cursor-pointer ${(demo?.defaultStepSettings?.tooltipDefaults?.beaconConfig?.alignment || demo?.defaultStepSettings?.beaconConfig?.alignment || 'center') === al
                                        ? 'bg-[#0c3c60] text-white shadow-2xs'
                                        : 'text-slate-600 hover:bg-white'
                                      }`}
                                  >
                                    {al}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 3B: Beacon Defaults Sub-Panel */}
                    {elementDefaultsTab === 'beacon' && (
                      <div className="space-y-3.5 pt-1">
                        <div className="p-2.5 bg-blue-50/70 border border-blue-200/80 rounded-xl text-[11px] text-blue-900 leading-relaxed">
                          🎯 <strong>Beacon Steps</strong> focus viewer attention directly on an interactive element without displaying an attached card.
                        </div>

                        {/* Beacon Placement Alignment */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-bold text-slate-700">Hotspot Placement on Element</label>
                            <span className="text-[10px] text-slate-500 font-mono capitalize">
                              {demo?.defaultStepSettings?.beaconDefaults?.alignment || demo?.defaultStepSettings?.beaconConfig?.alignment || 'center'}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border border-slate-200 text-center font-bold">
                            {(['left', 'center', 'right'] as const).map((al) => (
                              <button
                                key={al}
                                type="button"
                                onClick={() =>
                                  handleUpdateDefaultStepSettings({
                                    beaconDefaults: {
                                      ...(demo?.defaultStepSettings?.beaconDefaults || {}),
                                      alignment: al
                                    }
                                  })
                                }
                                className={`py-1.5 rounded-lg text-xs capitalize transition-colors cursor-pointer ${(demo?.defaultStepSettings?.beaconDefaults?.alignment || demo?.defaultStepSettings?.beaconConfig?.alignment || 'center') === al
                                    ? 'bg-[#0c3c60] text-white shadow-2xs'
                                    : 'text-slate-600 hover:bg-slate-100'
                                  }`}
                              >
                                {al}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Beacon Animation Style */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-bold text-slate-700">Animation Style</label>
                            <span className="text-[10px] text-slate-500 font-mono capitalize">
                              {demo?.defaultStepSettings?.beaconDefaults?.style || demo?.defaultStepSettings?.beaconConfig?.style || 'pulse'}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border border-slate-200 text-center font-bold">
                            {(['pulse', 'dot', 'icon'] as const).map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() =>
                                  handleUpdateDefaultStepSettings({
                                    beaconDefaults: {
                                      ...(demo?.defaultStepSettings?.beaconDefaults || {}),
                                      style: st
                                    }
                                  })
                                }
                                className={`py-1.5 rounded-lg text-xs capitalize transition-colors cursor-pointer ${(demo?.defaultStepSettings?.beaconDefaults?.style || demo?.defaultStepSettings?.beaconConfig?.style || 'pulse') === st
                                    ? 'bg-[#0c3c60] text-white shadow-2xs'
                                    : 'text-slate-600 hover:bg-slate-100'
                                  }`}
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Icon Picker when style === 'icon' */}
                        {(demo?.defaultStepSettings?.beaconDefaults?.style === 'icon' || (!demo?.defaultStepSettings?.beaconDefaults?.style && demo?.defaultStepSettings?.beaconConfig?.style === 'icon')) && (
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Beacon Icon</label>
                            <div className="grid grid-cols-5 gap-1 bg-white p-1 rounded-xl border border-slate-200">
                              {(['question', 'info', 'hand', 'plus', 'star'] as const).map((ic) => (
                                <button
                                  key={ic}
                                  type="button"
                                  onClick={() =>
                                    handleUpdateDefaultStepSettings({
                                      beaconDefaults: {
                                        ...(demo?.defaultStepSettings?.beaconDefaults || {}),
                                        style: 'icon',
                                        icon: ic
                                      }
                                    })
                                  }
                                  className={`p-2 rounded-lg border text-center font-bold transition-colors cursor-pointer ${(demo?.defaultStepSettings?.beaconDefaults?.icon || demo?.defaultStepSettings?.beaconConfig?.icon) === ic
                                      ? 'border-blue-600 bg-blue-50 text-[#0c3c60]'
                                      : 'border-transparent text-slate-600 hover:bg-slate-100'
                                    }`}
                                >
                                  {ic === 'question' && '?'}
                                  {ic === 'info' && 'i'}
                                  {ic === 'hand' && '👆'}
                                  {ic === 'plus' && '+'}
                                  {ic === 'star' && '★'}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Beacon Target Outline Box */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-bold text-slate-700">Target Outline Box</label>
                            <span className="text-[10px] text-slate-500 font-mono capitalize">
                              {demo?.defaultStepSettings?.beaconDefaults?.targetHighlight || 'none'}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border border-slate-200 text-center font-bold">
                            {[
                              { id: 'none', label: 'None' },
                              { id: 'solid', label: '🔲 Box' },
                              { id: 'bubble', label: '🫧 Bubble' },
                              { id: 'ring', label: '💫 Ring' },
                              { id: 'glow', label: '✨ Glow' },
                              { id: 'dashed', label: '📐 Dashed' }
                            ].map((hl) => (
                              <button
                                key={hl.id}
                                type="button"
                                onClick={() =>
                                  handleUpdateDefaultStepSettings({
                                    beaconDefaults: {
                                      ...(demo?.defaultStepSettings?.beaconDefaults || {}),
                                      targetHighlight: hl.id as any
                                    }
                                  })
                                }
                                className={`py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${(demo?.defaultStepSettings?.beaconDefaults?.targetHighlight || 'none') === hl.id
                                    ? 'bg-[#0c3c60] text-white shadow-2xs'
                                    : 'text-slate-600 hover:bg-slate-100'
                                  }`}
                              >
                                {hl.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Beacon Page Focus & Backdrop */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-bold text-slate-700">Page Focus & Backdrop</label>
                            <span className="text-[10px] text-slate-500 font-mono capitalize">
                              {demo?.defaultStepSettings?.beaconDefaults?.focusBackdrop || 'none'}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border border-slate-200 text-center font-bold">
                            {[
                              { id: 'none', label: 'Natural' },
                              { id: 'dim', label: '💡 Dim' },
                              { id: 'blur', label: '🌫️ Blur' }
                            ].map((fb) => (
                              <button
                                key={fb.id}
                                type="button"
                                onClick={() =>
                                  handleUpdateDefaultStepSettings({
                                    beaconDefaults: {
                                      ...(demo?.defaultStepSettings?.beaconDefaults || {}),
                                      focusBackdrop: fb.id as any
                                    }
                                  })
                                }
                                className={`py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${(demo?.defaultStepSettings?.beaconDefaults?.focusBackdrop || 'none') === fb.id
                                    ? 'bg-[#0c3c60] text-white shadow-2xs'
                                    : 'text-slate-600 hover:bg-slate-100'
                                  }`}
                              >
                                {fb.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 3C: Modal Defaults Sub-Panel */}
                    {elementDefaultsTab === 'modal' && (
                      <div className="space-y-3.5 pt-1">
                        <div className="p-2.5 bg-blue-50/70 border border-blue-200/80 rounded-xl text-[11px] text-blue-900 leading-relaxed">
                          📢 <strong>Modal Steps</strong> present full-bleed centered welcome dialogs, milestones, or concluding announcements with no targeted element on the page.
                        </div>

                        {/* Modal Card Surface Style */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-bold text-slate-700">Modal Surface Style</label>
                            <span className="text-[10px] text-slate-500 font-mono capitalize">
                              {demo?.defaultStepSettings?.modalDefaults?.cardStyle || demo?.defaultStepSettings?.cardStyle || 'solid'}
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-1.5 bg-white p-1 rounded-xl border border-slate-200 text-center font-bold">
                            {(['solid', 'glass', 'dark', 'outline'] as const).map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() =>
                                  handleUpdateDefaultStepSettings({
                                    modalDefaults: {
                                      ...(demo?.defaultStepSettings?.modalDefaults || {}),
                                      cardStyle: st
                                    }
                                  })
                                }
                                className={`py-1.5 rounded-lg text-xs capitalize transition-colors cursor-pointer ${(demo?.defaultStepSettings?.modalDefaults?.cardStyle || demo?.defaultStepSettings?.cardStyle || 'solid') === st
                                    ? 'bg-[#0c3c60] text-white shadow-2xs'
                                    : 'text-slate-600 hover:bg-slate-100'
                                  }`}
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Modal Backdrop Scrim */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-bold text-slate-700">Modal Backdrop Scrim</label>
                            <span className="text-[10px] text-slate-500 font-mono capitalize">
                              {demo?.defaultStepSettings?.modalDefaults?.focusBackdrop || 'dim'}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border border-slate-200 text-center font-bold">
                            {[
                              { id: 'dim', label: '💡 Dim Scrim' },
                              { id: 'blur', label: '🌫️ Blur Scrim' },
                              { id: 'none', label: 'Natural' }
                            ].map((fb) => (
                              <button
                                key={fb.id}
                                type="button"
                                onClick={() =>
                                  handleUpdateDefaultStepSettings({
                                    modalDefaults: {
                                      ...(demo?.defaultStepSettings?.modalDefaults || {}),
                                      focusBackdrop: fb.id as any
                                    }
                                  })
                                }
                                className={`py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${(demo?.defaultStepSettings?.modalDefaults?.focusBackdrop || 'dim') === fb.id
                                    ? 'bg-[#0c3c60] text-white shadow-2xs'
                                    : 'text-slate-600 hover:bg-slate-100'
                                  }`}
                              >
                                {fb.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 4. Bulk Apply Action Card */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50/60 border border-amber-200 flex items-center justify-between gap-3 shadow-xs">
                    <div>
                      <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                        <span>⚡</span>
                        <span>Apply Defaults to All Steps</span>
                      </h4>
                      <p className="text-[10px] text-amber-700 mt-0.5">
                        Intelligently applies Tooltip, Beacon, and Modal defaults to matching steps across all {steps.length} steps. Step content is strictly preserved.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyDefaultsToAllSteps}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer shrink-0 hover:scale-105 active:scale-95"
                    >
                      Apply to All
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={applyDefaultsToAllExistingSteps}
                  onChange={(e) => setApplyDefaultsToAllExistingSteps(e.target.checked)}
                  className="rounded border-slate-300 text-[#0c3c60] focus:ring-[#0c3c60] w-4 h-4 accent-[#0c3c60]"
                />
                <span className="text-[11px] font-semibold text-slate-700">
                  Apply design defaults to all {steps.length} existing steps
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={async () => {
                    let stepsToSave = steps;
                    if (applyDefaultsToAllExistingSteps && demo?.defaultStepSettings) {
                      stepsToSave = applyDefaultsToSteps(steps, demo.defaultStepSettings, demo.theme?.primaryColor);
                      setSteps(stepsToSave);
                    }
                    await handleSaveAll(stepsToSave);
                    setIsSettingsModalOpen(false);
                  }}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    saving
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-[#0c3c60] hover:bg-[#092b45] text-white shadow-md'
                  }`}
                >
                  {saving && <Compass className="w-3.5 h-3.5 animate-spin" />}
                  <span>{saving ? 'Saving...' : 'Save Settings'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Append Recording Live Website Modal */}
      {isAppendRecordModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-200 bg-slate-50/60 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0c3c60] flex items-center justify-center border border-blue-100">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Record More Steps</h2>
                  <p className="text-xs text-slate-500">Append new clicks directly to this walkthrough</p>
                </div>
              </div>
              <button
                onClick={() => setIsAppendRecordModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!demoId) return;
                setIsAppendRecordModalOpen(false);
                const targetUrl = appendTargetUrl.startsWith('http')
                  ? appendTargetUrl
                  : `https://${appendTargetUrl}`;
                window.open(targetUrl, '_blank');
                window.postMessage(
                  {
                    type: 'NAVIGATE_START_RECORDING',
                    demoId,
                    demoTitle: demo?.title || 'Walkthrough',
                    isAppend: true
                  },
                  '*'
                );
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Target Website URL *
                </label>
                <input
                  type="url"
                  required
                  value={appendTargetUrl}
                  onChange={(e) => setAppendTargetUrl(e.target.value)}
                  placeholder="https://my.rotary.org"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#0c3c60] focus:ring-2 focus:ring-blue-100"
                />
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                  The recorder widget will appear on this website. Any new clicks will be appended starting after <strong>Step {steps.length}</strong>.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAppendRecordModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0c3c60] hover:bg-[#092d48] text-white text-xs font-bold transition-all shadow-md shadow-blue-900/20 cursor-pointer flex items-center gap-1.5"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Launch & Append</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
