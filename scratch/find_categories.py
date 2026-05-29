import re

def parse_sql_values(row_str):
    values = []
    current = []
    in_string = False
    escape = False
    
    content = row_str.strip()
    if content.startswith('('):
        content = content[1:]
    if content.endswith(')'):
        content = content[:-1]
        
    i = 0
    n = len(content)
    while i < n:
        char = content[i]
        if escape:
            current.append(char)
            escape = False
        elif char == '\\':
            current.append(char)
            escape = True
        elif char == "'":
            in_string = not in_string
            current.append(char)
        elif char == ',' and not in_string:
            values.append(''.join(current).strip())
            current = []
        else:
            current.append(char)
        i += 1
    if current:
        values.append(''.join(current).strip())
    return values

def split_rows(rows_part):
    rows = []
    current_row = []
    in_string = False
    escape = False
    parenthesis_depth = 0
    
    for char in rows_part:
        if escape:
            current_row.append(char)
            escape = False
        elif char == '\\':
            current_row.append(char)
            escape = True
        elif char == "'":
            in_string = not in_string
            current_row.append(char)
        elif char == '(' and not in_string:
            parenthesis_depth += 1
            current_row.append(char)
        elif char == ')' and not in_string:
            parenthesis_depth -= 1
            current_row.append(char)
            if parenthesis_depth == 0:
                rows.append(''.join(current_row).strip())
                current_row = []
        elif parenthesis_depth > 0:
            current_row.append(char)
            
    return rows

def main():
    backup_path = "/var/www/vmart/pre_migration_backup.sql"
    with open(backup_path, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            if "INSERT INTO `categories`" in line:
                idx = line.find("VALUES")
                if idx != -1:
                    rows = split_rows(line[idx+6:])
                    print(f"Found {len(rows)} categories in backup:")
                    for r in rows:
                        vals = parse_sql_values(r)
                        print(f"  {vals}")

if __name__ == '__main__':
    main()
