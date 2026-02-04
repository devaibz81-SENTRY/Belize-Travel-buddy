'use client';

import React, { useState, useEffect, useMemo } from 'react';

interface Operator {
    id: string;
    name: string;
    phone: string;
    address: {
        full: string;
        district: string;
    };
    email: string;
    website: string;
    district: string;
    location: string;
    category: string;
    priceRange: string;
    rating: string;
}

export default function Home() {
    const [operators, setOperators] = useState<Operator[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [filters, setFilters] = useState({
        district: 'all',
        priceRange: 'all',
        minRating: 0,
    });
    const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);

    // Fetch Data
    useEffect(() => {
        fetchOperators();
    }, []);

    const fetchOperators = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/operators');
            const result = await response.json();
            if (result.success) {
                setOperators(result.data);
            } else {
                throw new Error(result.message || 'Failed to fetch');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Filter Logic
    const filteredOperators = useMemo(() => {
        return operators.filter((op) => {
            const matchesSearch =
                op.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                op.address.full.toLowerCase().includes(searchQuery.toLowerCase()) ||
                op.location.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesCategory =
                activeCategory === 'all' ||
                (activeCategory === 'diving' && op.category.toLowerCase().includes('diving')) ||
                (activeCategory === 'adventure' && op.category.toLowerCase().includes('adventure')) ||
                (activeCategory === 'mayan' && op.category.toLowerCase().includes('mayan')) ||
                (activeCategory === 'resort' && op.category.toLowerCase().includes('resort')) ||
                (activeCategory === 'cayo' && op.district === 'Cayo') ||
                (activeCategory === 'sanpedro' && op.location.includes('San Pedro'));

            const matchesDistrict = filters.district === 'all' || op.district === filters.district;
            const matchesPrice = filters.priceRange === 'all' || op.priceRange === filters.priceRange;
            const matchesRating = parseFloat(op.rating) >= filters.minRating;

            return matchesSearch && matchesCategory && matchesDistrict && matchesPrice && matchesRating;
        });
    }, [operators, searchQuery, activeCategory, filters]);

    const districts = useMemo(() => {
        const d = new Set(operators.map((op) => op.district));
        return Array.from(d).sort();
    }, [operators]);

    const getWhatsAppLink = (phone: string, name: string) => {
        const cleanPhone = phone.replace(/\D/g, '');
        const message = encodeURIComponent(
            `Hi! I found you on Travel Buddy Belize. I'm interested in learning more about ${name}.`
        );
        return `https://wa.me/501${cleanPhone}?text=${message}`;
    };

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f1115] text-white p-4 text-center">
                <svg
                    width="60"
                    height="60"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2"
                >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <h2 className="mt-4 text-2xl font-bold">Something went wrong</h2>
                <p className="mt-2 text-gray-400">{error}</p>
                <button
                    onClick={fetchOperators}
                    className="mt-6 px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="app-container">
            {/* Hero Section */}
            <header className="hero">
                <div className="hero-background"></div>
                <div className="hero-content">
                    <h1 className="hero-title">
                        <span className="title-main">Travel Buddy</span>
                        <span className="title-sub">Belize</span>
                    </h1>
                    <p className="hero-description">Discover 300+ BTB Licensed Tour Operators</p>

                    <div className="search-container">
                        <div className="search-box">
                            <svg className="search-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path
                                    d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zM18 18l-4.35-4.35"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search tour operators, activities, locations..."
                                className="search-input"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button
                            className={`refresh-btn ${loading ? 'spinning' : ''}`}
                            title="Refresh live data"
                            onClick={fetchOperators}
                            disabled={loading}
                        >
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path
                                    d="M17 2v6h-6M3 18v-6h6M18.36 7A9 9 0 1 0 5.64 13"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </button>
                    </div>

                    <div className="stats-bar">
                        <div className="stat-item">
                            <span className="stat-number">{filteredOperators.length}</span>
                            <span className="stat-label">Results Found</span>
                        </div>
                        <div className="stat-divider"></div>
                        <div className="stat-item">
                            <span className="stat-number">{new Date().toLocaleDateString()}</span>
                            <span className="stat-label">Last Updated</span>
                        </div>
                        <div className="stat-divider"></div>
                        <div className="stat-item">
                            <span className="stat-number live-indicator">LIVE</span>
                            <span className="stat-label">Data Status</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Filters Section */}
            <section className="filters-section">
                <div className="filters-container">
                    {[
                        { id: 'all', label: 'All Operators' },
                        { id: 'diving', label: 'Diving & Snorkeling' },
                        { id: 'adventure', label: 'Adventure Tours' },
                        { id: 'mayan', label: 'Mayan Tours' },
                        { id: 'resort', label: 'Resorts' },
                        { id: 'cayo', label: 'Cayo District' },
                        { id: 'sanpedro', label: 'San Pedro' },
                    ].map((cat) => (
                        <button
                            key={cat.id}
                            className={`filter-chip ${activeCategory === cat.id ? 'active' : ''}`}
                            onClick={() => setActiveCategory(cat.id)}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                <div className="advanced-filters">
                    <div className="filter-group">
                        <label>District</label>
                        <select
                            className="filter-select"
                            value={filters.district}
                            onChange={(e) => setFilters({ ...filters, district: e.target.value })}
                        >
                            <option value="all">All Districts</option>
                            {districts.map((d) => (
                                <option key={d} value={d}>
                                    {d}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Price Range</label>
                        <select
                            className="filter-select"
                            value={filters.priceRange}
                            onChange={(e) => setFilters({ ...filters, priceRange: e.target.value })}
                        >
                            <option value="all">Any Price</option>
                            <option value="$">$ (Value)</option>
                            <option value="$$">$$ (Standard)</option>
                            <option value="$$$">$$$ (Premium)</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Rating</label>
                        <select
                            className="filter-select"
                            value={filters.minRating}
                            onChange={(e) => setFilters({ ...filters, minRating: parseFloat(e.target.value) })}
                        >
                            <option value="0">Any Rating</option>
                            <option value="4.5">4.5+ Stars</option>
                            <option value="4.0">4.0+ Stars</option>
                            <option value="3.5">3.5+ Stars</option>
                        </select>
                    </div>
                </div>
            </section>

            {/* Main Content */}
            <main className="operators-section">
                {loading ? (
                    <div className="loading-state">
                        <div className="loading-spinner"></div>
                        <p className="loading-text">Fetching live data from Belize Tourism Board...</p>
                    </div>
                ) : filteredOperators.length === 0 ? (
                    <div className="empty-state">
                        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                            <circle cx="40" cy="40" r="38" stroke="currentColor" strokeWidth="2" opacity="0.2" />
                            <path d="M40 20v20M40 50v10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                        <h3>No operators found</h3>
                        <p>Try adjusting your search or filters</p>
                    </div>
                ) : (
                    <div className="operators-grid">
                        {filteredOperators.map((op, idx) => (
                            <div
                                key={op.id}
                                className="operator-card"
                                style={{ animationDelay: `${idx * 0.05}s` }}
                            >
                                <div className="operator-header">
                                    <div>
                                        <h3 className="operator-name">{op.name}</h3>
                                        <div style={{ color: '#f59e0b', fontSize: '12px', marginTop: '4px' }}>
                                            {'★'.repeat(Math.floor(parseFloat(op.rating)))}
                                            {'☆'.repeat(5 - Math.floor(parseFloat(op.rating)))}{' '}
                                            <span className="text-gray-500">({op.rating})</span>
                                        </div>
                                    </div>
                                    <span className="operator-badge">{op.category}</span>
                                </div>

                                <div className="operator-info">
                                    <div className="info-item">
                                        <svg
                                            className="info-icon"
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                        >
                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                            <circle cx="12" cy="10" r="3"></circle>
                                        </svg>
                                        <span className="info-text">
                                            {op.location}, {op.district}
                                        </span>
                                        <span className="font-semibold text-green-500 ml-2">{op.priceRange}</span>
                                    </div>
                                    <div className="info-item">
                                        <svg
                                            className="info-icon"
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                        >
                                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                        </svg>
                                        <span className="info-text">{op.phone || 'No phone'}</span>
                                    </div>
                                </div>

                                <div className="operator-actions">
                                    <button className="action-btn details-btn" onClick={() => setSelectedOperator(op)}>
                                        View Details
                                    </button>
                                    <a
                                        href={getWhatsAppLink(op.phone, op.name)}
                                        target="_blank"
                                        className="action-btn whatsapp"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                        </svg>
                                        WhatsApp
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Modal */}
            {selectedOperator && (
                <div className="modal active">
                    <div className="modal-backdrop" onClick={() => setSelectedOperator(null)}></div>
                    <div className="modal-content">
                        <button className="modal-close" onClick={() => setSelectedOperator(null)}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path
                                    d="M18 6L6 18M6 6l12 12"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </button>

                        <div className="modal-header">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                <h2 className="modal-title">{selectedOperator.name}</h2>
                                <span className="operator-badge">{selectedOperator.category}</span>
                            </div>
                            <div
                                className="modal-subtitle"
                                style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '8px' }}
                            >
                                <span>{selectedOperator.address.full}</span>
                            </div>
                        </div>

                        <div className="modal-section">
                            <h3>Contact Information</h3>
                            <div className="info-item" style={{ marginBottom: '8px' }}>
                                <span className="info-icon">📞</span>
                                <a href={`tel:${selectedOperator.phone}`} className="modal-link">
                                    {selectedOperator.phone}
                                </a>
                            </div>
                            {selectedOperator.email && (
                                <div className="info-item" style={{ marginBottom: '8px' }}>
                                    <span className="info-icon">✉️</span>
                                    <a href={`mailto:${selectedOperator.email}`} className="modal-link">
                                        {selectedOperator.email}
                                    </a>
                                </div>
                            )}
                            {selectedOperator.website && (
                                <div className="info-item">
                                    <span className="info-icon">🌐</span>
                                    <a
                                        href={
                                            selectedOperator.website.startsWith('http')
                                                ? selectedOperator.website
                                                : 'https://' + selectedOperator.website
                                        }
                                        target="_blank"
                                        className="modal-link"
                                    >
                                        Visit Website
                                    </a>
                                </div>
                            )}
                        </div>

                        <div className="modal-section">
                            <h3>Highlights</h3>
                            <div className="flex gap-2 flex-wrap">
                                <span className="filter-chip active" style={{ fontSize: '12px', padding: '6px 16px' }}>
                                    {selectedOperator.district}
                                </span>
                                <span className="filter-chip active" style={{ fontSize: '12px', padding: '6px 16px' }}>
                                    {selectedOperator.priceRange} Price
                                </span>
                                <span className="filter-chip active" style={{ fontSize: '12px', padding: '6px 16px' }}>
                                    {selectedOperator.rating} Rating
                                </span>
                            </div>
                        </div>

                        <a
                            href={getWhatsAppLink(selectedOperator.phone, selectedOperator.name)}
                            target="_blank"
                            className="action-btn whatsapp mt-4 w-full flex justify-center py-3"
                        >
                            Start WhatsApp Chat
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}
