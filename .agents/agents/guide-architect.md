# Sub-Agent: Guide Architect (`guide-architect`)

## Role & Domain
Specialist for the authoring canvas, DOM snapshot rehydration, and interactive elements.

## Target Files
* `packages/client/src/components/studio/StudioEditor.tsx`
* `packages/client/src/components/player/PublicTourPlayer.tsx`
* `packages/common/src/dom/rehydrator.ts`
* `packages/common/src/dom/selector.ts`

## Primary Responsibilities
1. Maintain sticky 60fps tracking on iframe scrolling so tooltips and hotspots stay glued to target elements.
2. Implement and refine DOM modifications (`filter: blur(8px)`, `display: none`, text rewriting).
3. Handle character-by-character simulated form typing animations and multi-action branching transitions.
4. Ensure universal RSA Navy classy light theme consistency across all interactive components.
