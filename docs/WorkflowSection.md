# WorkflowSection

4-step horizontal timeline (desktop) / vertical timeline (mobile) showing the Instra plugin workflow.

## Technologies
- Framer Motion v12, react-i18next, react-icons/fi, TailwindCSS v4

## i18n Keys
- `usecaseWorkflow.badge`
- `usecaseWorkflow.heading`
- `usecaseWorkflow.steps[]`  array of `{ title, body }` (4 items)

## Animation
- Connector line: `scaleX: 0→1` (desktop) / `scaleY: 0→1` (mobile), 0.8s duration
- Step nodes: staggered `opacity + y` entrance, 0.12s per step

## Example
```tsx
<WorkflowSection />
```
