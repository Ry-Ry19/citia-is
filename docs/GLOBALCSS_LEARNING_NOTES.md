# Global Styling Notes

## 1. What is globals.css?

globals.css contains styles and design tokens that
apply throughout the application.

It should contain:

- Colors
- Fonts
- Global background
- Border defaults
- Radius
- Theme variables
- Dark mode
- Global element styles

It should NOT contain every page's individual styling.

---

## 2. What are CSS variables?

A CSS variable stores a reusable value.

Example:

--primary: oklch(...);

The variable can then be used throughout the application.

This prevents repeating the same color everywhere.

---

## 3. What are design tokens?

Design tokens are named values representing the
design system.

Examples:

--primary
--background
--foreground
--border
--radius

Instead of thinking about specific colors, we think
about their purpose.

Example:

primary = main application action

---

## 4. Why use semantic colors?

Instead of:

bg-green-700

we can use:

bg-primary

This means the component cares about the role of the
color rather than its exact value.

If the primary color changes, the whole application
can change consistently.

---

## 5. What is @theme inline?

@theme connects CSS variables to Tailwind.

For example:

--color-primary: var(--primary);

allows:

bg-primary
text-primary
border-primary

to be used in Tailwind classes.

---

## 6. What is OKLCH?

OKLCH is a modern way of representing colors.

It contains:

L = Lightness
C = Chroma
H = Hue

I do not need to memorize OKLCH values.

The important concept is that the values are stored
inside reusable design tokens.

---

## 7. What is antialiased?

antialiased improves the appearance of text rendering.

Example:

@apply antialiased;

It makes text appear smoother.

---

## 8. What is a design system?

A design system is a collection of reusable visual
rules and components.

CITIA-IS uses:

- Green environmental brand
- Consistent typography
- Consistent spacing
- Consistent buttons
- Consistent cards
- Consistent inputs
- Consistent radius
- Consistent colors

This prevents every page from looking different.

---

## 9. Global styles vs component styles

Global:

globals.css

Used for:

- colors
- fonts
- themes
- global defaults

Component:

components/ui/button.tsx

Used for:

- button appearance
- button variants
- button sizes

Page:

app/page.tsx

Used for:

- page layout
- page content

---

## 10. Important principle

Do not make everything global.

Global styles should define the foundation.

Components should define reusable behavior
and appearance.

Pages should define composition and content.
