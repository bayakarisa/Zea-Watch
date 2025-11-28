
import sys
sys.stdout.reconfigure(encoding='utf-8')

import collections

try:
    with open('startup_log_8.txt', 'r', encoding='utf-16', errors='replace') as f:
        for line in f:
            if '[DEBUG]' in line or 'Error' in line or 'admin/stats' in line:
                print(line.strip())
except Exception:
    try:
        with open('startup_log_8.txt', 'r', encoding='utf-8', errors='replace') as f:
            for line in f:
                if '[DEBUG]' in line or 'Error' in line or 'admin/stats' in line:
                    print(line.strip())
    except Exception as e:
        print(f"Error reading file: {e}")
