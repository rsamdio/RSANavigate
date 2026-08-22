# DOM Mutation Specification

## DOMModification Schema
```typescript
export interface DOMModification {
  id?: string;
  selector: string;
  type: 'blur' | 'hide' | 'replaceText';
  value?: string;
}
```

## Rehydration Pipeline
1. Snapshot HTML and captured CSS strings are written to the sandboxed iframe.
2. `applyDOMModifications(doc, modifications)` parses all selectors.
3. Matching nodes receive `.tour-element-blurred`, `.tour-element-hidden`, or updated `textContent`.
4. Modifications are saved on `StepDocument.domModifications` and serialized into `TourManifest.steps[i].domModifications` upon publishing.
