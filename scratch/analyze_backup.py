import re
import sys

def main():
    backup_path = "/var/www/vmart/pre_migration_backup.sql"
    
    target_ids = {
        "26c07601-2053-4cd0-8f02-2ae03a5b65c5": "Nancy tenant_id",
        "4da270ee-42a8-424c-a86a-7fafcd694555": "Nancy user_id",
        "59c7246a-5c02-4cca-9a73-154e11f9e294": "88hao tenant_id",
        "0d703cad-0c65-4627-b1dc-45e67be9393c": "88hao user_id",
        "e39f0b4c-630b-4e9c-98b7-49a4f58afe7c": "Platform tenant_id",
        "66ff4acf-314b-4173-b9c7-64d16e202031": "Platform user_id",
        "907d6f1d-1042-4469-8225-271b94f9eec1": "rawbump user_id",
    }
    
    print("Reading backup file...")
    current_table = None
    
    # Store structure: table_name -> { desc_or_id -> count }
    table_stats = {}
    
    with open(backup_path, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            match = re.match(r'INSERT\s+INTO\s+`([^`]+)`', line, re.IGNORECASE)
            if match:
                current_table = match.group(1)
                
            for tid, desc in target_ids.items():
                # Count matches in this line
                matches = line.count(tid)
                if matches > 0:
                    if current_table not in table_stats:
                        table_stats[current_table] = {}
                    key = f"{desc} ({tid})"
                    table_stats[current_table][key] = table_stats[current_table].get(key, 0) + matches
                    
    print("\n=== Data Found in Pre-Migration Backup ===")
    for table, stats in sorted(table_stats.items()):
        print(f"\nTable `{table}`:")
        for desc_id, count in sorted(stats.items()):
            print(f"  - {desc_id}: {count} occurrences")

if __name__ == '__main__':
    main()
