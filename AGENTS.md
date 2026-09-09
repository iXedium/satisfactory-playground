# Project Workflow Guidelines

### Model & Reasoning
- Suggest switching from Flash to Pro (or increasing reasoning) whenever entering complex math, cyclic graph resolution, or performance optimization.

### Testing & Verification
- Prioritize real user experience testing using Chrome DevTools MCP on http://localhost:5173 when available.
- Always run `npm run type-check` before declaring a code change complete.

### Ambiguity & Questions
- If requirements are ambiguous or an edge case arises, ask multiple-choice questions with selectable options and always allow a custom user write-in option.

### Reporting Format
- Every completed task report must start with a concise **TL;DR** section at the top, followed by an **Extended Report** below.

### Git & Version Control
- Always commit changes in granular, atomic stages with clear conventional commit messages (e.g. `feat(...)`, `fix(...)`) so progress is easy to review and roll back if needed.
