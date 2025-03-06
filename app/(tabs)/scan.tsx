import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Pressable, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { getItemByBarcode, createTransaction, updateItemQuantity } from '@/services/supabase';
import { InventoryItem } from '@/types';
import { supabase } from '@/lib/supabase';

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

  // Auto-reset scanner after timeout
  useEffect(() => {
    if (scanned && !loading) {
      const timer = setTimeout(() => {
        resetScanner();
      }, 5000); // Reset after 5 seconds if not loading
      
      return () => clearTimeout(timer);
    }
  }, [scanned, loading]);

  const resetScanner = () => {
    isProcessing.current = false;
    setScanned(false);
    setScannedItem(null);
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    // Prevent multiple scans in quick succession
    const now = Date.now();
    if (now - lastScanTime.current < COOLDOWN_TIME) return;
    lastScanTime.current = now;

    // Prevent processing multiple scans simultaneously
    if (isProcessing.current) return;
    
    // Set scanner state
    setScanned(true);
    isProcessing.current = true;
    setLoading(true);
    
    console.log("Barcode scan detected!");
    
    try {
      // Clean the barcode data - trim whitespace and special characters
      const cleanBarcode = data.trim();
      
      // Log detailed barcode info for debugging
      console.log('Raw barcode:', data);
      console.log('Cleaned barcode:', cleanBarcode);
      console.log('Barcode length:', data.length);
      console.log('Barcode char codes:', [...data].map(c => c.charCodeAt(0)));
      
      // Try direct database query first
      const { data: directData, error: directError } = await supabase
        .from('items')
        .select('*')
        .eq('barcode', cleanBarcode)
        .single();
      
      console.log('Direct database query result:', { directData, directError });
      
      // Then try through the service function
      const item = await getItemByBarcode(cleanBarcode);
      console.log('Service function result:', item);
      
      if (directData || item) {
        const finalItem = directData || item;
        setScannedItem(finalItem);
        
        // Navigate directly to item details
        resetTransactionState();
        router.push({
          pathname: '/inventory/[barcode]' as const,
          params: { barcode: cleanBarcode }
        });
      } else {
        Alert.alert(
          "Item Not Found",
          `No item found with barcode: ${cleanBarcode}`,
          [
            {
              text: "Add New Item",
              onPress: () => {
                resetTransactionState();
                router.push({
                  pathname: '/inventory/add',
                  params: { scannedBarcode: cleanBarcode }
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
      console.error('Error during barcode scan:', error);
      Alert.alert("Error", "Failed to retrieve item information");
      // Auto-reset scanner after error
      setTimeout(resetScanner, 2000);
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
      </View>
      
      {scanned && (
        <Pressable 
          style={styles.resetButton}
          onPress={resetScanner}
        >
          <ThemedText style={styles.resetButtonText}>Scan Again</ThemedText>
        </Pressable>
      )}
      
      {loading && (
        <View style={styles.loadingOverlay}>
          <ThemedText style={styles.loadingText}>Processing...</ThemedText>
        </View>
      )}
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
  resetButton: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});