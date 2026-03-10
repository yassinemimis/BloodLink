# Node.js Dockerfile مناسب لتطبيق Nest/Express
FROM node:18-alpine AS builder
WORKDIR /app

# تثبيت أدوات البناء
RUN apk add --no-cache python3 make g++

# انسخ package.json و pnpm/yarn إذا موجود
COPY package*.json ./
# إن كنت تستخدم pnpm/yarn قم بتعديل أوامر التثبيت
RUN npm ci

# انسخ الشيفرة وبنِّ التطبيق
COPY . .
RUN npm run build

# إنتاجي: صورة أخف لتشغيل الكود
FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production

# نسخ node_modules من مرحلة البناء
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./

# منفذ التطبيق (عدّله إن حاجتك مختلفة)
EXPOSE 3000

# أمر التشغيل — عدّله ليتناسب مع تطبيقك (مثال: nest)
CMD ["node", "dist/main.js"]