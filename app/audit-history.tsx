import React from 'react';
import { StyleSheet, View, FlatList } from 'react-native';
import { Stack } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';

// Mock data - replace with Supabase data
const mockAudits = [
  { id: '1', date: '2023-11-15', completedBy: 'john.doe', notes: 'Regular inventory audit' },
  { id: '2', date: '2023-10-01', completedBy: 'jane.smith', notes: 'Quarterly review' },
  { id: '3', date: '2023-09-10', completedBy: 'john.doe', notes: 'Post-shipment verification' },
];

export default function AuditHistoryScreen() {
  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Audit History', headerShown: true }} />
      
      {mockAudits.length === 0 ? (
        <View style={styles.centeredContent}>
          <IconSymbol name="tray.fill" size={50} color="#666" />
          <ThemedText style={styles.emptyText}>No audits recorded yet</ThemedText>
        </View>
      ) : (
        <FlatList
          data={mockAudits}
          renderItem={({ item }) => (
            <ThemedView style={styles.auditCard}>
              <View style={styles.auditHeader}>
                <ThemedText type="defaultSemiBold">{new Date(item.date).toLocaleDateString()}</ThemedText>
                <ThemedText style={styles.userText}>By: {item.completedBy}</ThemedText>
              </View>
              {item.notes && <ThemedText style={styles.notesText}>{item.notes}</ThemedText>}
            </ThemedView>
          )}
          keyExtractor={item => item.id}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  auditCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  auditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  userText: {
    fontSize: 12,
    color: '#666',
  },
  notesText: {
    color: '#444',
  },
}); 