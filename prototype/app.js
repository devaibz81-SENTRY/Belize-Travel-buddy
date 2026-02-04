/**
 * Travel Buddy Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // State management
    const state = {
        allOperators: [],
        displayedOperators: [],
        filters: {
            category: 'all',
            search: '',
            district: 'all',
            priceRange: 'all',
            location: 'all',
            minRating: 0
        }
    };

    // DOM Elements
    const elements = {
        searchInput: document.getElementById('searchInput'),
        refreshBtn: document.getElementById('refreshBtn'),
        operatorsGrid: document.getElementById('operatorsGrid'),
        loadingState: document.getElementById('loadingState'),
        emptyState: document.getElementById('emptyState'),
        statTotal: document.getElementById('totalOperators'),
        statDate: document.getElementById('lastUpdated'),
        filterChips: document.querySelectorAll('.filter-chip'),
        districtSelect: document.getElementById('districtFilter'),
        priceSelect: document.getElementById('priceFilter'),
        ratingSelect: document.getElementById('ratingFilter'),
        modal: document.getElementById('operatorModal'),
        modalBody: document.getElementById('modalBody'),
        closeModal: document.getElementById('closeModal'),
        modalBackdrop: document.querySelector('.modal-backdrop')
    };

    // Initialize Application
    async function init() {
        showLoading(true);

        try {
            // Fetch live data
            state.allOperators = await travelBuddyAPI.getAllOperators();
            state.displayedOperators = [...state.allOperators];

            updateStats();
            populateDistrictFilter();
            applyFilters(); // Initial render

        } catch (error) {
            console.error('Failed to initialize:', error);
            showError('Failed to load tour operator data. Please try again.');
        } finally {
            showLoading(false);
        }
    }

    // Event Listeners

    // Search
    elements.searchInput.addEventListener('input', (e) => {
        state.filters.search = e.target.value;
        applyFilters();
    });

    // Refresh Data
    elements.refreshBtn.addEventListener('click', async () => {
        elements.refreshBtn.classList.add('spinning');
        showLoading(true);
        elements.operatorsGrid.innerHTML = ''; // Clear current

        // Force refresh from API (bypass cache if implemented in API)
        // For now, we simulate a re-fetch
        await new Promise(r => setTimeout(r, 800));
        state.allOperators = await travelBuddyAPI.getAllOperators();

        applyFilters();
        updateStats();
        showLoading(false);
        elements.refreshBtn.classList.remove('spinning');
    });

    // Category Filters (Chips)
    elements.filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            // Toggle active class
            elements.filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');

            const filterType = chip.dataset.filter;

            // Handle special quick-filters (like 'cayo' or 'sanpedro')
            if (filterType === 'cayo') {
                state.filters.category = 'all';
                state.filters.district = 'Cayo';
                // Update dropdown to match
                if (elements.districtSelect) elements.districtSelect.value = 'Cayo';
            } else if (filterType === 'sanpedro') {
                state.filters.category = 'all';
                state.filters.district = 'Belize';
                state.filters.location = 'San Pedro';
                // Reset district dropdown as San Pedro is a location within Belize district
                if (elements.districtSelect) elements.districtSelect.value = 'Belize';
            } else {
                state.filters.category = filterType;
                // Reset location specific overrides if switching back to categories
                if (state.filters.location === 'San Pedro' && filterType !== 'all') {
                    state.filters.location = 'all';
                    state.filters.district = 'all';
                    if (elements.districtSelect) elements.districtSelect.value = 'all';
                }
            }

            applyFilters();
        });
    });

    // Advanced Filters
    if (elements.districtSelect) {
        elements.districtSelect.addEventListener('change', (e) => {
            state.filters.district = e.target.value;
            state.filters.location = 'all'; // Reset location when district changes
            applyFilters();
        });
    }

    if (elements.priceSelect) {
        elements.priceSelect.addEventListener('change', (e) => {
            state.filters.priceRange = e.target.value;
            applyFilters();
        });
    }

    if (elements.ratingSelect) {
        elements.ratingSelect.addEventListener('change', (e) => {
            state.filters.minRating = parseFloat(e.target.value);
            applyFilters();
        });
    }

    // Modal Events
    elements.closeModal.addEventListener('click', closeModal);
    elements.modalBackdrop.addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    // Helper Functions

    function showLoading(show) {
        elements.loadingState.style.display = show ? 'flex' : 'none';
        if (show) {
            elements.operatorsGrid.style.display = 'none';
            elements.emptyState.style.display = 'none';
        } else {
            elements.operatorsGrid.style.display = 'grid';
        }
    }

    function updateStats() {
        elements.statTotal.textContent = state.displayedOperators.length;
        const date = new Date();
        elements.statDate.textContent = date.toLocaleDateString();
    }

    function populateDistrictFilter() {
        if (!elements.districtSelect) return;

        const districts = travelBuddyAPI.getDistricts(state.allOperators);
        const currentValue = elements.districtSelect.value;

        // Keep "All Districts" option
        elements.districtSelect.innerHTML = '<option value="all">All Districts</option>';

        districts.forEach(district => {
            const option = document.createElement('option');
            option.value = district;
            option.textContent = district;
            elements.districtSelect.appendChild(option);
        });

        elements.districtSelect.value = currentValue;
    }

    function applyFilters() {
        state.displayedOperators = travelBuddyAPI.filterOperators(state.allOperators, state.filters);
        updateStats();
        renderGrid();
    }

    function renderGrid() {
        elements.operatorsGrid.innerHTML = '';

        if (state.displayedOperators.length === 0) {
            elements.operatorsGrid.style.display = 'none';
            elements.emptyState.style.display = 'block';
            return;
        }

        elements.emptyState.style.display = 'none';
        elements.operatorsGrid.style.display = 'grid';

        state.displayedOperators.forEach((operator, index) => {
            const card = createOperatorCard(operator, index);
            elements.operatorsGrid.appendChild(card);
        });
    }

    function createOperatorCard(operator, index) {
        const card = document.createElement('div');
        card.className = 'operator-card';
        card.style.animation = `fadeIn 0.5s ease-out ${index * 0.05}s backwards`;

        // Generate stars
        const stars = '★'.repeat(Math.floor(operator.rating)) + '☆'.repeat(5 - Math.floor(operator.rating));

        card.innerHTML = `
            <div class="operator-header">
                <div>
                    <h3 class="operator-name">${operator.name}</h3>
                    <div style="color: var(--accent-orange); font-size: 12px; margin-top: 4px;">
                        ${stars} <span style="color: var(--text-muted);">(${operator.rating})</span>
                    </div>
                </div>
                <span class="operator-badge">${operator.category}</span>
            </div>
            
            <div class="operator-info">
                <div class="info-item">
                    <svg class="info-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    <span class="info-text">${operator.location}, ${operator.district}</span>
                    <span style="color: var(--accent-green); font-weight: 600;">${operator.priceRange}</span>
                </div>
                <div class="info-item">
                    <svg class="info-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                    <span class="info-text">${operator.phone || 'No phone'}</span>
                </div>
            </div>
            
            <div class="operator-actions">
                <button class="action-btn details-btn">
                    View Details
                </button>
                <a href="${travelBuddyAPI.getWhatsAppLink(operator.phone, operator.name)}" target="_blank" class="action-btn whatsapp">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    WhatsApp
                </a>
            </div>
        `;

        card.querySelector('.details-btn').addEventListener('click', () => openModal(operator));

        return card;
    }

    function openModal(operator) {
        elements.modalBody.innerHTML = `
            <div class="modal-header">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <h2 class="modal-title">${operator.name}</h2>
                    <span class="operator-badge">${operator.category}</span>
                </div>
                <div class="modal-subtitle" style="display: flex; gap: 10px; align-items: center; margin-top: 8px;">
                     <span>${operator.address.full}</span>
                </div>
            </div>
            
            <div class="modal-section">
                <h3>Contact Information</h3>
                <div class="info-item" style="margin-bottom: 8px;">
                    <span class="info-icon">📞</span>
                    <a href="tel:${operator.phone}" class="modal-link">${operator.phone}</a>
                </div>
                ${operator.email ? `
                <div class="info-item" style="margin-bottom: 8px;">
                    <span class="info-icon">✉️</span>
                    <a href="mailto:${operator.email}" class="modal-link">${operator.email}</a>
                </div>
                ` : ''}
                ${operator.website ? `
                <div class="info-item">
                    <span class="info-icon">🌐</span>
                    <a href="${operator.website.startsWith('http') ? operator.website : 'https://' + operator.website}" target="_blank" class="modal-link">Visit Website</a>
                </div>
                ` : ''}
            </div>

            <div class="modal-section">
                <h3>Highlights</h3>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <span class="filter-chip active" style="font-size: 12px; padding: 6px 16px;">${operator.district}</span>
                    <span class="filter-chip active" style="font-size: 12px; padding: 6px 16px;">${operator.priceRange} Price</span>
                    <span class="filter-chip active" style="font-size: 12px; padding: 6px 16px;">${operator.rating} Rating</span>
                </div>
            </div>

            <a href="${travelBuddyAPI.getWhatsAppLink(operator.phone, operator.name)}" target="_blank" class="action-btn whatsapp" style="justify-content: center; width: 100%; margin-top: 10px;">
                Start WhatsApp Chat
            </a>
        `;

        elements.modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        elements.modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    function showError(message) {
        elements.operatorsGrid.innerHTML = `
            <div class="empty-state">
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="var(--accent-orange)" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <h3>Error</h3>
                <p>${message}</p>
            </div>
        `;
    }

    // Start App
    init();
});
