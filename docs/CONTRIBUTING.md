# Contributing to OpenAlgo Chart

## Development Setup

### Prerequisites

- Node.js 20+
- npm 10+
- Git

### Installation

```bash
git clone <repository-url>
cd openalgo-chart
npm install
npm run dev
```

## Code Standards

### TypeScript

- Enable strict mode
- No implicit `any` without justification
- Export types from index files
- Use type imports: `import type { Order } from '@/types'`

### File Naming

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `OrderEntry.tsx` |
| Hooks | camelCase with 'use' prefix | `useOrderForm.ts` |
| Services | camelCase with '.service' suffix | `account.service.ts` |
| Types | camelCase | `orders.ts` |
| Constants | camelCase | `orderConstants.ts` |

### Import Order

```typescript
// 1. React imports
import { useState, useEffect } from 'react';

// 2. Third-party imports
import { create } from 'zustand';

// 3. Absolute imports (aliases)
import { useWorkspaceStore } from '@/store';
import type { Order } from '@/types';

// 4. Relative imports
import { OrderRow } from './OrderRow';
import styles from './OrderList.module.css';
```

### Component Structure

```typescript
// 1. Imports
import { useState } from 'react';
import type { OrderProps } from '@/types';

// 2. Types (if component-specific)
interface LocalState {
  isOpen: boolean;
}

// 3. Component
export function OrderEntry({ symbol, exchange }: OrderProps) {
  // Hooks first
  const [state, setState] = useState<LocalState>({ isOpen: false });

  // Derived values
  const displayName = `${symbol}:${exchange}`;

  // Handlers
  const handleSubmit = () => {
    // ...
  };

  // Render
  return (
    <div>
      {/* ... */}
    </div>
  );
}
```

## Git Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `refactor/description` - Code improvements
- `docs/description` - Documentation updates

### Commit Messages

Follow conventional commits:

```
type(scope): description

[optional body]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
```
feat(order): add stop-loss order type
fix(chart): resolve indicator rendering issue
docs(api): update service documentation
```

### Pull Request Checklist

- [ ] Code follows style guidelines
- [ ] Types are properly defined
- [ ] Tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Documentation updated if needed

## Testing

### Unit Tests

```bash
npm run test        # Run tests
npm run test:watch  # Watch mode
npm run test:coverage  # With coverage
```

### E2E Tests

```bash
npm run test:e2e      # Run Playwright tests
npm run test:e2e:ui   # Interactive mode
```

### Test File Location

- Unit tests: `src/**/*.test.ts(x)`
- Integration tests: `tests/integration/`
- E2E tests: `e2e/`

## Documentation

- Update docs when adding features
- Add JSDoc comments to public APIs
- Keep README.md current
- Document breaking changes

## Code Review

### What Reviewers Look For

1. **Type Safety**: Proper TypeScript usage
2. **Architecture**: Follows established patterns
3. **Testing**: Adequate test coverage
4. **Performance**: No unnecessary re-renders
5. **Security**: No exposed secrets, XSS prevention
6. **Accessibility**: Keyboard navigation, ARIA labels

### Responding to Feedback

- Address all comments
- Explain decisions when needed
- Request re-review after changes
