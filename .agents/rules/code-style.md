# Code Style & UI/UX Guidelines

## 1. Design Aesthetics & Branding
* **Brand Positioning**: The application represents **NAVIGATE** by *Rotaract South Asia MDIO*, a digital knowledge & guide directory.
* **Palette**: Universal Classy Light Theme.
  * Primary Accent: Deep RSA Navy (`#0c3c60` / `rgb(12, 60, 96)`).
  * Supporting: Slate backgrounds (`bg-slate-50`, `bg-slate-100`), clean borders (`border-slate-200`), and crisp dark typography (`text-slate-900`).
  * Avoid heavy dark mode backgrounds or generic neon colors.
* **Typography**: Modern sans-serif (`font-['Plus_Jakarta_Sans',sans-serif]`) and clean monospaced tokens for metadata (`font-mono`).

## 2. TypeScript & Monorepo Conventions
* **Strict Types**: Always import shared data structures (`TourManifest`, `StepDocument`, `DOMModification`, `DOMSnapshot`) from `@serverless-tour/common`.
* **Clean Code**: Avoid `any` where possible. Maintain backward compatibility for local storage fallbacks.
* **React 19 & Tailwind 4 Compatibility**: Use modern functional components with hooks, avoiding deprecated patterns.
