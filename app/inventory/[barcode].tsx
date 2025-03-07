import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Pressable, Alert, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import Barcode from '../components/BarcodeWrapper';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { getTransactions, getTransactionsByBarcode, recordTransaction, updateItem, deleteItem } from '@/services/inventoryService';
import { InventoryItem, Transaction } from '@/types';
import { getItemByBarcode, updateItemQuantity } from '@/services/supabase';
import dateUtils from '../utils/dateUtils';

export default function ItemDetailScreen() {
  const { barcode } = useLocalSearchParams();
  const router = useRouter();
  
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [inputQuantity, setInputQuantity] = useState('');
  const [showQuantityInput, setShowQuantityInput] = useState(false);
  const [transactionType, setTransactionType] = useState<'IN' | 'OUT' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadItemDetails();
  }, [barcode]);

  // 在状态声明后添加
  useEffect(() => {
    if (transactionType) {
      setShowQuantityInput(true);
      setErrorMessage(''); // 重置错误信息
    }
  }, [transactionType]); // 监听 transactionType 变化

  const validateQuantity = () => {
    const quantity = parseInt(inputQuantity);
    
    if (!quantity || quantity <= 0) {
      setErrorMessage('Quantity must be a positive number');
      return false;
    }
    
    if (transactionType === 'OUT' && item && item.quantity - quantity < 0) {
      setErrorMessage(`Cannot remove more than ${item.quantity} items`);
      return false;
    }
    
    return true;
  };

  const loadItemDetails = async () => {
    setLoading(true);
    try {
      // Fetch item details and recent transactions for this item
      const itemData = await getItemByBarcode(barcode as string);
      setItem(itemData);
      
      // Get recent transactions for this item
      const transactionsData = await getTransactionsByBarcode(barcode as string);
      setTransactions(transactionsData.filter(t => t.barcode === barcode).slice(0, 5));
    } catch (error) {
      Alert.alert('Error', 'Failed to load item details');
    } finally {
      setLoading(false);
    }
  };

  const getMalaysiaDateTime = (): string => {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Kuala_Lumpur',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false // Use 24-hour format
    };
  
    return new Date().toLocaleString('en-MY', options);
  }

  const handleTransaction = async () => {
    if (!transactionType || !item) return;
  
    if (!validateQuantity()) return;
  
    setActionLoading(true);
    try {
      const quantityChange = transactionType === 'IN' 
        ? parseInt(inputQuantity) 
        : -parseInt(inputQuantity);
  
      const transaction: Transaction = {
        timestamp: getMalaysiaDateTime(),
        barcode: barcode as string,
        quantity_change: quantityChange,
        transaction_type: transactionType,
        items: null
      };
      
      await recordTransaction(transaction);
      await updateItemQuantity(item.barcode, item.quantity + quantityChange);
      
      Alert.alert(
        "Transaction Recorded",
        `${transactionType === 'IN' ? 'Added' : 'Removed'} ${inputQuantity} ${item.name}`,
        [{ text: "OK", onPress: () => {
          setInputQuantity('');
          setShowQuantityInput(false);
          setTransactionType(null);
          loadItemDetails();
        }}]
      );
    } catch (error) {
      console.error("Error recording transaction:", error);
      Alert.alert("Error recording transaction", JSON.stringify(error));
    } finally {
      setInputQuantity('');
      setShowQuantityInput(false);
      setTransactionType(null);
      setErrorMessage('');
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
        <Stack.Screen options={{ title: 'Item Details', headerShown: true }} />
        
        <View style={styles.itemHeader}>
          <View style={styles.itemInfo}>
            <ThemedText type="title">{item.name}</ThemedText>
            <ThemedText style={styles.categoryTag}>{item.category}</ThemedText>
            
            <View style={styles.quantityContainer}>
              <ThemedText style={styles.quantityLabel}>Quantity</ThemedText>
              <ThemedText style={[styles.quantityValue, item.quantity < 10 && styles.lowStock]}>
                {item.quantity}
              </ThemedText>
            </View>
          </View>
        </View>
        
        <View style={styles.barcodeContainer}>
          <Barcode
            value={item.barcode}
            format="CODE128"
            singleBarWidth={2}
            height={100}
            lineColor="#000000"
            backgroundColor="#FFFFFF"
            showText={true}
            textStyle={styles.barcodeText}
          />
        </View>
        
        <View style={styles.actionButtons}>
        {!showQuantityInput ? (
          <>
            <Pressable 
              style={[styles.actionButton, styles.inButton]}
              onPress={() => {
                setTransactionType('IN');
                setShowQuantityInput(true); // 显式触发输入框显示
              }}
            >
              <IconSymbol name="plus" size={18} color="#FFFFFF" />
              <ThemedText style={styles.actionButtonText}>Add Stock</ThemedText>
            </Pressable>

            <Pressable 
              style={[styles.actionButton, styles.outButton]}
              onPress={() => {
                setTransactionType('OUT');
                setShowQuantityInput(true); // 显式触发输入框显示
              }}
            >
              <IconSymbol name="minus" size={18} color="#FFFFFF" />
              <ThemedText style={styles.actionButtonText}>Remove Stock</ThemedText>
            </Pressable>
          </>
        ) : (
          <View style={styles.quantityInputContainer}>
            <TextInput
              style={styles.quantityInput}
              keyboardType="number-pad"
              placeholder="Enter quantity"
              value={inputQuantity}
              onChangeText={text => {
                setInputQuantity(text.replace(/[^0-9]/g, ''));
                setErrorMessage('');
              }}
              autoFocus
            />
            
            {errorMessage && (
              <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
            )}

            <View style={styles.confirmButtons}>
              <Pressable
                style={[styles.confirmButton, styles.confirmButtonSuccess]}
                onPress={handleTransaction}
              >
                <ThemedText style={styles.confirmButtonText}>
                  Confirm {transactionType}
                </ThemedText>
              </Pressable>
              
              <Pressable
                style={[styles.confirmButton, styles.confirmButtonCancel]}
                onPress={() => {
                  setInputQuantity('');
                  setShowQuantityInput(false);
                  setTransactionType(null);
                }}
              >
                <ThemedText style={styles.confirmButtonText}>Cancel</ThemedText>
              </Pressable>
            </View>
          </View>
        )}
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
                {dateUtils.formatMalaysiaTime(transaction.timestamp)}
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
                      await deleteItem(item.barcode);
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
  itemInfo: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    width: '100%',
  },
  categoryTag: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    marginBottom: 12,
  },
  quantityContainer: {
    alignItems: 'flex-start',
    marginTop: 8,
    marginBottom: 4,
  },
  quantityLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  quantityValue: {
    paddingTop: 4,
    fontSize: 28,
    fontWeight: 'bold',
  },
  lowStock: {
    color: '#E74C3C',
  },
  barcodeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
    padding: 30,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  barcode: {
    marginBottom: 8,
    alignSelf: 'center',
    width: '100%',
  },
  barcodeText: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#000000',
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
  quantityInput: {
    height: 50,
    borderWidth: 2,
    borderColor: '#4A90E2',
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonSuccess: {
    backgroundColor: '#27AE60',
  },
  confirmButtonCancel: {
    backgroundColor: '#666',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  errorText: {
    color: '#E74C3C',
    marginBottom: 12,
    fontSize: 14,
  },
  quantityInputContainer: {
    width: '100%',
  },
}); 