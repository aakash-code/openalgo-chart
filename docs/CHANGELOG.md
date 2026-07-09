# Changelog

All notable changes to OpenAlgo Chart will be documented in this file.

## [Unreleased]

### Added
- **TypeScript Migration**: Full TypeScript configuration with strict mode
  - `tsconfig.json` with comprehensive strict type checking
  - Path aliases for cleaner imports (`@/`, `@components/`, etc.)
  - Type definitions for all API, domain, and UI types

- **Type System** (`src/types/`)
  - API types: Orders, Positions, Account, Market Data, Options
  - Domain types: Trading, Chart, Alerts, Workspace
  - UI types: Components, Context, Hooks
  - Utility types: Common patterns, branded types, Result type

- **Service Layer Migration** (`src/services/`)
  - TypeScript API client with typed request/response
  - Trading services: Account, Order management
  - Centralized endpoint constants

- **Store Migration** (`src/store/`)
  - TypeScript Zustand stores with full type safety
  - Workspace store with chart configuration
  - Market data store with ticker updates

- **Hooks Migration** (`src/hooks/`)
  - `useDebounce` - Debounce values
  - `useLocalStorage` - Persistent state
  - `useClickOutside` - Click outside detection
  - `useMediaQuery` - Responsive breakpoints

- **Constants Migration** (`src/constants/`)
  - Order constants with type exports
  - Storage keys with TypeScript const assertions

- **Context Providers** (`src/context/`)
  - UserContext with authentication state
  - ThemeContext with theme management

- **Documentation** (`docs/`)
  - Architecture overview
  - Contributing guidelines
  - Code standards
  - Review checklist

- **Testing Infrastructure**
  - Vitest configuration with coverage
  - MSW mock handlers
  - Test fixtures
  - Unit test examples

- **CI/CD Workflows** (`.github/workflows/`)
  - Lint, test, build pipeline
  - Coverage reporting
  - E2E test execution
  - Release automation

### Changed
- Updated `package.json` with TypeScript dependencies
- Converted Vite config to TypeScript
- Updated test setup to TypeScript

### Migration Notes
- Existing `.js` and `.jsx` files are still supported
- Gradual migration can continue with mixed file types
- Type imports available from `@/types`
