export type HotspotPlacement = 'top' | 'bottom' | 'left' | 'right' | 'center';
export type HotspotTriggerType = 'click' | 'hover' | 'next' | 'timer';
export type StepElementType = 'tooltip' | 'beacon' | 'spotlight' | 'modal';
export type FocusBackdropType = 'none' | 'dim' | 'blur';
export type TargetHighlightType = 'none' | 'solid' | 'bubble' | 'ring' | 'dashed' | 'glow';

export interface TargetCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
  scrollX?: number;
  scrollY?: number;
}

export interface TourTheme {
  primaryColor?: string;
  badgeColor?: string;
  borderRadius?: string;
  showBackdrop?: boolean;
  showStepCount?: boolean;
  pulseAnimation?: boolean;
}

export interface DOMModification {
  id?: string;
  selector: string;
  type: 'blur' | 'hide' | 'replaceText';
  value?: string;
  elementDescription?: string;
}

export interface StepAction {
  id: string;
  label: string;
  actionType: 'next' | 'prev' | 'jumpToStep' | 'openUrl';
  targetStepId?: string;
  url?: string;
  style?: 'primary' | 'secondary' | 'outline';
}

export interface InputAction {
  textToType: string;
  typingSpeedMs?: number;
}

export interface BeaconConfig {
  style?: 'pulse' | 'dot' | 'icon';
  icon?: 'question' | 'info' | 'hand' | 'plus' | 'star';
  color?: string;
  alignment?: 'left' | 'center' | 'right';
}

// Cloud Firestore: /demos/{demoId}
export interface DemoDocument {
  id: string;
  title: string;
  slug?: string; // Custom vanity URL slug (e.g. 'rbe-website')
  description?: string;
  coverImageUrl?: string; // WebP preview/cover image URL
  isFeatured?: boolean; // Highlighted on public portal hero
  authorId: string;
  authorEmail?: string;
  createdAt: number;
  updatedAt: number;
  stepOrder: string[]; // Ordered list of step IDs
  isPublished: boolean;
  publishedManifestUrl?: string;
  tags?: string[];
  theme?: TourTheme;
  displayMode?: 'standard' | 'responsive';
  showStepProgress?: boolean;
  allowStepJumping?: boolean;
  globalDomModifications?: DOMModification[];
}

// Cloud Firestore: /demos/{demoId}/steps/{stepId}
export interface StepDocument {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  targetSelector: string; // CSS selector or XPath
  targetCoordinates: TargetCoordinates;
  placement: HotspotPlacement;
  triggerType: HotspotTriggerType;
  stepType?: StepElementType;
  showBeacon?: boolean;
  showSpotlight?: boolean;
  focusBackdrop?: FocusBackdropType; // 'none' | 'dim' | 'blur'
  targetHighlight?: TargetHighlightType; // 'none' | 'solid' | 'ring' | 'dashed'
  beaconConfig?: BeaconConfig;
  buttonText?: string;
  buttonLayout?: 'full' | 'right' | 'center' | 'left';
  showBackButton?: boolean;
  backButtonText?: string;
  textAlign?: 'left' | 'center' | 'right';
  showTooltipArrow?: boolean;
  actions?: StepAction[];
  inputAction?: InputAction;
  domModifications?: DOMModification[];
  themeColor?: string;
  cardStyle?: 'solid' | 'glass' | 'dark' | 'outline';
  autoAdvanceSeconds?: number;
  audioUrl?: string;
  snapshotUrl: string; // R2 URL or inline snapshot reference
  createdAt: number;
  updatedAt?: number;
}

// Cloudflare R2: /demos/{demoId}/manifest.json (Zero-Database Edge Bundle)
export interface StepManifest {
  stepId: string;
  stepIndex: number;
  title: string;
  description: string;
  targetSelector: string;
  targetCoordinates: TargetCoordinates;
  placement: HotspotPlacement;
  triggerType: HotspotTriggerType;
  stepType?: StepElementType;
  showBeacon?: boolean;
  showSpotlight?: boolean;
  focusBackdrop?: FocusBackdropType;
  targetHighlight?: TargetHighlightType;
  beaconConfig?: BeaconConfig;
  buttonText?: string;
  buttonLayout?: 'full' | 'right' | 'center' | 'left';
  showBackButton?: boolean;
  backButtonText?: string;
  textAlign?: 'left' | 'center' | 'right';
  actions?: StepAction[];
  inputAction?: InputAction;
  domModifications?: DOMModification[];
  themeColor?: string;
  cardStyle?: 'solid' | 'glass' | 'dark' | 'outline';
  autoAdvanceSeconds?: number;
  audioUrl?: string;
  snapshotUrl: string;
}

export interface TourManifest {
  version: string;
  demoId: string;
  slug?: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  isFeatured?: boolean;
  totalSteps: number;
  theme?: TourTheme;
  displayMode?: 'standard' | 'responsive';
  showStepProgress?: boolean;
  allowStepJumping?: boolean;
  publishedAt: string;
  steps: StepManifest[];
  globalDomModifications?: DOMModification[];
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string; // e.g. https://pub-xxx.r2.dev or custom CDN URL
}
