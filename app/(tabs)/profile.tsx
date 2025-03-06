import React, { useState } from 'react';
import { StyleSheet, View, Pressable, Alert, Switch } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Transaction } from '@/types';
import { fetchTransactions } from '@/services/supabase';

// Add explicit type declarations
type CSVConfig = {
  mimeType: string;
  dialogTitle: string;
  UTI: string;
};

const CSV_CONFIG: CSVConfig = {
  mimeType: 'text/csv',
  dialogTitle: 'Export Transactions',
  UTI: 'public.comma-separated-values-text'
};

// Strengthen transaction validation
const validateTransaction = (t: Transaction): boolean => {
  return !!t.timestamp && Number.isFinite(t.quantity_change);
};

export default function ProfileScreen() {
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const [loading, setLoading] = useState(false);

  const generateCSV = (data: Transaction[]): string => {
    const safeData = data.filter(validateTransaction);
    
    const headers = "Date,Amount,Type,Name\n";
    
    return safeData.reduce((acc, t) => {
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
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };  

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Profile', headerShown: true }} />
      
      <View style={styles.section}>
        <ThemedText type="subtitle">Export</ThemedText>
        
        <Pressable
          style={({ pressed }) => [
            styles.menuItem,
            { opacity: pressed ? 0.6 : 1 }
          ]}
          onPress={() => !isExporting && handleExportCSV()}
          disabled={isExporting}
        >
          <View style={styles.menuItemLeft}>
            <IconSymbol 
              name={isExporting ? "hourglass" : "square.and.arrow.up"} 
              size={22} 
              color={isExporting ? "#999" : "#4A90E2"} 
            />
            <ThemedText>
              {isExporting ? 'Exporting...' : 'Export Data (CSV)'}
            </ThemedText>
          </View>
          {!isExporting && 
            <IconSymbol name="chevron.right" size={18} color="#666" />}
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
  profileHeader: {
    alignItems: 'center',
    marginVertical: 24,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  section: {
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  syncingText: {
    color: '#4A90E2',
    fontStyle: 'italic',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
    marginTop: 'auto',
  },
  logoutText: {
    color: '#E74C3C',
    fontWeight: 'bold',
  },
}); 