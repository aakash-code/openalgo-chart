# Code Review Checklist

## Before Submitting PR

### Type Safety

- [ ] All new functions have explicit return types
- [ ] No `any` types without justification comment
- [ ] API responses properly typed
- [ ] Props interfaces defined for components
- [ ] Generic types used where appropriate

### Architecture

- [ ] Business logic in services, not components
- [ ] State changes through proper channels (store/context)
- [ ] No direct API calls in components
- [ ] Hooks follow naming convention (`use*`)
- [ ] Components follow single responsibility principle

### Testing

- [ ] Unit tests for new utilities/hooks
- [ ] Integration tests for new services
- [ ] E2E tests for user-facing features
- [ ] Test coverage maintained above threshold
- [ ] Edge cases covered

### Documentation

- [ ] JSDoc comments for public functions
- [ ] README updated if new features
- [ ] Type exports documented in index.ts
- [ ] Breaking changes noted in CHANGELOG
- [ ] API documentation updated

### Security

- [ ] No sensitive data in logs
- [ ] User input validated
- [ ] API keys not exposed in client code
- [ ] XSS prevention for user content
- [ ] No SQL/command injection vectors

### Performance

- [ ] Memoization for expensive computations
- [ ] Virtualization for long lists
- [ ] Lazy loading for heavy components
- [ ] No unnecessary re-renders
- [ ] Bundle size impact considered

### Code Quality

- [ ] No commented-out code
- [ ] No console.log statements (use logger)
- [ ] Consistent naming conventions
- [ ] No magic numbers (use constants)
- [ ] Error handling in place

### Accessibility

- [ ] Keyboard navigation works
- [ ] ARIA labels where needed
- [ ] Color contrast sufficient
- [ ] Focus indicators visible
- [ ] Screen reader compatible

## Reviewer Checklist

### First Pass

1. Does the PR description explain the change?
2. Is the scope appropriate (not too large)?
3. Are there any obvious issues?

### Code Review

1. **Logic**: Is the implementation correct?
2. **Types**: Are types properly defined?
3. **Patterns**: Does it follow project patterns?
4. **Edge Cases**: Are edge cases handled?
5. **Error Handling**: Are errors handled gracefully?

### Testing

1. Are tests comprehensive?
2. Do tests cover edge cases?
3. Are tests maintainable?

### Final Check

1. Run tests locally
2. Check for TypeScript errors
3. Review in browser if UI change
4. Verify no regressions

## Common Issues to Watch For

### Type Issues

```typescript
// Issue: Using any
const data: any = response.data;

// Fix: Define proper type
const data: OrderResponse = response.data;
```

### State Issues

```typescript
// Issue: Direct mutation
state.items.push(newItem);

// Fix: Immutable update
set({ items: [...state.items, newItem] });
```

### Performance Issues

```typescript
// Issue: Creating new reference every render
<Child data={items.filter(i => i.active)} />

// Fix: Memoize
const activeItems = useMemo(
  () => items.filter(i => i.active),
  [items]
);
<Child data={activeItems} />
```

### Security Issues

```typescript
// Issue: Rendering user HTML
<div dangerouslySetInnerHTML={{ __html: userComment }} />

// Fix: Sanitize or use textContent
<div>{userComment}</div>
```
