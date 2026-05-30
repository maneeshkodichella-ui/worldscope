/**
 * WORLDSCOPE v2 — script.js
 * Enhanced: multi-field search · population filter · modal · stats dashboard
 * favorites · skeleton loading · URL state · accessibility · performance
 */

// ── State ────────────────────────────────────────
const state = {
  allCountries: [],
  filtered: [],
  searchTerm: '',
  region: '',
  population: '',
  sort: 'name-asc',
  favorites: new Set(JSON.parse(localStorage.getItem('worldscope-favs') || '[]')),
  showFavOnly: false,
};

// ── DOM References ───────────────────────────────
const dom = {
  searchInput:    () => document.getElementById('searchInput'),
  clearBtn:       () => document.getElementById('clearBtn'),
  regionFilter:   () => document.getElementById('regionFilter'),
  popFilter:      () => document.getElementById('popFilter'),
  sortFilter:     () => document.getElementById('sortFilter'),
  favToggle:      () => document.getElementById('favToggle'),
  cardsGrid:      () => document.getElementById('cardsGrid'),
  loadingState:   () => document.getElementById('loadingState'),
  errorState:     () => document.getElementById('errorState'),
  errorMessage:   () => document.getElementById('errorMessage'),
  emptyState:     () => document.getElementById('emptyState'),
  resultCount:    () => document.getElementById('resultCount'),
  activeFilters:  () => document.getElementById('activeFilters'),
  retryBtn:       () => document.getElementById('retryBtn'),
  themeToggle:    () => document.getElementById('themeToggle'),
  themeIcon:      () => document.getElementById('themeIcon'),
  themeLabel:     () => document.getElementById('themeLabel'),
  backToTop:      () => document.getElementById('backToTop'),
  statTotal:      () => document.getElementById('statTotal'),
  statShown:      () => document.getElementById('statShown'),
  statRegions:    () => document.getElementById('statRegions'),
  modal:          () => document.getElementById('countryModal'),
  modalOverlay:   () => document.getElementById('modalOverlay'),
  modalBody:      () => document.getElementById('modalBody'),
  modalClose:     () => document.getElementById('modalClose'),
};

// ── Utilities ────────────────────────────────────

const debounce = (fn, delay = 300) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

const formatNumber = (n) =>
  n != null ? Number(n).toLocaleString() : '—';

const truncate = (str, max = 40) =>
  str && str.length > max ? str.slice(0, max) + '…' : str ?? '—';

// ── Skeleton Loading ─────────────────────────────

const showSkeletons = () => {
  dom.errorState()?.classList.add('hidden');
  dom.emptyState()?.classList.add('hidden');
  dom.loadingState()?.classList.add('hidden');
  const grid = dom.cardsGrid();
  if (!grid) return;
  grid.innerHTML = Array(9).fill(0).map(() => `
    <article class="country-card skeleton-card" aria-hidden="true">
      <div class="skeleton skeleton-flag"></div>
      <div class="card-body">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line short"></div>
      </div>
      <div class="card-footer">
        <div class="skeleton skeleton-foot"></div>
      </div>
    </article>
  `).join('');
};

const showLoading = () => { showSkeletons(); };

const hideLoading = () => { /* skeletons cleared by renderCountries */ };

const showError = (message) => {
  dom.cardsGrid()?.replaceChildren();
  const msgEl = dom.errorMessage();
  if (msgEl) msgEl.textContent = message;
  dom.errorState()?.classList.remove('hidden');
};

const showEmpty = () => {
  dom.cardsGrid()?.replaceChildren();
  dom.emptyState()?.classList.remove('hidden');
};

const hideEmpty = () => {
  dom.emptyState()?.classList.add('hidden');
};

// ── Fetch Data ───────────────────────────────────

const COUNTRIES_URL   = 'https://cdn.jsdelivr.net/npm/world-countries/countries.json';
const POPULATION_URL  = 'https://cdn.jsdelivr.net/gh/samayo/country-json@master/src/country-by-population.json';

const fetchCountries = async () => {
  showLoading();
  let countries, popList;
  try {
    const [cRes, pRes] = await Promise.all([fetch(COUNTRIES_URL), fetch(POPULATION_URL)]);
    if (!cRes.ok) throw new Error(`Countries API responded with status ${cRes.status}`);
    if (!pRes.ok) throw new Error(`Population API responded with status ${pRes.status}`);
    [countries, popList] = await Promise.all([cRes.json(), pRes.json()]);
  } catch (err) {
    console.error('Fetch error:', err);
    showError('Could not load country data. Please check your internet connection.');
    return;
  }
  try {
    // Build population lookup by country name
    const popByName = {};
    for (const p of popList) {
      if (p.country && p.population != null) popByName[p.country.toLowerCase()] = p.population;
    }
    // Merge population into each country
    state.allCountries = countries.map(c => ({
      ...c,
      population: popByName[c.name?.common?.toLowerCase()] ?? popByName[c.name?.official?.toLowerCase()] ?? null,
    }));
    loadState();
    applyFilters();
  } catch (err) {
    console.error('App init error:', err);
    showError(`App failed to initialise: ${err.message}`);
  }
};

// ── Multi-Field Search ───────────────────────────

const buildSearchIndex = (country) => {
  const langs = country.languages ? Object.values(country.languages).join(' ') : '';
  const currencies = country.currencies
    ? Object.entries(country.currencies).map(([code, c]) => `${code} ${c.name}`).join(' ')
    : '';
  return [
    country.name?.common ?? '',
    country.name?.official ?? '',
    (country.capital ?? []).join(' '),
    country.region ?? '',
    country.subregion ?? '',
    langs,
    currencies,
  ].join(' ').toLowerCase();
};

// ── Filter & Sort ────────────────────────────────

const applyFilters = () => {
  const term   = state.searchTerm.toLowerCase().trim();
  const region = state.region;
  const pop    = state.population;

  let results = state.allCountries.filter((country) => {
    const matchesSearch = term === '' || buildSearchIndex(country).includes(term);
    const matchesRegion = region === '' || country.region === region;
    const p = country.population ?? 0;
    const matchesPop =
      pop === ''        ? true :
      pop === 'small'   ? p < 10_000_000 :
      pop === 'medium'  ? p >= 10_000_000 && p <= 100_000_000 :
      pop === 'large'   ? p > 100_000_000 : true;
    const matchesFav = !state.showFavOnly || state.favorites.has(country.cca2);
    return matchesSearch && matchesRegion && matchesPop && matchesFav;
  });

  results = sortCountries(results);
  state.filtered = results;
  renderCountries(results);
  updateStats(results.length);
  updateMeta(results.length);
  saveState();
};

const sortCountries = (countries) => {
  const sorted = [...countries];
  switch (state.sort) {
    case 'name-asc':  return sorted.sort((a, b) => (a.name?.common ?? '').localeCompare(b.name?.common ?? ''));
    case 'name-desc': return sorted.sort((a, b) => (b.name?.common ?? '').localeCompare(a.name?.common ?? ''));
    case 'pop-desc':  return sorted.sort((a, b) => (b.population ?? 0) - (a.population ?? 0));
    case 'pop-asc':   return sorted.sort((a, b) => (a.population ?? 0) - (b.population ?? 0));
    default:          return sorted;
  }
};

// ── Stats Dashboard ──────────────────────────────

const updateStats = (shownCount) => {
  const regions = new Set(state.allCountries.map(c => c.region).filter(Boolean)).size;
  const totalEl  = dom.statTotal();
  const shownEl  = dom.statShown();
  const regionsEl = dom.statRegions();
  if (totalEl)   totalEl.textContent  = state.allCountries.length.toLocaleString();
  if (shownEl)   shownEl.textContent  = shownCount.toLocaleString();
  if (regionsEl) regionsEl.textContent = regions.toLocaleString();
};

// ── Update Meta Bar ──────────────────────────────

const updateMeta = (count) => {
  const countEl = dom.resultCount();
  if (countEl) countEl.textContent =
    `Showing ${count.toLocaleString()} ${count === 1 ? 'country' : 'countries'}`;

  const filtersEl = dom.activeFilters();
  if (!filtersEl) return;
  filtersEl.innerHTML = '';

  if (state.searchTerm.trim())
    filtersEl.insertAdjacentHTML('beforeend',
      `<span class="filter-tag">Search: "${state.searchTerm.trim()}"</span>`);
  if (state.region)
    filtersEl.insertAdjacentHTML('beforeend',
      `<span class="filter-tag">Region: ${state.region}</span>`);
  if (state.population) {
    const popLabels = { small: 'Pop < 10M', medium: 'Pop 10–100M', large: 'Pop > 100M' };
    filtersEl.insertAdjacentHTML('beforeend',
      `<span class="filter-tag">${popLabels[state.population]}</span>`);
  }
  if (state.showFavOnly)
    filtersEl.insertAdjacentHTML('beforeend',
      `<span class="filter-tag">★ Favorites</span>`);

  const sortLabels = { 'name-asc': 'Name A→Z', 'name-desc': 'Name Z→A', 'pop-desc': 'Pop ↓', 'pop-asc': 'Pop ↑' };
  if (state.sort !== 'name-asc')
    filtersEl.insertAdjacentHTML('beforeend',
      `<span class="filter-tag">${sortLabels[state.sort] ?? ''}</span>`);
};

// ── Favorites ────────────────────────────────────

const toggleFavorite = (cca2, btn) => {
  if (state.favorites.has(cca2)) {
    state.favorites.delete(cca2);
    btn.classList.remove('fav-active');
    btn.setAttribute('aria-label', 'Add to favorites');
  } else {
    state.favorites.add(cca2);
    btn.classList.add('fav-active');
    btn.setAttribute('aria-label', 'Remove from favorites');
  }
  localStorage.setItem('worldscope-favs', JSON.stringify([...state.favorites]));
  if (state.showFavOnly) applyFilters();
};

// ── Render Cards ─────────────────────────────────

const buildCardHTML = (country) => {
  const name    = country.name?.common ?? 'Unknown';
  const flag    = `https://flagcdn.com/w320/${(country.cca2 ?? "xx").toLowerCase()}.png`;
  const flagAlt = country.flags?.alt ?? `Flag of ${name}`;
  const region  = country.region ?? '—';
  const pop     = formatNumber(country.population);
  const capital = truncate((country.capital ?? []).join(', '), 24) || '—';
  const code    = country.cca2 ?? '—';
  const isFav   = state.favorites.has(code);

  return `
    <article class="country-card" role="listitem" tabindex="0"
      data-cca2="${code}" aria-label="${name}, ${region}">
      <div class="card-flag">
        <img src="${flag}" alt="${flagAlt}" loading="lazy" />
        <span class="flag-region-badge">${region}</span>
        <button class="fav-btn ${isFav ? 'fav-active' : ''}"
          aria-label="${isFav ? 'Remove from favorites' : 'Add to favorites'}"
          data-cca2="${code}">♥</button>
      </div>
      <div class="card-body">
        <h3 class="card-name" title="${name}">${name}</h3>
        <div class="card-stats">
          <div class="card-stat">
            <span class="stat-label">Region</span>
            <span class="stat-value">${region}</span>
          </div>
          <div class="card-stat">
            <span class="stat-label">Population</span>
            <span class="stat-value pop-value">${pop}</span>
          </div>
        </div>
      </div>
      <div class="card-footer">
        <div class="card-capital"><strong>${capital}</strong></div>
        <span class="card-code">${code}</span>
      </div>
    </article>
  `;
};

const renderCountries = (countries) => {
  dom.emptyState()?.classList.add('hidden');
  dom.errorState()?.classList.add('hidden');
  const grid = dom.cardsGrid();
  if (!grid) return;

  if (countries.length === 0) {
    showEmpty();
    return;
  }

  const CHUNK = 40;
  grid.innerHTML = '';

  const renderChunk = (start) => {
    const fragment = document.createDocumentFragment();
    const end = Math.min(start + CHUNK, countries.length);
    for (let i = start; i < end; i++) {
      const div = document.createElement('div');
      div.innerHTML = buildCardHTML(countries[i]);
      fragment.appendChild(div.firstElementChild);
    }
    grid.appendChild(fragment);
    if (end < countries.length) requestAnimationFrame(() => renderChunk(end));
  };

  renderChunk(0);
};

// ── Country Detail Modal ─────────────────────────

const openModal = (cca2) => {
  const country = state.allCountries.find(c => c.cca2 === cca2);
  if (!country) return;

  const name      = country.name?.common ?? 'Unknown';
  const official  = country.name?.official ?? '—';
  const flag      = `https://flagcdn.com/w320/${(country.cca2 ?? "xx").toLowerCase()}.png`;
  const flagAlt   = country.flags?.alt ?? `Flag of ${name}`;
  const capital   = (country.capital ?? []).join(', ') || '—';
  const pop       = formatNumber(country.population);
  const region    = country.region ?? '—';
  const subregion = country.subregion ?? '—';
  const area      = country.area ? `${Number(country.area).toLocaleString()} km²` : '—';
  const independent = country.independent === true ? 'Yes' : country.independent === false ? 'No' : '—';
  const timezones = (country.timezones ?? []).join(', ') || '—';
  const langs     = country.languages ? Object.values(country.languages).join(', ') : '—';
  const currencies = country.currencies
    ? Object.entries(country.currencies).map(([code, c]) => `${c.name} (${code})`).join(', ')
    : '—';

  dom.modalBody().innerHTML = `
    <div class="modal-flag-wrap">
      <img src="${flag}" alt="${flagAlt}" class="modal-flag" />
    </div>
    <div class="modal-info">
      <h2 class="modal-name">${name}</h2>
      <p class="modal-official">${official}</p>
      <div class="modal-grid">
        <div class="modal-stat"><span class="modal-label">Capital</span><span class="modal-value">${capital}</span></div>
        <div class="modal-stat"><span class="modal-label">Population</span><span class="modal-value">${pop}</span></div>
        <div class="modal-stat"><span class="modal-label">Region</span><span class="modal-value">${region}</span></div>
        <div class="modal-stat"><span class="modal-label">Subregion</span><span class="modal-value">${subregion}</span></div>
        <div class="modal-stat"><span class="modal-label">Area</span><span class="modal-value">${area}</span></div>
        <div class="modal-stat"><span class="modal-label">Independent</span><span class="modal-value">${independent}</span></div>
        <div class="modal-stat modal-stat-wide"><span class="modal-label">Languages</span><span class="modal-value">${langs}</span></div>
        <div class="modal-stat modal-stat-wide"><span class="modal-label">Currencies</span><span class="modal-value">${currencies}</span></div>
        <div class="modal-stat modal-stat-wide"><span class="modal-label">Timezones</span><span class="modal-value">${timezones}</span></div>
      </div>
    </div>
  `;

  const modal = dom.modal();
  modal.classList.remove('hidden');
  modal.removeAttribute('aria-hidden');
  requestAnimationFrame(() => modal.classList.add('modal-open'));
  dom.modalClose().focus();
  document.body.style.overflow = 'hidden';
};

const closeModal = () => {
  const modal = dom.modal();
  modal.classList.remove('modal-open');
  setTimeout(() => {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }, 250);
};

// ── URL State Persistence ────────────────────────

const saveState = () => {
  const params = new URLSearchParams();
  if (state.searchTerm)  params.set('search', state.searchTerm);
  if (state.region)      params.set('region', state.region);
  if (state.population)  params.set('population', state.population);
  if (state.sort !== 'name-asc') params.set('sort', state.sort);
  if (state.showFavOnly) params.set('favs', '1');
  const query = params.toString();
  history.replaceState(null, '', query ? `?${query}` : location.pathname);
};

const loadState = () => {
  const params = new URLSearchParams(location.search);
  if (params.has('search')) {
    state.searchTerm = params.get('search');
    const si = dom.searchInput();
    if (si) si.value = state.searchTerm;
    if (state.searchTerm.trim()) dom.clearBtn()?.classList.add('visible');
  }
  if (params.has('region')) {
    state.region = params.get('region');
    const rf = dom.regionFilter();
    if (rf) rf.value = state.region;
  }
  if (params.has('population')) {
    state.population = params.get('population');
    const pf = dom.popFilter();
    if (pf) pf.value = state.population;
  }
  if (params.has('sort')) {
    state.sort = params.get('sort');
    const sf = dom.sortFilter();
    if (sf) sf.value = state.sort;
  }
  if (params.get('favs') === '1') {
    state.showFavOnly = true;
    dom.favToggle()?.classList.add('active');
  }
};

// ── Event Listeners ──────────────────────────────

const debouncedFilter = debounce(() => applyFilters(), 300);

const initSearchListener = () => {
  dom.searchInput()?.addEventListener('input', (e) => {
    state.searchTerm = e.target.value;
    dom.clearBtn()?.classList.toggle('visible', !!state.searchTerm.trim());
    debouncedFilter();
  });
};

const initClearBtn = () => {
  dom.clearBtn()?.addEventListener('click', () => {
    const si = dom.searchInput();
    const rf = dom.regionFilter();
    const pf = dom.popFilter();
    const sf = dom.sortFilter();
    if (si) si.value = '';
    if (rf) rf.value = '';
    if (pf) pf.value = '';
    if (sf) sf.value = 'name-asc';
    state.searchTerm   = '';
    state.region       = '';
    state.population   = '';
    state.sort         = 'name-asc';
    state.showFavOnly  = false;
    dom.favToggle()?.classList.remove('active');
    dom.clearBtn()?.classList.remove('visible');
    applyFilters();
    dom.searchInput()?.focus();
  });
};

const initFilters = () => {
  dom.regionFilter()?.addEventListener('change', (e) => { state.region = e.target.value; applyFilters(); });
  dom.popFilter()?.addEventListener('change',    (e) => { state.population = e.target.value; applyFilters(); });
  dom.sortFilter()?.addEventListener('change',   (e) => { state.sort = e.target.value; applyFilters(); });
  dom.favToggle()?.addEventListener('click', () => {
    state.showFavOnly = !state.showFavOnly;
    dom.favToggle()?.classList.toggle('active', state.showFavOnly);
    applyFilters();
  });
};

const initCardInteractions = () => {
  const grid = dom.cardsGrid();
  if (!grid) return;
  grid.addEventListener('click', (e) => {
    // Favorite button
    const favBtn = e.target.closest('.fav-btn');
    if (favBtn) { e.stopPropagation(); toggleFavorite(favBtn.dataset.cca2, favBtn); return; }
    // Card click → modal
    const card = e.target.closest('.country-card');
    if (card && !card.classList.contains('skeleton-card')) openModal(card.dataset.cca2);
  });

  // Keyboard: Enter/Space on card
  grid.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const card = e.target.closest('.country-card');
      if (card && !card.classList.contains('skeleton-card')) { e.preventDefault(); openModal(card.dataset.cca2); }
    }
  });
};

const initModal = () => {
  dom.modalClose()?.addEventListener('click', closeModal);
  dom.modalOverlay()?.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !dom.modal()?.classList.contains('hidden')) closeModal();
  });
};

const initRetry = () => {
  dom.retryBtn()?.addEventListener('click', () => {
    dom.errorState()?.classList.add('hidden');
    dom.cardsGrid()?.replaceChildren();
    fetchCountries();
  });
};

// ── Dark Mode ────────────────────────────────────

const THEME_KEY = 'worldscope-theme';

const applyTheme = (theme) => {
  document.documentElement.setAttribute('data-theme', theme);
  const icon  = dom.themeIcon();
  const label = dom.themeLabel();
  if (icon)  icon.textContent  = theme === 'dark' ? '☀' : '🌙';
  if (label) label.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
};

const initTheme = () => {
  const saved = localStorage.getItem(THEME_KEY) ?? 'dark';
  applyTheme(saved);
  dom.themeToggle()?.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem(THEME_KEY, next);
  });
};

// ── Back To Top ──────────────────────────────────

const initBackToTop = () => {
  const btn = dom.backToTop();
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
};

// ── Init ─────────────────────────────────────────

const initializeApp = () => {
  initTheme();
  initSearchListener();
  initClearBtn();
  initFilters();
  initCardInteractions();
  initModal();
  initRetry();
  initBackToTop();
  fetchCountries();
};

document.addEventListener('DOMContentLoaded', initializeApp);

// ── 3-column grid override ───────────────────────
(function applyGridOverride() {
  const style = document.createElement('style');
  style.textContent = `
    #cardsGrid {
      grid-template-columns: repeat(3, 1fr) !important;
    }
    @media (max-width: 900px) {
      #cardsGrid { grid-template-columns: repeat(2, 1fr) !important; }
    }
    @media (max-width: 560px) {
      #cardsGrid { grid-template-columns: 1fr !important; }
    }
  `;
  document.head
    ? document.head.appendChild(style)
    : document.addEventListener('DOMContentLoaded', () => document.head.appendChild(style));
})();
