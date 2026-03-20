import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FaSearch, FaFilter, FaTimes, FaMapMarkerAlt, FaVenusMars, FaUserCheck, FaUserPlus, FaSpinner } from 'react-icons/fa';
import Clientdatacard from './Clientdatacard';
import './clientdatacards.css';

// Types based on API response
interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

interface Bio {
  age: number | null;
  gender: string | null;
  country: string | null;
  county: string | null;
  location_desc: string | null;
  info: string | null;
  phone_number: string | null;
  occupation: string | null;
  interests: string | null;
  uploaded_img: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

interface Profile {
  id: number;
  user: User;
  bio: Bio | null;
  full_name: string;
  has_image: boolean;
  has_bio: boolean;
  profile_completion_percentage: number;
  created_at: string;
  updated_at: string;
}

interface ApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Profile[];
}

type FilterGender = 'all' | 'male' | 'female' | 'other' | 'nonbinary' | 'prefer_not_say';
type SortOption = 'default' | 'name_asc' | 'name_desc' | 'age_asc' | 'age_desc' | 'completion_asc' | 'completion_desc';

const Clientdatacards: React.FC = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterGender, setFilterGender] = useState<FilterGender>('all');
  const [filterCountry, setFilterCountry] = useState<string>('all');
  const [filterCounty, setFilterCounty] = useState<string>('all');
  const [showOnlyWithImages, setShowOnlyWithImages] = useState<boolean>(false);
  const [showOnlyWithBio, setShowOnlyWithBio] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [ageRange, setAgeRange] = useState<{ min: number; max: number }>({ min: 18, max: 100 });
  const [sortBy, setSortBy] = useState<SortOption>('default');

  // Fetch profiles data
  const { data, isLoading, error, refetch, isFetching } = useQuery<ApiResponse>({
    queryKey: ['profiles'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/profiles/all-profiles/`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch profiles');
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Extract unique countries and counties from data
  const { countries, counties } = useMemo(() => {
    if (!data?.results) return { countries: [], counties: [] };
    
    const countrySet = new Set<string>();
    const countySet = new Set<string>();
    
    data.results.forEach(profile => {
      if (profile.bio?.country) {
        countrySet.add(profile.bio.country);
      }
      if (profile.bio?.county) {
        countySet.add(profile.bio.county);
      }
    });
    
    return {
      countries: Array.from(countrySet).sort(),
      counties: Array.from(countySet).sort()
    };
  }, [data?.results]);

  // Filter and sort profiles - WITH BIO PROFILES PRIORITIZED
  const filteredAndSortedProfiles = useMemo(() => {
    if (!data?.results) return [];

    // First, filter profiles
    let filtered = [...data.results];

    // Search by name
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(profile =>
        profile.full_name.toLowerCase().includes(searchLower)
      );
    }

    // Filter by gender
    if (filterGender !== 'all') {
      filtered = filtered.filter(profile =>
        profile.bio?.gender === filterGender
      );
    }

    // Filter by country
    if (filterCountry !== 'all') {
      filtered = filtered.filter(profile =>
        profile.bio?.country === filterCountry
      );
    }

    // Filter by county
    if (filterCounty !== 'all') {
      filtered = filtered.filter(profile =>
        profile.bio?.county === filterCounty
      );
    }

    // Filter by age range
    filtered = filtered.filter(profile => {
      const age = profile.bio?.age;
      if (!age) return true;
      return age >= ageRange.min && age <= ageRange.max;
    });

    // Filter by has image
    if (showOnlyWithImages) {
      filtered = filtered.filter(profile => profile.has_image);
    }

    // Filter by has bio
    if (showOnlyWithBio) {
      filtered = filtered.filter(profile => profile.has_bio);
    }

    // Apply sorting based on user selection
    if (sortBy !== 'default') {
      filtered.sort((a, b) => {
        switch (sortBy) {
          case 'name_asc':
            return a.full_name.localeCompare(b.full_name);
          case 'name_desc':
            return b.full_name.localeCompare(a.full_name);
          case 'age_asc':
            return (a.bio?.age || 0) - (b.bio?.age || 0);
          case 'age_desc':
            return (b.bio?.age || 0) - (a.bio?.age || 0);
          case 'completion_asc':
            return a.profile_completion_percentage - b.profile_completion_percentage;
          case 'completion_desc':
            return b.profile_completion_percentage - a.profile_completion_percentage;
          default:
            return 0;
        }
      });
    } else {
      // DEFAULT ORDER: Profiles with bios (completed) first, then incomplete profiles
      // Within each group, maintain the original backend order
      filtered.sort((a, b) => {
        // Prioritize profiles with bios (has_bio = true)
        if (a.has_bio && !b.has_bio) return -1;
        if (!a.has_bio && b.has_bio) return 1;
        
        // If both have bio or both don't have bio, maintain original order
        // by comparing their original indices in the data.results array
        const indexA = data.results.findIndex(p => p.id === a.id);
        const indexB = data.results.findIndex(p => p.id === b.id);
        return indexA - indexB;
      });
    }

    return filtered;
  }, [data?.results, searchTerm, filterGender, filterCountry, filterCounty, showOnlyWithImages, showOnlyWithBio, ageRange, sortBy]);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm) count++;
    if (filterGender !== 'all') count++;
    if (filterCountry !== 'all') count++;
    if (filterCounty !== 'all') count++;
    if (showOnlyWithImages) count++;
    if (showOnlyWithBio) count++;
    if (ageRange.min !== 18 || ageRange.max !== 100) count++;
    if (sortBy !== 'default') count++;
    return count;
  }, [searchTerm, filterGender, filterCountry, filterCounty, showOnlyWithImages, showOnlyWithBio, ageRange, sortBy]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setFilterGender('all');
    setFilterCountry('all');
    setFilterCounty('all');
    setShowOnlyWithImages(false);
    setShowOnlyWithBio(false);
    setAgeRange({ min: 18, max: 100 });
    setSortBy('default');
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Count profiles with bios for display
  const profilesWithBio = useMemo(() => {
    return filteredAndSortedProfiles.filter(p => p.has_bio).length;
  }, [filteredAndSortedProfiles]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="cds-modern-loading">
        <div className="cds-loading-skeleton">
          <div className="cds-skeleton-header"></div>
          <div className="cds-skeleton-filters"></div>
          <div className="cds-skeleton-grid">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="cds-skeleton-card">
                <div className="cds-skeleton-image"></div>
                <div className="cds-skeleton-content"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="cds-modern-error">
        <div className="cds-modern-error-card">
          <span className="cds-modern-error-icon">💔</span>
          <h3>Unable to Load Profiles</h3>
          <p>There was an error loading profiles. Please try again.</p>
          <button className="cds-modern-retry-btn" onClick={handleRefresh}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cds-modern-container">
      {/* Hero Header Section */}
      <div className="cds-hero-section">
        <div className="cds-hero-content">
          <h1 className="cds-hero-title">
            <span className="cds-hero-icon">✨</span>
            Discover Matches
            <span className="cds-hero-icon">✨</span>
          </h1>
          <p className="cds-hero-subtitle">
            Find your perfect connection among <strong>{data?.count || 0}</strong> amazing profiles
          </p>
        </div>
        
        <div className="cds-hero-actions">
          <button 
            className={`cds-filter-toggle ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <FaFilter />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
            {activeFiltersCount > 0 && (
              <span className="cds-filter-badge">{activeFiltersCount}</span>
            )}
          </button>
          
          <button className="cds-refresh-btn" onClick={handleRefresh} disabled={isFetching}>
            {isFetching ? <FaSpinner className="cds-spin" /> : '⟳'}
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Search and Sort Bar */}
      <div className="cds-search-section">
        <div className="cds-search-wrapper">
          <FaSearch className="cds-search-icon" />
          <input
            type="text"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="cds-search-input"
          />
          {searchTerm && (
            <button className="cds-clear-search" onClick={() => setSearchTerm('')}>
              <FaTimes />
            </button>
          )}
        </div>
        
        {/* Sort Dropdown */}
        <div className="cds-sort-wrapper">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="cds-sort-select"
          >
            <option value="default">Default (Completed First)</option>
            <option value="name_asc">Name (A-Z)</option>
            <option value="name_desc">Name (Z-A)</option>
            <option value="age_asc">Age (Youngest First)</option>
            <option value="age_desc">Age (Oldest First)</option>
            <option value="completion_asc">Completion (Low to High)</option>
            <option value="completion_desc">Completion (High to Low)</option>
          </select>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="cds-filters-panel">
          <div className="cds-filters-grid">
            {/* Gender Filter */}
            <div className="cds-filter-group">
              <label className="cds-filter-label">
                <FaVenusMars /> Gender
              </label>
              <select
                value={filterGender}
                onChange={(e) => setFilterGender(e.target.value as FilterGender)}
                className="cds-filter-select"
              >
                <option value="all">All Genders</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="nonbinary">Non-binary</option>
                <option value="prefer_not_say">Prefer not to say</option>
              </select>
            </div>

            {/* Country Filter */}
            <div className="cds-filter-group">
              <label className="cds-filter-label">
                <FaMapMarkerAlt /> Country
              </label>
              <select
                value={filterCountry}
                onChange={(e) => {
                  setFilterCountry(e.target.value);
                  setFilterCounty('all');
                }}
                className="cds-filter-select"
              >
                <option value="all">All Countries</option>
                {countries.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>

            {/* County Filter */}
            <div className="cds-filter-group">
              <label className="cds-filter-label">
                <FaMapMarkerAlt /> County
              </label>
              <select
                value={filterCounty}
                onChange={(e) => setFilterCounty(e.target.value)}
                className="cds-filter-select"
                disabled={filterCountry === 'all'}
              >
                <option value="all">All Counties</option>
                {counties.map(county => (
                  <option key={county} value={county}>{county}</option>
                ))}
              </select>
            </div>

            {/* Age Range Filter */}
            <div className="cds-filter-group">
              <label className="cds-filter-label">
                🎂 Age Range
              </label>
              <div className="cds-age-range">
                <input
                  type="number"
                  value={ageRange.min}
                  onChange={(e) => setAgeRange({ ...ageRange, min: Math.min(Number(e.target.value), ageRange.max) })}
                  min={18}
                  max={100}
                  className="cds-age-input"
                />
                <span>to</span>
                <input
                  type="number"
                  value={ageRange.max}
                  onChange={(e) => setAgeRange({ ...ageRange, max: Math.max(Number(e.target.value), ageRange.min) })}
                  min={ageRange.min}
                  max={100}
                  className="cds-age-input"
                />
              </div>
            </div>

            {/* Toggle Filters */}
            <div className="cds-filter-group cds-toggle-group">
              <label className="cds-checkbox-label">
                <input
                  type="checkbox"
                  checked={showOnlyWithImages}
                  onChange={(e) => setShowOnlyWithImages(e.target.checked)}
                />
                <FaUserCheck /> With Photos
              </label>
              <label className="cds-checkbox-label">
                <input
                  type="checkbox"
                  checked={showOnlyWithBio}
                  onChange={(e) => setShowOnlyWithBio(e.target.checked)}
                />
                <FaUserPlus /> With Bio
              </label>
            </div>
          </div>

          {/* Filter Actions */}
          {activeFiltersCount > 0 && (
            <div className="cds-filters-actions">
              <button className="cds-clear-filters-btn" onClick={clearFilters}>
                Clear All Filters ({activeFiltersCount})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Active Filters Tags */}
      {activeFiltersCount > 0 && (
        <div className="cds-active-filters">
          <span className="cds-active-label">Active filters:</span>
          {filterGender !== 'all' && (
            <span className="cds-filter-tag">
              Gender: {filterGender}
              <button onClick={() => setFilterGender('all')}>×</button>
            </span>
          )}
          {filterCountry !== 'all' && (
            <span className="cds-filter-tag">
              Country: {filterCountry}
              <button onClick={() => setFilterCountry('all')}>×</button>
            </span>
          )}
          {filterCounty !== 'all' && (
            <span className="cds-filter-tag">
              County: {filterCounty}
              <button onClick={() => setFilterCounty('all')}>×</button>
            </span>
          )}
          {(ageRange.min !== 18 || ageRange.max !== 100) && (
            <span className="cds-filter-tag">
              Age: {ageRange.min}-{ageRange.max}
              <button onClick={() => setAgeRange({ min: 18, max: 100 })}>×</button>
            </span>
          )}
          {showOnlyWithImages && (
            <span className="cds-filter-tag">
              With Photos
              <button onClick={() => setShowOnlyWithImages(false)}>×</button>
            </span>
          )}
          {showOnlyWithBio && (
            <span className="cds-filter-tag">
              With Bio
              <button onClick={() => setShowOnlyWithBio(false)}>×</button>
            </span>
          )}
          {searchTerm && (
            <span className="cds-filter-tag">
              "{searchTerm}"
              <button onClick={() => setSearchTerm('')}>×</button>
            </span>
          )}
          {sortBy !== 'default' && (
            <span className="cds-filter-tag">
              Sort: {sortBy.replace('_', ' ')}
              <button onClick={() => setSortBy('default')}>×</button>
            </span>
          )}
          <button className="cds-clear-all" onClick={clearFilters}>
            Clear all
          </button>
        </div>
      )}

      {/* Results Stats */}
      <div className="cds-results-stats">
        <span className="cds-results-count">
          <strong>{filteredAndSortedProfiles.length}</strong> {filteredAndSortedProfiles.length === 1 ? 'profile' : 'profiles'} found
        </span>
        {filteredAndSortedProfiles.length !== data?.count && (
          <span className="cds-results-filtered">
            (filtered from {data?.count} total)
          </span>
        )}
        {profilesWithBio > 0 && sortBy === 'default' && (
          <span className="cds-results-badge">
            ✨ {profilesWithBio} completed {profilesWithBio === 1 ? 'profile' : 'profiles'} shown first
          </span>
        )}
        {sortBy !== 'default' && (
          <span className="cds-results-sort">
            • Sorted by {sortBy.replace('_', ' ')}
          </span>
        )}
      </div>

      {/* Cards Grid */}
      {filteredAndSortedProfiles.length === 0 ? (
        <div className="cds-empty-state">
          <div className="cds-empty-content">
            <span className="cds-empty-icon">🔍</span>
            <h3>No matches found</h3>
            <p>We couldn't find any profiles matching your criteria</p>
            <button className="cds-empty-btn" onClick={clearFilters}>
              Clear All Filters
            </button>
          </div>
        </div>
      ) : (
        <div className="cds-grid">
          {filteredAndSortedProfiles.map((profile) => (
            <Clientdatacard
              key={profile.id}
              id={profile.id.toString()}
              name={profile.full_name}
              age={profile.bio?.age || null}
              gender={profile.bio?.gender || null}
              country={profile.bio?.country || null}
              county={profile.bio?.county || null}
              location={profile.bio?.location_desc || null}
              occupation={profile.bio?.occupation || null}
              interests={profile.bio?.interests || null}
              image={profile.bio?.uploaded_img || null}
              info={profile.bio?.info || null}
              hasImage={profile.has_image}
              hasBio={profile.has_bio}
              completionPercentage={profile.profile_completion_percentage}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Clientdatacards;