# openalgo-chart — Project Guide

## Overview

A React + TypeScript charting application for the OpenAlgo trading platform. Built on `lightweight-charts` v5 with real-time WebSocket data, technical indicators, drawing tools, options chain, order entry, risk calculator, and AI-based scanners.

## Tech Stack

- **Framework:** React 19 + TypeScript
- **Build:** Vite 7
- **Charts:** lightweight-charts v5
- **State:** Zustand v5
- **Styling:** CSS modules + global styles
- **Testing:** Vitest (unit), Playwright (e2e)
- **Linting:** ESLint + TypeScript-ESLint

## Common Commands

```bash
npm run dev           # Start dev server
npm run build         # TypeScript check + Vite build
npm run type-check    # tsc --noEmit only
npm run lint          # ESLint
npm run test          # Vitest unit tests
npm run test:e2e      # Playwright e2e tests
```

## Project Structure

```
src/
├── App.tsx                    # Root orchestrator — mounts all panels, connects hooks
├── components/                # UI components (40+)
│   ├── Chart/                 # ChartComponent, ChartGrid, multi-layout support
│   ├── Topbar/                # Symbol selector, interval controls
│   ├── Toolbar/               # Drawing tools, right toolbar, properties panel
│   ├── Watchlist/             # Live watchlist with real-time ticks
│   ├── TradingPanel/          # Order entry & position management
│   ├── BottomBar/             # Orders/Trades/Positions tabs
│   ├── OptionChainModal/      # Options chain viewer
│   ├── RiskCalculatorPanel/   # Risk/reward calculator panel
│   ├── PositionTracker/       # Live position tracking
│   ├── ANNScanner/            # Neural network signal scanner
│   ├── TradefinderScanner/    # Market screener
│   ├── MarketScreener/        # Sector heatmap
│   ├── PineEditor/            # Monaco-based Pine Script editor
│   ├── Settings/              # Full settings popup
│   └── shared/                # Button, Text, ConfirmDialog, etc.
├── plugins/                   # lightweight-charts overlay plugins
│   ├── line-tools/            # Full drawing suite (trendlines, fibs, Elliott waves, etc.)
│   ├── volume-profile/
│   ├── tpo-profile/
│   ├── delta-profile/
│   ├── oi-profile/
│   ├── footprint-chart/
│   ├── bar-stats/
│   ├── power-trades/
│   ├── risk-calculator/       # On-chart risk lines renderer
│   └── visual-trading/        # Visual order entry on chart
├── store/                     # Zustand global state
│   ├── marketDataStore.ts     # Live ticker/LTP data
│   ├── workspaceStore.ts      # Chart layouts, active chart state
│   └── uiStore.ts             # UI panel visibility
├── hooks/                     # Feature logic hooks (~35)
│   ├── useChart.ts
│   ├── useIndicatorHandlers.ts
│   ├── useSymbolHandlers.ts
│   ├── useRiskCalculator.ts
│   ├── useOrderHandlers.ts
│   ├── useTradingData.ts
│   └── ...
├── services/                  # Data & API layer
│   ├── openalgo.ts            # Main OpenAlgo REST/WebSocket client
│   ├── chartDataService.ts    # OHLCV fetch & caching
│   ├── tickDataService.ts     # Real-time tick streaming
│   ├── tickStore.ts           # Tick aggregation store
│   ├── optionChain.ts         # Options data
│   ├── orderService.ts        # Order placement
│   ├── alertService.ts        # Price & indicator alerts
│   ├── globalAlertMonitor.ts  # Alert monitoring service
│   ├── pineScriptService.ts   # Pine Script execution
│   ├── annScannerService.ts   # ANN scanner
│   ├── tradefinderService.ts  # Trade finder scanner
│   └── db/chartCache.ts       # IndexedDB caching layer
├── utils/
│   ├── indicators/            # Technical indicator math
│   │   ├── sma, ema, macd, rsi, stochastic, bollingerBands
│   │   ├── ichimoku, vwap, supertrend, pivotPoints, atr, adx
│   │   ├── volume, cvd, tpo, footprint, riskCalculator
│   │   └── annStrategy, patternRecognition, institutionalVolumetric
│   ├── alerts/                # Alert condition evaluators
│   └── chartUtils, colorUtils, fuzzySearch, timeframes, ...
├── context/                   # React contexts
│   ├── ThemeContext
│   ├── UIContext
│   ├── AlertContext
│   ├── UserContext
│   ├── WatchlistContext
│   └── OrderContext
├── types/                     # TypeScript type definitions
│   ├── api/                   # API response types
│   ├── domain/                # Business domain types
│   └── ui/                    # UI component prop types
└── workers/                   # Web Workers for off-thread indicator computation
```

## Architecture Patterns

### App.tsx as Orchestrator
`App.tsx` is the root component. All feature logic is extracted into domain hooks (`useIndicatorHandlers`, `useSymbolHandlers`, etc.) and composed here. Heavy modals are `React.lazy()` loaded.

### Plugin System
Chart overlays extend `lightweight-charts` primitives via `plugin-base.ts`. Each plugin implements a pane view + renderer pair and is attached to the chart instance.

### Real-time Data Flow
```
WebSocket → openalgo.ts → tickStore → Zustand (marketDataStore) → components
```

### State Management
- **Zustand** for global market data and workspace state
- **React Context** for UI, alerts, user, watchlist, orders
- **Local component state** for ephemeral UI state

### Caching
- `IndexedDB` (via `db/chartCache.ts`) for OHLCV bar data
- In-memory `optionChainCache.ts` for options data

## Key Files

| File | Purpose |
|---|---|
| `src/App.tsx` | Root — wires everything together |
| `src/services/openalgo.ts` | All API calls + WebSocket management |
| `src/store/workspaceStore.ts` | Chart layout & active symbol state |
| `src/store/marketDataStore.ts` | Live LTP/tick data |
| `src/plugins/line-tools/line-tools.ts` | Drawing tool engine |
| `src/hooks/useChart.ts` | Chart instance lifecycle |
| `src/utils/indicators/index.ts` | Indicator exports |

## e2e Tests

Located in `e2e/`. Organized by feature:
- `risk-calculator/` — activation, draggable lines, templates, validation
- `watchlist-and-indicator.spec.ts`
- `verify-chart-sync.spec.ts`
