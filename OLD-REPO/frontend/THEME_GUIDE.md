# 🎨 Vodič za menjanje tema

Ovaj vodič objašnjava kako da menjate temu aplikacije koristeći monohromatske sive boje.

## 📁 Lokacija fajlova

Glavni fajl za menjanje tema se nalazi u:

```
src/assets/theme-variables.css
```

## 🎯 Kako menjati temu

### 1. Osnovne sive boje

U `theme-variables.css` fajlu, menjajte ove varijable:

```css
:root {
  /* Osnovna siva paleta - od najsvetlije do najtamnije */
  --theme-gray-50: #f9fafb; /* Najsvetlija siva */
  --theme-gray-100: #f3f4f6; /* Vrlo svetla siva */
  --theme-gray-200: #e5e7eb; /* Svetla siva */
  --theme-gray-300: #d1d5db; /* Srednje svetla siva */
  --theme-gray-400: #9ca3af; /* Srednja siva */
  --theme-gray-500: #6b7280; /* Osnovna siva */
  --theme-gray-600: #4b5563; /* Srednje tamna siva */
  --theme-gray-700: #374151; /* Tamna siva */
  --theme-gray-800: #1f2937; /* Vrlo tamna siva */
  --theme-gray-900: #111827; /* Najtamnija siva */
}
```

### 2. Dark mode boje

```css
:root {
  /* Dark mode specifične boje */
  --theme-dark-bg-primary: #0a0a0a; /* Glavna pozadina */
  --theme-dark-bg-secondary: #1a1a1a; /* Sekundarna pozadina */
  --theme-dark-bg-tertiary: #262626; /* Tercijarna pozadina */
  --theme-dark-surface: #1f1f1f; /* Površine elemenata */
  --theme-dark-surface-elevated: #2a2a2a; /* Uzdignute površine */
  --theme-dark-border: #404040; /* Granice */
  --theme-dark-text-primary: #ffffff; /* Glavni tekst */
  --theme-dark-text-secondary: #a1a1aa; /* Sekundarni tekst */
  --theme-dark-text-tertiary: #71717a; /* Tercijarni tekst */
}
```

### 3. Akcentne boje

```css
:root {
  /* Akcentne boje - za hover efekte, linkove, itd. */
  --theme-accent-primary: var(--theme-gray-500); /* Glavna akcentna boja */
  --theme-accent-secondary: var(--theme-gray-400); /* Sekundarna akcentna boja */
  --theme-accent-hover: var(--theme-gray-600); /* Hover efekat */
}
```

### 4. Status boje

```css
:root {
  /* Status boje - za success, warning, error */
  --theme-success: var(--theme-gray-600); /* Success - tamnija siva */
  --theme-warning: var(--theme-gray-500); /* Warning - srednja siva */
  --theme-error: var(--theme-gray-700); /* Error - tamna siva */
}
```

## 🎨 Gotove teme

U `theme-variables.css` fajlu su već pripremljene tri gotove teme. Samo otkomentarišite jednu od njih:

### Topla siva tema (sa blagim smeđim tonovima)

```css
--theme-gray-50: #fafaf9;
--theme-gray-100: #f5f5f4;
--theme-gray-200: #e7e5e4;
--theme-gray-300: #d6d3d1;
--theme-gray-400: #a8a29e;
--theme-gray-500: #78716c;
--theme-gray-600: #57534e;
--theme-gray-700: #44403c;
--theme-gray-800: #292524;
--theme-gray-900: #1c1917;
```

### Hladna siva tema (sa blagim plavim tonovima)

```css
--theme-gray-50: #f8fafc;
--theme-gray-100: #f1f5f9;
--theme-gray-200: #e2e8f0;
--theme-gray-300: #cbd5e1;
--theme-gray-400: #94a3b8;
--theme-gray-500: #64748b;
--theme-gray-600: #475569;
--theme-gray-700: #334155;
--theme-gray-800: #1e293b;
--theme-gray-900: #0f172a;
```

### Pure black & white tema (čisti crno-beli)

```css
--theme-gray-50: #ffffff;
--theme-gray-100: #f8f8f8;
--theme-gray-200: #e8e8e8;
--theme-gray-300: #d0d0d0;
--theme-gray-400: #a0a0a0;
--theme-gray-500: #707070;
--theme-gray-600: #505050;
--theme-gray-700: #303030;
--theme-gray-800: #202020;
--theme-gray-900: #000000;
```

## 🔧 Kako primeniti promene

1. Otvorite `src/assets/theme-variables.css`
2. Menjajte vrednosti varijabli
3. Sačuvajte fajl
4. Aplikacija će automatski primeniti nove boje

## 📝 Napomene

- Sve boje su monohromatske (varijacije sive)
- Promene se primenjuju na celu aplikaciju
- Nema potrebe za restartovanje servera
- Varijable se koriste kroz celu aplikaciju

## 🎯 Primeri korišćenja

### U CSS-u:

```css
.my-button {
  background: var(--theme-accent-primary);
  color: var(--theme-dark-text-primary);
  border: 1px solid var(--theme-dark-border);
}

.my-button:hover {
  background: var(--theme-accent-hover);
  box-shadow: 0 4px 8px var(--theme-shadow-color);
}
```

### U Vue komponenti:

```vue
<template>
  <div class="my-component">
    <button class="custom-button">Klikni me</button>
  </div>
</template>

<style scoped>
.custom-button {
  background: var(--theme-accent-primary);
  color: var(--theme-dark-text-primary);
}
</style>
```

## 🚀 Saveti

1. **Kontrast**: Uvek proverite da li imate dovoljno kontrasta između teksta i pozadine
2. **Testiranje**: Testirajte promene na različitim komponentama
3. **Backup**: Napravite backup trenutne teme pre velikih promena
4. **Gradijenti**: Koristite `--theme-gradient-start` i `--theme-gradient-end` za gradijente

---

**Napomena**: Ovaj sistem koristi CSS custom properties (varijable) koje su podržane u svim modernim browserima.
