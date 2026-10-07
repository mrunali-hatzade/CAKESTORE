import os
import re

def analyze_backend(base_dir, out_file):
    with open(out_file, 'w', encoding='utf-8') as f:
        f.write("=== BACKEND TENANCY ANALYSIS ===\n\n")
        
        for root, dirs, files in os.walk(base_dir):
            for file in files:
                if not file.endswith('.java'):
                    continue
                    
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8', errors='ignore') as java_file:
                    content = java_file.read()
                    
                if 'entity' in path.lower() or '@Entity' in content:
                    f.write(f"--- ENTITY: {file} ---\n")
                    if 'shopId' in content or 'Shop shop' in content:
                        f.write("  -> Contains Shop reference\n")
                    else:
                        f.write("  -> No direct Shop reference\n")
                        
                elif 'repository' in path.lower() or '@Repository' in content:
                    f.write(f"--- REPOSITORY: {file} ---\n")
                    lines = content.split('\n')
                    for line in lines:
                        if 'findById' in line or '@Query' in line or 'findBy' in line or 'deleteBy' in line:
                            f.write(f"  {line.strip()}\n")
                            
                elif 'service' in path.lower() or '@Service' in content:
                    f.write(f"--- SERVICE: {file} ---\n")
                    if 'shopId' in content or 'getShop' in content or 'SecurityContextHolder' in content:
                        f.write("  -> Contains shopId or Security checks\n")
                    # Check for potential IDOR: finding by ID without checking shop
                    lines = content.split('\n')
                    for line in lines:
                        if 'findById' in line:
                            f.write(f"  {line.strip()}\n")
                            
                elif 'controller' in path.lower() or '@RestController' in content:
                    f.write(f"--- CONTROLLER: {file} ---\n")
                    lines = content.split('\n')
                    for line in lines:
                        if '@GetMapping' in line or '@PostMapping' in line or '@PutMapping' in line or '@DeleteMapping' in line:
                            f.write(f"  {line.strip()}\n")

if __name__ == '__main__':
    analyze_backend(r'd:\PROJECTS\CAKE SAAs1\backend\src\main\java', 'tenancy_analysis.txt')
