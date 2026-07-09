# Code Standards

## TypeScript Guidelines

### Type Definitions

Always define types explicitly:

```typescript
// Good
function calculateProfit(position: Position): number {
  return position.quantity * (position.ltp - position.average_price);
}

// Bad
function calculateProfit(position) {
  return position.quantity * (position.ltp - position.average_price);
}
```

### Avoid `any`

Use `unknown` when type is truly unknown:

```typescript
// Good
function parseApiResponse(data: unknown): Order | null {
  if (isOrder(data)) return data;
  return null;
}

// Bad
function parseApiResponse(data: any): Order | null {
  return data;
}
```

### Type Guards

Use type guards for runtime type checking:

```typescript
function isOrder(data: unknown): data is Order {
  return (
    typeof data === 'object' &&
    data !== null &&
    'orderid' in data &&
    'symbol' in data
  );
}
```

## React Patterns

### Component Organization

```typescript
// 1. Type definitions
interface Props {
  symbol: string;
  exchange: string;
  onSelect: (symbol: string) => void;
}

// 2. Component
export function SymbolCard({ symbol, exchange, onSelect }: Props) {
  // 3. Hooks
  const [isHovered, setIsHovered] = useState(false);
  const ticker = useMarketDataStore((s) => s.getTicker(symbol, exchange));

  // 4. Derived state
  const displayPrice = formatPrice(ticker?.ltp ?? 0);
  const changeClass = ticker?.chg >= 0 ? 'positive' : 'negative';

  // 5. Callbacks
  const handleClick = useCallback(() => {
    onSelect(symbol);
  }, [symbol, onSelect]);

  // 6. Effects
  useEffect(() => {
    // Side effects
  }, [symbol]);

  // 7. Render
  return (
    <div onClick={handleClick}>
      {/* ... */}
    </div>
  );
}
```

### Memoization

Use memoization appropriately:

```typescript
// Memoize expensive computations
const sortedPositions = useMemo(
  () => positions.sort((a, b) => b.pnl - a.pnl),
  [positions]
);

// Memoize callbacks passed to children
const handleSort = useCallback(
  (column: string) => {
    setSortBy(column);
  },
  []
);

// Memoize components that receive objects/arrays as props
const MemoizedRow = memo(PositionRow);
```

### Custom Hooks

Extract reusable logic into hooks:

```typescript
// Custom hook for form state
function useOrderForm(initialSymbol: string) {
  const [formState, setFormState] = useState<OrderFormState>({
    symbol: initialSymbol,
    quantity: 1,
    orderType: 'MARKET',
  });

  const updateField = useCallback(<K extends keyof OrderFormState>(
    field: K,
    value: OrderFormState[K]
  ) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  }, []);

  const validate = useCallback(() => {
    // Validation logic
    return true;
  }, [formState]);

  return { formState, updateField, validate };
}
```

## Service Layer

### API Calls

Always use the service layer:

```typescript
// Good
import { accountService } from '@/services/trading';

const funds = await accountService.getFunds();

// Bad
const response = await fetch('/api/v1/funds', {
  method: 'POST',
  body: JSON.stringify({ apikey }),
});
```

### Error Handling

Handle errors gracefully:

```typescript
async function loadPositions() {
  try {
    const positions = await accountService.getPositionBook();
    setPositions(positions);
  } catch (error) {
    logger.error('Failed to load positions:', error);
    showToast({ type: 'error', message: 'Failed to load positions' });
  }
}
```

## State Management

### Zustand Store Structure

```typescript
interface StoreState {
  // State
  items: Item[];
  loading: boolean;

  // Actions
  addItem: (item: Item) => void;
  removeItem: (id: string) => void;
  setLoading: (loading: boolean) => void;
}

const useStore = create<StoreState>()((set) => ({
  items: [],
  loading: false,

  addItem: (item) => set((state) => ({
    items: [...state.items, item]
  })),

  removeItem: (id) => set((state) => ({
    items: state.items.filter((i) => i.id !== id)
  })),

  setLoading: (loading) => set({ loading }),
}));
```

### Selectors

Use selectors for derived state:

```typescript
// Define selectors outside component
const selectActiveOrders = (state: StoreState) =>
  state.orders.filter((o) => o.status === 'OPEN');

// Use in component
function ActiveOrders() {
  const activeOrders = useOrderStore(selectActiveOrders);
  // ...
}
```

## Performance

### Avoid Unnecessary Re-renders

```typescript
// Bad: Creates new object every render
<Component style={{ margin: 10 }} />

// Good: Define outside or memoize
const style = { margin: 10 };
<Component style={style} />

// Or with useMemo
const style = useMemo(() => ({ margin }), [margin]);
```

### Virtualization for Long Lists

```typescript
// Use virtual scrolling for lists > 100 items
import { useVirtualScroll } from '@/hooks';

function LongList({ items }: { items: Item[] }) {
  const { virtualItems, totalHeight, containerRef } = useVirtualScroll({
    items,
    itemHeight: 40,
  });

  return (
    <div ref={containerRef} style={{ height: 400, overflow: 'auto' }}>
      <div style={{ height: totalHeight }}>
        {virtualItems.map(({ item, style }) => (
          <ListItem key={item.id} item={item} style={style} />
        ))}
      </div>
    </div>
  );
}
```

## Security

### Never Expose Secrets

```typescript
// Bad
const apiKey = 'sk-12345';

// Good
const apiKey = import.meta.env.VITE_API_KEY;
```

### Validate User Input

```typescript
function validateOrderQuantity(quantity: unknown): number {
  const num = Number(quantity);
  if (!Number.isInteger(num) || num <= 0 || num > 10000) {
    throw new Error('Invalid quantity');
  }
  return num;
}
```

### Sanitize Display Data

```typescript
// Use textContent instead of innerHTML
element.textContent = userInput;

// If HTML needed, sanitize first
import DOMPurify from 'dompurify';
element.innerHTML = DOMPurify.sanitize(userInput);
```
