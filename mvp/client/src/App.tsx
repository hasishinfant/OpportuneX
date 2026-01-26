import { useEffect, useState } from 'react';
import './App.css';
import FilterSidebar from './components/FilterSidebar';
import OpportunityCard from './components/OpportunityCard';
import RoadmapModal from './components/RoadmapModal';
import SearchBar from './components/SearchBar';

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  type: 'hackathon' | 'internship' | 'workshop';
  organizer: {
    name: string;
    type: 'corporate' | 'startup' | 'government' | 'academic';
    logo: string;
  };
  requirements: {
    skills: string[];
    experience: string;
    eligibility: string[];
  };
  details: {
    mode: 'online' | 'offline' | 'hybrid';
    location?: string;
    duration?: string;
    stipend?: string;
    prizes?: string[];
  };
  timeline: {
    applicationDeadline: string;
    startDate: string;
    endDate?: string;
  };
  externalUrl: string;
  platform: string;
  tags: string[];
}

export interface Filters {
  skills: string;
  mode: string;
  location: string;
  type: string;
}

function App() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Filters>({
    skills: '',
    mode: 'any',
    location: '',
    type: 'all'
  });
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [showRoadmap, setShowRoadmap] = useState(false);

  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('query', searchQuery);
      if (filters.skills) params.append('skills', filters.skills);
      if (filters.mode !== 'any') params.append('mode', filters.mode);
      if (filters.location) params.append('location', filters.location);
      if (filters.type !== 'all') params.append('type', filters.type);

      const response = await fetch(`/api/opportunities?${params.toString()}`);
      const data = await response.json();
      setOpportunities(data.opportunities);
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, [searchQuery, filters]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleFilterChange = (newFilters: Filters) => {
    setFilters(newFilters);
  };

  const handleGuideMe = (opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity);
    setShowRoadmap(true);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="container">
          <h1 className="logo">
            <span className="logo-icon">🎯</span>
            OpportuneX
          </h1>
          <p className="tagline">Discover your next opportunity with AI-powered search</p>
        </div>
      </header>

      <main className="main-content">
        <div className="container">
          <div className="search-section">
            <SearchBar onSearch={handleSearch} />
            <p className="search-hint">
              Try: "AI hackathons in Mumbai" or "React internships" or "data science workshops"
            </p>
          </div>

          <div className="content-wrapper">
            <FilterSidebar filters={filters} onFilterChange={handleFilterChange} />
            
            <div className="opportunities-section">
              {loading ? (
                <div className="loading">
                  <div className="spinner"></div>
                  <p>Finding opportunities for you...</p>
                </div>
              ) : (
                <>
                  <div className="results-header">
                    <h2>
                      {opportunities.length} {opportunities.length === 1 ? 'opportunity' : 'opportunities'} found
                    </h2>
                  </div>
                  
                  <div className="opportunities-grid">
                    {opportunities.map((opportunity) => (
                      <OpportunityCard
                        key={opportunity.id}
                        opportunity={opportunity}
                        onGuideMe={handleGuideMe}
                      />
                    ))}
                  </div>
                  
                  {opportunities.length === 0 && (
                    <div className="no-results">
                      <div className="no-results-icon">🔍</div>
                      <h3>No opportunities found</h3>
                      <p>Try adjusting your search terms or filters</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {showRoadmap && selectedOpportunity && (
        <RoadmapModal
          opportunity={selectedOpportunity}
          onClose={() => setShowRoadmap(false)}
        />
      )}
    </div>
  );
}

export default App;