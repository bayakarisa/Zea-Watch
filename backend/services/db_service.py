import os
from supabase import create_client, Client
from datetime import datetime
from typing import Optional, List, Dict

class DatabaseService:
    def __init__(self):
        # --- FIX ---
        # Set defaults for in-memory/fallback *first*.
        # This ensures _next_id ALWAYS exists.
        self.use_supabase = False
        self.memory_storage = []
        self._next_id = 1  
        # --- END FIX ---
        
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_KEY')
        
        if not supabase_url or not supabase_key:
            # Credentials not found, will use in-memory defaults
            print("Warning: Supabase credentials not found. Using in-memory storage.")
        else:
            # Try to connect to Supabase
            try:
                self.supabase: Client = create_client(supabase_url, supabase_key)
                self.use_supabase = True  # <-- Update this if connection is good
                print("Supabase client initialized successfully")
            except Exception as e:
                # Connection failed, will use in-memory defaults
                print(f"Warning: Failed to initialize Supabase client: {str(e)}")
                print("Using in-memory storage.")
    
    def save_analysis(self, disease: str, confidence: float, description: str, 
                        recommendation: str, image_url: str) -> Dict:
        """Save analysis result to database"""
        data = {
            'disease': disease,
            'confidence': confidence,
            'description': description,
            'recommendation': recommendation,
            'image_url': image_url,
            'created_at': datetime.utcnow().isoformat()
        }
        
        if self.use_supabase:
            try:
                result = self.supabase.table('analyses').insert(data).execute()
                if result.data:
                    return result.data[0]
            except Exception as e:
                print(f"Error saving to Supabase: {str(e)}")
                # Fallback to memory
                return self._save_to_memory(data)
        else:
            return self._save_to_memory(data)
    
    def _save_to_memory(self, data: Dict) -> Dict:
        """Save to in-memory storage (fallback)"""
        data['id'] = str(self._next_id)
        self._next_id += 1 # This line will no longer crash
        self.memory_storage.append(data)
        return data
    
    def get_all_analyses(self) -> List[Dict]:
        """Get all analysis results"""
        if self.use_supabase:
            try:
                result = self.supabase.table('analyses').select('*').order('created_at', desc=True).execute()
                return result.data if result.data else []
            except Exception as e:
                print(f"Error fetching from Supabase: {str(e)}")
                return self._get_from_memory()
        else:
            return self._get_from_memory()
    
    def _get_from_memory(self) -> List[Dict]:
        """Get all from memory storage"""
        return sorted(self.memory_storage, key=lambda x: x.get('created_at', ''), reverse=True)
    
    def delete_analysis(self, id: str) -> bool:
        """Delete analysis by ID"""
        if self.use_supabase:
            try:
                result = self.supabase.table('analyses').delete().eq('id', id).execute()
                return len(result.data) > 0 if result.data else False
            except Exception as e:
                print(f"Error deleting from Supabase: {str(e)}")
                return self._delete_from_memory(id)
        else:
            return self._delete_from_memory(id)
    
    def _delete_from_memory(self, id: str) -> bool:
        """Delete from memory storage"""
        initial_len = len(self.memory_storage)
        self.memory_storage = [item for item in self.memory_storage if item.get('id') != id]
        return len(self.memory_storage) < initial_len