import { supabase } from '@/lib/supabase';
import { InventoryItem, Transaction } from '@/types';
import dateUtils from '../utils/dateUtils';

export async function getItemByBarcode(barcode: string): Promise<InventoryItem | null> {
    // Clean the barcode
    const cleanBarcode = barcode.trim();

    console.log('Querying database for barcode:', cleanBarcode);
    try {
        const { data, error } = await supabase
            .from('items')
            .select('*')
            .eq('barcode', cleanBarcode)
            .single();

        console.log('Raw database response:', { data, error });

        if (error) {
            if (error.code === 'PGRST116') {
                console.log('No rows found for barcode:', cleanBarcode);
                return null;
            }
            console.error('Database error:', error);
            throw error;
        }

        if (!data) {
            console.log('No data returned for barcode:', cleanBarcode);
            return null;
        }

        console.log('Successfully found item:', data);
        return data;
    } catch (e) {
        console.error('Exception in getItemByBarcode:', e);
        throw e;
    }
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
            timestamp: dateUtils.getMalaysiaISOString(), // Use Malaysia timezone
        });

    if (error) throw error;
    return data;
}

const supabaseService = {
    getItemByBarcode,
    fetchTransactions,
    createTransaction,
};

export default supabaseService; 