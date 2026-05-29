import re
import subprocess
import os

def get_vmart_schema(table_name):
    # Fetch show create table from docker
    cmd = ["docker", "exec", "kashop-mysql", "mysql", "-u", "root", "-proot123", "-N", "-B", "-e", f"show create table kashop.{table_name}"]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise Exception(f"Failed to get schema for {table_name}: {res.stderr}")
    
    # The output is table_name\tCREATE TABLE ...
    parts = res.stdout.strip().split('\t', 1)
    if len(parts) < 2:
        raise Exception(f"Unexpected output format for {table_name}: {res.stdout}")
    
    schema = parts[1]
    return schema

def parse_sql_values(row_str):
    # row_str starts with '(' and ends with ')'
    # We split it by commas, respecting string literals and escaped quotes
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
    # Find all start indices of INSERT INTO `table_name`
    pattern = re.compile(r'INSERT\s+INTO\s+`' + re.escape(table_name) + r'`', re.IGNORECASE)
    matches = []
    
    for match in pattern.finditer(content):
        start_idx = match.start()
        # Scan forward to find the ending semicolon, ignoring semicolons inside string literals
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

def process_insert_values(insert_sql, table_name, cols, tenant_id):
    values_idx = insert_sql.upper().find("VALUES")
    if values_idx == -1:
        return insert_sql
        
    prefix = insert_sql[:values_idx + 6]
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
            
    new_rows = []
    multi_tenant_tables = ["cards", "categories", "products", "orders", "tickets", "users"]
    
    for row in rows:
        vals = parse_sql_values(row)
        
        # 1. Product sort_score removal
        if table_name == "products":
            if len(vals) == 20:
                # Remove 19th element (sort_score) at index 18
                vals.pop(18)
                
        # 2. Filter out legacy admin row from users table
        if table_name == "users":
            # The remote admin ID is '907d6f1d-1042-4469-8225-271b94f9eec1'
            if len(vals) > 0 and vals[0] in ("'907d6f1d-1042-4469-8225-271b94f9eec1'", '"907d6f1d-1042-4469-8225-271b94f9eec1"'):
                print(f"Filtering out admin user row with ID: {vals[0]}")
                continue
                
        # 3. Append tenant_id to multi-tenant tables
        if table_name in multi_tenant_tables:
            vals.append(f"'{tenant_id}'")
            
        new_row = "(" + ",".join(vals) + ")"
        new_rows.append(new_row)
        
    if not new_rows:
        return ""
        
    return prefix + "\n" + ",\n".join(new_rows) + ";"

def main():
    dump_path = "/Users/bradpit/Downloads/haodongxi_2026-05-21T18-31-25.sql"
    out_path = "/Users/bradpit/Downloads/haodongxi_2026-05-21T18-31-25_vmart.sql"
    
    print(f"Reading source dump from: {dump_path}")
    with open(dump_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Global User ID replacement to target owner user ID
    print("Performing global ID substitution for the owner user ID...")
    content = content.replace('42f4723f-4635-4e36-88bd-9518a013e320', '907d6f1d-1042-4469-8225-271b94f9eec1')
    
    tables = [
        "cards", "categories", "orders", "payments", 
        "product_variants", "products", "settings", 
        "site_visits", "ticket_messages", "tickets", "users"
    ]
    
    for table_name in tables:
        print(f"\nProcessing table: {table_name}...")
        
        # 1. Locate the legacy block
        pattern_str = r'DROP TABLE IF EXISTS `' + re.escape(table_name) + r'`;.*?' + re.escape('/*!40101 SET character_set_client = @saved_cs_client */;')
        pattern = re.compile(pattern_str, re.DOTALL)
        
        legacy_match = pattern.search(content)
        if not legacy_match:
            print(f"WARNING: Could not find legacy schema block for {table_name}")
            continue
            
        legacy_block = legacy_match.group(0)
        
        # 2. Extract legacy columns
        match_create = re.search(r'CREATE TABLE `' + re.escape(table_name) + r'` \((.*?)\) ENGINE=', legacy_block, re.DOTALL | re.IGNORECASE)
        if not match_create:
            print(f"WARNING: Could not find CREATE TABLE block inside legacy block for {table_name}")
            continue
            
        cols_block = match_create.group(1)
        cols = []
        for line in cols_block.split('\n'):
            line = line.strip()
            if line.startswith('`'):
                col_name = line.split('`')[1]
                cols.append(col_name)
                
        print(f"Found legacy columns for {table_name}: {', '.join(cols)}")
        
        # 3. Retrieve new Vmart schema
        vmart_create = get_vmart_schema(table_name)
        new_block = (
            f"DROP TABLE IF EXISTS `{table_name}`;\n"
            "/*!40101 SET @saved_cs_client     = @@character_set_client */;\n"
            "/*!50503 SET character_set_client = utf8mb4 */;\n"
            f"{vmart_create};\n"
            "/*!40101 SET character_set_client = @saved_cs_client */;"
        )
        
        # 4. Replace schema in content
        content = content.replace(legacy_block, new_block)
        print(f"Replaced schema definition for {table_name} with Vmart target schema.")
        
        # 5. Rewrite INSERT INTO statements using robust state-machine boundary finder
        insert_ranges = find_insert_statements(content, table_name)
        print(f"Found {len(insert_ranges)} INSERT INTO statements for {table_name}.")
        
        # Replace in reverse order so string indices remain valid
        for start_idx, end_idx in reversed(insert_ranges):
            old_insert = content[start_idx:end_idx]
            
            # Columns list to use
            if table_name == "products":
                if "sort_score" in cols:
                    cols_to_use = [c for c in cols if c != "sort_score"]
                else:
                    cols_to_use = list(cols)
            else:
                cols_to_use = list(cols)
                
            multi_tenant_tables = ["cards", "categories", "products", "orders", "tickets", "users"]
            if table_name in multi_tenant_tables:
                cols_to_use.append("tenant_id")
                
            # Process insert values
            new_insert = process_insert_values(old_insert, table_name, cols, "9a56e9e1-aeb3-4ae7-a584-91ab66f5fa3f")
            
            if not new_insert.strip():
                content = content[:start_idx] + content[end_idx:]
                continue
                
            cols_str = ', '.join([f'`{c}`' for c in cols_to_use])
            
            new_insert_with_cols = re.sub(
                r'INSERT\s+INTO\s+`' + re.escape(table_name) + r'`\s+VALUES',
                f'INSERT INTO `{table_name}` ({cols_str}) VALUES',
                new_insert,
                flags=re.IGNORECASE
            )
            
            content = content[:start_idx] + new_insert_with_cols + content[end_idx:]
            
    print(f"\nWriting converted SQL dump to: {out_path}")
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Conversion completed successfully!")
    
    # 6. Verification
    print("\n--- Starting Verification ---")
    test_db = "kashop_temp_test"
    print(f"Creating temporary test database '{test_db}' in Docker...")
    
    # Drop test DB if exists
    subprocess.run(["docker", "exec", "kashop-mysql", "mysql", "-u", "root", "-proot123", "-e", f"DROP DATABASE IF EXISTS {test_db}"], check=True)
    # Create test DB
    subprocess.run(["docker", "exec", "kashop-mysql", "mysql", "-u", "root", "-proot123", "-e", f"CREATE DATABASE {test_db}"], check=True)
    
    try:
        # Import the converted SQL into the test DB
        print("Importing converted SQL file into test database...")
        with open(out_path, 'r', encoding='utf-8') as sql_file:
            import_proc = subprocess.run(
                ["docker", "exec", "-i", "kashop-mysql", "mysql", "-u", "root", "-proot123", test_db],
                stdin=sql_file,
                capture_output=True,
                text=True
            )
            
        if import_proc.returncode != 0:
            print(f"ERROR: Import failed with exit code {import_proc.returncode}!")
            print(f"stderr:\n{import_proc.stderr}")
        else:
            print("SUCCESS: Converted SQL file imported perfectly without errors!")
            
            # Verify row counts for a couple of tables to make sure data is intact
            print("\nVerifying row counts and tenant_id mapping:")
            for t in ["users", "products", "orders", "cards"]:
                cnt_proc = subprocess.run(
                    ["docker", "exec", "kashop-mysql", "mysql", "-u", "root", "-proot123", "-N", "-B", "-e", f"SELECT COUNT(*) FROM {test_db}.{t}"],
                    capture_output=True,
                    text=True
                )
                
                # Also count matching tenant ID
                cnt_tenant_proc = subprocess.run(
                    ["docker", "exec", "kashop-mysql", "mysql", "-u", "root", "-proot123", "-N", "-B", "-e", f"SELECT COUNT(*) FROM {test_db}.{t} WHERE tenant_id = '9a56e9e1-aeb3-4ae7-a584-91ab66f5fa3f'"],
                    capture_output=True,
                    text=True
                )
                
                if cnt_proc.returncode == 0:
                    print(f"  Table `{t}` has {cnt_proc.stdout.strip()} records (with matching tenant_id: {cnt_tenant_proc.stdout.strip()}).")
                    
    finally:
        print(f"\nDropping temporary test database '{test_db}'...")
        subprocess.run(["docker", "exec", "kashop-mysql", "mysql", "-u", "root", "-proot123", "-e", f"DROP DATABASE IF EXISTS {test_db}"], check=True)
        print("Verification cleanup complete.")

if __name__ == '__main__':
    main()
