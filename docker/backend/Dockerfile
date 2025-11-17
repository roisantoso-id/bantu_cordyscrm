# 后端 Dockerfile - 独立部署
FROM eclipse-temurin:21-jdk AS build

WORKDIR /build

# 复制后端代码
COPY backend /build/backend
COPY pom.xml mvnw .mvn /build/

# 构建后端
RUN ./mvnw clean package -DskipTests -pl '!frontend' && \
    mkdir backend/app/target/dependency && \
    cd backend/app/target/dependency && \
    jar -xf ../*.jar

# 运行环境
FROM ghcr.io/cordys-dev/cordys-base:latest

LABEL maintainer="FIT2CLOUD <support@fit2cloud.com>"

ARG MODULE=app
ARG DEPENDENCY=/build/backend/${MODULE}/target/dependency

# 复制构建产物
COPY --from=build ${DEPENDENCY}/BOOT-INF/lib /app/lib
COPY --from=build ${DEPENDENCY}/META-INF /app/META-INF
COPY --from=build ${DEPENDENCY}/BOOT-INF/classes /app

# 复制启动脚本和配置
COPY installer/shells /shells
COPY installer/conf /installer/conf
COPY installer/mcp /app/mcp

# 环境变量
ENV JAVA_CLASSPATH=/app:/app/lib/*
ENV JAVA_MAIN_CLASS=cn.cordys.Application
ENV AB_OFF=true
ENV JAVA_OPTIONS="-Dfile.encoding=utf-8 -Djava.awt.headless=true --add-opens java.base/jdk.internal.loader=ALL-UNNAMED --add-opens java.base/java.util=ALL-UNNAMED"

ARG CRM_VERSION=main
ENV CRM_VERSION=${CRM_VERSION}

RUN echo "CRM_VERSION value during build: ${CRM_VERSION}" && \
    echo -n "${CRM_VERSION}" > /tmp/CRM_VERSION && \
    chmod 777 /shells/*.sh

VOLUME [ "/opt/cordys" ]

EXPOSE 8081 8082

ENTRYPOINT ["sh", "/shells/start-all.sh"]




