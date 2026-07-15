---
name: React Performance Tuner
description: Enforces React performance best practices. Activate this skill when building or modifying heavy UI components, lists, or state management logic.
---

# React Performance Tuner

Your objective is to ensure the React application runs smoothly at 60fps and avoids unnecessary re-renders.

## Best Practices
1. **Memoization:** Use `useMemo` for expensive calculations (e.g., filtering or sorting large lists like the transactions array). Use `useCallback` for functions passed as props to child components to prevent unnecessary re-renders.
2. **React.memo:** Wrap pure presentation components in `React.memo` if they frequently receive the same props.
3. **State Colocation:** Keep state as close to where it is used as possible to prevent top-level state changes from re-rendering the entire component tree.
4. **Virtualization:** For extremely long lists, consider suggesting or implementing list virtualization (e.g., `react-window`).
