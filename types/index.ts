// Types
export type InventoryItem = {
  barcode: string;
  name: string;
  category: string;
  quantity: number;
  created_at: string;
};

export type Transaction = {
  id?: string;
  barcode: string;
  quantity_change: number;
  transaction_type: 'IN' | 'OUT';
  timestamp: string;
  items: { name: string } | null; 
  item_name?: string;
};

export type AuditLog = {
  id: string;
  barcode: string;
  audited_quantity: number;
  audit_timestamp: string;
};