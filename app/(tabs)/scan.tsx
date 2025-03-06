import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Pressable, Alert, Text, TextInput, Keyboard, KeyboardAvoidingView, Platform, TouchableWithoutFeedback } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { getItemByBarcode, createTransaction, updateItemQuantity, fetchTransactions } from '@/services/supabase';
import { InventoryItem, Transaction } from '@/types';

const CSV_CONFIG = {
  mimeType: 'text/csv',
  dialogTitle: 'Export Transactions',
  UTI: 'public.comma-separated-values-text'
};

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scannedItem, setScannedItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const isProcessing = useRef(false);
  const COOLDOWN_TIME = 1500;
  const lastScanTime = useRef(0);
  const [inputQuantity, setInputQuantity] = useState('');
  const [showQuantityInput, setShowQuantityInput] = useState(false);
  const [transactionType, setTransactionType] = useState<'in' | 'out' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');


  useEffect(() => {
    if (!permission) {
      (async () => {
        const { status } = await requestPermission();
      })();
    }
  }, [permission, requestPermission]);

  const resetScanner = () => {
    isProcessing.current = false;
    setScanned(false);
    setScannedItem(null);
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    setScanned(true);
    const now = Date.now();
    if (now - lastScanTime.current < COOLDOWN_TIME) return;
    lastScanTime.current = now;

    if (isProcessing.current) return;
    isProcessing.current = true;
    
    try {
      setLoading(true);
      const item = await getItemByBarcode(data);
      
      if (item) {
        setScannedItem(item);
        
        // Navigate directly to item details
        resetTransactionState();
        router.push({
          pathname: '/inventory/[barcode]' as const,
          params: { barcode: data }
        });
      } else {
        Alert.alert(
          "Item Not Found",
          `No item found with barcode: ${data}`,
          [
            {
              text: "Add New Item",
              onPress: () => {
                resetTransactionState();
                router.push({
                  pathname: '/inventory/add',
                  params: { scannedBarcode: data }
                });
              }
            },
            { 
              text: "OK", 
              style: "cancel",
              onPress: () => {
                resetScanner();
              }
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert("Error", "Failed to retrieve item information");
      console.error(error);
    } finally {
      isProcessing.current = false;
      setLoading(false);
    }
  };

  const validateQuantity = (type: 'in' | 'out') => {
    const quantity = parseInt(inputQuantity);
    
    if (!quantity || quantity <= 0) {
      setErrorMessage('Quantity must be a positive number');
      return false;
    }
    
    if (type === 'out' && scannedItem!.quantity - quantity < 0) {
      setErrorMessage(`Cannot remove more than ${scannedItem!.quantity} items`);
      return false;
    }
    
    return true;
  };
  
  const handleConfirmTransaction = async () => {
    if (!transactionType || !scannedItem) return;
  
    if (!validateQuantity(transactionType)) return;
  
    try {
      const quantity = parseInt(inputQuantity);
      const newQuantity = transactionType === 'in' 
        ? scannedItem.quantity + quantity
        : scannedItem.quantity - quantity;
  
      await createTransaction(
        scannedItem.barcode, 
        transactionType === 'in' ? quantity : -quantity,
        transactionType.toUpperCase() as 'IN' | 'OUT'
      );
      
      await updateItemQuantity(scannedItem.barcode, newQuantity);
      
      Alert.alert(
        "Transaction Recorded",
        `${transactionType === 'in' ? 'Added' : 'Removed'} ${quantity} ${scannedItem.name}`,
        [{ text: "OK", onPress: resetTransactionState }]
      );
    } catch (error) {
      Alert.alert("Error", "Failed to record transaction");
    } finally {
      resetTransactionState();
    }
  };
  
  const resetTransactionState = () => {
    setInputQuantity('');
    setShowQuantityInput(false);
    setTransactionType(null);
    setErrorMessage('');
  };
  

  const handleTransaction = async (type: 'in' | 'out') => {
    setLoading(true);
    
    try {
      if (!scannedItem) {
        Alert.alert("Error", "No item scanned");
        return;
      }
      
      const quantityChange = type === 'in' ? 1 : -1;
      const newQuantity = scannedItem.quantity + quantityChange;
      
      if (newQuantity < 0) {
        Alert.alert("Error", "Cannot remove more items than available in stock");
        return;
      }
      
      await createTransaction(scannedItem.barcode, quantityChange, type === 'in' ? 'IN' : 'OUT');
      await updateItemQuantity(scannedItem.barcode, newQuantity);
      
      Alert.alert(
        "Transaction Recorded",
        `${type === 'in' ? 'Added' : 'Removed'} 1 ${scannedItem.name}`,
        [
          { text: "OK", onPress: () => {
            setScannedItem(null);
            setScanned(false);
          }}
        ]
      );
    } catch (error) {
      Alert.alert("Error", "Failed to record transaction");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const generateCSV = (data: Transaction[]): string => {
    const headers = "Date,Amount,Category,Description\n";
    
    return data.reduce((acc, t) => {
      const desc = t.items?.name 
        ? `"${t.items?.name.replace(/"/g, '""')}"`
        : '""';
        
      return acc + [
        t.timestamp,
        t.quantity_change.toFixed(2),
        t.transaction_type,
        desc
      ].join(',') + '\n';
    }, headers);
  };

  const handleExportCSV = async () => {
    try {
      if (!FileSystem.cacheDirectory) {
        throw new Error('Cache directory not available');
      }
      
      const data = await fetchTransactions();
      
      if (!data?.length) {
        Alert.alert('No Data', 'There are no transactions to export');
        return;
      }
  
      const csvString = generateCSV(data);
      const fileName = `transactions_${new Date().toISOString().slice(0,10)}.csv`;
      const fileUri = FileSystem.cacheDirectory + fileName;
  
      await FileSystem.writeAsStringAsync(fileUri, csvString, {
        encoding: FileSystem.EncodingType.UTF8
      });
  
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, CSV_CONFIG);
      } else {
        Alert.alert('Error', 'Sharing functionality is not available');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      Alert.alert('Error', 'Failed to export data');
    }
  };

  if (!permission) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Requesting camera permission...</ThemedText>
      </ThemedView>
    );
  }
  
  if (!permission.granted) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>No access to camera</ThemedText>
        <Pressable style={styles.button} onPress={requestPermission}>
          <ThemedText style={styles.buttonText}>Grant Permission</ThemedText>
        </Pressable>
        <Pressable style={styles.button} onPress={() => router.back()}>
          <ThemedText style={styles.buttonText}>Go Back</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Scan Barcode', headerShown: true }} />
      
      <View style={styles.scannerContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          key={scanned ? "inactive" : "active"}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: [
              'qr',
              'upc_a',
              'upc_e',
              'ean8',
              'ean13',
              'code39',
              'code93',
              'code128',
            ],
          }}
        />
        <View style={styles.overlay}>
          <View style={styles.scanFrame} />
          <ThemedText style={styles.scanText}>Align barcode within frame</ThemedText>
        </View>
        
        <View style={styles.quickActionsContainer}>
          <Pressable
            style={styles.quickActionButton}
            onPress={handleExportCSV}
          >
            <IconSymbol name="square.and.arrow.up" size={24} color="#FFFFFF" />
            <ThemedText style={styles.quickActionText}>Export CSV</ThemedText>
          </Pressable>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scannerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningView: {
    alignItems: 'center',
  },
  scanningText: {
    marginTop: 16,
    fontSize: 18,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#4A90E2',
    borderRadius: 12,
    backgroundColor: 'transparent',
    marginBottom: 20,
  },
  scanText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  scannedItemContainer: {
    width: '100%',
    alignItems: 'center',
    padding: 16,
  },
  itemCard: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    marginVertical: 16,
  },
  barcodeContainer: {
    marginVertical: 10,
    alignItems: 'center',
    width: 300, // Fixed width to control barcode size
    overflow: 'hidden', // Prevent overflow
  },
  actionTitle: {
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 16,
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    flex: 1,
    gap: 8,
  },
  inButton: {
    backgroundColor: '#27AE60',
  },
  outButton: {
    backgroundColor: '#E74C3C',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    padding: 16,
  },
  cancelButtonText: {
    color: '#666',
  },
  button: {
    padding: 12,
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    marginVertical: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  quantityContainer: {
    width: '100%',
    padding: 16,
  },
  quantityInput: {
    height: 50,
    borderWidth: 2,
    borderColor: '#4A90E2',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  flexContainer: {
    flex: 1,
    width: '100%',
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
  quickActionsContainer: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    flexDirection: 'row',
    gap: 12,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 144, 226, 0.9)',
    padding: 12,
    borderRadius: 24,
    gap: 8,
  },
  quickActionText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});