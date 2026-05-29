import re

def main():
    backup_path = "/var/www/vmart/pre_migration_backup.sql"
    with open(backup_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
        
    print("Found CREATE TABLE statements:")
    for match in re.finditer(r'CREATE TABLE\s+[`"]?([^`"\s(]+)[`"]?', content, re.IGNORECASE):
        table_name = match.group(1)
        start = match.start()
        # Find ending
        end = content.find(';', start)
        schema = content[start:end+1]
        print(f"\n--- Schema for table `{table_name}` ---")
        print(schema)

if __name__ == '__main__':
    main()
