'use client';

import { useState } from 'react';
import styles from './SearchOperators.module.css';

interface Operator {
  id: string;
  name: string;
  description: string;
  phone: string;
  email: string;
  city: string;
  category: string;
  rating: number;
  website?: string;
}

const CITIES = [
  'Belmopan',
  'Belize City',
  'San Ignacio',
  'Placencia',
  'Caye Caulker',
  'Ambergris Caye',
  'Hopkins',
  'Dangriga',
];

const CATEGORIES = [
  'Diving & Snorkeling',
  'Adventure Tours',
  'Mayan Culture',
  'Wildlife Tours',
  'Water Sports',
  'Beach Tours',
  'Jungle Tours',
  'Fishing',
];

export default function SearchOperators() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [results, setResults] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('query', searchQuery);
      if (selectedCity) params.append('city', selectedCity);
      if (selectedCategory) params.append('category', selectedCategory);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/search-operators?${params}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to search operators. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Belize Travel Buddy</h1>
          <p className={styles.subtitle}>
            Discover and connect with tour operators across Belize
          </p>
        </div>
      </header>

      <div className={styles.searchSection}>
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="search" className={styles.label}>
                Search by name or keyword
              </label>
              <input
                id="search"
                type="text"
                placeholder="Enter operator name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="city" className={styles.label}>
                Select City/District
              </label>
              <select
                id="city"
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className={styles.select}
              >
                <option value="">All Cities</option>
                {CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="category" className={styles.label}>
                Tour Type
              </label>
              <select
                id="category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={styles.select}
              >
                <option value="">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <button
                type="submit"
                disabled={loading}
                className={styles.searchButton}
              >
                {loading ? 'Searching...' : 'Search Operators'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.resultsSection}>
        {results.length > 0 ? (
          <div>
            <h2 className={styles.resultsTitle}>
              Found {results.length} operator{results.length !== 1 ? 's' : ''}
            </h2>
            <div className={styles.operatorGrid}>
              {results.map((operator) => (
                <div key={operator.id} className={styles.operatorCard}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.operatorName}>{operator.name}</h3>
                    {operator.rating && (
                      <span className={styles.rating}>
                        {'★'.repeat(Math.floor(operator.rating))}
                      </span>
                    )}
                  </div>

                  {operator.description && (
                    <p className={styles.description}>{operator.description}</p>
                  )}

                  <div className={styles.meta}>
                    {operator.city && (
                      <span className={styles.metaItem}>
                        <strong>City:</strong> {operator.city}
                      </span>
                    )}
                    {operator.category && (
                      <span className={styles.metaItem}>
                        <strong>Category:</strong> {operator.category}
                      </span>
                    )}
                  </div>

                  <div className={styles.contactSection}>
                    {operator.phone && (
                      <a href={`tel:${operator.phone}`} className={styles.contactBtn}>
                        Call: {operator.phone}
                      </a>
                    )}
                    {operator.email && (
                      <a
                        href={`mailto:${operator.email}`}
                        className={styles.contactBtn}
                      >
                        Email
                      </a>
                    )}
                    {operator.website && (
                      <a
                        href={operator.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.contactBtn}
                      >
                        Website
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          !loading && (
            <div className={styles.emptyState}>
              <p>Search for tour operators by name, location, or tour type.</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
