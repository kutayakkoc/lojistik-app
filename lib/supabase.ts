import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Supabase API ayarlarından kopyaladığın değerleri buraya yapıştır
const supabaseUrl = 'https://lsjxyzglrgqvwdjjrfcs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxzanh5emdscmdxdndkampyZmNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMjkwOTgsImV4cCI6MjA4ODcwNTA5OH0.DLt5NOjfWHvhwLNatML-DWDDMz0LxB-7jRUXZvSuqmo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});