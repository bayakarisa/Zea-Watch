import os
import json
from datetime import datetime
from pathlib import Path

class DatabaseService:
    def __init__(self):
        self.db_file = os.getenv('DB_FILE', 'analysis_records.json')
        
        # If DB_FILE is not set, use in-memory storage
        if not self.db_file or self.db_file == 'memory':
            self.use_memory = True
            self.records = []
            print("Using in-memory storage.")
        else:
            self.use_memory = False
            # Ensure the database file exists
            if not os.path.exists(self.db_file):
                Path(self.db_file).write_text('[]')
                print(f"Created new database file: {self.db_file}")
            else:
                print(f"Using existing database: {self.db_file}")

    def save_analysis(self, disease, confidence, description, recommendation, image_url):
        """Save analysis results to database."""
        record = {
            'id': self._generate_id(),
            'disease': disease,
            'confidence': confidence,
            'description': description,
            'recommendation': recommendation,
            'image_url': image_url,
            'created_at': datetime.now().isoformat()
        }

        if self.use_memory:
            self.records.append(record)
        else:
            records = self._read_records()
            records.append(record)
            self._write_records(records)

        return record

    def get_analysis_history(self):
        """Retrieve analysis history."""
        if self.use_memory:
            return self.records
        return self._read_records()

    def _generate_id(self):
        """Generate a unique ID for new records."""
        existing = self.get_analysis_history()
        if not existing:
            return 1
        return max(record['id'] for record in existing) + 1

    def _read_records(self):
        """Read records from JSON file."""
        if not os.path.exists(self.db_file):
            return []
        with open(self.db_file, 'r') as f:
            return json.load(f)

    def _write_records(self, records):
        """Write records to JSON file."""
        with open(self.db_file, 'w') as f:
            json.dump(records, f, indent=2)