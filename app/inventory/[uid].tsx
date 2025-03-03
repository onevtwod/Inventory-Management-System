import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Pressable, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { getTransactions, recordTransaction, updateItem } from '@/services/inventoryService';
import { InventoryItem, Transaction } from '@/types';
import { getItemByBarcode } from '@/services/supabase';

export default function ItemDetailScreen() {
  const { barcode } = useLocalSearchParams();
  const router = useRouter();
  
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadItemDetails();
  }, [barcode]);

  const loadItemDetails = async () => {
    setLoading(true);
    try {
      // Fetch item details and recent transactions for this item
      const itemData = await getItemByBarcode(barcode as string);
      setItem(itemData);
      
      // Get recent transactions for this item
      const transactionsData = await getTransactions();
      setTransactions(transactionsData.filter(t => t.barcode === barcode).slice(0, 5));
    } catch (error) {
      Alert.alert('Error', 'Failed to load item details');
    } finally {
      setLoading(false);
    }
  };

  const handleTransaction = async (type: 'IN' | 'OUT') => {
    setActionLoading(true);
    try {
      const quantityChange = type === 'IN' ? 1 : -1;

      const transaction: Transaction = {
        timestamp: new Date().toISOString(),
        barcode: barcode as string,
        item_name: item?.name ?? "N/A", 
        quantity_change: quantityChange,
        transaction_type: type,
        items: null
      };
      
      await recordTransaction(transaction);

      // Refresh data
      await loadItemDetails();
      Alert.alert('Success', 'Transaction recorded successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to record transaction');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  if (!item) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: 'Item Not Found', headerShown: true }} />
        <ThemedText>This item could not be found.</ThemedText>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ThemedText style={styles.backButtonText}>Go Back</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ScrollView>
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: item.name, headerShown: true }} />
        
        <View style={styles.itemHeader}>
          <View>
            <ThemedText type="title">{item.name}</ThemedText>
            <ThemedText style={styles.categoryTag}>{item.category}</ThemedText>
          </View>
          <View style={styles.quantityContainer}>
            <ThemedText style={styles.quantityLabel}>Quantity</ThemedText>
            <ThemedText style={[styles.quantityValue, item.quantity < 10 && styles.lowStock]}>
              {item.quantity}
            </ThemedText>
          </View>
        </View>
        
        <View style={styles.barcodeContainer}>
          <IconSymbol name="barcode" size={18} color="#666" />
          <ThemedText style={styles.barcodeText}>{item.barcode || 'No barcode'}</ThemedText>
        </View>
        
        <View style={styles.actionButtons}>
          <Pressable 
            style={[styles.actionButton, styles.inButton, actionLoading && styles.disabledButton]}
            onPress={() => handleTransaction('IN')}
            disabled={actionLoading}
          >
            <IconSymbol name="plus" size={18} color="#FFFFFF" />
            <ThemedText style={styles.actionButtonText}>Add Stock</ThemedText>
          </Pressable>
          
          <Pressable 
            style={[styles.actionButton, styles.outButton, actionLoading && styles.disabledButton]}
            onPress={() => handleTransaction('OUT')}
            disabled={actionLoading}
          >
            <IconSymbol name="minus" size={18} color="#FFFFFF" />
            <ThemedText style={styles.actionButtonText}>Remove Stock</ThemedText>
          </Pressable>
        </View>
        
        <ThemedText type="subtitle" style={styles.sectionTitle}>Recent Transactions</ThemedText>
        
        {transactions.length > 0 ? (
          transactions.map(transaction => (
            <View key={transaction.id} style={styles.transactionItem}>
              <View style={styles.transactionInfo}>
                <View style={[
                  styles.transactionType, 
                  transaction.transaction_type === 'IN' ? styles.inTransaction : styles.outTransaction
                ]}>
                  <IconSymbol 
                    name={transaction.transaction_type === 'IN' ? 'arrow.down' : 'arrow.up'} 
                    size={12} 
                    color="#FFFFFF" 
                  />
                </View>
                <ThemedText>
                  {transaction.transaction_type === 'IN' ? '+' : '-'}{Math.abs(transaction.quantity_change)}
                </ThemedText>
              </View>
              <ThemedText style={styles.transactionDate}>
                {new Date(transaction.timestamp).toLocaleString()}
              </ThemedText>
            </View>
          ))
        ) : (
          <ThemedText style={styles.noTransactions}>No recent transactions</ThemedText>
        )}
        
        <View style={styles.editDeleteButtons}>
          <Pressable 
            style={styles.editButton}
            onPress={() => router.push(`/inventory/edit/${barcode}`)}
          >
            <IconSymbol name="pencil" size={18} color="#4A90E2" />
            <ThemedText style={styles.editButtonText}>Edit Item</ThemedText>
          </Pressable>
          
          <Pressable 
            style={styles.deleteButton}
            onPress={() => {
              Alert.alert(
                'Delete Item',
                'Are you sure you want to delete this item?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Delete', 
                    style: 'destructive',
                    onPress: async () => {
                      // Implement delete logic
                      router.back();
                    }
                  }
                ]
              );
            }}
          >
            <IconSymbol name="trash" size={18} color="#E74C3C" />
            <ThemedText style={styles.deleteButtonText}>Delete Item</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    </ScrollView>
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
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  categoryTag: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  quantityContainer: {
    alignItems: 'center',
  },
  quantityLabel: {
    fontSize: 14,
    color: '#666',
  },
  quantityValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  lowStock: {
    color: '#E74C3C',
  },
  barcodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  barcodeText: {
    marginLeft: 8,
    fontSize: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    gap: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  inButton: {
    backgroundColor: '#27AE60',
  },
  outButton: {
    backgroundColor: '#E74C3C',
  },
  disabledButton: {
    opacity: 0.5,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  transactionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  transactionType: {
    borderRadius: 12,
    padding: 4,
  },
  inTransaction: {
    backgroundColor: '#27AE60',
  },
  outTransaction: {
    backgroundColor: '#E74C3C',
  },
  transactionDate: {
    fontSize: 14,
    color: '#666',
  },
  noTransactions: {
    fontStyle: 'italic',
    color: '#666',
    textAlign: 'center',
    marginVertical: 16,
  },
  editDeleteButtons: {
    flexDirection: 'row',
    marginTop: 32,
    gap: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4A90E2',
    flex: 1,
    gap: 8,
  },
  editButtonText: {
    color: '#4A90E2',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E74C3C',
    flex: 1,
    gap: 8,
  },
  deleteButtonText: {
    color: '#E74C3C',
  },
  backButton: {
    padding: 12,
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
}); 