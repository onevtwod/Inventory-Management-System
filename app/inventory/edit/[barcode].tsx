import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Pressable, Alert, ActivityIndicator, TextInput, Modal, Platform } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { getItemByBarcode } from '@/services/supabase';
import { InventoryItem } from '@/types';
import { updateItem } from '@/services/inventoryService';

export default function EditItemScreen() {
  const { barcode } = useLocalSearchParams();
  const router = useRouter();
  
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    quantity: '',
    barcode: ''
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const categories = ['Aeroplus', 'Superleather'];

  useEffect(() => {
    loadItem();
  }, [barcode]);

  const loadItem = async () => {
    try {
      setLoading(true);
      const data = await getItemByBarcode(barcode as string);
      if (data) {
        setItem(data);
        setFormData({
          name: data.name,
          category: data.category || '',
          quantity: data.quantity.toString(),
          barcode: data.barcode
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load item details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      setUpdating(true);
      if (!item) return;

      const updatedItem = {
        ...item,
        name: formData.name.trim(),
        category: formData.category.trim(),
        quantity: parseInt(formData.quantity),
        barcode: formData.barcode.trim()
      };

      await updateItem(item.barcode, updatedItem);
      Alert.alert('Success', 'Item updated successfully');
      router.push({
        pathname: '/inventory',
        params: { refresh: Date.now() }
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to update item');
    } finally {
      setUpdating(false);
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
        <ThemedText>Item not found</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Edit Item', headerShown: true }} />
      
      <View>
        <ThemedText type="subtitle">Item Details</ThemedText>
        
        {/* Item Name Field */}
        <View style={styles.inputGroup}>
          <ThemedText type='default'>Item Name</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="Enter item name"
            value={formData.name}
            onChangeText={text => setFormData(prev => ({ ...prev, name: text }))}
          />
        </View>

        {/* Category Field */}
        <View style={styles.inputGroup}>
          <ThemedText type='default'>Category</ThemedText>
          {Platform.OS === 'ios' ? (
            <>
              <Pressable 
                style={styles.pickerPressable}
                onPress={() => setShowPicker(true)}
              >
                <ThemedText style={[styles.pickerText, !formData.category && styles.placeholderText]}>
                  {formData.category || 'Select Category'}
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
                      selectedValue={formData.category}
                      onValueChange={(value) => {
                        setFormData(prev => ({ ...prev, category: value }));
                      }}
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
            <View style={styles.androidPickerContainer}>
              <Picker
                selectedValue={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                mode="dropdown"
                style={styles.androidPicker}
                dropdownIconColor="#4A90E2"
              >
                {categories.map((cat) => (
                  <Picker.Item 
                    label={cat} 
                    value={cat} 
                    key={cat}
                    style={styles.androidPickerItem}
                  />
                ))}
              </Picker>
            </View>
          )}
        </View>

        {/* Barcode Field */}
        <View style={styles.inputGroup}>
          <ThemedText type='default'>Barcode</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="Enter barcode"
            value={formData.barcode}
            onChangeText={text => setFormData(prev => ({ ...prev, barcode: text.replace(/[^a-zA-Z0-9]/g, '') }))}
          />
        </View>

        {/* Quantity Field */}
        <View style={styles.inputGroup}>
          <ThemedText type='default'>Stock Quantity</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="Enter current stock"
            value={formData.quantity}
            onChangeText={text => setFormData(prev => ({ ...prev, quantity: text.replace(/[^0-9]/g, '') }))}
            keyboardType="number-pad"
          />
        </View>
        
        <Pressable 
          style={styles.saveButton}
          onPress={handleUpdate}
          disabled={updating}
        >
          <ThemedText style={styles.buttonText}>
            {updating ? 'Saving...' : 'Save Changes'}
          </ThemedText>
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
  saveButton: {
    backgroundColor: '#4A90E2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFF',
  },
  pickerPressable: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
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
    color: '#333',
  },
  placeholderText: {
    color: '#888',
  },
  pickerContainer: {
    backgroundColor: 'white',
    height: 250,
    width: '100%',
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
  androidPickerContainer: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  androidPicker: {
    backgroundColor: 'transparent',
    height: 50,
    width: '100%',
    marginLeft: -8,
    color: '#333',
  },
  androidPickerItem: {
    fontSize: 16,
    color: '#333',
  },
});