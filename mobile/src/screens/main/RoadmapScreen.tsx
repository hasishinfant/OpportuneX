import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { API_ENDPOINTS } from '../../config/api';
import { apiService } from '../../services/api.service';
import type { Roadmap } from '../../types';

export default function RoadmapScreen({ navigation }: any) {
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRoadmaps();
  }, []);

  const loadRoadmaps = async () => {
    try {
      const response: any = await apiService.get(API_ENDPOINTS.ROADMAPS);
      if (response.success) {
        setRoadmaps(response.data || []);
      }
    } catch (error) {
      console.error('Load roadmaps error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateRoadmap = () => {
    Alert.alert(
      'Generate Roadmap',
      'Select an opportunity from the search to generate a personalized preparation roadmap.',
      [{ text: 'OK' }]
    );
  };

  const renderRoadmapCard = ({ item }: { item: Roadmap }) => (
    <TouchableOpacity style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name='map' size={24} color='#3B82F6' />
        <Text style={styles.cardTitle}>{item.title}</Text>
      </View>
      <Text style={styles.cardDescription} numberOfLines={2}>
        {item.description}
      </Text>
      <View style={styles.cardFooter}>
        <View style={styles.badge}>
          <Ionicons name='time-outline' size={16} color='#6B7280' />
          <Text style={styles.badgeText}>{item.estimatedDuration} days</Text>
        </View>
        <View style={styles.badge}>
          <Ionicons name='list-outline' size={16} color='#6B7280' />
          <Text style={styles.badgeText}>{item.phases.length} phases</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size='large' color='#3B82F6' />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Roadmaps</Text>
        <Text style={styles.subtitle}>AI-powered preparation plans</Text>
      </View>

      <FlatList
        data={roadmaps}
        keyExtractor={item => item.id}
        renderItem={renderRoadmapCard}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name='map-outline' size={64} color='#D1D5DB' />
            <Text style={styles.emptyText}>No roadmaps yet</Text>
            <Text style={styles.emptySubtext}>
              Generate a roadmap from any opportunity
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={handleGenerateRoadmap}
            >
              <Ionicons name='add-circle-outline' size={20} color='#fff' />
              <Text style={styles.buttonText}>Create Roadmap</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  list: {
    padding: 16,
  },
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
    flex: 1,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 24,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
