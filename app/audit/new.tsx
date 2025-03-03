import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TextInput, Pressable, Alert, FlatList, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { getInventoryItems, recordAudit } from '@/services/inventoryService';
import { InventoryItem } from '@/types';

export default function NewAuditScreen() {
  const router = useRouter();
  
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<InventoryItem[]>([]);
  const [auditInProgress, setAuditInProgress] = useState(false);
  const [currentItem, setCurrentItem] = useState<InventoryItem|null>(null);
  const [auditedQuantity, setAuditedQuantity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  useEffect(() => {
    loadItems();
  }, []);
  
  const loadItems = async () => {
    try {
      const data = await getInventoryItems();
      setItems(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load inventory items');
    } finally {
      setLoading(false);
    }
  };
  
  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.barcode.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const startAudit = () => {
    if (selectedItems.length === 0) {
      Alert.alert('Error', 'Please select at least one item to audit');
      return;
    }
    
    setAuditInProgress(true);
    setCurrentItem(selectedItems[0]);
  };
  
  const handleSelectItem = (item: InventoryItem) => {
    if (selectedItems.some(i => i.barcode === item.barcode)) {
      setSelectedItems(selectedItems.filter(i => i.barcode !== item.barcode));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };
  
  const submitAuditForCurrentItem = async () => {
    if (!currentItem) {
      Alert.alert('Error', 'No current item selected');
      return;
    }
    if (!auditedQuantity) {
      Alert.alert('Error', 'Please enter the audited quantity');
      return;
    }
    
    setSubmitting(true);
    try {
      await recordAudit({
        barcode: currentItem.barcode,
        audited_quantity: parseInt(auditedQuantity, 10),
      });
      
      // Move to next item or finish
      const currentIndex = selectedItems.findIndex(item => item.barcode === currentItem.barcode);
      if (currentIndex < selectedItems.length - 1) {
        setCurrentItem(selectedItems[currentIndex + 1]);
        setAuditedQuantity('');
      } else {
        // All items audited
        Alert.alert('Success', 'Audit completed successfully', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to record audit');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }
  
  if (auditInProgress && currentItem) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: 'Audit in Progress', headerShown: true }} />
        
        <ThemedText type="title" style={styles.auditTitle}>
          Auditing Item ({selectedItems.findIndex(item => item.barcode === currentItem.barcode) + 1} of {selectedItems.length})
        </ThemedText>
        
        <ThemedView style={styles.auditItemCard}>
          <ThemedText type="subtitle">{currentItem.name}</ThemedText>
          <ThemedText>Current Quantity: {currentItem.quantity}</ThemedText>
          <ThemedText>Barcode: {currentItem.barcode || 'None'}</ThemedText>
          <ThemedText>Category: {currentItem.category}</ThemedText>
          
          <View style={styles.auditInputContainer}>
            <ThemedText style={styles.auditInputLabel}>Actual Quantity:</ThemedText>
            <TextInput
              style={styles.auditInput}
              value={auditedQuantity}
              onChangeText={setAuditedQuantity}
              keyboardType="numeric"
              placeholder="Enter quantity"
              autoFocus
            />
          </View>
          
          <View style={styles.auditButtons}>
            <Pressable 
              style={[styles.auditButton, submitting && styles.disabledButton]}
              onPress={submitAuditForCurrentItem}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <ThemedText style={styles.auditButtonText}>Submit</ThemedText>
              )}
            </Pressable>
          </View>
        </ThemedView>
      </ThemedView>
    );
  }
  
  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'New Audit', headerShown: true }} />
      
      <ThemedText type="title" style={styles.pageTitle}>Select Items to Audit</ThemedText>
      
      <View style={styles.searchContainer}>
        <IconSymbol name="magnifyingglass" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search items"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      <FlatList
        data={filteredItems}
        keyExtractor={item => item.barcode}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }: {item: InventoryItem}) => (
          <Pressable onPress={() => handleSelectItem(item)}>
            <ThemedView style={[
              styles.itemCard,
              selectedItems.some(i => i.barcode === item.barcode) && styles.selectedItemCard
            ]}>
              <View style={styles.itemInfo}>
                <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
                <ThemedText>Qty: {item.quantity}</ThemedText>
              </View>
              {selectedItems.some(i => i.barcode === item.barcode) && (
                <IconSymbol name="checkmark.circle.fill" size={24} color="#27AE60" />
              )}
            </ThemedView>
          </Pressable>
        )}
      />
      
      <View style={styles.bottomBar}>
        <ThemedText style={styles.selectedCount}>
          {selectedItems.length} items selected
        </ThemedText>
        <Pressable 
          style={[styles.startButton, selectedItems.length === 0 && styles.disabledButton]}
          onPress={startAudit}
          disabled={selectedItems.length === 0}
        >
          <ThemedText style={styles.startButtonText}>Start Audit</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageTitle: {
    marginBottom: 16,
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
  listContainer: {
    paddingBottom: 80,
  },
  itemCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedItemCard: {
    borderWidth: 2,
    borderColor: '#27AE60',
  },
  itemInfo: {
    flex: 1,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  selectedCount: {
    fontSize: 16,
  },
  startButton: {
    backgroundColor: '#4A90E2',
    padding: 12,
    borderRadius: 8,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.5,
  },
  auditTitle: {
    marginBottom: 24,
    textAlign: 'center',
  },
  auditItemCard: {
    padding: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  auditInputContainer: {
    marginTop: 16,
  },
  auditInputLabel: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  auditInput: {
    backgroundColor: '#F0F0F0',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  auditButtons: {
    marginTop: 24,
  },
  auditButton: {
    backgroundColor: '#4A90E2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  auditButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
}); 