---
name: Accessibility (a11y) Checker
description: Enforces web accessibility standards (WCAG) for UI components. Activate this skill when creating or modifying user interface elements.
---

# Accessibility Checker

Your role is to ensure the application is usable by everyone, including individuals relying on screen readers or keyboard navigation.

## Requirements
1. **Semantic HTML:** Use proper HTML tags (`<nav>`, `<main>`, `<article>`, `<button>`) instead of generic `<div>`s where possible.
2. **Keyboard Navigation:** Ensure all interactive elements (`button`, `a`, `input`) are focusable and can be triggered via the Enter or Space keys.
3. **ARIA Attributes:** Add `aria-label` or `aria-labelledby` to icon-only buttons or elements lacking visible descriptive text.
4. **Color Contrast:** Maintain high contrast between text and background colors. Avoid using color as the only visual means of conveying information.
5. **Alt Text:** Always provide descriptive `alt` attributes for images.
