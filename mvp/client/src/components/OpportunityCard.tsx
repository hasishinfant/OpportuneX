import React from 'react';
import { Opportunity } from '../App';
import './OpportunityCard.css';

interface OpportunityCardProps {
  opportunity: Opportunity;
  onGuideMe: (opportunity: Opportunity) => void;
}

const OpportunityCard: React.FC<OpportunityCardProps> = ({ opportunity, onGuideMe }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'hackathon': return '🏆';
      case 'internship': return '💼';
      case 'workshop': return '🎓';
      default: return '📋';
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'online': return '💻';
      case 'offline': return '🏢';
      case 'hybrid': return '🔄';
      default: return '📍';
    }
  };

  const isDeadlineSoon = () => {
    const deadline = new Date(opportunity.timeline.applicationDeadline);
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays > 0;
  };

  return (
    <div className="opportunity-card">
      <div className="card-header">
        <div className="organizer-info">
          <span className="organizer-logo">{opportunity.organizer.logo}</span>
          <div>
            <h3 className="opportunity-title">{opportunity.title}</h3>
            <p className="organizer-name">{opportunity.organizer.name}</p>
          </div>
        </div>
        <div className="opportunity-type">
          <span className="type-icon">{getTypeIcon(opportunity.type)}</span>
          <span className="type-text">{opportunity.type}</span>
        </div>
      </div>

      <p className="opportunity-description">{opportunity.description}</p>

      <div className="opportunity-details">
        <div className="detail-item">
          <span className="detail-icon">{getModeIcon(opportunity.details.mode)}</span>
          <span>{opportunity.details.mode}</span>
          {opportunity.details.location && (
            <span className="location"> • {opportunity.details.location}</span>
          )}
        </div>
        
        {opportunity.details.duration && (
          <div className="detail-item">
            <span className="detail-icon">⏱️</span>
            <span>{opportunity.details.duration}</span>
          </div>
        )}

        {opportunity.details.stipend && (
          <div className="detail-item">
            <span className="detail-icon">💰</span>
            <span>{opportunity.details.stipend}</span>
          </div>
        )}

        {opportunity.details.prizes && opportunity.details.prizes.length > 0 && (
          <div className="detail-item">
            <span className="detail-icon">🏆</span>
            <span>Prizes: {opportunity.details.prizes.join(', ')}</span>
          </div>
        )}
      </div>

      <div className="skills-section">
        <h4>Required Skills:</h4>
        <div className="skills-list">
          {opportunity.requirements.skills.map((skill, index) => (
            <span key={index} className="skill-tag">{skill}</span>
          ))}
        </div>
      </div>

      <div className="deadline-section">
        <div className={`deadline ${isDeadlineSoon() ? 'deadline-urgent' : ''}`}>
          <span className="deadline-icon">📅</span>
          <span>
            Deadline: {formatDate(opportunity.timeline.applicationDeadline)}
            {isDeadlineSoon() && <span className="urgent-text"> (Soon!)</span>}
          </span>
        </div>
      </div>

      <div className="platform-info">
        <span className="platform-tag">
          📱 {opportunity.platform}
        </span>
      </div>

      <div className="card-actions">
        <button 
          className="guide-button"
          onClick={() => onGuideMe(opportunity)}
        >
          <span className="button-icon">🤖</span>
          Guide Me
        </button>
        <a 
          href={opportunity.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="apply-button"
        >
          <span className="button-icon">🔗</span>
          View on Platform
        </a>
      </div>
    </div>
  );
};

export default OpportunityCard;