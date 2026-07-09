# Context Usage Patterns

This document describes the centralized context providers in the codebase and how to use them.

## Overview

The application uses 7 context providers, wrapped in `main.jsx`:

```
<UserProvider>
  <ThemeProvider>
    <UIProvider>
      <ToolProvider>
        <AlertProvider>
          <WatchlistProvider>
            <App />
          </WatchlistProvider>
        </AlertProvider>
      </ToolProvider>
    </UIProvider>
  </ThemeProvider>
</UserProvider>
```

---

## UIContext - Modal & Panel State

**File:** `src/context/UIContext.jsx`

### Usage
```javascript
import { useUI } from './context/UIContext';

function MyComponent() {
  const {
    isSearchOpen, setIsSearchOpen,
    isCommandPaletteOpen, setIsCommandPaletteOpen,
    isSettingsOpen, setIsSettingsOpen,
    closeAllModals,
    closeTopmostModal,
    hasOpenModal,
  } = useUI();
}
```

### Available States
| State | Type | Description |
|-------|------|-------------|
| `isSearchOpen` | boolean | Symbol search modal |
| `searchMode` | string | 'switch', 'add', 'compare' |
| `isCommandPaletteOpen` | boolean | Command palette (Ctrl+K) |
| `isTemplateDialogOpen` | boolean | Layout template dialog |
| `isShortcutsDialogOpen` | boolean | Keyboard shortcuts dialog |
| `isChartTemplatesOpen` | boolean | Chart templates dialog |
| `isSettingsOpen` | boolean | Settings popup |
| `isStraddlePickerOpen` | boolean | Straddle picker |
| `isOptionChainOpen` | boolean | Option chain modal |
| `isAlertOpen` | boolean | Alert dialog |
| `isSectorHeatmapOpen` | boolean | Sector heatmap |
| `isIndicatorSettingsOpen` | boolean | Indicator settings |
| `activeRightPanel` | string | Current right panel |

### Helper Functions
- `closeAllModals()` - Close all open modals
- `closeTopmostModal()` - Close only the topmost modal (for Escape key)
- `openSearch(mode, initialValue)` - Open search with specific mode
- `openOptionChain(symbol)` - Open option chain for symbol

---

## AlertContext - Alert Management

**File:** `src/context/AlertContext.jsx`

### Usage
```javascript
import { useAlert } from './context/AlertContext';

function MyComponent() {
  const {
    alerts, setAlerts,
    alertLogs, addAlertLog,
    unreadAlertCount, incrementUnreadCount,
    globalAlertPopups, addGlobalPopup,
    alertPricesRef,
  } = useAlert();
}
```

### Features
- **24-hour retention** - Triggered alerts auto-expire
- **Persistence** - Alerts saved to localStorage via storageService
- **Cross-tab sync** - Alert state shared across tabs

### Available States
| State | Type | Description |
|-------|------|-------------|
| `alerts` | array | Active alerts |
| `alertLogs` | array | Alert history |
| `unreadAlertCount` | number | Badge count |
| `globalAlertPopups` | array | Background notification popups |
| `alertPricesRef` | ref | Map for crossing detection |

### Helper Functions
- `addAlert(alert)` - Create new alert
- `removeAlert(alertId)` - Delete alert
- `triggerAlert(alertId)` - Mark as triggered
- `addAlertLog(log)` - Add to history
- `addGlobalPopup(popup)` - Show background popup

---

## ThemeContext - Theme Management

**File:** `src/context/ThemeContext.jsx`

### Usage
```javascript
import { useTheme } from './context/ThemeContext';

function MyComponent() {
  const { theme, setTheme, toggleTheme } = useTheme();
}
```

### Features
- Auto-applies `data-theme` attribute to `<html>`
- Cross-tab sync via storage events
- Cloud sync integration

---

## UserContext - Authentication

**File:** `src/context/UserContext.jsx`

### Usage
```javascript
import { useUser } from './context/UserContext';

function MyComponent() {
  const { isAuthenticated, user, login, logout } = useUser();
}
```

---

## WatchlistContext - Watchlist Data

**File:** `src/context/WatchlistContext.jsx`

### Usage
```javascript
import { useWatchlist } from './context/WatchlistContext';

function MyComponent() {
  const { watchlists, activeListId, quotes } = useWatchlist();
}
```

---

## ToolContext - Drawing Tools

**File:** `src/context/ToolContext.jsx`

### Usage
```javascript
import { useTool } from './context/ToolContext';

function MyComponent() {
  const { activeTool, setActiveTool, toolOptions } = useTool();
}
```

---

## OrderContext - Order Management

**File:** `src/context/OrderContext.jsx`

### Usage
```javascript
import { useOrder } from './context/OrderContext';

function MyComponent() {
  const { orders, pendingOrders, placeOrder } = useOrder();
}
```

---

## Best Practices

1. **Use context for shared state** - If multiple components need the same state, use context
2. **Don't duplicate** - Check if state already exists in a context before adding useState
3. **Prefer context helpers** - Use `addAlert()` instead of `setAlerts(prev => [...])`
4. **Keep components focused** - Components should only consume the context values they need
