# Cloudflare R2 Manifest Specification

## Zero-Database Edge Architecture
The public viewer requires zero database connections. It consumes a single static JSON manifest bundle served directly from Cloudflare R2 / CDN:

```json
{
  "version": "1.0.0",
  "demoId": "demo_123",
  "title": "Rotary Club Central Goal Setting",
  "totalSteps": 5,
  "publishedAt": "2026-08-18T10:00:00.000Z",
  "steps": [
    {
      "stepId": "step_1",
      "stepIndex": 0,
      "title": "Accessing Club Goals",
      "description": "Click the Goal Center tab to review active metrics.",
      "targetSelector": "#nav-goals",
      "targetCoordinates": { "x": 120, "y": 80, "width": 140, "height": 40 },
      "placement": "bottom",
      "triggerType": "click",
      "stepType": "tooltip",
      "showBeacon": true,
      "snapshotUrl": "https://pub-tour.r2.dev/demos/demo_123/snapshots/step_1.json"
    }
  ]
}
```
