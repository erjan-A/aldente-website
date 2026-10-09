# Coding standards

## Implementation

- Keep reusable logic in `src/lib`, browser custom elements in `src/scripts`, content in `src/data`, and page sections in `src/components`.
- Write a failing test before changing behavior. Use unit tests for logic and happy-dom tests for browser custom elements.

## Servers

- Start development with `npm run dev -- --background`. Use the installed Astro CLI help for status, logs, and stop commands.
- Let Playwright manage its configured preview server.

## Completion

Run `npm run verify` before finishing any file change. Report the result and any failed or blocked checks.
