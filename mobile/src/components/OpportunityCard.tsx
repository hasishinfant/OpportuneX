import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { Opportunity } from '../types';

interface OpportunityCardProps {
  opportunity: Opportunity;
  navigation?: any;
}

export default function OpportunityCard({
  opportunity,
  navigation,
}: OpportunityCardProps) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'hackathon':
        return '#3B82F6';
      case 'internship':
        return '#10B981';
      case 'workshop':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'hackathon':
        return 'code-slash';
      case 'internship':
        return 'briefcase';
      case 'workshop':
        return 'school';
      default:
        return 'document';
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'online':
        return 'globe-outline';
      case 'offline':
        return 'location-outline';
      case 'hybrid':
        return 'git-merge-outline';
      default:
        return 'help-outline';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleOpenUrl = () => {
    Linking.openURL(opportunity.externalUrl);
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handleOpenUrl}>
      <View style={styles.header}>
        <View
          style={[
            styles.typeBadge,
            { backgroundColor: getTypeColor(opportunity.type) },
          ]}
        >
          <Ionicons
            name={getTypeIcon(opportunity.type) as any}
            size={16}
            color='#fff'
          />
          <Text style={styles.typeText}>{opportunity.type}</Text>
        </View>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {opportunity.title}
      </Text>

      <Text style={styles.organizer}>{opportunity.organizer.name}</Text>

      <Text style={styles.description} numberOfLines={3}>
        {opportunity.description}
      </Text>

      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Ionicons
            name={getModeIcon(opportunity.details.mode)}
            size={16}
            color='#6B7280'
          />
          <Text style={styles.detailText}>{opportunity.details.mode}</Text>
        </View>

        {opportunity.details.location && (
          <View style={styles.detailItem}>
            <Ionicons name='location-outline' size={16} color='#6B7280' />
            <Text style={styles.detailText} numberOfLines={1}>
              {opportunity.details.location}
            </Text>
          </View>
        )}

        <View style={styles.detailItem}>
          <Ionicons name='calendar-outline' size={16} color='#6B7280' />
          <Text style={styles.detailText}>
            {formatDate(opportunity.timeline.applicationDeadline)}
          </Text>
        </View>
      </View>

      {opportunity.requirements.skills.length > 0 && (
        <View style={styles.skills}>
          {opportunity.requirements.skills.slice(0, 3).map((skill, index) => (
            <View key={index} style={styles.skillBadge}>
              <Text style={styles.skillText}>{skill}</Text>
            </View>
          ))}
          {opportunity.requirements.skills.length > 3 && (
            <Text style={styles.moreSkills}>
              +{opportunity.requirements.skills.length - 3} more
            </Text>
          )}
        </View>
      )}

      <View style={styles.footer}>
        <TouchableOpacity style={styles.applyButton} onPress={handleOpenUrl}>
          <Text style={styles.applyButtonText}>View Details</Text>
          <Ionicons name='arrow-forward' size={16} color='#fff' />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  typeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  organizer: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  details: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
  },
  skills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  skillBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  skillText: {
    fontSize: 11,
    color: '#374151',
  },
  moreSkills: {
    fontSize: 11,
    color: '#6B7280',
    alignSelf: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  applyButton: {
    flexDirection: 'row',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    gap: 6,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
