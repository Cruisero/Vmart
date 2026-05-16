# 开发环境 Dockerfile
FROM node:20-alpine

# 安装 Prisma 所需的 OpenSSL
RUN apk add --no-cache openssl

WORKDIR /app

# 复制 package 文件和 prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# 安装依赖 (使用 libc+musl 平台预编译的 sharp)
RUN npm install --platform=linuxmusl --arch=x64 --libc=musl

# 复制源代码
COPY . .

# 生成 Prisma 客户端（在所有文件复制之后，确保使用最新 schema）
RUN npx prisma generate

# 暴露后端端口
EXPOSE 8080

# 启动开发服务器 (使用 nodemon 热重载)
CMD ["npm", "run", "dev"]
