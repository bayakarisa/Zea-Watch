import os
import json
from datetime import datetime
from typing import Optional, List, Dict

class DatabaseService:
    def __init__(self):
        self.db_file = 'analysis_records.json'
        self.memory_storage = self._load_db()
        
        # Set the next ID based on the highest existing ID
        if self.memory_storage:
            self._next_id = max(int(item.get('id', 0)) for item in self.memory_storage) + 1
        else:
            self._next_id = 1
            
        print(f"Using existing database: {self.db_file}")

    def _load_db(self) -> List[Dict]:
        """Load the JSON database file from disk."""
        if not os.path.exists(self.db_file):
            return []
        try:
            with open(self.db_file, 'r') as f:
                data = json.load(f)
                return data if isinstance(data, list) else []
        except json.JSONDecodeError:
            print(f"Warning: {self.db_file} is corrupted. Starting with an empty database.")
            return []

    def _save_db(self):
        """Save the in-memory database to the JSON file."""
        try:
            with open(self.db_file, 'w') as f:
                json.dump(self.memory_storage, f, indent=4)
        except IOError as e:
            print(f"Error saving database: {e}")
    
    def save_analysis(self, disease: str, confidence: float, description: str, 
                        recommendation: str, image_url: str) -> Dict:
        """Save analysis result to the JSON database."""
        data = {
            'disease': disease,
            'confidence': confidence,
            'description': description,
            'recommendation': recommendation,
            'image_url': image_url,
            'created_at': datetime.utcnow().isoformat()
        }
        
        data['id'] = str(self._next_id)
        self._next_id += 1
        
        self.memory_storage.append(data)
        self._save_db() # Save changes to the file
        return data
    
    def get_all_analyses(self) -> List[Dict]:
        """
        Get all analysis results, sorted by date.
        This is the function that was missing.
        """
        # Data is already in memory, just sort and return it
        return sorted(self.memory_storage, key=lambda x: x.get('created_at', ''), reverse=True)
    
    def delete_analysis(self, id: str) -> bool:
        """Delete analysis by ID from the JSON database."""
        initial_len = len(self.memory_storage)
        self.memory_storage = [item for item in self.memory_storage if item.get('id') != id]
        
        # If an item was actually deleted, save the change
        if len(self.memory_storage) < initial_len:
            self._save_db()
            return True
        return False