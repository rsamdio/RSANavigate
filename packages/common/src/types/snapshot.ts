import { TargetCoordinates, DOMModification } from './demo';

export interface ClickedElementInfo {
  tagName: string;
  id?: string;
  className?: string;
  selector: string;
  xpath?: string;
  text?: string;
  rect: TargetCoordinates;
  attributes?: Record<string, string>;
}

export interface DOMSnapshot {
  id: string;
  demoId?: string;
  stepId?: string;
  url: string;
  title: string;
  html: string;
  styles: string[];
  viewport: {
    width: number;
    height: number;
    scrollX: number;
    scrollY: number;
  };
  capturedAt: number;
  clickCoordinates?: {
    x: number;
    y: number;
  };
  clickedElement?: ClickedElementInfo;
  externalStylesheets?: string[];
}

export interface CaptureOptions {
  inlineStyles?: boolean;
  captureCanvas?: boolean;
  cleanScripts?: boolean;
  maxHtmlLength?: number;
}

export interface RehydrationOptions {
  interactiveElements?: boolean;
  highlightTarget?: boolean;
  disableNavigation?: boolean;
  scale?: number;
  modifications?: DOMModification[];
}
