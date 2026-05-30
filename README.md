[README.md](https://github.com/user-attachments/files/28427470/README.md)
# ◈ WorldScope — Global Country Explorer

A production-quality **Dynamic Search & Filter Application** built with pure Vanilla JavaScript, HTML5, and CSS3. No frameworks. No dependencies.

![WorldScope Screenshot](assets/screenshot.png)

## 🌍 Live Demo

Deploy in one click to [Vercel](https://vercel.com) — see deployment steps below.

---

## ✨ Features

| Feature | Details |
|---|---|
| **Real-time Search** | Debounced (300ms) case-insensitive search on country names |
| **Region Filter** | Africa, Americas, Asia, Europe, Oceania, Antarctic |
| **Sort** | Name A–Z / Z–A · Population High–Low / Low–High |
| **Dark / Light Mode** | Persisted via `localStorage` |
| **Result Counter** | Live count updates with every keystroke |
| **Active Filter Tags** | Visual pills showing current search & filter state |
| **Loading Spinner** | Animated ring with dot-trail text |
| **Error State** | Graceful fallback with retry button |
| **Empty State** | "No results found" with visual design |
| **Back To Top** | Smooth scroll, appears after 400px scroll |
| **Responsive** | Desktop 4-col → Tablet 2-col → Mobile 1-col |
| **Card Animations** | Staggered fade-in entrance, hover lift effect |
| **Chunked Rendering** | 250 cards rendered in batches for smooth performance |

---

## 🗂 Project Structure

```
worldscope/
├── index.html       # Semantic HTML5 structure
├── style.css        # CSS variables, dark/light themes, responsive grid
├── script.js        # ES6+ modular vanilla JS
└── assets/          # Static assets (screenshots, icons, etc.)
```

---

## 🚀 Run Locally

```bash
# No build step needed — just open in browser
open index.html

# Or serve with any static server:
npx serve .
python -m http.server 8000
```

---

## ☁️ Deploy to Vercel

### Option A — CLI

```bash
npm i -g vercel
vercel
# Follow prompts — select "Other" as framework
# Vercel auto-detects static HTML
```

### Option B — Dashboard

1. Push to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repo
4. Leave all settings as default (Framework Preset: **Other**)
5. Click **Deploy**

---

## 📐 Architecture

```
initializeApp()
  ├── initTheme()         — dark/light with localStorage
  ├── initSearchListener() — debounced input handler
  ├── initClearBtn()       — resets all state
  ├── initFilters()        — region + sort dropdowns
  ├── initRetry()          — re-triggers fetchData()
  ├── initBackToTop()      — scroll-aware button
  └── fetchData()
        └── filterData()
              ├── sortData()
              └── renderCards()  — chunked RAF rendering
```

---

## 💡 JavaScript Concepts Demonstrated

- **Debounce** — avoids thrashing the DOM on every keystroke
- **Fetch API + async/await** — clean async data loading
- **Array methods** — `.filter()`, `.sort()`, `.map()`
- **Template literals** — card HTML generation
- **DOM manipulation** — efficient fragment-based rendering
- **localStorage** — persisting user preferences
- **Event delegation** — modular, scalable event handling
- **requestAnimationFrame** — smooth chunked rendering of large lists
- **CSS Custom Properties** — runtime theme switching

---

## 🎤 Portfolio Description

> WorldScope is a production-ready Global Country Intelligence Dashboard built with zero dependencies. It demonstrates advanced DOM manipulation, real-time search with debouncing, multi-filter state management, dark/light theming via CSS variables and localStorage, and chunked rendering for smooth performance across 250+ data cards.

---

## 💬 Common Interview Questions

**Q: Why did you use debounce on the search input?**  
A: To prevent firing a filter operation on every single keypress. With 250 country objects, filtering is fast, but debouncing ensures we don't do unnecessary work and leaves room to scale (e.g. if search became an API call).

**Q: How does the dark mode persist across page refreshes?**  
A: `localStorage.setItem('worldscope-theme', theme)` saves the preference. On init, `localStorage.getItem()` reads it back before rendering.

**Q: How do you handle the API being slow or failing?**  
A: The `fetchData` function wraps the `fetch` call in `try/catch`. If the response status isn't `ok`, an error is thrown. The UI shows a friendly error message and a retry button that re-calls `fetchData`.

**Q: Why did you use `requestAnimationFrame` for rendering?**  
A: To avoid blocking the main thread when rendering a large set of cards. Chunked rendering with `requestAnimationFrame` lets the browser paint between batches.

**Q: What's the difference between `input` and `change` events?**  
A: `input` fires on every character typed (good for real-time search). `change` fires only when the element loses focus or a selection is committed (better for dropdowns and checkboxes).

**Q: How do you prevent XSS when injecting API data into the DOM?**  
A: For this project, the API data is from a trusted source. In production, you'd sanitize user-generated content via `textContent` instead of `innerHTML`, or use a library like DOMPurify for untrusted HTML strings.

---

## 🔧 Potential Enhancements

- [ ] Pagination or infinite scroll for performance at scale
- [ ] Country detail modal on card click
- [ ] Keyboard navigation support
- [ ] Language / currency sub-filter
- [ ] PWA offline support with Service Worker cache

---

## 📄 License

MIT — use freely in portfolios and projects.
