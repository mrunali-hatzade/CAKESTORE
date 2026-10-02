# Build stage
FROM maven:3.9.4-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
# Build the application, skipping tests for faster docker build
RUN mvn clean package -DskipTests

# Run stage
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Create a non-root system user and group
RUN addgroup -S spring && adduser -S spring -G spring

COPY --from=build /app/target/*.jar app.jar

# Create uploads directory and assign ownership
RUN mkdir -p uploads && chown -R spring:spring /app

# Run as non-root user
USER spring:spring

# Expose port
EXPOSE 8080

# Docker Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://localhost:8080/actuator/health/liveness || exit 1

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]


