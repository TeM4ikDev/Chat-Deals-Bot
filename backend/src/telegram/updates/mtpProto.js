const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { Api } = require("telegram/tl");
const input = require("input"); // npm i input

const apiId = 29514923;         // возьми на https://my.telegram.org
const apiHash = "95def91b17083ec9e21c34065ed00508";
const session = new StringSession("1AgAOMTQ5LjE1NC4xNjcuNTABu8Zle85/z5OK7gUEOPLMYdNWEpyMWad3/88UmPCbdi337orriWqpDbge3xOuCQcWY8gHu2YHW+NEpHO8NpZKtRKKYzd/AidATNdgL+c70zWf7aVy0JeueqSizYntV84R76AoYQC5ZRk6+YzilyJEy6YxQn6OsmgWt7E/qDXbRCp0uXVnOHtLjJKuqoqUGNWPzbCB2ApW4+uUbyMPcQ9vLzgsyDMLzS5Sd/hrjZYho+MvRta+pDjfKUPP4o5fLKxY7iLDQT5iaKVxTi01w7F81AK62s4umw8kq7mDCckm2sErrCaLC80ckvJGZOk3bg2IlvFKMextS9LDlRjOGDRZoe8="); // сюда можно потом вставить строку сессии после логина

async function main() {
  console.log("Запуск клиента...");
  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => await input.text("Введи номер: "),
    password: async () => await input.text("Пароль (если есть 2FA): "),
    phoneCode: async () => await input.text("Код из Telegram: "),
    onError: (err) => console.log(err),
  });

  console.log("Авторизация успешна!");
  console.log("Твоя session string:");

//   console.log(client.session)
  console.log(client.session.save()); // можешь сохранить, чтобы потом не логиниться заново

  // ====== Поиск подтегов по главному тегу ======
  const mainUsername = "fometa"; // главный тег без "@"

  console.log(`\n=== Поиск подтегов для @${mainUsername} ===\n`);

  try {
    // Получаем информацию о главном username
    const user = await client.getEntity(mainUsername);

    console.log("Информация о пользователе/канале:");
    console.log(`ID: ${user.id}`);
    console.log(`Username: @${user.username || 'N/A'}`);
    console.log(`Тип: ${user.className}`);

    // Получаем полную информацию
    const full = await client.invoke(
      new Api.users.GetFullUser({
        id: user,
      })
    );

    console.log("\nПолная информация:");
    console.log(full.users[0].usernames);

    // Проверяем, является ли это collectible username
    
  } catch (err) {
    console.error("Ошибка при получении информации:", err.errorMessage || err);
  }
}

main();
