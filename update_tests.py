import os
import re

files_to_update = [
    'backend/src/test/java/com/cakeplatform/api/modules/auth/RegistrationIdentityIntegrityTest.java',
    'backend/src/test/java/com/cakeplatform/api/modules/media/GuestMediaUploadSecurityTest.java',
    'backend/src/test/java/com/cakeplatform/api/modules/security/StageEProductionHardeningTest.java',
    'backend/src/test/java/com/cakeplatform/api/modules/user/OwnerAccountDeletionTest.java'
]

for file_path in files_to_update:
    with open(file_path, 'r') as f:
        content = f.read()
    
    content = content.replace('import com.cakeplatform.api.modules.media.MediaUploadService;', 'import com.cakeplatform.api.modules.media.StorageService;')
    content = content.replace('MediaUploadService', 'StorageService')
    content = content.replace('mediaUploadService', 'storageService')
    
    with open(file_path, 'w') as f:
        f.write(content)

print('Updated test files.')
