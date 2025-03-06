import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, Pressable, View, TextInput, ActivityIndicator } from 'react-native';
import { Link, Stack } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { fetchInventory } from '@/services/supabase';
import { InventoryItem } from '@/types';
import { useRouter } from 'expo-router';

export default function InventoryScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
      loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const data = await fetchInventory();
      setInventoryItems(data);
      setError(null);
    } catch (err) {
      console.error('Error loading inventory:', err);
      setError('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = inventoryItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.barcode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filter === 'All' || item.category === filter;
    
    return matchesSearch && matchesCategory;
  });

  // Get unique categories from inventory items
  const categories = ['All', ...new Set(inventoryItems.map(item => item.category))];

  const renderItem = ({ item }: { item: InventoryItem }) => (
    <Link href={`/inventory/${item.barcode}`} asChild>
      <Pressable>
        <ThemedView style={styles.itemCard}>
          <View style={styles.itemMain}>
            <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
            <ThemedText>{item.barcode}</ThemedText>
          </View>
          <View style={styles.itemMeta}>
            <ThemedText style={styles.categoryTag}>{item.category}</ThemedText>
            <ThemedText 
              type="defaultSemiBold" 
              style={[styles.quantity, item.quantity < 10 ? styles.lowStock : null]}
            >
              {item.quantity}
            </ThemedText>
          </View>
        </ThemedView>
      </Pressable>
    </Link>
  );

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Inventory', headerShown: true }} />
      
      <View style={styles.searchContainer}>
        <IconSymbol name="magnifyingglass" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or barcode"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      <View style={styles.filterContainer}>
        {categories.map(category => (
          <Pressable 
            key={category} 
            style={[styles.filterButton, filter === category && styles.activeFilter]}
            onPress={() => setFilter(category)}
          >
            <ThemedText 
              style={[styles.filterText, filter === category && styles.activeFilterText]}
            >
              {category}
            </ThemedText>
          </Pressable>
        ))}
      </View>
      
      {loading ? (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <ThemedText style={styles.loadingText}>Loading inventory...</ThemedText>
        </View>
      ) : error ? (
        <View style={styles.centeredContainer}>
          <IconSymbol name="exclamationmark.triangle.fill" size={50} color="#E74C3C" />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <Pressable style={styles.retryButton} onPress={loadInventory}>
            <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
          </Pressable>
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={styles.centeredContainer}>
          <IconSymbol name="tray.fill" size={50} color="#666" />
          <ThemedText style={styles.emptyText}>
            {searchQuery || filter !== 'All' ? 'No items match your search criteria' : 'No inventory items found'}
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={item => item.barcode}
          contentContainerStyle={styles.listContainer}
          onRefresh={loadInventory}
          refreshing={loading}
        />
      )}
      
      <Link href="/inventory/add" asChild>
        <Pressable style={styles.addButton}>
          <IconSymbol name="plus" size={24} color="#FFFFFF" />
        </Pressable>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    marginBottom: 4,
  },
  activeFilter: {
    backgroundColor: '#4A90E2',
  },
  filterText: {
    fontSize: 14,
    color: '#333333',
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  listContainer: {
    paddingBottom: 80,
  },
  itemCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  itemMain: {
    flex: 1,
  },
  itemMeta: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  categoryTag: {
    fontSize: 12,
    color: '#666',
  },
  quantity: {
    fontSize: 18,
  },
  lowStock: {
    color: '#E74C3C',
  },
  addButton: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#E74C3C',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
}); 