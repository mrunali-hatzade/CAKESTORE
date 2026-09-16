import sys

files_to_update = [
    'backend/src/test/java/com/cakeplatform/api/modules/communication/PhaseGCommunicationTest.java',
    'backend/src/test/java/com/cakeplatform/api/modules/security/StageEProductionHardeningTest.java'
]

for file_path in files_to_update:
    with open(file_path, 'r') as f:
        content = f.read()
    
    content = content.replace('com.cakeplatform.api.modules.media.MediaUploadService', 'com.cakeplatform.api.modules.media.LocalMediaUploadServiceImpl')
    content = content.replace('new StorageService(', 'new com.cakeplatform.api.modules.media.LocalMediaUploadServiceImpl(')
    
    with open(file_path, 'w') as f:
        f.write(content)

print('Updated failing tests.')
