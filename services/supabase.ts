import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';
import { InventoryItem, Transaction } from '@/types';

// Replace with your Supabase URL and anon key
const supabaseUrl = 'https://cancvemvrtthwipvfrjj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhbmN2ZW12cnR0aHdpcHZmcmpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA5MTAzODgsImV4cCI6MjA1NjQ4NjM4OH0.acHBaJ6Hwo3_gMiw-I5p0wgxHK23BnCvUMmu7yGJy4s';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export async function fetchInventory(): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*');
  
  if (error) throw error;
  return data || [];
}

export async function fetchTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        items:barcode (name) 
      `)
      .order('timestamp', { ascending: false })
  
    if (error) throw error;

    return data.map(t => ({
      ...t,
      item_name: t.items?.name || 'N/A'
    })); 
}

export async function createTransaction(barcode: string, quantity_change: number, transaction_type: 'IN' | 'OUT') {
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      barcode,
      quantity_change,
      transaction_type,
      timestamp: new Date().toISOString(),
    });
  
  if (error) throw error;
  return data;
}

export async function getItemByBarcode(barcode: string): Promise<InventoryItem | null> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('barcode', barcode)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function updateItemQuantity(barcode: string, newQuantity: number) {
  const { error } = await supabase
    .from('items')
    .update({ quantity: newQuantity })
    .eq('barcode', barcode);
  
  if (error) throw error;
} 