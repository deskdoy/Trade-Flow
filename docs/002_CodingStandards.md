# Coding Standards: TradeFlow

To keep the codebase maintainable, secure, and extensible as it grows, we enforce these strict coding standards across all applications and packages.

## TypeScript & Type Safety

1. **Explicit Types**: Avoid using `any` or implicit conversions. All method signatures must specify input and output types.
2. **Named Imports Only**: Use named imports (`import { x } from "y"`) rather than wildcard object destructuring.
3. **Enum Declaration**: Define standard TypeScript enums. Do NOT use `const enum`.
4. **Enforce Readonly State**: Use `readonly` arrays and properties where state changes are discouraged (e.g. within domain entities).

## Code Structure & Decoupling

1. **Dependency Injection**: Classes and Use Cases should accept their dependencies in their constructor via interfaces, never by instantiating concrete instances.
2. **No Business Logic in Interfaces**: Controllers must only receive HTTP requests, parse and validate payloads, trigger application Use Cases, and formulate the HTTP response.
3. **Pathing**: Use clean TypeScript path aliases (e.g. `@/*`) to avoid long relative import sequences (e.g., `../../../../`).
4. **Linting**: All files must pass `npm run lint` with zero errors or warnings.
