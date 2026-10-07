import os
import re
import json

def scan_project(root_dir):
    report = {}
    
    # 1. Project Structure
    report['structure'] = {
        'frontend': os.path.exists(os.path.join(root_dir, 'frontend_v2')),
        'backend': os.path.exists(os.path.join(root_dir, 'backend')),
    }
    
    # 3. Auth
    auth_text = ""
    backend_src = os.path.join(root_dir, 'backend', 'src', 'main', 'java')
    if os.path.exists(backend_src):
        for root, _, files in os.walk(backend_src):
            for file in files:
                if file.endswith('.java'):
                    with open(os.path.join(root, file), 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        if 'OTP' in content.upper():
                            auth_text += f"OTP found in {file}\n"
    report['auth_otp'] = auth_text if auth_text else "NOT IMPLEMENTED"
    
    with open('audit_raw.json', 'w') as f:
        json.dump(report, f)
        
    print("Audit script finished.")

if __name__ == '__main__':
    scan_project(r'd:\PROJECTS\CAKE SAAs1')
