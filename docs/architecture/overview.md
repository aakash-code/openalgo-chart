# Architecture Overview

## Introduction

OpenAlgo Chart is a professional trading chart application built with React and TypeScript. It connects to the OpenAlgo backend API for market data and order execution.

## System Components

### Frontend Application

The React application handles:

- Chart rendering using Lightweight Charts
- Real-time market data display
- Order entry and management
- Position tracking
- Alert management
- Workspace layout management

### Backend Integration

Connects to OpenAlgo backend via:

- **REST API** (port 5000): Order execution, account data
- **WebSocket** (port 8765): Real-time market data

## Layer Architecture

### 1. Presentation Layer (Components)

React components responsible for UI rendering:

```
src/components/
├── Chart/            # Chart components
├── AccountPanel/     # Trading account components
├── Watchlist/        # Watchlist components
├── OrderEntryModal/  # Order entry
└── shared/           # Reusable UI components
```

### 2. State Management Layer

Combines Zustand stores and React Context:

**Zustand Stores** (global, persistent):
- `workspaceStore`: Chart layout, indicators
- `marketDataStore`: Real-time ticker data

**React Context** (app-wide, session):
- `UserContext`: Authentication state
- `OrderContext`: Order modal state
- `AlertContext`: Alert management
- `ThemeContext`: Theme preferences

### 3. Hooks Layer

Custom hooks encapsulate reusable logic:

```
src/hooks/
├── useChart.js         # Chart initialization
├── useTradingData.js   # Trading data fetching
├── useOrderForm.js     # Order form state
└── useLocalStorage.js  # Persistent storage
```

### 4. Service Layer

Services handle external communication:

```
src/services/
├── api/              # Core API client
├── trading/          # Account & order services
├── market/           # Market data services
└── realtime/         # WebSocket services
```

### 5. Type Layer

TypeScript types ensure type safety:

```
src/types/
├── api/              # API types
├── domain/           # Business types
├── ui/               # Component types
└── utils/            # Utility types
```

## Data Flow

### Initialization

```
App.tsx
  ↓
Load workspace from localStorage
  ↓
Initialize WebSocket connection
  ↓
Subscribe to market data
  ↓
Render charts and panels
```

### Real-time Updates

```
WebSocket message received
  ↓
tickDataService processes
  ↓
marketDataStore updated
  ↓
Components re-render via selector
```

### Order Execution

```
User submits order form
  ↓
useOrderForm validates
  ↓
orderService.placeOrder()
  ↓
API response received
  ↓
Toast notification shown
  ↓
Order book refreshed
```

## Key Design Patterns

### Repository Pattern

Services abstract data access:

```typescript
// Services hide API details
const positions = await accountService.getPositionBook();
```

### Observer Pattern

Zustand provides subscription-based updates:

```typescript
// Components subscribe to specific data
const ltp = useMarketDataStore((s) => s.getTicker(symbol, exchange)?.ltp);
```

### Factory Pattern

Store slices create consistent state shapes:

```typescript
const createChartSlice = (set, get) => ({
  charts: [],
  addChart: (chart) => set(...),
  removeChart: (id) => set(...),
});
```

## Performance Considerations

### Selective Re-rendering

Use selectors to minimize re-renders:

```typescript
// Only re-render when specific value changes
const ltp = useMarketDataStore(selectLTP(symbol, exchange));
```

### Virtualization

Long lists use virtual scrolling:

```typescript
const { virtualItems } = useVirtualScroll({ items, itemHeight: 40 });
```

### Memoization

Expensive computations are memoized:

```typescript
const sortedData = useMemo(() =>
  data.sort((a, b) => b.value - a.value),
  [data]
);
```

## Security Measures

### Authentication

- API key stored in localStorage
- Key sent with each API request
- No key exposure in logs

### Input Validation

- Order quantities validated
- Price inputs sanitized
- Symbol names validated

### XSS Prevention

- User content escaped
- No dangerouslySetInnerHTML
- Content Security Policy headers
