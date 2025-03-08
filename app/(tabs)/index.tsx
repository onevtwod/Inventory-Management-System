import React, { useState, useEffect } from 'react';
import { StyleSheet, Platform, View, ActivityIndicator, Alert, Pressable } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { supabase } from '@/services/supabase';
import { fetchTransactions } from '@/services/supabase';
import { Transaction } from '@/types';

const CSV_CONFIG = {
  mimeType: 'text/csv',
  dialogTitle: 'Export Transactions',
  UTI: 'public.comma-separated-values-text'
};

// Define a subset of SF Symbol names used in this component
type SFSymbolName =
  | "shippingbox.fill"
  | "exclamationmark.triangle.fill"
  | "arrow.left.arrow.right"
  | "checkmark.circle.fill"
  | "cube.box.fill"
  | "qrcode"
  | "plus"
  | "list.clipboard.fill"
  | "square.and.arrow.up";

type AppRoute =
  | "/inventory"
  | "/transactions"
  | "/audit-history"
  | "/scan"
  | "/inventory/add"
  | "/audit/new"
  | `/inventory?${string}` // Allow query strings for /inventory
  | `/transactions?${string}`
  | `/audit-history?${string}`
  | `/scan?${string}`
  | `/inventory/add?${string}`
  | `/audit/new?${string}`
  | `/inventory/[barcode]`;

interface StatCardProps {
  icon: SFSymbolName;
  title: string;
  value: string | number;
  linkTo: AppRoute;
}

function StatCard({ icon, title, value, linkTo }: StatCardProps) {
  return (
    <Link href={linkTo as any} asChild>
      <ThemedView style={styles.card}>
        <IconSymbol size={32} name={icon} color="#4A90E2" />
        <View>
          <ThemedText type="defaultSemiBold">{title}</ThemedText>
          <ThemedText type="title">{value}</ThemedText>
        </View>
      </ThemedView>
    </Link>
  );
}

export default function DashboardScreen() {
  const [dashboardData, setDashboardData] = useState({
    totalItems: 0,
    lowStock: 0,
    recentTransactions: 0,
    lastAudit: '-'
  });
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadDashboardData();
    }, [])
  );

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get total items count
      const { count: totalItems } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true });
      
      // Get low stock items count
      const { count: lowStock } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .lt('quantity', 2);
      // Get recent transactions (last 7 days)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const { count: recentTransactions } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', oneWeekAgo.toISOString());
      
      // Get last audit date
      const { data: lastAuditData } = await supabase
        .from('audit_logs')
        .select('date')
        .order('date', { ascending: false })
        .limit(1);
      
      const lastAudit = lastAuditData && lastAuditData.length > 0 
        ? new Date(lastAuditData[0].date).toISOString().split('T')[0] 
        : 'Never';
      
      setDashboardData({
        totalItems: totalItems || 0,
        lowStock: lowStock || 0,
        recentTransactions: recentTransactions || 0,
        lastAudit
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCSV = (data: Transaction[]): string => {
    const headers = "Date,Amount,Type,Name\n";
    
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
    if (isExporting) return;
    setIsExporting(true);
    
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
      setIsExporting(false);
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <IconSymbol
          size={200}
          color="#FFFFFF50"
          name="cube.box.fill"
          style={styles.headerImage}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Lim Cushion IMS</ThemedText>
      </ThemedView>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <ThemedText style={styles.loadingText}>Loading data...</ThemedText>
        </View>
      ) : (
        <ThemedView style={styles.statsContainer}>
          <StatCard 
            icon="shippingbox.fill" 
            title="Total Items" 
            value={dashboardData.totalItems} 
            linkTo="/inventory" 
          />
          <StatCard 
            icon="exclamationmark.triangle.fill" 
            title="Low Stock" 
            value={dashboardData.lowStock} 
            linkTo="/inventory?filter=low" 
          />
        </ThemedView>
      )}
      
      <ThemedView style={styles.actionsContainer}>
        <ThemedText type="subtitle">Quick Actions</ThemedText>
        <View style={styles.actionButtonsRow}>
          <Link href="/inventory/add" style={styles.actionButton}>
            <ThemedView style={styles.actionButtonInner}>
              <IconSymbol size={24} name="plus" color="#FFFFFF" />
              <ThemedText style={styles.actionButtonText}>Add New Item</ThemedText>
            </ThemedView>
          </Link>
          
          <Pressable 
            style={styles.actionButton} 
            onPress={handleExportCSV}
            disabled={isExporting}
          >
            <ThemedView style={[styles.actionButtonInner, isExporting && styles.actionButtonDisabled]}>
              <IconSymbol 
                size={24} 
                name="square.and.arrow.up" 
                color="#FFFFFF" 
              />
              <ThemedText style={styles.actionButtonText}>
                {isExporting ? 'Exporting...' : 'Export CSV'}
              </ThemedText>
            </ThemedView>
          </Pressable>
        </View>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  headerImage: {
    bottom: -50,
    right: 20,
    position: 'absolute',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  card: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    marginBottom: 8,
  },
  actionsContainer: {
    gap: 12,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  actionButtonInner: {
    backgroundColor: '#4A90E2',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 180,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
});
