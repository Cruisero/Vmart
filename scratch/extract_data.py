import re
import os

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

def find_insert_statements(content, table_name):
    pattern = re.compile(r'INSERT\s+INTO\s+`' + re.escape(table_name) + r'`', re.IGNORECASE)
    matches = []
    
    for match in pattern.finditer(content):
        start_idx = match.start()
        in_string = False
        escape = False
        i = start_idx
        n = len(content)
        end_idx = -1
        
        while i < n:
            char = content[i]
            if escape:
                escape = False
            elif char == '\\':
                escape = True
            elif char == "'":
                in_string = not in_string
            elif char == ';' and not in_string:
                end_idx = i + 1
                break
            i += 1
            
        if end_idx != -1:
            matches.append((start_idx, end_idx))
            
    return matches

def split_rows(insert_sql):
    values_idx = insert_sql.upper().find("VALUES")
    if values_idx == -1:
        return []
        
    rows_part = insert_sql[values_idx + 6:].strip()
    if rows_part.endswith(';'):
        rows_part = rows_part[:-1]
        
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

def get_columns_from_schema(content, table_name):
    pattern = re.compile(r'CREATE\s+TABLE\s+`' + re.escape(table_name) + r'`\s*\((.*?)\)\s*ENGINE=', re.DOTALL | re.IGNORECASE)
    match = pattern.search(content)
    if not match:
        return []
    
    cols_block = match.group(1)
    cols = []
    for line in cols_block.split('\n'):
        line = line.strip()
        if line.startswith('`'):
            col_name = line.split('`')[1]
            cols.append(col_name)
    return cols

def clean_json_value(val):
    # Strip enclosing single quotes to check if it's JSON
    stripped = val.strip()
    if stripped.startswith("'") and stripped.endswith("'"):
        inner = stripped[1:-1]
        # Check if the inner string is a JSON array or object
        if (inner.startswith('[') and inner.endswith(']')) or (inner.startswith('{') and inner.endswith('}')):
            # Replace escaped double quotes with regular double quotes
            inner = inner.replace('\\"', '"')
            return f"'{inner}'"
    return val

def main():
    backup_path = "/var/www/vmart/pre_migration_backup.sql"
    out_sql_path = "/var/www/vmart/restore_other_tenants.sql"
    
    target_user_ids = {
        "4da270ee-42a8-424c-a86a-7fafcd694555", # Nancy
        "0d703cad-0c65-4627-b1dc-45e67be9393c", # 88hao
        "66ff4acf-314b-4173-b9c7-64d16e202031", # Platform
        "907d6f1d-1042-4469-8225-271b94f9eec1", # rawbump
    }
    
    target_tenant_id = "59c7246a-5c02-4cca-9a73-154e11f9e294" # 88hao tenant_id
    
    print(f"Reading backup from: {backup_path}")
    with open(backup_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
        
    restore_sql_blocks = []
    
    tables_to_restore = ["users", "products", "product_variants", "orders", "cards"]
    
    extracted_product_ids = set()
    
    for table_name in tables_to_restore:
        print(f"\nProcessing `{table_name}` table...")
        
        # Get columns from schema in backup file
        cols = get_columns_from_schema(content, table_name)
        if not cols:
            print(f"WARNING: Could not extract columns for {table_name}")
            continue
            
        print(f"  Found {len(cols)} columns in backup schema.")
        
        tenant_id_idx = cols.index("tenant_id") if "tenant_id" in cols else -1

        # Detect and handle sort_score in products
        sort_score_idx = -1
        if table_name == "products" and "sort_score" in cols:
            sort_score_idx = cols.index("sort_score")
            print(f"    Detected 'sort_score' column at index {sort_score_idx}. Removing from columns and values...")
            cols.pop(sort_score_idx)
        
        insert_ranges = find_insert_statements(content, table_name)
        extracted_rows = []
        
        for start_idx, end_idx in insert_ranges:
            insert_sql = content[start_idx:end_idx]
            rows = split_rows(insert_sql)
            
            for row in rows:
                vals = parse_sql_values(row)
                if not vals:
                    continue
                    
                keep = False
                if table_name == "users":
                    uid = vals[0].strip("'\"")
                    if uid in target_user_ids:
                        print(f"    Extracted user: ID={uid}, email={vals[1]}")
                        keep = True
                else:
                    # For products, product_variants, orders, cards: check if matches
                    if table_name == "products":
                        if tenant_id_idx != -1 and tenant_id_idx < len(vals):
                            t_val = vals[tenant_id_idx].strip("'\"")
                            # Keep if target tenant, platform tenant, or NULL/empty
                            if (t_val == target_tenant_id or 
                                t_val == "e39f0b4c-630b-4e9c-98b7-49a4f58afe7c" or 
                                t_val == "NULL" or 
                                t_val == "" or
                                "NULL" in vals[tenant_id_idx].upper()):
                                keep = True
                        else:
                            # Fallback
                            if any(target_tenant_id in v for v in vals) or any("e39f0b4c-630b-4e9c-98b7-49a4f58afe7c" in v for v in vals) or any("NULL" in v.upper() for v in vals):
                                keep = True
                        
                        if keep:
                            print(f"    Extracted product: ID={vals[0].strip('\'\"')}, name={vals[2]}, tenant_id={vals[tenant_id_idx] if tenant_id_idx != -1 else 'N/A'}")
                    elif table_name == "product_variants":
                        if len(vals) > 1:
                            pid = vals[1].strip("'\"")
                            if pid in extracted_product_ids:
                                keep = True
                                print(f"    Extracted variant: ID={vals[0].strip('\'\"')}, product_id={pid}, name={vals[2]}")
                    else:
                        if any(target_tenant_id in v for v in vals):
                            if table_name == "orders":
                                print(f"    Extracted order: ID={vals[0].strip('\'\"')}, order_no={vals[1]}")
                            elif table_name == "cards":
                                print(f"    Extracted card: ID={vals[0].strip('\'\"')}")
                            keep = True
                        
                if keep:
                    if table_name == "products":
                        pid = vals[0].strip("'\"")
                        extracted_product_ids.add(pid)
                        
                    # Remove sort_score value if index was set
                    if sort_score_idx != -1:
                        vals.pop(sort_score_idx)
                    
                    # Clean all JSON values to fix backslash escaping issues
                    cleaned_vals = [clean_json_value(v) for v in vals]
                    
                    new_row = "(" + ",".join(cleaned_vals) + ")"
                    extracted_rows.append(new_row)
                    
        if extracted_rows:
            cols_str = ", ".join([f"`{c}`" for c in cols])
            block = f"INSERT IGNORE INTO `{table_name}` ({cols_str}) VALUES\n" + ",\n".join(extracted_rows) + ";"
            restore_sql_blocks.append(block)
            
    print(f"\nWriting restore SQL to: {out_sql_path}")
    with open(out_sql_path, 'w', encoding='utf-8') as f:
        f.write("\n\n".join(restore_sql_blocks))
        # Append categories update to reset them to platform categories
        f.write("\n\n-- Reset categories to platform categories\n")
        f.write("UPDATE `categories` SET `tenant_id` = NULL;\n")
        
    print("Extraction and script writing completed successfully!")

if __name__ == '__main__':
    main()
