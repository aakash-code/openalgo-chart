# OpenAlgo Chart Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    React Application                         │
├─────────────────────────────────────────────────────────────┤
│  Components (UI Layer)                                       │
│  ├── Chart Components (ChartComponent, ChartGrid)           │
│  ├── Trading Components (OrderEntry, Positions)             │
│  └── Layout Components (Topbar, Sidebar, Panels)            │
├─────────────────────────────────────────────────────────────┤
│  State Management Layer                                      │
│  ├── Zustand Stores (workspace, marketData)                 │
│  └── React Context (User, Order, Alert, Theme)              │
├─────────────────────────────────────────────────────────────┤
│  Hooks Layer                                                 │
│  ├── Data Hooks (useTradingData, useChart)                  │
│  ├── UI Hooks (useMediaQuery, useKeyboardNav)               │
│  └── Utility Hooks (useDebounce, useLocalStorage)           │
├─────────────────────────────────────────────────────────────┤
│  Service Layer                                               │
│  ├── Trading Services (Account, Order, Position)            │
│  ├── Market Services (ChartData, Tick, Instrument)          │
│  └── Real-time Services (WebSocket, Subscriptions)          │
├─────────────────────────────────────────────────────────────┤
│  Type System                                                 │
│  ├── API Types (Request/Response contracts)                 │
│  ├── Domain Types (Business entities)                       │
│  └── UI Types (Component props, Context values)             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    OpenAlgo Backend API                      │
│  REST API (Port 5000) │ WebSocket (Port 8765)               │
└─────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### 1. Type-First Development

All data contracts are defined in `src/types/` before implementation:

- **API Types** (`src/types/api/`): Request/response shapes for all API calls
- **Domain Types** (`src/types/domain/`): Core business entities (Order, Position, Chart)
- **UI Types** (`src/types/ui/`): Component props, context values, hook returns

### 2. Service Layer Abstraction

API calls are isolated in services, never in components:

```typescript
// Good: Service handles API details
const funds = await accountService.getFunds();

// Bad: Component makes direct API calls
const response = await fetch('/api/v1/funds');
```

### 3. State Separation

- **Server State**: Market data, positions, orders - managed by services + stores
- **Client State**: UI preferences, layout - managed by Zustand + localStorage
- **Component State**: Form inputs, local UI state - managed by React useState

### 4. Feature-Based Organization

Components are organized by feature domain:

```
src/components/
├── Chart/           # Chart-related components
├── Trading/         # Order entry, positions
├── Watchlist/       # Watchlist components
└── shared/          # Reusable UI components
```

## Data Flow

### Market Data Flow

```
WebSocket → tickDataService → marketDataStore → Component
                                    ↓
                              useMarketDataStore
                                    ↓
                              Ticker Display
```

### Order Flow

```
OrderEntry Component
        ↓
  useOrderForm hook
        ↓
  orderService.placeOrder()
        ↓
  OpenAlgo API
        ↓
  Broker
```

### State Updates

```
User Action → Hook/Handler → Service Call → Store Update → UI Re-render
```

## Directory Structure

```
src/
├── types/           # TypeScript type definitions
│   ├── api/         # API request/response types
│   ├── domain/      # Business domain types
│   ├── ui/          # UI component types
│   └── utils/       # Utility types
├── services/        # API and business logic
│   ├── api/         # Core API client
│   ├── trading/     # Trading services
│   ├── market/      # Market data services
│   └── realtime/    # WebSocket services
├── store/           # Zustand stores
├── hooks/           # Custom React hooks
├── context/         # React context providers
├── components/      # React components
├── constants/       # Application constants
└── utils/           # Utility functions
```

## Technology Stack

| Layer | Technology |
|-------|------------|
| UI Framework | React 19 |
| State Management | Zustand 5 |
| Charts | Lightweight Charts |
| Styling | CSS Modules |
| Build | Vite 7 |
| Language | TypeScript 5 |
| Testing | Vitest + Playwright |

## Key Patterns

### Hook Pattern

Custom hooks encapsulate reusable logic:

```typescript
function useTradingData() {
  const [data, setData] = useState<TradingData>(initialState);

  useEffect(() => {
    // Fetch and subscribe to data
  }, []);

  return { data, refresh };
}
```

### Service Pattern

Services handle all external communication:

```typescript
class AccountService {
  async getFunds(): Promise<Funds | null> {
    return makeApiRequest<Funds>('/funds');
  }
}
```

### Store Pattern

Zustand stores for global state:

```typescript
const useWorkspaceStore = create<WorkspaceStore>()((set) => ({
  layout: '1',
  setLayout: (layout) => set({ layout }),
}));
```
