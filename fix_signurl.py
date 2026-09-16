import sys

file_path = 'backend/src/main/java/com/cakeplatform/api/modules/media/CloudinaryUploadServiceImpl.java'
with open(file_path, 'r') as f:
    content = f.read()

content = content.replace('.signUrl(true)', '.signed(true)')

with open(file_path, 'w') as f:
    f.write(content)

print('Fixed signUrl to signed')
