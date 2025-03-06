import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Pressable, Alert, ActivityIndicator, TextInput } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

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
          <TextInput
            style={styles.input}
            placeholder="Enter category"
            value={formData.category}
            onChangeText={text => setFormData(prev => ({ ...prev, category: text }))}
          />
        </View>

        {/* Barcode Field */}
        <View style={styles.inputGroup}>
          <ThemedText type='default'>Barcode</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="Enter numeric barcode"
            value={formData.barcode}
            onChangeText={text => setFormData(prev => ({ ...prev, barcode: text.replace(/[^0-9]/g, '') }))}
            keyboardType="number-pad"
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
});