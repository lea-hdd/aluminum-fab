/**
 * AlumiFab — Main JavaScript
 * ES6 Classes: Product, Catalog, AlertManager, CurrencyConverter
 */

'use strict';

// ============================================================
// CLASS: Product
// Represents a single catalog item
// ============================================================
class Product {
  constructor({ id, name, category, description, specs, icon, material, thickness, finish }) {
    this.id          = id;
    this.name        = name;
    this.category    = category;     // 'windows' | 'doors' | 'railings' | 'facades' | 'louvers'
    this.description = description;
    this.specs       = specs;        // array of spec strings
    this.icon        = icon;         // emoji fallback
    this.material    = material;
    this.thickness   = thickness;
    this.finish      = finish;
  }

  // Returns HTML for the product card
  render() {
    const specsHTML = this.specs
      .map(s => `<span>${s}</span>`)
      .join(' &bull; ');

    return `
      <div class="col-sm-6 col-lg-4 mb-4 product-item" data-category="${this.category}" data-id="${this.id}">
        <div class="product-card">
          <div class="product-card__img">${this.icon}</div>
          <div class="product-card__body">
            <span class="product-card__badge">${this.category}</span>
            <div class="product-card__name">${this.name}</div>
            <p class="product-card__desc">${this.description}</p>
            <div class="product-card__specs">${specsHTML}</div>
            <button class="btn-quote" onclick="requestQuote('${this.name}')">
              Request Quote
            </button>
          </div>
        </div>
      </div>`;
  }
}

// ============================================================
// CLASS: Catalog
// Manages product list, search, filtering, pagination
// ============================================================
class Catalog {
  constructor(products, containerSelector, paginationSelector, countSelector) {
    this.allProducts      = products;
    this.filtered         = [...products];
    this.container        = document.querySelector(containerSelector);
    this.paginationEl     = document.querySelector(paginationSelector);
    this.countEl          = document.querySelector(countSelector);
    this.currentPage      = 1;
    this.perPage          = 6;
    this.activeCategory   = 'all';
    this.searchQuery      = '';
  }

  // Filter by category
  filterByCategory(category) {
    this.activeCategory = category;
    this.currentPage = 1;
    this._applyFilters();
  }

  // Search by query string
  search(query) {
    this.searchQuery = query.toLowerCase().trim();
    this.currentPage = 1;
    this._applyFilters();
  }

  // Go to page number
  goToPage(page) {
    this.currentPage = page;
    this._render();
    window.scrollTo({ top: document.querySelector('.catalog-controls').offsetTop - 80, behavior: 'smooth' });
  }

  // Apply active filters and re-render
  _applyFilters() {
    this.filtered = this.allProducts.filter(p => {
      const matchCat = this.activeCategory === 'all' || p.category === this.activeCategory;
      const matchQ   = !this.searchQuery ||
        p.name.toLowerCase().includes(this.searchQuery) ||
        p.description.toLowerCase().includes(this.searchQuery) ||
        p.category.toLowerCase().includes(this.searchQuery);
      return matchCat && matchQ;
    });
    this._render();
  }

  // Render current page of products
  _render() {
    if (!this.container) return;

    const totalPages = Math.ceil(this.filtered.length / this.perPage);
    const start      = (this.currentPage - 1) * this.perPage;
    const page       = this.filtered.slice(start, start + this.perPage);

    // Products
    if (page.length === 0) {
      this.container.innerHTML = `
        <div class="col-12 no-results">
          <div class="icon">🔍</div>
          <p>No products found for "<strong>${this.searchQuery || this.activeCategory}</strong>"</p>
          <button class="filter-btn" onclick="catalog.filterByCategory('all'); catalog.search('');">
            Clear filters
          </button>
        </div>`;
    } else {
      this.container.innerHTML = page.map(p => p.render()).join('');
    }

    // Count
    if (this.countEl) {
      this.countEl.textContent = `${this.filtered.length} product${this.filtered.length !== 1 ? 's' : ''}`;
    }

    // Pagination
    this._renderPagination(totalPages);
  }

  // Render pagination controls
  _renderPagination(totalPages) {
    if (!this.paginationEl) return;
    if (totalPages <= 1) { this.paginationEl.innerHTML = ''; return; }

    let html = '';
    // Prev
    html += `<li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="event.preventDefault(); catalog.goToPage(${this.currentPage - 1})">&#8592;</a>
    </li>`;
    // Pages
    for (let i = 1; i <= totalPages; i++) {
      html += `<li class="page-item ${i === this.currentPage ? 'active' : ''}">
        <a class="page-link" href="#" onclick="event.preventDefault(); catalog.goToPage(${i})">${i}</a>
      </li>`;
    }
    // Next
    html += `<li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="event.preventDefault(); catalog.goToPage(${this.currentPage + 1})">&#8594;</a>
    </li>`;

    this.paginationEl.innerHTML = html;
  }

  // Initialize the catalog
  init() {
    this._render();
  }
}

// ============================================================
// CLASS: AlertManager
// Renders styled alert messages in a target container
// ============================================================
class AlertManager {
  constructor(containerSelector) {
    this.container = document.querySelector(containerSelector);
  }

  _icons = { success: '✔', error: '✖', info: 'ℹ' };

  show(type, title, message, autoDismiss = 0) {
    if (!this.container) return;

    const id   = `alert-${Date.now()}`;
    const icon = this._icons[type] || 'ℹ';

    const el = document.createElement('div');
    el.id        = id;
    el.className = `alert-custom alert-${type}`;
    el.innerHTML = `
      <span class="alert-custom__icon">${icon}</span>
      <div>
        <div class="alert-custom__title">${title}</div>
        ${message ? `<div class="alert-custom__body">${message}</div>` : ''}
      </div>
      <button class="alert-custom__close" onclick="document.getElementById('${id}').remove()" aria-label="Dismiss">✕</button>`;

    this.container.prepend(el);

    if (autoDismiss > 0) {
      setTimeout(() => el.remove(), autoDismiss);
    }
  }

  clear() {
    if (this.container) this.container.innerHTML = '';
  }
}

// ============================================================
// CLASS: CurrencyConverter
// Converts a fixed USD quote amount into a chosen currency
// using the Frankfurter exchange rate API (api.frankfurter.app).
// No API key required, and the API sends proper CORS headers,
// so it works directly from the browser with no proxy needed.
// ============================================================
class CurrencyConverter {
  constructor(containerSelector, selectSelector, resultSelector, statusSelector, baseAmount = 100) {
    this.container   = document.querySelector(containerSelector);
    this.selectEl    = document.querySelector(selectSelector);
    this.resultEl    = document.querySelector(resultSelector);
    this.statusEl    = document.querySelector(statusSelector);
    this.baseAmount  = baseAmount;
  }

  init() {
    if (!this.container || !this.selectEl) return;
    this.selectEl.addEventListener('change', () => this.fetch());
    this.fetch();
  }

  async fetch() {
    if (!this.selectEl) return;
    const targetCurrency = this.selectEl.value;

    // LBP is not tracked by the ECB (Frankfurter's data source), so we use
    // a fixed reference rate instead of a live API call. Lebanon's central
    // bank rate has held steady at ~89,500 LBP/USD since Feb 2024 — see
    // README AI-use appendix for sourcing and rationale.
    if (targetCurrency === 'LBP') {
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        if (!res.ok) throw new Error(`API responded ${res.status}`);
        const data = await res.json();
        if (data && data.rates && data.rates.LBP !== undefined) {
          this._render(data.rates.LBP, 'LBP', data.time_last_update_utc);
        } else {
          throw new Error('LBP not in response');
        }
      } catch (err) {
        console.warn('LBP live fetch failed, using fixed rate:', err.message);
        this._render(89500, 'LBP', 'fixed reference rate');
      }
      return;
    }

    this._setStatus('loading', 'Fetching exchange rate…');

    try {
      const url = `https://api.frankfurter.dev/v1/latest?from=USD&to=${targetCurrency}`;
      const res = await fetch(url);

      if (!res.ok) throw new Error(`API responded ${res.status}`);

      const data = await res.json();

      if (data && data.rates && data.rates[targetCurrency] !== undefined) {
        this._render(data.rates[targetCurrency], targetCurrency, data.date);
      } else {
        throw new Error('Unexpected response format');
      }
    } catch (err) {
      console.warn('CurrencyConverter:', err.message);
      this._setStatus('error', 'Exchange rate unavailable');
    }
  }

  _render(rate, currency, date) {
    const converted = (this.baseAmount * rate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (this.resultEl) this.resultEl.textContent = `${converted} ${currency}`;
    const label = date === 'fixed reference rate' ? 'Fixed reference rate (not live)' : `Rate as of ${date}`;
    this._setStatus('', label);
  }

  _setStatus(type, msg) {
    if (this.statusEl) {
      this.statusEl.textContent = msg;
      this.statusEl.className   = `price-widget__status ${type}`;
    }
  }
}

// ============================================================
// CLASS: DeliveryGoalPlanner
// Uses Geoapify Geocoding + Routing APIs to calculate delivery goals
// ============================================================
class DeliveryGoalPlanner {
  constructor() {
    this.apiKey = '963f011eb9de49ceaa5fde7e3c1347f4';
    this.workshop = {
      lat: 33.9806,
      lon: 35.6178,
      label: 'SAM S.A.R.L. Workshop, Sarba, Jounieh'
    };

    this.addressEl = document.getElementById('delivery-address');
    this.modeEl = document.getElementById('delivery-mode');
    this.buttonEl = document.getElementById('delivery-check-btn');
    this.statusEl = document.getElementById('delivery-status');
    this.summaryEl = document.getElementById('delivery-summary');
    this.filterEl = document.getElementById('delivery-filter');
    this.currentView = 'summary';
    this.stepsEl = document.getElementById('delivery-steps');
    this.steps = [];
  }

  init() {
    if (!this.addressEl || !this.buttonEl) return;

    this.buttonEl.addEventListener('click', () => this.checkDeliveryGoal());
//here new
    document.querySelectorAll('.delivery-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.delivery-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      this.currentView = btn.dataset.view;
      this.renderSteps(this.steps);
      });
    });
  }

  async checkDeliveryGoal() {
    const address = this.addressEl.value.trim();
    const mode = this.modeEl.value;

    if (!address) {
      this.setState('empty', 'Please enter a delivery address first.');
      return;
    }

    this.setState('loading', 'Finding address and calculating delivery route...');
    this.summaryEl.innerHTML = '';
    this.stepsEl.innerHTML = '';
    this.filterEl.hidden = true;

    try {
      const destination = await this.geocodeAddress(address);
      const route = await this.fetchRoute(destination, mode);

      this.renderSummary(route, destination);
      this.steps = this.extractSteps(route);
      this.renderSteps(this.steps);

      this.filterEl.hidden = this.steps.length === 0;
      this.setState('', 'Delivery route loaded from Geoapify.');
    } catch (err) {
      console.warn('DeliveryGoalPlanner:', err.message);
      this.setState('error', err.message || 'Delivery route unavailable.');
    }
  }

  async geocodeAddress(address) {
    const url =
      `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(address)}` +
      `&format=json&limit=1&filter=countrycode:lb&apiKey=${this.apiKey}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Geocoding failed with status ${res.status}`);

    const data = await res.json();

    if (!data.results || data.results.length === 0) {
      throw new Error('No matching address found. Try a more specific location.');
    }

    return data.results[0];
  }

  async fetchRoute(destination, mode) {
    const waypoints = `${this.workshop.lat},${this.workshop.lon}|${destination.lat},${destination.lon}`;

    const url =
      `https://api.geoapify.com/v1/routing?waypoints=${waypoints}` +
      `&mode=${mode}&format=json&apiKey=${this.apiKey}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Routing failed with status ${res.status}`);

    const data = await res.json();

    if (!data.results || data.results.length === 0) {
      throw new Error('No delivery route found for this address.');
    }

    return data.results[0];
  }

  renderSummary(route, destination) {
    const distanceKm = (route.distance / 1000).toFixed(1);
    const timeMin = Math.round(route.time / 60);
    const goal = timeMin <= 60 ? 'Within standard delivery range' : 'Extended delivery planning needed';

    this.summaryEl.innerHTML = `
      <div class="delivery-summary-grid">
        <div class="delivery-metric">
          <span>Distance</span>
          <strong>${distanceKm} km</strong>
        </div>
        <div class="delivery-metric">
          <span>ETA</span>
          <strong>${timeMin} min</strong>
        </div>
        <div class="delivery-metric">
          <span>Goal</span>
          <strong>${goal}</strong>
        </div>
      </div>
      <p class="delivery-found-address">Matched address: ${destination.formatted}</p>
    `;
  }

  extractSteps(route) {
    if (!route.legs) return [];

    return route.legs.flatMap(leg => leg.steps || []);
  }

  renderSteps(steps = []) {
    if (!this.stepsEl) return;

    const safeSteps = Array.isArray(steps) ? steps : [];

    if (this.currentView === 'summary') {
      this.stepsEl.innerHTML = '';
      return;
    }

    if (safeSteps.length === 0) {
      this.stepsEl.innerHTML = '<div class="delivery-state empty">No route details available.</div>';
      return;
    }

    this.stepsEl.innerHTML = safeSteps.map((step, index) => {
      const text = step.instruction?.text || 'Continue on route';
      const distance = step.distance ? `${Math.round(step.distance)} m` : '';

      return `
        <div class="delivery-step">
          <strong>${index + 1}.</strong>
          <span>${text}</span>
          <small>${distance}</small>
        </div>
      `;
    }).join('');
  }

  filterSteps(query) {
    const q = query.toLowerCase().trim();

    if (!q) {
      this.renderSteps(this.steps);
      return;
    }

    const filtered = this.steps.filter(step =>
      (step.instruction?.text || '').toLowerCase().includes(q)
    );

    this.renderSteps(filtered);
  }

  setState(type, message) {
    this.statusEl.textContent = message;
    this.statusEl.className = `delivery-state ${type}`;
  }
}

// ============================================================
// PRODUCT DATA — 18 original items across 5 categories
// ============================================================
const PRODUCTS = [
  new Product({ id: 1, name: 'Thermal Break Casement Window', category: 'windows',
    description: 'Double-glazed casement window with thermal break profile. Designed for energy efficiency and acoustic insulation in residential and commercial buildings.',
    specs: ['Double glazing', '70mm profile', 'U-value 1.4'], icon: '🪟',
    material: 'Aluminum 6063-T5', thickness: '1.8mm', finish: 'Powder coated' }),

  new Product({ id: 2, name: 'Fixed Picture Window', category: 'windows',
    description: 'Large fixed-frame picture window for maximum natural light and unobstructed views. Available in custom sizes up to 3×2m.',
    specs: ['Fixed frame', 'Custom sizing', 'Triple seal'], icon: '🖼️',
    material: 'Aluminum 6063-T6', thickness: '2mm', finish: 'Anodized' }),

  new Product({ id: 3, name: 'Sliding Sash Window', category: 'windows',
    description: 'Horizontal sliding sash with smooth rolling system. Ideal for apartments and offices with space constraints.',
    specs: ['Horizontal slide', 'Roller bearings', 'Child lock'], icon: '🪟',
    material: 'Aluminum 6060-T5', thickness: '1.6mm', finish: 'Powder coated' }),

  new Product({ id: 4, name: 'Tilt & Turn Window', category: 'windows',
    description: 'Versatile European-style window that tilts inward for ventilation or swings fully open for cleaning and emergency egress.',
    specs: ['Tilt + turn', 'Two-way opening', 'Anti-burglar'], icon: '🔄',
    material: 'Aluminum 6063-T5', thickness: '1.8mm', finish: 'RAL custom' }),

  new Product({ id: 5, name: 'Louvered Vent Window', category: 'windows',
    description: 'Fixed louvre blades angled for rain protection while maintaining constant ventilation. Popular in utility rooms and parking levels.',
    specs: ['Fixed louvres', 'IP44 rated', 'Bird mesh'], icon: '🌬️',
    material: 'Aluminum 6063', thickness: '1.5mm', finish: 'Mill finish' }),

  new Product({ id: 6, name: 'Pivot Entry Door', category: 'doors',
    description: 'Statement pivot door with off-center hinge for dramatic large-format entrances. Available up to 1.2m wide and 3m tall.',
    specs: ['Pivot hinge', 'Up to 3m height', 'Concealed closer'], icon: '🚪',
    material: 'Aluminum 6061-T6', thickness: '3mm', finish: 'Powder coated' }),

  new Product({ id: 7, name: 'Sliding Patio Door', category: 'doors',
    description: 'Wide-span sliding door system connecting interior living space to outdoor terraces. Stainless steel track for smooth, quiet operation.',
    specs: ['Soft close', 'SS track', '8mm safety glass'], icon: '🚪',
    material: 'Aluminum 6063-T5', thickness: '2.5mm', finish: 'Anodized bronze' }),

  new Product({ id: 8, name: 'Folding Bi-Fold Door', category: 'doors',
    description: 'Multi-panel bi-fold system that folds fully to one side, opening the entire wall. Up to 8 panels in a single run.',
    specs: ['Up to 8 panels', 'Bottom track', 'Traffic door'], icon: '🔀',
    material: 'Aluminum 6063-T6', thickness: '2mm', finish: 'RAL 7016' }),

  new Product({ id: 9, name: 'Security Fire Door', category: 'doors',
    description: 'Fire-rated aluminum door with intumescent seal and panic bar. Certified to EI60 standard for commercial and industrial use.',
    specs: ['EI60 rated', 'Panic bar', 'Intumescent seal'], icon: '🔐',
    material: 'Aluminum 6061-T6', thickness: '3.5mm', finish: 'Epoxy primer' }),

  new Product({ id: 10, name: 'Flush Swing Door', category: 'doors',
    description: 'Clean-faced swing door with concealed hinges and frameless glass infill. Perfect for modern office and retail interiors.',
    specs: ['Concealed hinges', 'Glass infill', 'ADA compliant'], icon: '🚪',
    material: 'Aluminum 6063', thickness: '2mm', finish: 'Satin anodized' }),

  new Product({ id: 11, name: 'Glass Balcony Railing', category: 'railings',
    description: 'Frameless glass railing with aluminum base shoe channel. Provides safety without interrupting the view from balconies and terraces.',
    specs: ['10mm tempered', 'Base shoe', 'Load tested'], icon: '🏗️',
    material: 'Aluminum 6063-T5', thickness: '2mm', finish: 'Powder coated white' }),

  new Product({ id: 12, name: 'Horizontal Bar Railing', category: 'railings',
    description: 'Contemporary cable-free horizontal bar railing in rectangular tube profile. Suits modern staircases and elevated walkways.',
    specs: ['40×20 tube', '110cm height', 'Welded joints'], icon: '📏',
    material: 'Aluminum 6060-T6', thickness: '2mm', finish: 'RAL 9005 black' }),

  new Product({ id: 13, name: 'Decorative Spindle Railing', category: 'railings',
    description: 'Traditional-style railing with decorative aluminum spindles and round top rail. Available with various spindle patterns.',
    specs: ['25mm spindles', 'Round handrail', 'Multiple patterns'], icon: '🎨',
    material: 'Aluminum 6063', thickness: '1.5mm', finish: 'Gold anodized' }),

  new Product({ id: 14, name: 'Pool Fence Railing', category: 'railings',
    description: 'Compliant pool safety fencing with self-closing, self-latching gate. Meets international pool barrier standards.',
    specs: ['900mm min height', 'Self-latching', 'Corrosion proof'], icon: '🏊',
    material: 'Aluminum 6063-T5', thickness: '2mm', finish: 'Powder coated white' }),

  new Product({ id: 15, name: 'Ventilated Facade Panel', category: 'facades',
    description: 'Rainscreen cladding panel system with ventilated air cavity for thermal management. Suitable for multi-story residential and commercial buildings.',
    specs: ['Rainscreen', 'Hidden fixings', 'A2 fire class'], icon: '🏢',
    material: 'Aluminum 3mm composite', thickness: '3mm', finish: 'PVDF coating' }),

  new Product({ id: 16, name: 'Perforated Screen Panel', category: 'facades',
    description: 'Decorative perforated aluminum panel used for sun shading, privacy screening, and building aesthetics. Custom perforation patterns available.',
    specs: ['Custom patterns', 'Up to 4×1.5m', 'Hidden fix'], icon: '⬛',
    material: 'Aluminum 1050-H14', thickness: '2mm', finish: 'Powder coated' }),

  new Product({ id: 17, name: 'Fixed External Louvre', category: 'louvers',
    description: 'External fixed blade louvre for sun control and natural ventilation. Blade angle optimized for the building orientation.',
    specs: ['Fixed 45°', 'Bird/insect mesh', 'Drainage tested'], icon: '🌤️',
    material: 'Aluminum 6063-T5', thickness: '2mm', finish: 'RAL custom' }),

  new Product({ id: 18, name: 'Motorized Adjustable Louvre', category: 'louvers',
    description: 'Electrically operated adjustable louvre system with 0–90° blade rotation. Integrates with building management systems via BACnet.',
    specs: ['0–90° rotation', 'BACnet ready', 'IP55 motor'], icon: '⚙️',
    material: 'Aluminum 6063-T6', thickness: '2.5mm', finish: 'Anodized silver' }),
];

// ============================================================
// GLOBAL INSTANCES (instantiated per-page)
// ============================================================
let catalog      = null;
let alertManager = null;
let currencyConverter = null;

// Redirect to contact page with product pre-selected
function requestQuote(productName) {
  sessionStorage.setItem('quoteProduct', productName);
  window.location.href = 'contact.html';
}

// ============================================================
// PAGE INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;

  // --- HOME ---
  if (page === 'home') {
    currencyConverter = new CurrencyConverter(
      '#price-widget', '#currency-select', '#currency-result', '#currency-status'
    );
    currencyConverter.init();
  }

  // --- CATALOG ---
  if (page === 'catalog') {
    catalog = new Catalog(PRODUCTS, '#product-grid', '#pagination', '#product-count');
    catalog.init();

    // Search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', e => catalog.search(e.target.value));
    }

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        catalog.filterByCategory(btn.dataset.category);
      });
    });

    currencyConverter = new CurrencyConverter(
    '#price-widget', '#currency-select', '#currency-result', '#currency-status'
    );
    currencyConverter.init();
  }

  // --- CONTACT ---
  if (page === 'contact') {
    alertManager = new AlertManager('#alert-container');

    // Pre-fill product from catalog redirect
    const preProduct = sessionStorage.getItem('quoteProduct');
    const productSel = document.getElementById('product-select');
    if (preProduct && productSel) {
      // Find the matching option and select it
      for (const opt of productSel.options) {
        if (opt.value === preProduct) { opt.selected = true; break; }
      }
      sessionStorage.removeItem('quoteProduct');
    }

    // Form submit
    const form = document.getElementById('quote-form');
    if (form) {
      form.addEventListener('submit', handleQuoteSubmit);
    }
    const deliveryPlanner = new DeliveryGoalPlanner();
    deliveryPlanner.init();
  }
});

// Contact form validation and submission
function handleQuoteSubmit(e) {
  e.preventDefault();
  alertManager.clear();

  const name    = document.getElementById('name').value.trim();
  const email   = document.getElementById('email').value.trim();
  const product = document.getElementById('product-select').value;
  const message = document.getElementById('message').value.trim();

  let valid = true;

  // Clear previous error states
  ['name', 'email', 'product-select', 'message'].forEach(id => {
    document.getElementById(id)?.classList.remove('error');
  });

  // Validate
  if (!name) {
    document.getElementById('name').classList.add('error');
    alertManager.show('error', 'Name required', 'Please enter your full name.');
    valid = false;
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    document.getElementById('email').classList.add('error');
    alertManager.show('error', 'Valid email required', 'Please enter a valid email address.');
    valid = false;
  }

  if (!product) {
    document.getElementById('product-select').classList.add('error');
    alertManager.show('error', 'Product required', 'Please select a product category.');
    valid = false;
  }

  if (!valid) return;

  // Simulate submission
  const btn = document.getElementById('submit-btn');
  btn.disabled    = true;
  btn.textContent = 'Sending…';

  setTimeout(() => {
    alertManager.show(
      'success',
      'Quote request received!',
      `Thank you, ${name}. We'll contact you at ${email} within 1 business day.`,
      8000
    );
    e.target.reset();
    btn.disabled    = false;
    btn.textContent = 'Send Quote Request';
  }, 1200);
}