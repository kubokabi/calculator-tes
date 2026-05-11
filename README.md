# Hagematech Calculator

A modern scientific calculator Web Component with gradient themes, custom colors, memory functions, keyboard support, and a built-in bilingual Guide Book.

Use it with one simple HTML tag:

```html
<calculator-hagematech></calculator-hagematech>
```

---

## Preview

<p align="center">
  <img 
    src="docs/images/calculator-hagematech-aurora.png" 
    alt="Hagematech Calculator Preview" 
    width="320"
  />
</p>

```html
<calculator-hagematech></calculator-hagematech>
```

---

## Features

- Scientific calculator Web Component
- Simple custom HTML tag
- Works with npm, CDN, plain HTML, React, Vue, Laravel, Next.js, Vite, and Astro
- Shadow DOM style isolation
- Responsive layout
- Gradient themes and custom hex colors
- Light and dark mode
- DEG/RAD angle mode
- Memory functions
- Keyboard support
- Built-in English and Indonesian Guide Book
- Powered by math.js

---

## Installation

### npm

```bash
npm install calculator-hagematech
```

Import it once in your JavaScript entry file:

```js
import 'calculator-hagematech';
```

Use the component:

```html
<calculator-hagematech></calculator-hagematech>
```

---

## CDN Usage

Use this if you do not want to install the package.

```html
<script src="https://cdn.jsdelivr.net/npm/calculator-hagematech@1.0.0"></script>

<calculator-hagematech></calculator-hagematech>
```

For production, use a fixed version like `@1.0.0` to keep behavior stable.

---

## Basic Usage

```html
<calculator-hagematech></calculator-hagematech>
```

With gradient:

```html
<calculator-hagematech gradient="ocean"></calculator-hagematech>
```

With custom color:

```html
<calculator-hagematech color="#0ea5e9"></calculator-hagematech>
```

With dark mode:

```html
<calculator-hagematech theme="dark"></calculator-hagematech>
```

With light mode:

```html
<calculator-hagematech theme="light"></calculator-hagematech>
```

---

## Gradient Themes

Available themes:

```txt
aurora
sunset
ocean
forest
grape
gold
```

Example:

```html
<calculator-hagematech gradient="forest"></calculator-hagematech>
```

---

## Custom Hex Color

You can use your own color.

```html
<calculator-hagematech color="#0ea5e9"></calculator-hagematech>
```

When the `color` attribute is used, the calculator automatically generates a matching gradient style.

---

## Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `gradient` | string | `aurora` | Selects a built-in gradient theme |
| `color` | hex color | empty | Generates a custom style from a hex color |
| `theme` | string | `dark` | Sets theme mode: `dark` or `light` |
| `angle-mode` | string | `DEG` | Sets trigonometry mode: `DEG` or `RAD` |
| `precision` | number | `16` | Controls displayed result precision |
| `max-length` | number | `300` | Maximum allowed expression length |

Example:

```html
<calculator-hagematech
  gradient="ocean"
  theme="dark"
  angle-mode="DEG"
  precision="16"
  max-length="300"
></calculator-hagematech>
```

---

## Usage in Frameworks

### React

```jsx
import 'calculator-hagematech';

export default function App() {
  return (
    <calculator-hagematech gradient="ocean"></calculator-hagematech>
  );
}
```

### Next.js

Because this package uses a browser custom element, import it on the client side.

```jsx
'use client';

import { useEffect } from 'react';

export default function Calculator() {
  useEffect(() => {
    import('calculator-hagematech');
  }, []);

  return (
    <calculator-hagematech gradient="aurora"></calculator-hagematech>
  );
}
```

### Vue

```js
import 'calculator-hagematech';
```

```vue
<template>
  <calculator-hagematech gradient="forest"></calculator-hagematech>
</template>
```

### Laravel + Vite

Import in `resources/js/app.js`:

```js
import 'calculator-hagematech';
```

Use in Blade:

```blade
<calculator-hagematech gradient="ocean"></calculator-hagematech>
```

### Astro

```astro
---
import 'calculator-hagematech';
---

<calculator-hagematech gradient="grape"></calculator-hagematech>
```

---

## React TypeScript Support

If TypeScript does not recognize the custom element, create this file:

```txt
src/custom-elements.d.ts
```

Add:

```ts
import React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'calculator-hagematech': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        gradient?: string;
        color?: string;
        theme?: string;
        'angle-mode'?: string;
        precision?: string;
        'max-length'?: string;
      };
    }
  }
}

export {};
```

---

## Supported Operations

### Basic

| Operation | Button |
|---|---|
| Addition | `+` |
| Subtraction | `−` |
| Multiplication | `×` |
| Division | `÷` |
| Percent | `%` |
| Equals | `=` |
| Clear all | `AC` |
| Clear entry | `CE` |
| Backspace | `⌫` |
| Toggle sign | `±` |

### Scientific

| Function | Button |
|---|---|
| Sine | `sin` |
| Cosine | `cos` |
| Tangent | `tan` |
| Arc sine | `asin` |
| Arc cosine | `acos` |
| Arc tangent | `atan` |
| Log base 10 | `log` |
| Natural logarithm | `ln` |
| Square root | `√` |
| Cube root | `∛` |
| Square | `x²` |
| Power | `xʸ` |
| Inverse | `1/x` |
| Factorial | `x!` |
| Modulo | `mod` |

### Constants

| Constant | Button |
|---|---|
| Pi | `π` |
| Euler's number | `e` |

---

## Memory Functions

| Button | Description |
|---|---|
| `MS` | Save current value to memory |
| `MR` | Recall saved memory value |
| `M+` | Add current value to memory |
| `M-` | Subtract current value from memory |
| `MC` | Clear memory |

---

## Keyboard Support

| Key | Action |
|---|---|
| `0-9` | Input numbers |
| `+` | Addition |
| `-` | Subtraction |
| `*` | Multiplication |
| `/` | Division |
| `.` | Decimal point |
| `%` | Percent |
| `Enter` | Calculate |
| `Backspace` | Delete one character |
| `Escape` | Clear all or close Guide Book |

---

## Guide Book

The calculator includes a built-in bilingual Guide Book in English and Indonesian.

Click the `Guide Book` link at the bottom of the calculator to open it.

---

## Calculation Event

The component dispatches a `calculate` event after a successful calculation.

```html
<calculator-hagematech id="calc"></calculator-hagematech>

<script>
  document.getElementById('calc').addEventListener('calculate', function (event) {
    console.log(event.detail.expression);
    console.log(event.detail.result);
  });
</script>
```

Event detail:

```js
{
  expression: "2+2",
  result: "4"
}
```

---

## Multiple Calculators

You can use more than one calculator on the same page.

```html
<calculator-hagematech gradient="aurora"></calculator-hagematech>
<calculator-hagematech gradient="sunset"></calculator-hagematech>
<calculator-hagematech color="#0ea5e9"></calculator-hagematech>
```

Each calculator works independently.

---

## Styling

The component uses Shadow DOM, so its internal style will not conflict with your website CSS.

Customize it using attributes:

```html
<calculator-hagematech gradient="ocean"></calculator-hagematech>
```

```html
<calculator-hagematech color="#7c3aed"></calculator-hagematech>
```

---

## Dependency

Hagematech Calculator automatically loads math.js from CDN.

No manual math.js setup is required.

---

## Browser Support

Recommended modern browsers:

- Google Chrome
- Microsoft Edge
- Mozilla Firefox
- Safari

---

## License

This project is open source with visible Hagematech attribution.

You may use, study, modify, and distribute this project under the selected open source license.

Visible Hagematech branding must remain in the free version.

To remove Hagematech branding, a commercial branding removal license is required.

---

## Commercial Branding Removal

The free version includes visible Hagematech attribution.

A commercial license allows you to:

- Remove visible Hagematech branding
- Use without public attribution
- Use in client projects
- Use in commercial dashboards, ERP, POS, admin panels, SaaS, or internal business tools
- Get optional priority support

Contact:

- Email: your-email@example.com
- Website: https://yourdomain.com

---

## Author

Created by Hagematech.

---

## Version

```txt
1.0.0
```

---

## Quick Copy Paste

### npm

```bash
npm install calculator-hagematech
```

```js
import 'calculator-hagematech';
```

```html
<calculator-hagematech></calculator-hagematech>
```

### CDN

```html
<script src="https://cdn.jsdelivr.net/npm/calculator-hagematech@1.0.0"></script>

<calculator-hagematech></calculator-hagematech>
```

### Gradient

```html
<calculator-hagematech gradient="ocean"></calculator-hagematech>
```

### Custom Color

```html
<calculator-hagematech color="#0ea5e9"></calculator-hagematech>
```