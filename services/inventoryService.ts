import { supabase } from '@/lib/supabase';
import { AuditLog, InventoryItem, Transaction } from '@/types';

// Get all inventory items
export const getInventoryItems = async (): Promise<InventoryItem[]> => {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching inventory items:', error);
    throw error;
  }

  return data || [];
};

// Get an item by barcode
export const getItemByBarcode = async (barcode: string): Promise<InventoryItem | null> => {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('barcode', barcode)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is no rows returned
    console.error(`Error fetching item with barcode ${barcode}:`, error);
    throw error;
  }

  return data || null;
};

// Add a new item
export const addItem = async (item: Omit<InventoryItem, 'created_at'>): Promise<InventoryItem> => {
  const { data, error } = await supabase
    .from('items')
    .insert([{
      ...item
    }])
    .select()
    .single();

  if (error) {
    console.error('Error adding item:', error);
    throw error;
  }

  return data;
};

// Update an item
export const updateItem = async (barcode: string, updates: Partial<InventoryItem>): Promise<InventoryItem> => {
  const { data, error } = await supabase
    .from('items')
    .update(updates)
    .eq('barcode', barcode)
    .select()
    .single();

  if (error) {
    console.error(`Error updating item ${barcode}:`, error);
    throw error;
  }

  return data;
};

// Record a transaction
export const recordTransaction = async (transaction: Omit<Transaction, 'id' | 'timestamp'>): Promise<Transaction> => {
  // First record the transaction
  const { data: transactionData, error: transactionError } = await supabase
    .from('transactions')
    .insert([transaction])
    .select()
    .single();

  if (transactionError) {
    console.error('Error recording transaction:', transactionError);
    throw transactionError;
  }

  // Then update the item quantity
  const { data: item } = await supabase
    .from('items')
    .select('quantity')
    .eq('barcode', transaction.barcode)
    .single();

  const newQuantity = item?.quantity + transaction.quantity_change;

  await supabase
    .from('items')
    .update({ quantity: newQuantity })
    .eq('barcode', transaction.barcode);

  return transactionData;
};

// Get transactions
export const getTransactions = async (limit = 50): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      id,
      barcode,
      quantity_change,
      transaction_type,
      timestamp,
      items:barcode (name) 
    `)
    .order('timestamp', { ascending: false })
    .limit(limit)

  if (error) throw error;

  return data.map(t => {
    return {
      id: t.id,
      barcode: t.barcode,
      item_name: t.items[0].name,
      quantity_change: t.quantity_change,
      transaction_type: t.transaction_type,
      timestamp: t.timestamp,
    };
  }).filter(Boolean) as Transaction[];  
};

// Record an audit
export const recordAudit = async (audit: Omit<AuditLog, 'id' | 'audit_timestamp'>): Promise<AuditLog> => {
  const { data, error } = await supabase
    .from('audit_logs')
    .insert([audit])
    .select()
    .single();

  if (error) {
    console.error('Error recording audit:', error);
    throw error;
  }

  // Update the item quantity to match the audit
  await supabase
    .from('items')
    .update({ quantity: audit.audited_quantity })
    .eq('barcode', audit.barcode);

  return data;
};

// Get audit logs
export const getAuditLogs = async (limit = 50): Promise<AuditLog[]> => {
  const { data, error } = await supabase
    .from('audit_logs')
    .select(`
      id, 
      barcode, 
      audited_quantity, 
      audit_timestamp, 
      items(name)
    `)
    .order('audit_timestamp', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching audit logs:', error);
    throw error;
  }

  return data;
}; 