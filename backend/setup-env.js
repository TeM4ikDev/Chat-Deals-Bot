#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const environment = process.argv[2] || 'development';

const envFiles = {
  development: 'env.development',
  production: 'env.production'
};

const sourceFile = envFiles[environment];
const targetFile = '.env';

if (!sourceFile) {
  console.error('❌ Неверное окружение. Используйте: development, production');
  process.exit(1);
}

const sourcePath = path.join(__dirname, sourceFile);
const targetPath = path.join(__dirname, targetFile);

if (!fs.existsSync(sourcePath)) {
  console.error(`❌ Файл ${sourceFile} не найден!`);
  console.log('📝 Доступные файлы окружения:');
  Object.entries(envFiles).forEach(([env, file]) => {
    const exists = fs.existsSync(path.join(__dirname, file));
    console.log(`  ${env}: ${file} ${exists ? '✅' : '❌'}`);
  });
  process.exit(1);
}

try {
  fs.copyFileSync(sourcePath, targetPath);
  console.log(`✅ Файл окружения скопирован: ${sourceFile} → ${targetFile}`);
  console.log(`🌍 Окружение: ${environment}`);
} catch (error) {
  console.error('❌ Ошибка при копировании файла:', error.message);
  process.exit(1);
}
