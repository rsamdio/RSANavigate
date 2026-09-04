import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Maximize,
  Minimize,
  Share2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Compass,
  ArrowLeft,
  Play,
  Pause,
  HelpCircle,
  Info,
  Hand,
  Plus,
  Star,
  Clock,
  Send,
  Crosshair,
  Volume2,
  VolumeX
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  TourManifest,
  StepManifest,
  StepAction,
  DOMSnapshot,
  FocusBackdropType,
  TargetHighlightType,
  rehydrateIframeSnapshot,
  computeTooltipPosition,
  computeBeaconPosition,
  computeCardEdgePoint,
  ObstacleRect,
  findElementInSnapshot,
  simulateTypingInElement
} from '@serverless-tour/common';
import { loadPublicTourManifest, getDOMSnapshot, createDefaultBlankSnapshot } from '../../services/demoService';
import { updatePageMetadata, resetToDefaultMetadata } from '../../utils/seo';

interface LiveTargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
  isVisible: boolean;
}

export const PublicTourPlayer: React.FC = () => {
  const { demoId } = useParams<{ demoId: string }>();

  // State
  const [manifest, setManifest] = useState<TourManifest | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [currentSnapshot, setCurrentSnapshot] = useState<DOMSnapshot | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [copiedShare, setCopiedShare] = useState<boolean>(false);
  const [liveTargetRect, setLiveTargetRect] = useState<LiveTargetRect | null>(null);

  // Timer state
  const [timerRemaining, setTimerRemaining] = useState<number | null>(null);
  const [isAutoPlayPaused, setIsAutoPlayPaused] = useState<boolean>(false);

  // Refs
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const cancelTypingRef = useRef<(() => void) | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Audio state
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);

  // 1. Fetch static manifest (ZERO-DATABASE EXECUTION)
  useEffect(() => {
    if (!demoId) return;

    async function loadManifest() {
      setLoading(true);
      setError(null);
      try {
        const isPreview = new URLSearchParams(window.location.search).get('preview') === 'true';
        const data = await loadPublicTourManifest(demoId!, isPreview);
        setManifest(data);
        setCurrentStepIndex(0);

        // Dynamically set page metadata: "(Walkthrough title) | NAVIGATE | Rotaract South Asia MDIO"
        updatePageMetadata({
          walkthroughTitle: data.title,
          description: data.description,
          url: window.location.href,
          ogImage: data.coverImageUrl
        });
      } catch (err: any) {
        setError(err.message || 'Failed to load tour manifest');
      } finally {
        setLoading(false);
      }
    }

    loadManifest();

    return () => {
      resetToDefaultMetadata();
    };
  }, [demoId]);

  const activeStep: StepManifest | null =
    manifest && manifest.steps ? manifest.steps[currentStepIndex] || null : null;

  // Real-time dynamic target tracking on scroll & resize inside the iframe
  const updateTargetCoordinates = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe || !activeStep) {
      setLiveTargetRect((prev) => (prev ? null : prev));
      return;
    }

    // Modal steps are centered announcements with no element targets
    const isModalStep =
      activeStep.stepType === 'modal' ||
      (!activeStep.stepType && !activeStep.targetSelector && !activeStep.targetCoordinates && manifest?.defaultStepSettings?.stepType === 'modal');
    if (isModalStep) {
      setLiveTargetRect((prev) => (prev ? null : prev));
      return;
    }

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    // Get the iframe's own position in the outer page (accounts for the top header/progress bar)
    const iframeRect = iframe.getBoundingClientRect();
    const iframeOffsetTop = iframeRect.top;
    const iframeOffsetLeft = iframeRect.left;

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

    // Guard: never track body/html — their rects drift on every scroll event
    const isBodyTarget =
      !activeStep.targetSelector ||
      activeStep.targetSelector === 'body' ||
      activeStep.targetSelector === 'html';

    let targetEl: Element | null = null;
    if (!isBodyTarget) {
      targetEl = findElementInSnapshot(doc, activeStep.targetSelector, activeStep.targetCoordinates);
    } else if (activeStep.targetCoordinates && activeStep.targetCoordinates.x !== undefined) {
      targetEl = findElementInSnapshot(doc, undefined, activeStep.targetCoordinates);
    }

    if (targetEl && targetEl !== doc.body && targetEl !== doc.documentElement) {
      const rect = targetEl.getBoundingClientRect();
      const scrollAllowance = 80;
      const isVisible = (rect.top + rect.height) > -scrollAllowance && rect.top < (viewportHeight + scrollAllowance);
      const nextRect = {
        top: rect.top + iframeOffsetTop,
        left: rect.left + iframeOffsetLeft,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom + iframeOffsetTop,
        right: rect.right + iframeOffsetLeft,
        isVisible
      };

      // Prevent 60fps React re-render thrashing when stationary
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

    // Coordinate fallback: stored page-absolute coords, subtract current scroll, add iframe page offset
    const coords = activeStep.targetCoordinates;
    if (coords && coords.x !== undefined && coords.y !== undefined && coords.width && coords.height) {
      const top = coords.y - scrollY + iframeOffsetTop;
      const left = coords.x - scrollX + iframeOffsetLeft;
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
      // No valid specific element target — clear cleanly
      setLiveTargetRect((prev) => (prev ? null : prev));
    }
  }, [activeStep]);

  // 2. Load step snapshot, apply privacy/text modifications, and rehydrate iframe
  useEffect(() => {
    if (!manifest || !activeStep) return;

    setStepError(null);

    // Clean up prior typing animation
    if (cancelTypingRef.current) {
      cancelTypingRef.current();
      cancelTypingRef.current = null;
    }

    let isActive = true;

    async function loadSnapshot() {
      try {
        let snap = await getDOMSnapshot(activeStep!.snapshotUrl, manifest?.demoId || demoId, activeStep?.stepId || (activeStep as any)?.id);
        if (!isActive) return;

        // Self-Healing Fallback 1: If snapshot is missing for this step, borrow from sibling steps
        if (!snap && manifest && manifest.steps && manifest.steps.length > 0) {
          for (const otherStep of manifest.steps) {
            if (otherStep.stepId !== activeStep!.stepId && otherStep.snapshotUrl) {
              snap = await getDOMSnapshot(otherStep.snapshotUrl, manifest.demoId || demoId, otherStep.stepId);
              if (snap) {
                console.info(`PublicTourPlayer: Self-healed step ${(activeStep?.stepIndex ?? 0) + 1} by borrowing snapshot from step ${(otherStep.stepIndex ?? 0) + 1}.`);
                break;
              }
            }
          }
        }

        // Self-Healing Fallback 2: Reuse current snapshot if already displayed
        if (!snap && currentSnapshot) {
          snap = currentSnapshot;
          console.info(`PublicTourPlayer: Reusing current snapshot for step ${(activeStep?.stepIndex ?? 0) + 1}.`);
        }

        // Self-Healing Fallback 3: Create starter fallback if nothing exists
        if (!snap) {
          snap = createDefaultBlankSnapshot(activeStep!.stepId, activeStep?.title, activeStep?.description);
        }
        
        if (snap) {
          setCurrentSnapshot(snap);
          if (iframeRef.current) {
            // Combine global demo modifications + step-specific modifications
            const allModifications = [
              ...(manifest?.globalDomModifications || []),
              ...(activeStep?.domModifications || [])
            ];

            const doc = await rehydrateIframeSnapshot(iframeRef.current, snap, {
              disableNavigation: true,
              modifications: allModifications
            });

            // 60fps tracking engine for buttery smooth sticky positioning during scroll/resize
            let running = true;
            const tick = () => {
              if (!running) return;
              updateTargetCoordinates();
              if (rafRef.current) cancelAnimationFrame(rafRef.current);
              rafRef.current = requestAnimationFrame(tick);
            };
            
            // Give iframe a moment to settle, then start the tracking loop
            setTimeout(() => {
              scrollToTarget();
              updateTargetCoordinates();
              rafRef.current = requestAnimationFrame(tick);
            }, 100);

            // Handle Simulated Input Typing if configured
            if (activeStep?.inputAction?.textToType) {
              const targetEl = findElementInSnapshot(doc, activeStep.targetSelector, activeStep.targetCoordinates);
              if (targetEl && (targetEl.tagName === 'INPUT' || targetEl.tagName === 'TEXTAREA')) {
                cancelTypingRef.current = simulateTypingInElement(
                  targetEl as HTMLInputElement,
                  activeStep.inputAction.textToType,
                  activeStep.inputAction.typingSpeedMs || 50
                );
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to load step snapshot:', err);
        setStepError('Failed to load this step. Please try navigating to the next one.');
      }
    }

    loadSnapshot();

    return () => {
      isActive = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (cancelTypingRef.current) {
        cancelTypingRef.current();
        cancelTypingRef.current = null;
      }
      // Stop and reset audio when leaving a step
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
    };
  }, [activeStep?.stepId, activeStep?.snapshotUrl, manifest?.globalDomModifications, updateTargetCoordinates]);

  // 2b. Audio Narration Effect — plays per-step audio when configured
  useEffect(() => {
    if (!activeStep?.audioUrl || isCompleted) return;

    const audio = new Audio(activeStep.audioUrl);
    audioRef.current = audio;
    audio.muted = isAudioMuted;
    audio.play().catch(() => {
      // Autoplay policy blocked — user must interact first; silent fallback
    });

    return () => {
      audio.pause();
      audio.currentTime = 0;
      if (audioRef.current === audio) audioRef.current = null;
    };
  }, [activeStep?.stepId, activeStep?.audioUrl, isCompleted]);

  // 3. Auto-Play Timer Hook
  useEffect(() => {
    if (!activeStep?.autoAdvanceSeconds || isCompleted || isAutoPlayPaused) {
      setTimerRemaining(null);
      return;
    }

    let remaining = activeStep.autoAdvanceSeconds;
    setTimerRemaining(remaining);

    const interval = setInterval(() => {
      remaining -= 1;
      setTimerRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        handleNextStep();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeStep?.stepId, activeStep?.autoAdvanceSeconds, isCompleted, isAutoPlayPaused]);

  // Window resize listener
  useEffect(() => {
    window.addEventListener('resize', updateTargetCoordinates);
    return () => window.removeEventListener('resize', updateTargetCoordinates);
  }, [updateTargetCoordinates]);

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
  }, [activeStep]);

  // Step advancement
  const handleNextStep = () => {
    if (!manifest) return;

    if (currentStepIndex < manifest.steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      setIsCompleted(true);
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.5 }
      });
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleRestart = () => {
    setCurrentStepIndex(0);
    setIsCompleted(false);
  };

  // Custom Action Execution (Branching / Jumps / External Links)
  const handleExecuteAction = (action: StepAction) => {
    if (action.actionType === 'next') {
      handleNextStep();
    } else if (action.actionType === 'prev') {
      handlePrevStep();
    } else if (action.actionType === 'jumpToStep' && action.targetStepId) {
      const targetIndex = manifest?.steps.findIndex((s) => s.stepId === action.targetStepId);
      if (targetIndex !== undefined && targetIndex >= 0) {
        setCurrentStepIndex(targetIndex);
      } else {
        handleNextStep();
      }
    } else if (action.actionType === 'openUrl' && action.url) {
      window.open(action.url, '_blank');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      playerContainerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextStep();
      } else if (e.key === ' ' && !e.repeat) {
        e.preventDefault();
        handleNextStep();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevStep();
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      } else if ((e.key === 'm' || e.key === 'M') && activeStep?.audioUrl) {
        setIsAudioMuted((prev) => {
          const next = !prev;
          if (audioRef.current) audioRef.current.muted = next;
          return next;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStepIndex, manifest, isFullscreen]);

  // Calculate live Tooltip position relative to full viewport
  const viewportSize = { width: window.innerWidth || 1280, height: window.innerHeight || 800 };
  const targetRectForTooltip = liveTargetRect || {
    top: 200,
    left: 200,
    width: 200,
    height: 60,
    bottom: 260,
    right: 400,
    isVisible: true
  };

  const globalDefaults = manifest?.defaultStepSettings;
  const currentStepType =
    activeStep?.stepType ||
    (activeStep?.targetSelector || activeStep?.targetCoordinates
      ? 'tooltip'
      : globalDefaults?.stepType || 'tooltip');

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
      (activeStep?.showBeacon ?? td?.showBeacon ?? globalDefaults?.showBeacon ?? true)) ||
    (!activeStep?.stepType && (td?.showBeacon ?? globalDefaults?.showBeacon ?? true));

  const tooltipPlacement =
    activeStep?.placement ||
    td?.placement ||
    globalDefaults?.placement ||
    'bottom';

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

  const themeColor = activeStep?.themeColor || globalDefaults?.themeColor || '#0c3c60';

  const cardStyle =
    activeStep?.cardStyle ||
    (currentStepType === 'modal' ? md?.cardStyle : td?.cardStyle) ||
    globalDefaults?.cardStyle ||
    'solid';

  const beaconColor =
    activeStep?.beaconConfig?.color ||
    (currentStepType === 'beacon' ? bd?.color : td?.beaconConfig?.color) ||
    globalDefaults?.beaconConfig?.color ||
    globalDefaults?.themeColor ||
    themeColor;

  // Beacon icon rendering helper
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
        return <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />;
    }
  };

  const titleCardObstacle: ObstacleRect = {
    left: 0,
    top: 0,
    width: 440,
    height: 76
  };

  const topControlsRightObstacle: ObstacleRect = {
    left: Math.max(0, viewportSize.width - 130),
    top: 0,
    width: 130,
    height: 76
  };

  const tooltipPosition = computeTooltipPosition(
    targetRectForTooltip,
    viewportSize,
    tooltipPlacement,
    { width: 340, height: 190 },
    26,
    beaconAlignment,
    [titleCardObstacle, topControlsRightObstacle]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="flex flex-col items-center gap-3 p-8 bg-white border border-slate-200 rounded-3xl shadow-xl w-80">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-[#0c3c60] flex items-center justify-center animate-spin mb-2">
            <Compass className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-800">Loading Interactive Walkthrough...</p>
          <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden relative">
             <div className="absolute top-0 left-0 h-full bg-[#0c3c60] rounded-full w-1/2 animate-[pulse_1s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !manifest) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-900 p-4 font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="bg-white border border-slate-200 p-8 rounded-3xl max-w-md text-center shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-500 mx-auto flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Guide Not Found</h2>
          <p className="text-xs text-slate-500 mt-2">{error || 'This interactive guide is unavailable.'}</p>
          <Link
            to="/"
            className="mt-6 inline-block px-5 py-2.5 rounded-xl bg-[#0c3c60] hover:bg-[#092b45] text-white text-xs font-semibold shadow-md shadow-blue-900/20"
          >
            Return to NAVIGATE Portal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={playerContainerRef}
      className="relative w-full h-screen overflow-hidden bg-slate-50 font-['Plus_Jakarta_Sans',sans-serif]"
      style={{
        '--theme-color': themeColor
      } as React.CSSProperties}
    >
      {/* 3.2 Top Progress Bar — shows progress including current step */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-200 z-50">
        <div 
          className="h-full transition-all duration-300 ease-out"
          style={{ 
            width: `${((currentStepIndex + 1) / manifest.totalSteps) * 100}%`,
            backgroundColor: themeColor
          }}
        />
      </div>

      {/* 1. Full-Bleed Native Website Canvas (100% Viewport, Zero Frames) */}
      <iframe
        ref={iframeRef}
        title="Interactive Guide"
        className={`w-full h-full border-0 bg-white transition-opacity duration-300 ${
          loading ? 'opacity-0' : 'opacity-100'
        }`}
        sandbox="allow-same-origin allow-popups allow-forms"
      />

      {/* Step Error Overlay */}
      {stepError && (
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-30 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm text-center border border-red-200">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold">!</span>
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-2">Step Load Error</h3>
            <p className="text-xs text-slate-600 mb-4">{stepError}</p>
            <button
              onClick={handleNextStep}
              className="px-4 py-2 bg-slate-900 text-white rounded-full text-xs font-bold hover:bg-slate-800"
            >
              Skip Step
            </button>
          </div>
        </div>
      )}

      {/* 2.1 Backdrop Focus Overlay (Dim or Frosted Blur with SVG Cutout Hole) */}
      {focusBackdrop !== 'none' && liveTargetRect && !isCompleted && !isModalMode && (
        <div className="fixed inset-0 pointer-events-none z-10 animate-fade-in overflow-hidden">
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <mask id="player-spotlight-mask">
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
            className="absolute inset-0 pointer-events-none"
            style={{
              mask: 'url(#player-spotlight-mask)',
              WebkitMask: 'url(#player-spotlight-mask)',
              backdropFilter: focusBackdrop === 'blur' ? 'blur(8px) brightness(0.7)' : undefined,
              WebkitBackdropFilter: focusBackdrop === 'blur' ? 'blur(8px) brightness(0.7)' : undefined,
              backgroundColor: focusBackdrop === 'blur' ? 'rgba(12, 30, 50, 0.4)' : 'rgba(15, 23, 42, 0.55)'
            }}
          />
        </div>
      )}

      {/* 2.2 Target Outline / Highlight Box (Customizable Border without Beacon) */}
      {targetHighlight !== 'none' && liveTargetRect && !isCompleted && !isModalMode && liveTargetRect.isVisible !== false && (
        <div className="fixed inset-0 pointer-events-none z-10 animate-fade-in">
          <div
            className={`absolute ${
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
        </div>
      )}

      {/* 3. Floating Sticky Hotspot Beacon (Live-Glued to Element on Scroll) */}
      {showBeacon && liveTargetRect && !isCompleted && liveTargetRect.isVisible !== false && (() => {
          const { x: targetX } = computeBeaconPosition(liveTargetRect, beaconAlignment);
          const beaconLeft = targetX - 16;

          return (
            <div
              onClick={handleNextStep}
              className="fixed z-20 cursor-pointer group"
              style={{
                top: `${liveTargetRect.top + liveTargetRect.height / 2 - 16}px`,
                left: `${beaconLeft}px`
              }}
              title="Click target element to advance"
            >
              <div className="relative">
                {beaconStyle === 'pulse' && (
                  <div
                    className="absolute inset-0 rounded-full animate-ping opacity-75"
                    style={{ background: beaconColor }}
                  />
                )}
                <div
                  className={`relative w-8 h-8 rounded-full text-white flex items-center justify-center shadow-lg transition-transform ${beaconStyle !== 'dot' ? 'group-hover:scale-125' : ''} ring-4 ring-white/80`}
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

      {/* 3.1 Floating Edge Beacon Nudge (When Target Beacon Scrolls Off-Screen in Beacon-Only Mode) */}
      {isBeaconOnlyMode && liveTargetRect && !isCompleted && liveTargetRect.isVisible === false && (() => {
        const { x: targetX } = computeBeaconPosition(liveTargetRect, beaconAlignment);

        const isTargetAbove = (liveTargetRect.top + liveTargetRect.height) < 0;
        const clampedX = Math.max(120, Math.min(viewportSize.width - 120, targetX));

        return (
          <div
            className={`fixed z-30 pointer-events-auto transition-all duration-300 animate-fade-in ${
              isTargetAbove ? 'top-20' : 'bottom-24'
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

      {/* 4. Floating Sticky Tooltip Callout and Connector (Glued to Live Element Position) */}
      {showTooltip && activeStep && !isModalMode && liveTargetRect && !isCompleted && (() => {
          return (
            <>
              {/* Connector SVG Line between Tooltip and Target/Beacon (Continuous Reference Trail) */}
              {(() => {
                const { x: targetX, y: targetY } = computeBeaconPosition(liveTargetRect, beaconAlignment);

                // When target scrolls off-screen, clamp reference endpoint to viewport boundary
                // so the dashed line remains visible as a continuous directional leash/reference back to the element.
                const clampedTargetX = Math.max(16, Math.min(viewportSize.width - 16, targetX));
                const clampedTargetY = Math.max(0, Math.min(viewportSize.height, targetY));

                const cardRect = {
                  left: tooltipPosition.left,
                  top: tooltipPosition.top,
                  width: 340,
                  height: 180
                };
                const cardEdge = computeCardEdgePoint(cardRect, { x: clampedTargetX, y: clampedTargetY });

                return (
                  <svg className="fixed inset-0 w-full h-full pointer-events-none overflow-visible" style={{ zIndex: 20 }}>
                    <defs>
                      <filter id="player-line-glow" x="-20%" y="-20%" width="140%" height="140%">
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
                      filter="url(#player-line-glow)"
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

              {/* Tooltip Card */}
              <div
                className="fixed transition-opacity duration-200"
                style={{
                  zIndex: 35,
                  top: `${tooltipPosition.top}px`,
                  left: `${tooltipPosition.left}px`,
                  width: '340px',
                  opacity: liveTargetRect.isVisible === false ? 0.9 : 1
                }}
              >
              <div
                className={`relative rounded-2xl p-5 shadow-2xl transition-all border ${
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
                {/* Off-screen Target Center Indicator */}
                {liveTargetRect.isVisible === false && (
                  <button
                    type="button"
                    onClick={scrollToTarget}
                    className="mb-3 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#0c3c60] text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 w-full cursor-pointer transition-colors shadow-2xs border border-blue-200"
                  >
                    <Crosshair className="w-3.5 h-3.5 text-blue-600" />
                    <span>📍 Return to highlight</span>
                  </button>
                )}
                <div className="flex items-center justify-between mb-2">
                  <div className="invisible">
                    {/* Step counter removed for cleaner UI */}
                  </div>

                  {timerRemaining !== null && (
                    <div className="flex items-center gap-1 text-[10px] font-mono text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{timerRemaining}s</span>
                    </div>
                  )}
                </div>

                <h3
                  className={`font-bold text-base tracking-tight leading-snug ${
                    cardStyle === 'dark' ? 'text-white' : 'text-slate-900'
                  } ${
                    activeStep.textAlign === 'center'
                      ? 'text-center'
                      : activeStep.textAlign === 'right'
                      ? 'text-right'
                      : 'text-left'
                  }`}
                >
                  {activeStep.title}
                </h3>
                <p
                  className={`text-xs mt-2 leading-relaxed ${
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

                {/* Custom Multi-Action Buttons / Branching */}
                {activeStep.actions && activeStep.actions.length > 0 ? (
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-2 justify-end">
                    {activeStep.actions.map((act) => (
                      <button
                        key={act.id}
                        onClick={() => handleExecuteAction(act)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 hover:scale-105 ${
                          act.style === 'secondary'
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            : act.style === 'outline'
                            ? 'bg-white border border-slate-300 hover:bg-slate-50 text-slate-700'
                            : 'text-white shadow-sm'
                        }`}
                        style={{
                          background: act.style === 'primary' ? themeColor : undefined
                        }}
                      >
                        <span>{act.label}</span>
                        {act.actionType === 'openUrl' ? (
                          <ExternalLink className="w-3 h-3" />
                        ) : (
                          <ChevronRight className="w-3 h-3" />
                        )}
                      </button>
                    ))}
                  </div>
                ) : manifest.showStepProgress === false ? (
                  <div
                    className={`mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 ${
                      activeStep.buttonLayout === 'full'
                        ? 'flex-col w-full'
                        : activeStep.buttonLayout === 'center'
                        ? 'justify-center'
                        : activeStep.buttonLayout === 'left'
                        ? 'justify-start'
                        : 'justify-between'
                    }`}
                  >
                    {activeStep.showBackButton && (
                      <button
                        onClick={handlePrevStep}
                        className={`px-3 py-1.5 rounded-xl text-slate-500 hover:text-slate-800 text-[11px] font-bold border border-slate-200 bg-slate-50 cursor-pointer transition-colors ${
                          activeStep.buttonLayout === 'full' ? 'w-full text-center' : ''
                        }`}
                      >
                        {activeStep.backButtonText || 'Back'}
                      </button>
                    )}
                    <button
                      onClick={handleNextStep}
                      className={`px-4 py-2 rounded-xl text-white text-[11px] font-bold shadow-sm text-center cursor-pointer hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 ${
                        activeStep.buttonLayout === 'full' ? 'w-full' : ''
                      }`}
                      style={{ background: themeColor }}
                    >
                      {activeStep.buttonText || (currentStepIndex === manifest.totalSteps - 1 ? 'Finish Guide' : 'Next Step')}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
            </>
          );
        })()}

      {/* 5. Centered Announcement / Modal Mode */}
      {isModalMode && activeStep && !isCompleted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in">
          <div
            className={`rounded-3xl p-8 max-w-lg w-full shadow-2xl text-center relative max-h-[85vh] flex flex-col border transition-all ${
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
            {/* Step counter removed from modal mode */}

            <h2
              className={`text-2xl font-extrabold tracking-tight ${
                cardStyle === 'dark' ? 'text-white' : 'text-slate-900'
              }`}
            >
              {activeStep.title}
            </h2>
            <p
              className={`text-sm mt-3 leading-relaxed ${
                cardStyle === 'dark' ? 'text-slate-300' : 'text-slate-600'
              }`}
            >
              {activeStep.description}
            </p>

            {/* Custom Multi-Action Buttons for Modal */}
            {activeStep.actions && activeStep.actions.length > 0 ? (
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                {activeStep.actions.map((act) => (
                  <button
                    key={act.id}
                    onClick={() => handleExecuteAction(act)}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 hover:scale-105 ${
                      act.style === 'secondary'
                        ? cardStyle === 'dark'
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        : act.style === 'outline'
                        ? cardStyle === 'dark'
                          ? 'bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200'
                          : 'bg-white border border-slate-300 hover:bg-slate-50 text-slate-700'
                        : 'text-white shadow-lg shadow-blue-900/20'
                    }`}
                    style={{
                      background: act.style === 'primary' ? themeColor : undefined
                    }}
                  >
                    <span>{act.label}</span>
                    {act.actionType === 'openUrl' ? <ExternalLink className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-8 flex items-center justify-center gap-3">
                {activeStep.showBackButton && currentStepIndex > 0 && (
                  <button
                    onClick={handlePrevStep}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                      cardStyle === 'dark'
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    }`}
                  >
                    Previous
                  </button>
                )}
                <button
                  onClick={handleNextStep}
                  className="px-6 py-2.5 rounded-xl text-white text-xs font-bold shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2 cursor-pointer hover:scale-105"
                  style={{ background: themeColor }}
                >
                  <span>{activeStep.buttonText || (currentStepIndex === manifest.totalSteps - 1 ? 'Finish Guide' : 'Continue Walkthrough')}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Sleek Floating Top Bar (Title, Audio, & Tools Overlay) */}
      <div className="fixed top-4 left-4 right-4 z-40 flex items-center justify-between pointer-events-none">
        {/* Left: Branding & Guide Title Card */}
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl px-4 py-2 shadow-lg shadow-slate-900/5 flex items-center gap-3 pointer-events-auto">
          <Link
            to="/"
            className="w-8 h-8 rounded-xl bg-[#0c3c60] text-white flex items-center justify-center shadow-sm hover:bg-[#092b45] transition-colors"
            title="Return to NAVIGATE Portal"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight line-clamp-1 max-w-xs sm:max-w-md">
              {manifest.title}
            </h1>
            <p className="text-[10px] text-slate-500 font-medium">
              Step {currentStepIndex + 1} of {manifest.totalSteps} • Rotaract South Asia MDIO
            </p>
          </div>
        </div>

        {/* Right: Share, Audio Mute, Fullscreen Controls */}
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-1.5 shadow-lg shadow-slate-900/5 flex items-center gap-1.5 pointer-events-auto">
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              setCopiedShare(true);
              setTimeout(() => setCopiedShare(false), 1500);
            }}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            title="Share Guide Link"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {activeStep?.audioUrl && (
            <button
              onClick={() => {
                const next = !isAudioMuted;
                setIsAudioMuted(next);
                if (audioRef.current) audioRef.current.muted = next;
              }}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title={isAudioMuted ? 'Unmute Narration' : 'Mute Narration'}
            >
              {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 7. Sleek Floating Bottom Control Pill (Only if showStepProgress !== false) */}
      {manifest.showStepProgress !== false && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-full px-5 py-2.5 shadow-2xl shadow-slate-900/15 flex items-center gap-4">
          <button
            disabled={currentStepIndex === 0}
            onClick={handlePrevStep}
            className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 disabled:opacity-25 text-slate-700 hover:text-slate-900 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Prev</span>
          </button>

          {/* Progress Indicator Dots — respects allowStepJumping setting */}
          <div className="flex items-center gap-1.5">
            {manifest.steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => manifest.allowStepJumping !== false && setCurrentStepIndex(idx)}
                className={`h-2 rounded-full transition-all ${
                  manifest.allowStepJumping !== false ? 'cursor-pointer' : 'cursor-default'
                } ${
                  idx === currentStepIndex
                    ? 'w-6 bg-[#0c3c60]'
                    : idx < currentStepIndex
                    ? 'w-2 bg-emerald-500'
                    : 'w-2 bg-slate-200 hover:bg-slate-300'
                }`}
                title={manifest.allowStepJumping !== false ? `Jump to Step ${idx + 1}` : `Step ${idx + 1}`}
                disabled={manifest.allowStepJumping === false}
              />
            ))}
          </div>

          <span className="text-[11px] font-mono font-bold text-slate-500">
            {Math.round(((currentStepIndex + 1) / manifest.totalSteps) * 100)}%
          </span>

          <button
            onClick={handleNextStep}
            className="px-4 py-1.5 rounded-full bg-[#0c3c60] hover:bg-[#092b45] text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-blue-900/20 transition-all cursor-pointer hover:scale-105"
          >
            <span>{currentStepIndex === manifest.totalSteps - 1 ? 'Finish' : 'Next'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      )}

      {/* 8. Completion Celebration Modal */}
      {isCompleted && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md text-center shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">Guide Completed!</h2>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              You have completed all {manifest.totalSteps} steps in the{' '}
              <strong className="text-slate-800">{manifest.title}</strong> walkthrough.
            </p>

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                onClick={handleRestart}
                className="w-full py-2.5 rounded-xl bg-[#0c3c60] hover:bg-[#092b45] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Restart Walkthrough</span>
              </button>

              <Link
                to="/"
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              >
                Return to NAVIGATE Portal
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
