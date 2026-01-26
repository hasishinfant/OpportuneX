import React from 'react';
import { Filters } from '../App';
import './FilterSidebar.css';

interface FilterSidebarProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({ filters, onFilterChange }) => {
  const handleFilterChange = (key: keyof Filters, value: string) => {
    onFilterChange({
      ...filters,
      [key]: value
    });
  };

  const clearFilters = () => {
    onFilterChange({
      skills: '',
      mode: 'any',
      location: '',
      type: 'all'
    });
  };

  return (
    <div className="filter-sidebar">
      <div className="filter-header">
        <h3>Filters</h3>
        <button className="clear-filters" onClick={clearFilters}>
          Clear All
        </button>
      </div>

      <div className="filter-group">
        <label className="filter-label">Type</label>
        <select
          value={filters.type}
          onChange={(e) => handleFilterChange('type', e.target.value)}
          className="filter-select"
        >
          <option value="all">All Types</option>
          <option value="hackathon">Hackathons</option>
          <option value="internship">Internships</option>
          <option value="workshop">Workshops</option>
        </select>
      </div>

      <div className="filter-group">
        <label className="filter-label">Mode</label>
        <select
          value={filters.mode}
          onChange={(e) => handleFilterChange('mode', e.target.value)}
          className="filter-select"
        >
          <option value="any">Any Mode</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
          <option value="hybrid">Hybrid</option>
        </select>
      </div>

      <div className="filter-group">
        <label className="filter-label">Skills</label>
        <input
          type="text"
          placeholder="e.g., React, Python, AI"
          value={filters.skills}
          onChange={(e) => handleFilterChange('skills', e.target.value)}
          className="filter-input"
        />
        <small className="filter-hint">Separate multiple skills with commas</small>
      </div>

      <div className="filter-group">
        <label className="filter-label">Location</label>
        <input
          type="text"
          placeholder="e.g., Mumbai, Delhi, Remote"
          value={filters.location}
          onChange={(e) => handleFilterChange('location', e.target.value)}
          className="filter-input"
        />
      </div>

      <div className="popular-searches">
        <h4>Popular Searches</h4>
        <div className="search-tags">
          <button 
            className="search-tag"
            onClick={() => handleFilterChange('skills', 'React')}
          >
            React
          </button>
          <button 
            className="search-tag"
            onClick={() => handleFilterChange('skills', 'Python')}
          >
            Python
          </button>
          <button 
            className="search-tag"
            onClick={() => handleFilterChange('skills', 'AI')}
          >
            AI/ML
          </button>
          <button 
            className="search-tag"
            onClick={() => handleFilterChange('skills', 'Data Science')}
          >
            Data Science
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterSidebar;