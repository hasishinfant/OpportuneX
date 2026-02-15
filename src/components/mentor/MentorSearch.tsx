'use client';

import type { MentorMatch } from '@/types/mentor-matching';
import { useState } from 'react';

interface MentorSearchProps {
  onSelectMentor: (mentorId: string) => void;
}

export default function MentorSearch({ onSelectMentor }: MentorSearchProps) {
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<MentorMatch[]>([]);
  const [filters, setFilters] = useState({
    skills: [] as string[],
    domains: [] as string[],
    languages: [] as string[],
    minRating: 0,
  });
  const [skillInput, setSkillInput] = useState('');
  const [domainInput, setDomainInput] = useState('');

  const handleSearch = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/mentor/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(filters),
      });

      if (response.ok) {
        const data = await response.json();
        setMatches(data);
      }
    } catch (error) {
      console.error('Error searching mentors:', error);
    } finally {
      setLoading(false);
    }
  };

  const addSkill = () => {
    if (skillInput && !filters.skills.includes(skillInput)) {
      setFilters({ ...filters, skills: [...filters.skills, skillInput] });
      setSkillInput('');
    }
  };

  const addDomain = () => {
    if (domainInput && !filters.domains.includes(domainInput)) {
      setFilters({ ...filters, domains: [...filters.domains, domainInput] });
      setDomainInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setFilters({
      ...filters,
      skills: filters.skills.filter(s => s !== skill),
    });
  };

  const removeDomain = (domain: string) => {
    setFilters({
      ...filters,
      domains: filters.domains.filter(d => d !== domain),
    });
  };

  return (
    <div className='mentor-search'>
      <div className='search-filters'>
        <h2>Find Your Mentor</h2>

        {/* Skills Filter */}
        <div className='filter-group'>
          <label>Skills</label>
          <div className='input-with-button'>
            <input
              type='text'
              value={skillInput}
              onChange={e => setSkillInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && addSkill()}
              placeholder='e.g., React, Python, Machine Learning'
            />
            <button onClick={addSkill} type='button'>
              Add
            </button>
          </div>
          <div className='tags'>
            {filters.skills.map(skill => (
              <span key={skill} className='tag'>
                {skill}
                <button onClick={() => removeSkill(skill)}>&times;</button>
              </span>
            ))}
          </div>
        </div>

        {/* Domains Filter */}
        <div className='filter-group'>
          <label>Domains</label>
          <div className='input-with-button'>
            <input
              type='text'
              value={domainInput}
              onChange={e => setDomainInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && addDomain()}
              placeholder='e.g., Web Development, Data Science'
            />
            <button onClick={addDomain} type='button'>
              Add
            </button>
          </div>
          <div className='tags'>
            {filters.domains.map(domain => (
              <span key={domain} className='tag'>
                {domain}
                <button onClick={() => removeDomain(domain)}>&times;</button>
              </span>
            ))}
          </div>
        </div>

        {/* Languages Filter */}
        <div className='filter-group'>
          <label>Languages</label>
          <select
            multiple
            value={filters.languages}
            onChange={e =>
              setFilters({
                ...filters,
                languages: Array.from(
                  e.target.selectedOptions,
                  opt => opt.value
                ),
              })
            }
          >
            <option value='English'>English</option>
            <option value='Hindi'>Hindi</option>
            <option value='Tamil'>Tamil</option>
            <option value='Telugu'>Telugu</option>
            <option value='Bengali'>Bengali</option>
          </select>
        </div>

        {/* Rating Filter */}
        <div className='filter-group'>
          <label>Minimum Rating</label>
          <input
            type='range'
            min='0'
            max='5'
            step='0.5'
            value={filters.minRating}
            onChange={e =>
              setFilters({ ...filters, minRating: parseFloat(e.target.value) })
            }
          />
          <span>{filters.minRating} stars</span>
        </div>

        <button
          onClick={handleSearch}
          disabled={loading}
          className='search-button'
        >
          {loading ? 'Searching...' : 'Find Mentors'}
        </button>
      </div>

      {/* Results */}
      <div className='search-results'>
        {matches.length === 0 && !loading && (
          <p className='no-results'>
            No mentors found. Try adjusting your filters.
          </p>
        )}

        {matches.map(match => (
          <div key={match.mentor.id} className='mentor-card'>
            <div className='mentor-header'>
              <div className='mentor-info'>
                <h3>{match.mentor.currentRole || 'Mentor'}</h3>
                {match.mentor.currentCompany && (
                  <p className='company'>{match.mentor.currentCompany}</p>
                )}
                <div className='rating'>
                  <span className='stars'>
                    {'★'.repeat(Math.round(match.mentor.averageRating))}
                    {'☆'.repeat(5 - Math.round(match.mentor.averageRating))}
                  </span>
                  <span className='rating-value'>
                    {match.mentor.averageRating.toFixed(1)}
                  </span>
                  <span className='sessions'>
                    ({match.mentor.totalSessions} sessions)
                  </span>
                </div>
              </div>
              <div className='match-score'>
                <div className='score-circle'>
                  <span className='score'>{Math.round(match.matchScore)}%</span>
                  <span className='label'>Match</span>
                </div>
              </div>
            </div>

            <div className='mentor-details'>
              <p className='bio'>{match.mentor.bio}</p>

              <div className='expertise'>
                <strong>Expertise:</strong>
                <div className='tags'>
                  {match.mentor.expertiseAreas.slice(0, 5).map(skill => (
                    <span key={skill} className='tag'>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className='domains'>
                <strong>Domains:</strong>
                <div className='tags'>
                  {match.mentor.domains.slice(0, 3).map(domain => (
                    <span key={domain} className='tag'>
                      {domain}
                    </span>
                  ))}
                </div>
              </div>

              <div className='languages'>
                <strong>Languages:</strong> {match.mentor.languages.join(', ')}
              </div>

              <div className='match-reasoning'>
                <strong>Why this match:</strong> {match.reasoning}
              </div>

              {match.availableSlots && match.availableSlots.length > 0 && (
                <div className='availability'>
                  <strong>Available:</strong>
                  {match.availableSlots.slice(0, 3).map((slot, idx) => (
                    <span key={idx} className='time-slot'>
                      {
                        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][
                          slot.dayOfWeek
                        ]
                      }{' '}
                      {slot.startTime}-{slot.endTime}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className='mentor-actions'>
              <button
                onClick={() => onSelectMentor(match.mentor.id)}
                className='primary-button'
              >
                Request Mentorship
              </button>
              <button className='secondary-button'>View Profile</button>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .mentor-search {
          display: grid;
          grid-template-columns: 300px 1fr;
          gap: 2rem;
          padding: 2rem;
        }

        .search-filters {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          height: fit-content;
          position: sticky;
          top: 2rem;
        }

        .search-filters h2 {
          margin: 0 0 1.5rem 0;
          font-size: 1.5rem;
        }

        .filter-group {
          margin-bottom: 1.5rem;
        }

        .filter-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }

        .input-with-button {
          display: flex;
          gap: 0.5rem;
        }

        .input-with-button input {
          flex: 1;
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .input-with-button button {
          padding: 0.5rem 1rem;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .tag {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.75rem;
          background: #e9ecef;
          border-radius: 16px;
          font-size: 0.875rem;
        }

        .tag button {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1.25rem;
          line-height: 1;
          padding: 0;
          margin-left: 0.25rem;
        }

        select {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        input[type='range'] {
          width: 100%;
        }

        .search-button {
          width: 100%;
          padding: 0.75rem;
          background: #28a745;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          cursor: pointer;
          margin-top: 1rem;
        }

        .search-button:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }

        .search-results {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .no-results {
          text-align: center;
          padding: 3rem;
          color: #6c757d;
        }

        .mentor-card {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .mentor-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 1rem;
        }

        .mentor-info h3 {
          margin: 0 0 0.25rem 0;
          font-size: 1.25rem;
        }

        .company {
          color: #6c757d;
          margin: 0 0 0.5rem 0;
        }

        .rating {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .stars {
          color: #ffc107;
          font-size: 1.25rem;
        }

        .rating-value {
          font-weight: 600;
        }

        .sessions {
          color: #6c757d;
          font-size: 0.875rem;
        }

        .match-score {
          text-align: center;
        }

        .score-circle {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .score {
          font-size: 1.5rem;
          font-weight: 700;
        }

        .label {
          font-size: 0.75rem;
        }

        .mentor-details {
          margin: 1rem 0;
        }

        .mentor-details > div {
          margin-bottom: 0.75rem;
        }

        .bio {
          color: #495057;
          line-height: 1.6;
        }

        .match-reasoning {
          padding: 0.75rem;
          background: #f8f9fa;
          border-radius: 4px;
          font-size: 0.875rem;
        }

        .availability {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          align-items: center;
        }

        .time-slot {
          padding: 0.25rem 0.75rem;
          background: #e7f3ff;
          border-radius: 4px;
          font-size: 0.875rem;
        }

        .mentor-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }

        .primary-button,
        .secondary-button {
          flex: 1;
          padding: 0.75rem;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          cursor: pointer;
        }

        .primary-button {
          background: #007bff;
          color: white;
        }

        .secondary-button {
          background: white;
          color: #007bff;
          border: 1px solid #007bff;
        }

        @media (max-width: 768px) {
          .mentor-search {
            grid-template-columns: 1fr;
          }

          .search-filters {
            position: static;
          }
        }
      `}</style>
    </div>
  );
}
