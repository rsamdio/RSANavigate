# Branching Logic & Simulated Input Specification

## StepAction Schema
```typescript
export interface StepAction {
  id: string;
  label: string;
  actionType: 'next' | 'prev' | 'jumpToStep' | 'openUrl';
  targetStepId?: string;
  url?: string;
  style?: 'primary' | 'secondary' | 'outline';
}
```

## Execution Flow in PublicTourPlayer
* `jumpToStep`: Resolves index of `targetStepId` from `manifest.steps` and triggers `setCurrentStepIndex()`.
* `openUrl`: Opens `window.open(url, '_blank')`.
* `next` / `prev`: Step increments/decrements with boundary checks.
* `inputAction`: If configured with `{ textToType, typingSpeedMs }`, calls `simulateTypingInElement()` upon step mount.
