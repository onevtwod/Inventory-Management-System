import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  FlatList,
  View,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Stack } from "expo-router";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { fetchTransactions } from "@/services/supabase";
import { Transaction } from "@/types";

export default function TransactionsScreen() {
  const [filter, setFilter] = useState("All");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const data = await fetchTransactions();
      setTransactions(data);
      setError(null);
    } catch (err) {
      console.error("Error loading transactions:", err);
      setError("Failed to load transaction data");
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter((transaction) => {
    if (filter === "All") return true;
    return transaction.transaction_type === filter;
  });

  const renderItem = ({ item }: { item: Transaction }) => (
    <ThemedView style={styles.transactionCard}>
      <View style={styles.transactionHeader}>
        <ThemedText type="defaultSemiBold">{item.item_name}</ThemedText>
        <View
          style={[
            styles.transactionType,
            item.transaction_type === "IN" ? styles.inTransaction : styles.outTransaction,
          ]}
        >
          <IconSymbol
            name={item.transaction_type === "IN" ? "arrow.down" : "arrow.up"}
            size={12}
            color="#FFFFFF"
          />
          <ThemedText style={styles.transactionTypeText}>
            {item.transaction_type}
          </ThemedText>
        </View>
      </View>

      <View style={styles.transactionDetails}>
        <ThemedText>{new Date(item.timestamp).toLocaleString()}</ThemedText>
        <ThemedText style={styles.quantityText}>
          {item.transaction_type === "IN" ? "+" : ""}
          {item.quantity_change}
        </ThemedText>
      </View>
    </ThemedView>
  );

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: "Transactions", headerShown: true }} />

      <View style={styles.filterContainer}>
        {["All", "IN", "OUT"].map((type) => (
          <Pressable
            key={type}
            style={[
              styles.filterButton,
              filter === type && styles.activeFilter,
            ]}
            onPress={() => setFilter(type)}
          >
            <ThemedText
              style={[
                styles.filterText,
                filter === type && styles.activeFilterText,
              ]}
            >
              {type}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <ThemedText style={styles.loadingText}>
            Loading transactions...
          </ThemedText>
        </View>
      ) : error ? (
        <View style={styles.centeredContainer}>
          <IconSymbol
            name="exclamationmark.triangle.fill"
            size={50}
            color="#E74C3C"
          />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <Pressable style={styles.retryButton} onPress={loadTransactions}>
            <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
          </Pressable>
        </View>
      ) : filteredTransactions.length === 0 ? (
        <View style={styles.centeredContainer}>
          <IconSymbol name="tray.fill" size={50} color="#666" />
          <ThemedText style={styles.emptyText}>
            {filter !== "All"
              ? `No ${filter} transactions found`
              : "No transactions recorded yet"}
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={filteredTransactions}
          renderItem={renderItem}
          keyExtractor={(item) => item.barcode}
          contentContainerStyle={styles.listContainer}
          onRefresh={loadTransactions}
          refreshing={loading}
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
  filterContainer: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F0F0F0",
  },
  activeFilter: {
    backgroundColor: "#4A90E2",
  },
  filterText: {
    fontSize: 14,
    color: "#333333",
  },
  activeFilterText: {
    color: "#FFFFFF",
  },
  listContainer: {
    paddingBottom: 16,
  },
  transactionCard: {
    padding: 16,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  transactionType: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  inTransaction: {
    backgroundColor: "#27AE60",
  },
  outTransaction: {
    backgroundColor: "#E74C3C",
  },
  transactionTypeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  transactionDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  quantityText: {
    fontWeight: "bold",
  },
  userText: {
    fontSize: 12,
    color: "#666",
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: "#E74C3C",
    textAlign: "center",
    marginBottom: 20,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#4A90E2",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
});
