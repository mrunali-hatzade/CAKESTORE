import os
import re

files_to_update = [
    'backend/src/main/java/com/cakeplatform/api/modules/auth/service/AuthService.java',
    'backend/src/main/java/com/cakeplatform/api/modules/media/MediaController.java',
    'backend/src/main/java/com/cakeplatform/api/modules/storefront/CustomerMediaController.java',
    'backend/src/main/java/com/cakeplatform/api/modules/user/service/OwnerAccountDeletionService.java'
]

for file_path in files_to_update:
    with open(file_path, 'r') as f:
        content = f.read()
    
    content = content.replace('import com.cakeplatform.api.modules.media.MediaUploadService;', 'import com.cakeplatform.api.modules.media.StorageService;')
    content = content.replace('MediaUploadService', 'StorageService')
    content = content.replace('mediaUploadService', 'storageService')
    
    with open(file_path, 'w') as f:
        f.write(content)

print('Updated files.')
