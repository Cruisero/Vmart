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
    sql_path = "/var/www/vmart/restore_other_tenants.sql"
    with open(sql_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    match = re.search(r'INSERT IGNORE INTO `orders` \((.*?)\) VALUES\s*(.*?);', content, re.DOTALL | re.IGNORECASE)
    if not match:
        print("Orders insert not found")
        return
        
    cols = [c.strip('` ') for c in match.group(1).split(',')]
    rows_part = match.group(2).strip()
    
    user_id_idx = cols.index('user_id')
    product_id_idx = cols.index('product_id')
    tenant_id_idx = cols.index('tenant_id')
    
    rows = split_rows(rows_part)
    print(f"Total orders in SQL file: {len(rows)}")
    
    uids = set()
    pids = set()
    tids = set()
    
    for r in rows:
        v = parse_sql_values(r)
        if len(v) > user_id_idx:
            uids.add(v[user_id_idx].strip("'\""))
        if len(v) > product_id_idx:
            pids.add(v[product_id_idx].strip("'\""))
        if len(v) > tenant_id_idx:
            tids.add(v[tenant_id_idx].strip("'\""))
            
    print("Unique user_ids in orders SQL:", uids)
    print("Unique product_ids in orders SQL:", pids)
    print("Unique tenant_ids in orders SQL:", tids)

if __name__ == '__main__':
    main()
