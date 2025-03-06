import { supabase } from '@/lib/supabase';
import { InventoryItem, Transaction } from '@/types';

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