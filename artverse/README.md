# Artverse — Premium Digital Art Gallery

A production-ready React.js frontend built with `styled-components`.

## Tech Stack

- **React 18** — functional components + hooks
- **styled-components v6** — all styling (zero Tailwind, zero inline styles)
- **Vite** — lightning-fast dev server & build

## Folder Structure

```
src/
├── components/
│   ├── Hero/
│   │   ├── index.jsx            # Infinite scroll image columns + CTA
│   │   └── styledComponents.js
│   ├── StatsBar/
│   │   ├── index.jsx            # 120K / 2.4M / 847 horizontal stats
│   │   └── styledComponents.js
│   ├── LatestDrops/
│   │   ├── index.jsx            # CSS masonry, 6 artworks
│   │   └── styledComponents.js
│   ├── FilterBar/
│   │   ├── index.jsx            # Sticky, horizontally scrollable tabs
│   │   └── styledComponents.js
│   ├── Gallery/
│   │   ├── index.jsx            # CSS masonry, paginated, filtered
│   │   └── styledComponents.js
│   ├── ArtworkCard/
│   │   ├── index.jsx            # Hover overlay + download button
│   │   └── styledComponents.js
│   └── Pagination/
│       ├── index.jsx            # Back / 1 2 3 / Next with ellipsis
│       └── styledComponents.js
├── pages/
│   └── Home/
│       ├── index.jsx            # State: selectedCategory + currentPage
│       └── styledComponents.js  # Navbar + Footer
├── styles/
│   ├── theme.js                 # Design tokens (colors, fonts, spacing)
│   └── GlobalStyles.js          # Global reset + font imports
├── data/
│   └── artworks.js              # 120 generated artwork objects
├── App.jsx                      # ThemeProvider root
└── index.jsx                    # React DOM entry
```

## Quick Start

```bash
npm install
npm run dev
```

## Key Design Decisions

### Masonry Layout
Uses CSS `columns` property — no JS library required, no layout recalculation, pure CSS masonry with `break-inside: avoid`.

### Infinite Hero Scroll
Pure CSS `@keyframes` animation. Each column has a different duration (22s / 28s / 34s) for an organic parallax feel. Cards are duplicated so the loop is seamless.

### FilterBar + Pagination State
Both live in `Home/index.jsx` and flow down as props. Changing a filter resets `currentPage` to 1. `useMemo` ensures filtered/paginated arrays only recompute when their dependencies change.

### Performance
- `loading="lazy"` on all images
- `React.memo` on `ArtworkCard` to prevent unnecessary re-renders
- `useCallback` on event handlers in Home
- `useMemo` for filtered + paginated data derivations
- Image opacity fade-in on load (no layout shift)

## Theme Customization

Edit `src/styles/theme.js` to change colors, fonts, spacing, or breakpoints globally.
All styled-components consume the theme via `ThemeProvider`.
