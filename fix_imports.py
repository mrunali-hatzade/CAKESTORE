import sys

file_path = 'backend/src/main/java/com/cakeplatform/api/modules/media/CloudinaryMigrationRunner.java'
with open(file_path, 'r') as f:
    content = f.read()

content = content.replace('import com.cakeplatform.api.modules.shop.repository.BusinessDocumentRepository;\n', '')
content = content.replace('import com.cakeplatform.api.modules.shop.repository.ShopRepository;\n', '')

with open(file_path, 'w') as f:
    f.write(content)

file_path = 'backend/src/main/java/com/cakeplatform/api/modules/shop/controller/DocumentAccessController.java'
with open(file_path, 'r') as f:
    content = f.read()

content = content.replace('import com.cakeplatform.api.modules.shop.repository.BusinessDocumentRepository;', 'import com.cakeplatform.api.modules.shop.BusinessDocumentRepository;')

with open(file_path, 'w') as f:
    f.write(content)

print('Fixed imports.')
