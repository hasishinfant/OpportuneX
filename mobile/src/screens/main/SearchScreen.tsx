import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import OpportunityCard from '../../components/OpportunityCard';
import { API_ENDPOINTS } from '../../config/api';
import { apiService } from '../../services/api.service';
import type { Opportunity, SearchFilters } from '../../types';

export default function SearchScreen({ navigation }: any) {
  const [query, setQuery] = useState('');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});

  const handleSearch = async () => {
    if (!query.trim()) {
      Alert.alert('Error', 'Please enter a search query');
      return;
    }

    setIsLoading(true);
    try {
      const response: any = await apiService.post(API_ENDPOINTS.SEARCH, {
        query: query.trim(),
        filters,
        pagination: { page: 1, limit: 20 },
      });

      if (response.success) {
        setOpportunities(response.data.opportunities);

        if (response.data.opportunities.length === 0) {
          Speech.speak('No opportunities found. Try a different search.');
        } else {
          Speech.speak(
            `Found ${response.data.opportunities.length} opportunities`
          );
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Failed to search opportunities');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceSearch = () => {
    Alert.alert(
      'Voice Search',
      'Voice search feature requires additional setup. Please use text search for now.',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons
            name='search'
            size={20}
            color='#6B7280'
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder='Search opportunities...'
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType='search'
          />
          <TouchableOpacity
            onPress={handleVoiceSearch}
            style={styles.voiceButton}
          >
            <Ionicons name='mic' size={24} color='#3B82F6' />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearch}
          disabled={isLoading}
        >
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size='large' color='#3B82F6' />
        </View>
      ) : (
        <FlatList
          data={opportunities}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <OpportunityCard opportunity={item} navigation={navigation} />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            query ? (
              <View style={styles.emptyContainer}>
                <Ionicons name='search-outline' size={64} color='#D1D5DB' />
                <Text style={styles.emptyText}>No results found</Text>
                <Text style={styles.emptySubtext}>
                  Try different keywords or filters
                </Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name='compass-outline' size={64} color='#D1D5DB' />
                <Text style={styles.emptyText}>Start searching</Text>
                <Text style={styles.emptySubtext}>
                  Find hackathons, internships, and workshops
                </Text>
              </View>
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  voiceButton: {
    padding: 4,
  },
  searchButton: {
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
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
  },
});
