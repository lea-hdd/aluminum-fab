/**
 * AlumiFab — Main JavaScript
 * ES6 Classes: Product, Catalog, AlertManager, AluminumPriceWidget
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
// CLASS: AluminumPriceWidget
// Fetches live aluminum price from API Ninjas Commodity API
// ============================================================
class AluminumPriceWidget {
  constructor(containerSelector, apiKey) {
    this.container = document.querySelector(containerSelector);
    this.apiKey    = apiKey;
  }

  async fetch() {
    if (!this.container) return;

    this._setStatus('loading', 'Fetching live market data…');

    try {
      // Bypassing client-side CORS policy restrictions using a public demo proxy
      const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
      const targetUrl = 'https://api.api-ninjas.com/v1/commodityprice?name=aluminum';

      const res = await fetch(
        proxyUrl + targetUrl,
        { headers: { 'X-Api-Key': this.apiKey } }
      );

      if (!res.ok) throw new Error(`API responded ${res.status}`);

      const data = await res.json();

      if (data && data.price !== undefined) {
        this._render(data.price, data.updated);
      } else {
        throw new Error('Unexpected response format');
      }
    } catch (err) {
      console.warn('AluminumPriceWidget:', err.message);
      this._setStatus('error', 'Price data unavailable');
    }
  }

  _render(price, updatedAt) {
    const valueEl  = this.container.querySelector('.price-widget__value');
    const statusEl = this.container.querySelector('.price-widget__status');

    if (valueEl)  valueEl.textContent  = `$${Number(price).toFixed(2)}`;
    if (statusEl) {
      const date = updatedAt ? new Date(updatedAt * 1000).toLocaleDateString() : 'today';
      statusEl.textContent  = `LME spot price · Updated ${date}`;
      statusEl.className    = 'price-widget__status';
    }
  }

  _setStatus(type, msg) {
    const statusEl = this.container?.querySelector('.price-widget__status');
    if (statusEl) {
      statusEl.textContent = msg;
      statusEl.className   = `price-widget__status ${type}`;
    }
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
let priceWidget  = null;

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
    // Standardizing implementation to fetch from direct key string injection
    priceWidget = new AluminumPriceWidget('#price-widget', 'm97LbnFuSlxVGVZK5X6vLHvsb64s4Cg65OkSD3vW');
    priceWidget.fetch();
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

    // Standardizing implementation to fetch from direct key string injection
    priceWidget = new AluminumPriceWidget('#price-widget', 'm97LbnFuSlxVGVZK5X6vLHvsb64s4Cg65OkSD3vW');
    priceWidget.fetch();
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