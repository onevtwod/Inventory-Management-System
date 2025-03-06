import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View, Pressable, Alert, ScrollView, Animated, Platform, Modal } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { addItem } from '@/services/inventoryService';
import { useLocalSearchParams } from 'expo-router';

export default function AddItemScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('Sofa');
  const [quantity, setQuantity] = useState('0');
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (params?.scannedBarcode && typeof params.scannedBarcode === 'string') {
      const newBarcode = params.scannedBarcode.toString();
      setBarcode(newBarcode);
      
      // Preserve the name from params if available
      if (params?.name && typeof params.name === 'string' && params.name.trim() !== '') {
        setName(params.name);
      }
    }
  }, [params.scannedBarcode, params.name]);

  const categories = ['Sofa', 'Car', 'Replacement'];

  const handleAddItem = async () => {
    if (!name) {
      Alert.alert('Error', 'Item name is required');
      return;
    }

    setLoading(true);
    try {
      await addItem({
        name,
        barcode,
        category,
        quantity: parseInt(quantity, 10) || 0,
      });
      
      Alert.alert('Success', 'Item added successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: unknown) { 
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView>
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: 'Add New Item', headerShown: true }} />
        
        <View style={styles.formGroup}>
          <ThemedText style={styles.label}>Item Name</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="Enter item name"
            value={name}
            onChangeText={setName}
          />
        </View>
        
        <View style={styles.formGroup}>
          <ThemedText style={styles.label}>Barcode</ThemedText>
          <View style={styles.barcodeInput}>
            <TextInput
              style={styles.input}
              placeholder="Enter or scan barcode"
              value={barcode}
              onChangeText={setBarcode}
            />
            <Pressable style={styles.scanButton} onPress={() => router.push({
              pathname: '/(tabs)/scan',
            })}>
              <IconSymbol name="barcode.viewfinder" size={24} color="#FFFFFF" />
              <ThemedText style={styles.scanButtonText}>Scan Barcode</ThemedText>
            </Pressable>
          </View>
        </View>
        
        <View style={styles.formGroup}>
          <ThemedText style={styles.label}>Category</ThemedText>
          
          {Platform.OS === 'ios' ? (
          <>
            <Pressable 
              style={styles.pickerPressable}
              onPress={() => setShowPicker(true)}
            >
              <ThemedText style={[styles.pickerText, !category && styles.placeholderText]}>
                {category || 'Select Category'}
              </ThemedText>
            </Pressable>

            <Modal
              visible={showPicker}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowPicker(false)}
            >
              <View style={styles.modalContainer}>
                <View style={styles.pickerHeader}>
                  <Pressable
                    style={styles.doneButton}
                    onPress={() => setShowPicker(false)}
                  >
                    <ThemedText style={styles.doneButtonText}>Done</ThemedText>
                  </Pressable>
                </View>
                
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={category}
                    onValueChange={(value) => setCategory(value)}
                    style={styles.picker}
                  >
                    {categories.map((cat) => (
                      <Picker.Item label={cat} value={cat} key={cat} color={Platform.OS === 'ios' ? '#000' : undefined}/>
                    ))}
                  </Picker>
                </View>
              </View>
            </Modal>
          </>
        ) : (
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={category}
                onValueChange={setCategory}
                mode="dialog"
                style={styles.picker}
              >
                {categories.map((cat) => (
                  <Picker.Item label={cat} value={cat} key={cat} />
                ))}
              </Picker>
            </View>
          )}
        </View>
        
        <View style={styles.formGroup}>
          <ThemedText style={styles.label}>Initial Quantity</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="0"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
          />
        </View>
        
        <View style={styles.buttonContainer}>
          <Pressable
            style={styles.cancelButton}
            onPress={() => router.back()}
          >
            <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
          </Pressable>
          
          <Pressable
            style={[styles.addButton, loading && styles.disabledButton]}
            onPress={handleAddItem}
            disabled={loading}
          >
            <ThemedText style={styles.addButtonText}>Add Item</ThemedText>
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
  formGroup: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#F0F0F0',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  barcodeInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanButton: {
    backgroundColor: '#4A90E2',
    padding: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  categoryButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryButton: {
    backgroundColor: '#F0F0F0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  selectedCategory: {
    backgroundColor: '#4A90E2',
  },
  categoryText: {
    color: '#333',
  },
  selectedCategoryText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelButton: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#333',
  },
  addButton: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#4A90E2',
    flex: 2,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.5,
  },
  pickerPressable: {
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
  },
  picker: {
    width: '100%',
    backgroundColor: 'white',
    color: '#333',
  },
  pickerText: {
    padding: 12,
    color: '#333', // Explicit text color
  },
  placeholderText: {
    color: '#888', // Different color for placeholder
  },
  pickerContainer: {
    backgroundColor: 'white',
    height: 250,
    width: '100%',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  pickerWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  pickerHeader: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  doneButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  doneButtonText: {
    color: '#4A90E2',
    fontWeight: '600',
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});