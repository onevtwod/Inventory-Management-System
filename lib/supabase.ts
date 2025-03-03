import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// Replace with your Supabase URL and key
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