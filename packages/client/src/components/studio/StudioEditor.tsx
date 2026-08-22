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
  HotspotPlacement,
  HotspotTriggerType,
  StepElementType,
  FocusBackdropType,
  TargetHighlightType,
  TargetCoordinates,
  rehydrateIframeSnapshot,
  generateCssSelector,
  getElementCoordinates,
  computeTooltipPosition,
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
  updateDemo,
  generateSlugFromTitle
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
  const [canvasMode, setCanvasMode] = useState<'target' | 'addStep' | 'domEdit'>('target');
  const [targetFeedback, setTargetFeedback] = useState<string | null>(null);
  const [manualSelectorInput, setManualSelectorInput] = useState<string>('');
  const [canvasViewport, setCanvasViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [viewportScaleMode, setViewportScaleMode] = useState<'fit' | '100'>('fit');
  const canvasOuterRef = useRef<HTMLDivElement | null>(null);
  const [wrapperDimensions, setWrapperDimensions] = useState<{ width: number; height: number }>({ width: 1000, height: 700 });
  const [liveTargetRect, setLiveTargetRect] = useState<LiveTargetRect | null>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'design' | 'advanced'>('content');
  const [canvasContainerSize, setCanvasContainerSize] = useState<{ width: number; height: number }>({ width: 960, height: 620 });
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);

  // History for Undo/Redo
  const [history, setHistory] = useState<StepDocument[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const skipHistoryRef = useRef<boolean>(false);

  // Drag and Drop state for timeline reordering
  const [draggedStepIndex, setDraggedStepIndex] = useState<number | null>(null);
  const [dragOverStepIndex, setDragOverStepIndex] = useState<number | null>(null);

  // DOM Modification Action Modal
  const [selectedDomEl, setSelectedDomEl] = useState<{ selector: string; text: string; element?: HTMLElement } | null>(null);
  const [hoveredPrivacySelector, setHoveredPrivacySelector] = useState<string | null>(null);
  const [newTextValue, setNewTextValue] = useState<string>('');

  // Publish Modal State
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

  // Active step
  const activeStep = steps[activeStepIndex] || null;

  // Refs for zero-stale-closure iframe event handlers
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasModeRef = useRef<'target' | 'addStep' | 'domEdit'>(canvasMode);
  const activeStepRef = useRef<StepDocument | null>(activeStep);
  const activeStepIndexRef = useRef<number>(activeStepIndex);
  const stepsRef = useRef<StepDocument[]>(steps);
  const iframeListenersCleanupRef = useRef<(() => void) | null>(null);
  const rafRef = useRef<number | null>(null);

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

  // 1.2: Dynamic canvas container size via ResizeObserver
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setCanvasContainerSize({ width, height });
        }
      }
    });

    observer.observe(container);
    // Initial measurement
    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setCanvasContainerSize({ width: rect.width, height: rect.height });
    }

    return () => observer.disconnect();
  }, []);

  // Real-time dynamic target tracking on scroll & resize inside the canvas iframe
  const updateTargetCoordinates = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe || !activeStep) {
      setLiveTargetRect(null);
      return;
    }

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    const targetEl = findElementInSnapshot(doc, activeStep.targetSelector, activeStep.targetCoordinates);

    if (targetEl) {
      const rect = targetEl.getBoundingClientRect();
      setLiveTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
        right: rect.right
      });
    } else {
      // 1.3: Aggressive fallback - always produce a valid rect from stored coordinates
      const scrollY = iframe.contentWindow?.scrollY || 0;
      const scrollX = iframe.contentWindow?.scrollX || 0;
      const coords = activeStep.targetCoordinates || { x: 100, y: 100, width: 200, height: 60 };
      const top = coords.y - scrollY;
      const left = coords.x - scrollX;
      setLiveTargetRect({
        top,
        left,
        width: coords.width,
        height: coords.height,
        bottom: top + coords.height,
        right: left + coords.width
      });
    }
  }, [activeStep]);

  // 1.3: RAF loop to continuously update target coordinates for sticky overlays
  useEffect(() => {
    if (!activeStep) return;

    let running = true;
    const tick = () => {
      if (!running) return;
      updateTargetCoordinates();
      rafRef.current = requestAnimationFrame(tick);
    };
    // Start with a short delay to let iframe settle
    const timeout = setTimeout(() => {
      rafRef.current = requestAnimationFrame(tick);
    }, 100);

    return () => {
      running = false;
      clearTimeout(timeout);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [activeStep?.id, activeStep?.stepType, activeStep?.showSpotlight, updateTargetCoordinates]);

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

        // Check if this is a newly recorded tour from the extension
        const isRecordedTour = demoId!.startsWith('demo_rec_') || window.location.search.includes('source=extension');

        if (isRecordedTour && (!d || sList.length === 0)) {
          setSyncStatusMessage('Connecting to extension & importing captured DOM steps...');
          // Request recorded data directly from extension content script bridge
          window.postMessage({ type: 'NAVIGATE_STUDIO_REQUEST_RECORDED_TOUR', demoId }, '*');
        } else {
          setSyncStatusMessage('Loading walkthrough details & steps...');
        }

        const authorUser = getLocalUser();
        if (!d) {
          d = {
            id: demoId!,
            title: isRecordedTour ? 'Captured Walkthrough' : 'New Interactive Walkthrough',
            description: 'Created with NAVIGATE Studio',
            authorId: authorUser?.uid || 'creator',
            authorEmail: authorUser?.email || '',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            stepOrder: [],
            isPublished: false,
            tags: ['Rotary Guide']
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
        if (sList.length === 0 && !isRecordedTour) {
          const initialStepId = `step_${Date.now()}_1`;
          const starterSnapshot = createDefaultBlankSnapshot(initialStepId);
          await saveDOMSnapshot(demoId!, initialStepId, starterSnapshot);

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
            snapshotUrl: starterSnapshot.id,
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

          // Auto-sync steps and snapshots to Firestore in background
          for (const st of sList) {
            saveStep(demoId!, st).catch(() => {});
            getDOMSnapshot(st.snapshotUrl, demoId!).then((snap) => {
              if (snap) {
                saveDOMSnapshot(demoId!, st.snapshotUrl, snap).catch(() => {});
              }
            }).catch(() => {});
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadData();

    // Listen for storage and custom extension bridge events
    const handleSyncChange = () => {
      loadData();
    };

    const handleWindowMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'NAVIGATE_STUDIO_RECORDED_TOUR_RESPONSE' && event.data?.demoId === demoId) {
        setSyncStatusMessage('Recorded session received! Rehydrating interactive canvas...');
        const tour = event.data.tourData;
        if (tour) {
          const authorUser = getLocalUser();
          const cleanDemo: DemoDocument = {
            ...tour.demo,
            authorId: authorUser?.uid || tour.demo.authorId || 'creator',
            authorEmail: authorUser?.email || tour.demo.authorEmail || ''
          };
          setDemo(cleanDemo);
          await updateDemo(demoId, cleanDemo);

          if (tour.steps && tour.steps.length > 0) {
            setSteps(tour.steps);
            setHistory([tour.steps]);
            setHistoryIndex(0);
            setActiveStepIndex(0);

            // Persist steps and snapshots to storage & Firestore
            for (const st of tour.steps) {
              await saveStep(demoId, st);
            }
            if (tour.snapshots) {
              for (const [sKey, sObj] of Object.entries(tour.snapshots)) {
                saveDOMSnapshot(demoId, sKey, sObj as any).catch(() => {});
              }
              // Immediately load snapshot for first step
              const firstSnapKey = tour.steps[0]?.snapshotUrl;
              if (firstSnapKey && tour.snapshots[firstSnapKey]) {
                const s = tour.snapshots[firstSnapKey];
                setCurrentSnapshot(s);
                if (iframeRef.current) {
                  rehydrateIframeSnapshot(iframeRef.current, s, { disableNavigation: true });
                }
              }
            }
          }
        }
      } else if (event.data?.type === 'NAVIGATE_EXTENSION_TOUR_LOADED' && event.data?.demoId === demoId) {
        loadData();
      }
    };

    window.addEventListener('storage', handleSyncChange);
    window.addEventListener('navigate-tour-ready', handleSyncChange);
    window.addEventListener('message', handleWindowMessage);

    return () => {
      window.removeEventListener('storage', handleSyncChange);
      window.removeEventListener('navigate-tour-ready', handleSyncChange);
      window.removeEventListener('message', handleWindowMessage);
    };
  }, [demoId]);

  // Load snapshot for active step and rehydrate iframe
  useEffect(() => {
    if (!activeStep) {
      setSnapshotLoading(false);
      return;
    }

    async function loadSnapshot() {
      setSnapshotLoading(true);
      setSyncStatusMessage(`Rehydrating Step ${activeStep?.stepNumber || 1} DOM snapshot...`);
      try {
        const snap = await getDOMSnapshot(activeStep!.snapshotUrl, demoId);
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

            // Attach scroll & resize listeners to iframe window for 60fps sticky positioning in Studio
            const iframeWin = iframeRef.current.contentWindow;
            if (iframeWin) {
              iframeWin.addEventListener('scroll', updateTargetCoordinates, { passive: true });
              iframeWin.addEventListener('resize', updateTargetCoordinates, { passive: true });
            }

            // 1.4: Setup iframe listeners (will be re-attached when canvasMode changes)
            if (iframeListenersCleanupRef.current) {
              iframeListenersCleanupRef.current();
            }
            iframeListenersCleanupRef.current = setupIframeListeners() || null;

            scrollToTarget();
            setTimeout(() => {
              scrollToTarget();
              updateTargetCoordinates();
            }, 60);
            setTimeout(() => {
              scrollToTarget();
              updateTargetCoordinates();
            }, 250);
          }
        }
      } catch (err) {
        console.error('Failed to load snapshot:', err);
      } finally {
        setSnapshotLoading(false);
      }
    }

    loadSnapshot();

    return () => {
      const iframeWin = iframeRef.current?.contentWindow;
      if (iframeWin) {
        iframeWin.removeEventListener('scroll', updateTargetCoordinates);
        iframeWin.removeEventListener('resize', updateTargetCoordinates);
      }
    };
  }, [activeStep?.id, activeStep?.snapshotUrl, updateTargetCoordinates]);

  // Fast live update for DOM modifications without re-rendering or flickering the iframe
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

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target || target === doc.body || target === doc.documentElement) return;

      if (highlightedEl && highlightedEl !== target) {
        highlightedEl.classList.remove('tour-element-hovered');
      }
      target.classList.add('tour-element-hovered');
      highlightedEl = target;
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target) {
        target.classList.remove('tour-element-hovered');
      }
    };

    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      let target = e.target as HTMLElement;
      if (!target) return;

      // CRITICAL: If e.target resolved to body/html (transparent overlay click-through),
      // use elementFromPoint to find the actual deepest visual element the user meant to click.
      if (target === doc.body || target === doc.documentElement) {
        const deepEl = doc.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
        if (deepEl && deepEl !== doc.body && deepEl !== doc.documentElement) {
          target = deepEl;
        } else {
          // Truly clicked empty body area - reject for all modes
          setTargetFeedback('⚠️ Clicked empty area. Please click directly on a visible element.');
          setTimeout(() => setTargetFeedback(null), 3000);
          return;
        }
      }

      const selector = generateCssSelector(target);
      const coords = getElementCoordinates(target);

      // Read from ref to always get current mode & step without stale closures
      const currentMode = canvasModeRef.current;
      const currentStep = activeStepRef.current;
      const currentIndex = activeStepIndexRef.current;

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

        // Immediately set liveTargetRect from clicked element so tooltip instantly snaps to it
        const rect = target.getBoundingClientRect();
        setLiveTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          bottom: rect.bottom,
          right: rect.right
        });

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
        setNewTextValue(target.textContent || '');
      }
    };

    doc.addEventListener('mouseover', handleMouseOver);
    doc.addEventListener('mouseout', handleMouseOut);
    doc.addEventListener('click', handleClick, true);

    return () => {
      doc.removeEventListener('mouseover', handleMouseOver);
      doc.removeEventListener('mouseout', handleMouseOut);
      doc.removeEventListener('click', handleClick, true);
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
        const className = selectedDomEl.element.className.split(' ')[0];
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

    // Apply rules across whole iframe document
    const doc = iframeRef.current?.contentDocument;
    if (doc) {
      applyDOMModifications(doc, updatedMods);
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
      applyDOMModifications(doc, updated);
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
  const handleSaveAll = async () => {
    if (!demoId || !demo) return;
    setSaving(true);
    try {
      // 1. Update demo document
      await updateDemo(demoId, {
        title: demo.title,
        description: demo.description,
        tags: demo.tags,
        theme: demo.theme,
        displayMode: demo.displayMode || 'standard',
        showStepProgress: demo.showStepProgress ?? true,
        allowStepJumping: demo.allowStepJumping ?? true,
        stepOrder: steps.map((s) => s.id)
      });

      // 2. Persist all steps
      for (const step of steps) {
        await saveStep(demoId, step);
      }

      setIsDirty(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to save changes:', err);
    } finally {
      setSaving(false);
    }
  };

  // Debounced background auto-save (2000ms idle window after last edit)
  useEffect(() => {
    if (!isDirty || saving || !demoId || !demo) return;
    const timer = setTimeout(() => {
      handleSaveAll();
    }, 2000);
    return () => clearTimeout(timer);
  }, [isDirty, saving, demoId, demo, steps]);

  // Add a new step
  const handleAddStep = async () => {
    if (!demoId) return;

    const newStepId = `step_${Date.now()}_${steps.length + 1}`;
    const starterSnapshot = currentSnapshot || createDefaultBlankSnapshot(newStepId);
    const snapshotUrl = await saveDOMSnapshot(demoId, newStepId, starterSnapshot);

    const newStep: StepDocument = {
      id: newStepId,
      stepNumber: steps.length + 1,
      title: `Step ${steps.length + 1}`,
      description: 'Add a helpful explanation for this step.',
      targetSelector: 'body',
      targetCoordinates: { x: 100, y: 100, width: 200, height: 60, scrollX: 0, scrollY: 0 },
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
    setTargetFeedback('✨ Step added! Click any button, link, or section in the canvas to anchor it.');
    setTimeout(() => setTargetFeedback(null), 4000);

    await saveStep(demoId, newStep);
    await updateDemo(demoId, {
      stepOrder: updatedSteps.map((s) => s.id)
    });
  };

  // Delete a step
  const handleDeleteStep = async (stepId: string) => {
    if (!demoId || steps.length <= 1) return;

    const updatedSteps = steps.filter((s) => s.id !== stepId);
    setSteps(updatedSteps);
    setActiveStepIndex(Math.max(0, activeStepIndex - 1));
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
    const duplicatedStep: StepDocument = {
      ...stepToDup,
      id: newStepId,
      stepNumber: steps.length + 1,
      title: `${stepToDup.title} (Copy)`,
      createdAt: Date.now()
    };

    const updatedSteps = [...steps];
    updatedSteps.splice(targetIdx + 1, 0, duplicatedStep);
    setSteps(updatedSteps);
    setActiveStepIndex(targetIdx + 1);
    setIsDirty(true);

    await saveStep(demoId, duplicatedStep);
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

    setSteps(reordered);
    setActiveStepIndex(toIndex);
    setIsDirty(true);

    await reorderSteps(
      demoId,
      reordered.map((s) => s.id)
    );
  };

  // Live in-editor testing of form typing simulation
  const handleTestTyping = () => {
    const iframe = iframeRef.current;
    if (!iframe || !activeStep?.inputAction?.textToType) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    const targetEl = findElementInSnapshot(doc, activeStep.targetSelector, activeStep.targetCoordinates);
    if (targetEl && (targetEl instanceof HTMLInputElement || targetEl instanceof HTMLTextAreaElement)) {
      simulateTypingInElement(targetEl, activeStep.inputAction.textToType, activeStep.inputAction.typingSpeedMs || 45);
    } else {
      alert('Target element is not an input box. Select a text input or textarea on the canvas to test typing simulation.');
    }
  };

  // Test Player Handler (Saves changes first if dirty)
  const handleTestPlayer = async () => {
    if (isDirty) {
      await handleSaveAll();
    }
    window.open(`/${demo?.slug || demoId}`, '_blank');
  };

  // 2.2: Keyboard Shortcuts (Cmd+S / Ctrl+S for Save, Cmd+Z for Undo/Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveAll();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDuplicateStep();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (activeStep && steps.length > 1) {
          e.preventDefault();
          handleDeleteStep(activeStep.id);
        }
      } else if (e.key.toLowerCase() === 't') {
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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    history, historyIndex, handleUndo, handleRedo, handleDuplicateStep, handleDeleteStep, 
    activeStep, steps.length, activeStepIndex
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
        setIsPublishModalOpen(true);
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
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

  const isModalMode = activeStep?.stepType === 'modal';
  const isBeaconOnlyMode = activeStep?.stepType === 'beacon';
  const showTooltip = !isBeaconOnlyMode && !isModalMode;

  const focusBackdrop: FocusBackdropType =
    activeStep?.focusBackdrop ||
    (activeStep?.showSpotlight || activeStep?.stepType === 'spotlight' ? 'dim' : 'none');

  const targetHighlight: TargetHighlightType =
    activeStep?.targetHighlight || (focusBackdrop !== 'none' ? 'solid' : 'none');

  const showBeacon =
    activeStep?.stepType === 'beacon' ||
    (activeStep?.stepType === 'tooltip' && activeStep?.showBeacon === true);

  const tooltipPosition = computeTooltipPosition(
    targetRectForTooltip,
    canvasContainerSize,
    activeStep?.placement || 'bottom',
    { width: 330, height: 200 },
    14
  );

  // Active theme styling
  const themeColor = activeStep?.themeColor || '#0c3c60';
  const cardStyle = activeStep?.cardStyle || 'solid'; // 'solid' | 'glass' | 'dark' | 'outline'

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

  if (loading) {
    return (
      <div className="h-screen bg-slate-50 flex items-center justify-center text-slate-900 font-['Plus_Jakarta_Sans',sans-serif] select-none">
        <div className="flex flex-col items-center gap-4 p-8 bg-white border border-slate-200 rounded-3xl shadow-xl max-w-sm w-full mx-4 text-center animate-fade-in">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0c3c60]">
              <Compass className="w-7 h-7 animate-spin text-blue-600" style={{ animationDuration: '3s' }} />
            </div>
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            </span>
          </div>

          <div>
            <h2 className="text-base font-extrabold text-[#0c3c60]">NAVIGATE Studio</h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {syncStatusMessage}
            </p>
          </div>

          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
            <div className="h-full bg-gradient-to-r from-[#0c3c60] via-blue-600 to-indigo-600 rounded-full animate-pulse w-3/4" />
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
              onClick={() => setIsSettingsModalOpen(true)}
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
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
              saving
                ? 'bg-slate-100 text-slate-500 border border-slate-200'
                : saveSuccess
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                : isDirty
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 ring-2 ring-blue-400/40'
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
                <Save className={`w-3.5 h-3.5 ${isDirty ? 'text-white animate-pulse' : 'text-slate-500'}`} />
                <span>{isDirty ? 'Save Changes' : 'Saved'}</span>
              </>
            )}
          </button>

          <div className="hidden lg:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setCanvasViewport('desktop')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                canvasViewport === 'desktop' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Desktop Canvas"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCanvasViewport('tablet')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                canvasViewport === 'tablet' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Tablet Canvas"
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCanvasViewport('mobile')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                canvasViewport === 'mobile' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Mobile Canvas"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handleTestPlayer}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-200 cursor-pointer"
            title="Preview standalone player (auto-saves)"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Test Player</span>
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
              className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                canvasMode === 'target'
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
              className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                canvasMode === 'addStep'
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
              className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                canvasMode === 'domEdit'
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
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  viewportScaleMode === 'fit' && zoomLevel === 1
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
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  viewportScaleMode === '100' && zoomLevel === 1
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
              className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isPreviewMode
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
            className={`flex-1 min-h-0 flex items-center justify-center p-4 sm:p-6 overflow-auto ${
              isPreviewMode ? 'bg-slate-800' : 'bg-slate-200/50'
            }`}
          >
            <div
              className={`bg-white rounded-2xl overflow-hidden shadow-2xl relative transition-transform duration-150 flex flex-col shrink-0 ${
                !isPreviewMode ? 'border border-slate-300 ring-1 ring-slate-900/5' : ''
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
                  className={`w-full h-full border-0 bg-white transition-opacity duration-300 ${
                    snapshotLoading ? 'opacity-0' : 'opacity-100'
                  }`}
                  sandbox="allow-same-origin allow-scripts"
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
                      {activeStep ? `Rehydrating Step ${activeStep.stepNumber}` : 'Preparing Interactive Canvas'}
                    </h3>
                    <p className="text-xs text-slate-500 max-w-xs mt-1 leading-relaxed">
                      {syncStatusMessage || 'Synchronizing DOM snapshot and positioning interactive callouts...'}
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
                            x={Math.max(0, liveTargetRect.left - 6)}
                            y={Math.max(0, liveTargetRect.top - 6)}
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
                {targetHighlight !== 'none' && liveTargetRect && !isModalMode && (
                  <div
                    className={`absolute pointer-events-none z-10 ${
                      targetHighlight === 'ring' ? 'animate-pulse' : ''
                    } ${
                      targetHighlight === 'bubble'
                        ? 'rounded-2xl'
                        : targetHighlight === 'glow'
                        ? 'rounded-xl'
                        : targetHighlight === 'dashed'
                        ? 'rounded-lg'
                        : 'rounded-xl'
                    }`}
                    style={{
                      top: `${Math.max(0, liveTargetRect.top - (targetHighlight === 'bubble' ? 8 : 6))}px`,
                      left: `${Math.max(0, liveTargetRect.left - (targetHighlight === 'bubble' ? 8 : 6))}px`,
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
                {showBeacon && liveTargetRect && !isModalMode && (() => {
                  const alignment = activeStep?.beaconConfig?.alignment || 'center';
                  const beaconStyle = activeStep?.beaconConfig?.style || 'pulse';
                  const beaconColor = activeStep?.beaconConfig?.color || themeColor;

                  let beaconLeft = liveTargetRect.left + liveTargetRect.width / 2 - 14;
                  if (alignment === 'left') {
                    beaconLeft = liveTargetRect.left - 14;
                  } else if (alignment === 'right') {
                    beaconLeft = liveTargetRect.right - 14;
                  }

                  return (
                    <div
                      className="absolute z-20 pointer-events-none"
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

                {/* 2.6: Active Target Overlay during Targeting Mode */}
                {canvasMode === 'target' && liveTargetRect && (
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

                {/* 2.6: Connector SVG Line between Tooltip and Target */}
                {showTooltip && activeStep && liveTargetRect && canvasMode === 'target' && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                    <line
                      x1={tooltipPosition.left + 165} // center of tooltip width (330/2)
                      y1={tooltipPosition.top + 95}   // center of tooltip approx height
                      x2={liveTargetRect.left + liveTargetRect.width / 2}
                      y2={liveTargetRect.top + liveTargetRect.height / 2}
                      stroke="rgba(12, 60, 96, 0.4)"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    />
                  </svg>
                )}

                {/* 3. Anchored Tooltip Callout (Tooltip Mode) */}
                {showTooltip && activeStep && !isModalMode && (
                  <div
                    className="absolute z-20 pointer-events-none"
                    style={{
                      top: `${tooltipPosition.top}px`,
                      left: `${tooltipPosition.left}px`,
                      width: '330px'
                    }}
                  >
                    <div
                      className={`relative rounded-2xl p-4 shadow-2xl text-slate-900 pointer-events-auto border transition-all ${
                        cardStyle === 'glass'
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
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{
                            background: cardStyle === 'dark' ? 'rgba(255,255,255,0.1)' : `${themeColor}15`,
                            color: cardStyle === 'dark' ? '#38bdf8' : themeColor
                          }}
                        >
                          Step {activeStepIndex + 1} of {steps.length}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono capitalize">
                          {activeStep.placement}
                        </span>
                      </div>
                      <h4
                        className={`font-bold text-sm ${cardStyle === 'dark' ? 'text-white' : 'text-slate-900'} ${
                          activeStep.textAlign === 'center'
                            ? 'text-center'
                            : activeStep.textAlign === 'right'
                            ? 'text-right'
                            : 'text-left'
                        }`}
                      >
                        {activeStep.title}
                      </h4>
                      <p
                        className={`text-xs mt-1 leading-relaxed ${
                          cardStyle === 'dark' ? 'text-slate-300' : 'text-slate-600'
                        } ${
                          activeStep.textAlign === 'center'
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
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                                act.style === 'secondary'
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
                          className={`mt-3 pt-2 border-t border-slate-100 flex items-center gap-2 ${
                            activeStep.buttonLayout === 'full'
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
                              className={`px-3 py-1.5 rounded-xl text-slate-500 hover:text-slate-800 text-[11px] font-bold border border-slate-200 bg-slate-50 cursor-pointer ${
                                activeStep.buttonLayout === 'full' ? 'w-full text-center' : ''
                              }`}
                            >
                              {activeStep.backButtonText || 'Back'}
                            </span>
                          )}
                          <span
                            className={`px-4 py-2 rounded-xl text-white text-[11px] font-bold shadow-sm text-center cursor-pointer ${
                              activeStep.buttonLayout === 'full' ? 'w-full' : ''
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

                {/* 4. Live Centered Announcement Modal Dialog (Modal Mode) */}
                {isModalMode && activeStep && (
                  <div className="absolute inset-0 z-25 flex items-center justify-center p-6 pointer-events-none animate-fade-in">
                    <div
                      className={`w-full max-w-md rounded-3xl p-6 shadow-2xl text-center pointer-events-auto border transition-all ${
                        cardStyle === 'glass'
                          ? 'bg-white/95 backdrop-blur-md border-white/60 shadow-2xl'
                          : cardStyle === 'dark'
                          ? 'bg-slate-900 text-white border-slate-800 shadow-2xl'
                          : cardStyle === 'outline'
                          ? 'bg-white border-2 text-slate-900 shadow-xl'
                          : 'bg-white border-slate-200 shadow-2xl'
                      }`}
                      style={{
                        borderColor: cardStyle === 'outline' ? themeColor : undefined,
                        borderTop: cardStyle === 'solid' ? `5px solid ${themeColor}` : undefined
                      }}
                    >
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#0c3c60] text-xs font-bold mb-3 border border-blue-200 shadow-2xs">
                        <Compass className="w-3.5 h-3.5" />
                        <span>Step {activeStepIndex + 1} of {steps.length} • Modal Dialog</span>
                      </div>

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
                                  ? 'bg-slate-100 text-slate-700'
                                  : act.style === 'outline'
                                  ? 'bg-white border border-slate-300 text-slate-700'
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
                            <span className="px-4 py-2 rounded-xl text-slate-600 text-xs font-bold border border-slate-200 bg-slate-50">
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
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'content' ? 'bg-white text-[#0c3c60] shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Content
              </button>
              <button
                onClick={() => setActiveTab('design')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'design' ? 'bg-white text-[#0c3c60] shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Design & Style
              </button>
              <button
                onClick={() => setActiveTab('advanced')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'advanced' ? 'bg-white text-[#0c3c60] shadow-2xs' : 'text-slate-600 hover:text-slate-900'
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
                        onClick={() => handleUpdateActiveStep({ stepType: 'tooltip', placement: 'bottom' })}
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
                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          canvasMode === 'target'
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
                        onClick={() =>
                          handleUpdateActiveStep({
                            stepType: 'tooltip',
                            placement: activeStep.placement === 'center' ? 'bottom' : (activeStep.placement || 'bottom'),
                            showBeacon: false
                          })
                        }
                        className={`py-1.5 px-2 rounded-lg font-bold transition-colors cursor-pointer text-center text-xs ${
                          activeStep.stepType === 'tooltip' || (!activeStep.stepType && activeStep.stepType !== 'modal' && activeStep.stepType !== 'beacon')
                            ? 'bg-[#0c3c60] text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                        }`}
                      >
                        <span>📌 Tooltip</span>
                      </button>

                      <button
                        onClick={() =>
                          handleUpdateActiveStep({
                            stepType: 'beacon',
                            showBeacon: true,
                            placement: activeStep.placement === 'center' ? 'bottom' : (activeStep.placement || 'bottom')
                          })
                        }
                        className={`py-1.5 px-2 rounded-lg font-bold transition-colors cursor-pointer text-center text-xs ${
                          activeStep.stepType === 'beacon'
                            ? 'bg-[#0c3c60] text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                        }`}
                      >
                        <span>🎯 Beacon</span>
                      </button>

                      <button
                        onClick={() =>
                          handleUpdateActiveStep({
                            stepType: 'modal',
                            placement: 'center',
                            showBeacon: false
                          })
                        }
                        className={`py-1.5 px-2 rounded-lg font-bold transition-colors cursor-pointer text-center text-xs ${
                          activeStep.stepType === 'modal'
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
                              className={`py-1.5 rounded-lg text-[10px] transition-colors cursor-pointer ${
                                targetHighlight === hl.id
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
                              className={`py-1 rounded-lg text-[10px] transition-colors cursor-pointer ${
                                focusBackdrop === fb.id
                                  ? 'bg-[#0c3c60] text-white shadow-2xs'
                                  : 'text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {fb.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Hotspot Beacon Toggle for Tooltip mode */}
                      {activeStep.stepType !== 'beacon' && (
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                          <span className="text-[11px] font-bold text-slate-700">Display Pulsing Beacon</span>
                          <input
                            type="checkbox"
                            checked={activeStep.showBeacon === true}
                            onChange={(e) => handleUpdateActiveStep({ showBeacon: e.target.checked })}
                            className="w-4 h-4 text-blue-600 rounded cursor-pointer accent-[#0c3c60]"
                          />
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
                              className={`px-1.5 py-0.5 rounded text-[10px] capitalize font-bold transition-colors cursor-pointer ${
                                (activeStep.textAlign || 'left') === align
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

                  {/* 3. Placement Selector (Top, Bottom, Left, Right, Center) */}
                  {!isModalMode && (
                    <div>
                      <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5 text-[11px]">
                        Callout Placement
                      </label>
                      <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-center font-bold">
                        {(['top', 'bottom', 'left', 'right'] as const).map((p) => (
                          <button
                            key={p}
                            onClick={() => handleUpdateActiveStep({ placement: p })}
                            className={`py-1.5 rounded-lg capitalize transition-colors cursor-pointer ${
                              activeStep.placement === p
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
                            className={`py-1 rounded-lg text-[10px] transition-colors cursor-pointer ${
                              (activeStep.buttonLayout || 'right') === layout.id
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
                          className={`py-2 px-2.5 rounded-xl font-bold text-xs border text-left transition-colors cursor-pointer ${
                            (activeStep.cardStyle || 'solid') === st.id
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
                        checked={Boolean(activeStep.showBeacon)}
                        onChange={(e) => handleUpdateActiveStep({ showBeacon: e.target.checked })}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>

                    {activeStep.showBeacon && (
                      <>
                        <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border border-slate-200">
                          {(['pulse', 'dot', 'icon'] as const).map((st) => (
                            <button
                              key={st}
                              onClick={() =>
                                handleUpdateActiveStep({
                                  beaconConfig: { ...activeStep.beaconConfig, style: st }
                                })
                              }
                              className={`py-1 rounded-lg text-[10px] font-bold capitalize transition-colors ${
                                (activeStep.beaconConfig?.style || 'pulse') === st
                                  ? 'bg-[#0c3c60] text-white'
                                  : 'text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>

                        <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border border-slate-200">
                          {(['left', 'center', 'right'] as const).map((al) => (
                            <button
                              key={al}
                              onClick={() =>
                                handleUpdateActiveStep({
                                  beaconConfig: { ...activeStep.beaconConfig, alignment: al }
                                })
                              }
                              className={`py-1 rounded-lg text-[10px] font-bold capitalize transition-colors ${
                                (activeStep.beaconConfig?.alignment || 'center') === al
                                  ? 'bg-slate-200 text-slate-800'
                                  : 'text-slate-500 hover:bg-slate-100'
                              }`}
                            >
                              {al}
                            </button>
                          ))}
                        </div>

                        {activeStep.beaconConfig?.style === 'icon' && (
                          <div className="grid grid-cols-5 gap-1 pt-1">
                            {(['question', 'info', 'hand', 'plus', 'star'] as const).map((ic) => (
                              <button
                                key={ic}
                                onClick={() =>
                                  handleUpdateActiveStep({
                                    beaconConfig: { ...activeStep.beaconConfig, icon: ic }
                                  })
                                }
                                className={`p-1.5 rounded-lg border text-center transition-colors ${
                                  activeStep.beaconConfig?.icon === ic
                                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                                    : 'border-slate-200 hover:bg-white'
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
                        )}
                      </>
                    )}
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
      <div className="h-24 bg-white border-t border-slate-200 px-4 py-2 flex items-center gap-3.5 z-20 shrink-0 select-none shadow-md">
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

        {/* Center: Horizontally Scrollable Step Cards */}
        <div className="flex-1 min-w-0 flex items-center gap-3 overflow-x-auto py-1 px-1 scroll-smooth">
          {steps.map((step, idx) => {
            const isActive = idx === activeStepIndex;
            return (
              <div
                key={step.id}
                onClick={() => setActiveStepIndex(idx)}
                className={`shrink-0 w-48 h-18 rounded-xl p-2 transition-all cursor-pointer flex flex-col justify-between border relative group ${
                  isActive
                    ? 'bg-blue-50/70 border-blue-600 shadow-md ring-2 ring-blue-600/30'
                    : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 shadow-2xs'
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
                  <span className="font-mono truncate max-w-[95px]">
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveStep(idx, -1);
                      }}
                      className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-900"
                      title="Move Left"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                  )}
                  {idx < steps.length - 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveStep(idx, 1);
                      }}
                      className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-900"
                      title="Move Right"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateStep(idx);
                    }}
                    className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600"
                    title="Duplicate Step"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  {steps.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteStep(step.id);
                      }}
                      className="p-1 hover:bg-red-50 rounded text-slate-500 hover:text-red-600"
                      title="Delete Step"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
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
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Interactive Steps:</span>
                  <span className="font-bold text-slate-800">{steps.length} steps</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Status:</span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Publicly Accessible & Live
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-600 bg-blue-50/50 border border-blue-100 rounded-xl p-3 flex items-start gap-2">
                <Globe className="w-4 h-4 text-[#0c3c60] shrink-0 mt-0.5" />
                <span>
                  This guide will be published live to NAVIGATE and made available for Rotaract members to view instantly.
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

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
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

                <div className="flex items-center rounded-xl bg-slate-50 border border-slate-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 overflow-hidden shadow-2xs">
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
                  className="rounded border-slate-300 text-[#0c3c60] focus:ring-[#0c3c60] w-4 h-4 cursor-pointer"
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
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      (demo?.displayMode || 'standard') === 'standard'
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
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      demo?.displayMode === 'responsive'
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
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
              </div>

              {/* Global Accent Theme Color */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Brand Accent Color</label>
                <div className="flex items-center gap-2">
                  {PRESET_THEME_COLORS.map((col) => (
                    <button
                      key={col.hex}
                      type="button"
                      onClick={() => {
                        if (demo) {
                          setDemo({
                            ...demo,
                            theme: { ...demo.theme, primaryColor: col.hex }
                          });
                        }
                        setIsDirty(true);
                      }}
                      className={`w-7 h-7 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                        (demo?.theme?.primaryColor || '#0c3c60') === col.hex ? 'ring-2 ring-offset-2 ring-blue-600 scale-110' : 'hover:scale-105'
                      }`}
                      style={{ background: col.hex }}
                      title={col.name}
                    />
                  ))}
                </div>
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
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
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
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await handleSaveAll();
                  setIsSettingsModalOpen(false);
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#0c3c60] hover:bg-[#092b45] text-white shadow-md transition-all cursor-pointer"
              >
                Save Settings
              </button>
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
                    type: 'START_RECORDING',
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
