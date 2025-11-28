
try:
    with open('startup_log.txt', 'r', encoding='utf-16') as f:
        for line in f:
            if 'admin' in line or 'Rule' in line or '->' in line:
                print(line.strip())
except Exception:
    try:
        with open('startup_log.txt', 'r', encoding='utf-8') as f:
            for line in f:
                if 'admin' in line or 'Rule' in line or '->' in line:
                    print(line.strip())
    except Exception as e:
        print(f"Error reading file: {e}")
