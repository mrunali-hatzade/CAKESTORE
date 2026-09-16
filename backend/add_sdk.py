import sys

file_path = 'pom.xml'
with open(file_path, 'r') as f:
    content = f.read()

if 'cloudinary-http44' not in content:
    dependency = '''
        <!-- Cloudinary SDK -->
        <dependency>
            <groupId>com.cloudinary</groupId>
            <artifactId>cloudinary-http44</artifactId>
            <version>1.36.0</version>
        </dependency>
'''
    content = content.replace('</dependencies>', dependency + '    </dependencies>')
    
    with open(file_path, 'w') as f:
        f.write(content)
    print('Added Cloudinary SDK')
else:
    print('Already has Cloudinary SDK')
