---
name: BounD UI Design System
description: Guidelines for the BounD web app's visual style, colors, and Tailwind classes. Activate this skill when creating or modifying UI components.
---

# BounD UI Design System

You are currently working on BounD, a premium Smart Finance Manager web app. When building or modifying UI components, you MUST adhere to this design system.

## 1. Color Palette
- **Primary Gradient**: `bg-gradient-to-r from-purple-600 to-orange-500`
- **Primary Gradient (Hover)**: `hover:from-purple-700 hover:to-orange-600`
- **Backgrounds**: `bg-slate-50` for the main app background, `bg-white` for cards and content areas.
- **Text**: `text-slate-800` or `text-slate-900` for primary text, `text-slate-500` for secondary text.
- **Accent (Active states)**: `text-purple-700` with `bg-purple-50` or `bg-purple-100`.

## 2. Shapes & Shadows
- **Border Radius**: Use `rounded-2xl` for large cards/modals, `rounded-xl` for buttons/inputs, `rounded-lg` for smaller elements.
- **Shadows**: Use `shadow-sm` for standard cards, `shadow-md` for primary buttons and elevated cards, `shadow-2xl` for modals.
- **Borders**: Subtle borders using `border border-slate-200` on white cards.

## 3. Responsive Design
- Always use a mobile-first approach.
- Use `md:` breakpoint for desktop layouts.
- Rely on Flexbox and CSS Grid.
