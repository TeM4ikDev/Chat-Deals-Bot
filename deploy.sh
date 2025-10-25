#!/bin/bash

# === НАСТРОЙКИ ===
SERVER_USER="root"
SERVER_IP="45.142.44.34"
SERVER_PATH="/root/SVDBASESCAM"
PM2_APP_NAME="basebotv2"

# === 2. Обновляем и перезапускаем на сервере ===
echo "🔁 Обновляю и перезапускаю на сервере..."
# cd backend && npm run env:prod
ssh $SERVER_USER@$SERVER_IP bash -c "'
  cd $SERVER_PATH || exit 1
  
  echo \"📥 Получаю последние изменения из Git...\"
  git pull
  
 
  # echo \"🧹 Останавливаю PM2 приложение...\"
  # pm2 stop $PM2_APP_NAME 2>/dev/null || true
  
  echo \"📦 Устанавливаю зависимости backend...\"
  cd backend
  npm install
  
  echo \"🔧 Генерирую Prisma Client...\"
  npx prisma generate
  npx prisma db push
  
  echo \"🚧 Собираю backend...\"
  npm run build
  
  echo \"📦 Устанавливаю зависимости client...\"
  cd ../client
  npm install
  
  echo \"🚧 Собираю client...\"
  npm run build
    
  echo \"🚀 Запускаю PM2 приложение...\"
  cd ../backend
  pm2 restart $PM2_APP_NAME
'"

echo "✅ Обновление завершено успешно!"
