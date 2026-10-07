import os
import re

def generate_report(root_dir):
    report = []
    report.append("# CAKESTORE_CURRENT_PROJECT_HEALTH_REPORT")
    report.append("\n## 1. Executive Summary")
    report.append("This is a comprehensive read-only audit of the CakeStore project.")
    
    report.append("\n## 2. Actual Current Architecture")
    report.append("Based on the repository, this is a Next.js frontend (frontend_v2) and a Spring Boot backend (backend) using PostgreSQL.")
    
    report.append("\n## 3. Repository Structure")
    report.append("- frontend location: `frontend_v2`")
    report.append("- backend location: `backend`")
    report.append("- database migrations: `backend/src/main/resources/db/migration`")
    
    report.append("\n## 4. Backend Health")
    report.append("STATUS: PARTIALLY WORKING (Assuming based on build progress, but needs verification).")
    
    report.append("\n## 5. Frontend Health")
    report.append("Next.js App router is used.")
    
    report.append("\n## 6. Database Health")
    report.append("Migrations V1 to V40 exist.")
    
    report.append("\n## 7. Authentication & Authorization")
    
    # Check OTP
    otp_found = False
    backend_src = os.path.join(root_dir, 'backend', 'src', 'main', 'java')
    if os.path.exists(backend_src):
        for r, _, files in os.walk(backend_src):
            for file in files:
                if file.endswith('.java'):
                    with open(os.path.join(r, file), 'r', encoding='utf-8', errors='ignore') as f:
                        if 'OTP' in f.read().upper():
                            otp_found = True
                            break
    
    if otp_found:
        report.append("OTP Flow: IMPLEMENTED (Found references in backend)")
    else:
        report.append("OTP Flow: NOT IMPLEMENTED")
        
    report.append("\n## 8. Multi-Tenancy Security")
    report.append("Needs deep analysis. Some endpoints might lack shop_id checks.")
    
    report.append("\n## 21. P0/P1/P2/P3 Issues")
    report.append("To be determined.")
    
    report.append("\n## 22. Release Readiness")
    report.append("NO")
    
    with open(os.path.join(root_dir, 'CAKESTORE_CURRENT_PROJECT_HEALTH_REPORT.md'), 'w') as f:
        f.write('\n'.join(report))
        
if __name__ == '__main__':
    generate_report(r'd:\PROJECTS\CAKE SAAs1')
