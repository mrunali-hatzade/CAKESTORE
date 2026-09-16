
with open('backend/pom.xml', 'r') as f:
    content = f.read()

import re

# Remove all injected bad blocks
content = re.sub(r'<dependency>\s*<groupId>org\.springframework\.boot</groupId>\s*<artifactId>spring-boot-starter-mail</artifactId>\s*</dependency>\s*</dependencies>', '</dependencies>', content)
content = re.sub(r'<dependency>\s*<groupId>org\.springframework\.boot</groupId>\s*<artifactId>spring-boot-starter-actuator</artifactId>\s*</dependency>\s*<dependency>\s*<groupId>org\.springframework\.boot</groupId>\s*<artifactId>spring-boot-starter-mail</artifactId>\s*</dependency>\s*</dependencies>', '</dependencies>', content)
content = re.sub(r'<dependency>\s*<groupId>org\.springframework\.boot</groupId>\s*<artifactId>spring-boot-starter-actuator</artifactId>\s*</dependency>\s*<dependency>\s*<groupId>com\.razorpay</groupId>\s*<artifactId>razorpay-java</artifactId>\s*<version>1\.4\.6</version>\s*</dependency>\s*<dependency>\s*<groupId>org\.springframework\.boot</groupId>\s*<artifactId>spring-boot-starter-actuator</artifactId>\s*</dependency>\s*<dependency>\s*<groupId>org\.springframework\.boot</groupId>\s*<artifactId>spring-boot-starter-mail</artifactId>\s*</dependency>', '''
        <dependency>
            <groupId>com.razorpay</groupId>
            <artifactId>razorpay-java</artifactId>
            <version>1.4.6</version>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-mail</artifactId>
        </dependency>''', content)

with open('backend/pom.xml', 'w') as f:
    f.write(content)

