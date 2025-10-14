import { DatabaseService } from "@/database/database.service";
import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import input from "input"; // npm i input
import { TelegramClient as TelegramClientClass } from "telegram";
import { StringSession } from "telegram/sessions";
import { Api } from "telegram/tl";

@Injectable()
export class TelegramClient {

  constructor(
    @Inject(forwardRef(() => DatabaseService))
    private readonly database: DatabaseService,
    @Inject(forwardRef(() => ConfigService))
    private readonly configService: ConfigService,
  ) { }

  client: TelegramClientClass

  apiId = 1360482307
  apiHash = "95def91b17083ec9e21c34065ed00508"
  session = new StringSession(this.configService.get('TELEGRAM_SESSION'))

  async onModuleInit() {
    await this.createClient();
    // await this.updatePrevUsersCollectionUsernames();
    // await this.updateScammersRegistrationDate();
  }

  async createClient() {
    try {
      this.client = new TelegramClientClass(this.session, this.apiId, this.apiHash, {
        connectionRetries: 5,
      });

      await this.client.start({
        phoneNumber: async () => await input.text("Введи номер: "),
        password: async () => await input.text("Пароль (если есть 2FA): "),
        phoneCode: async () => await input.text("Код из Telegram: "),
        onError: (err) => console.log(err),
      });

      // console.log("Твоя session string:");
      // console.log(client.session.save());

      // const mainUsername = "fometa";
      // await this.getUserData('sdjcnjksdncjknskjdcnkjsdck');
    } catch (err) {
      console.error("Ошибка при получении информации:", err);
    }
  }

  getClient() {
    return this.client;
  }

  async updateScammersRegistrationDate() {
    const scammers = await this.database.scammer.findMany({
      where: {
        registrationDate: null,
        telegramId: {
          not: null
        }
      }
    })

    for (let i = 0; i < scammers.length; i++) {
      const scammer = scammers[i];
      const registrationDate = this.getRegistrationDateByTelegramId(scammer.telegramId)
      await this.database.scammer.update({
        where: { id: scammer.id },
        data: { registrationDate: registrationDate }
      })
    }
  }

  async updatePrevUsersCollectionUsernames() {
    const scammers = await this.database.scammer.findMany({
      where: {
        username: {
          not: null
        },
        collectionUsernames: {
          none: {}
        }
      },

      take: 10,
     
    })

    console.log(`Найдено scammers для обновления: ${scammers.length}`)

    // return // Раскомментируй это, если хочешь остановить процесс

    for (let i = 0; i < scammers.length; i++) {
      const scammer = scammers[i];
      
      try {
        console.log(`Обрабатываю ${i + 1}/${scammers.length}: ${scammer.username}`)
        
        const info = await this.getUserData(scammer.username)
        console.log(info)

        if (!info) {
          // Задержка даже при ошибке, чтобы не перегружать API
          await this.delay(1500);
          continue;
        }

        await this.database.scammer.update({
          where: { id: scammer.id },
          data: {
            telegramId: info?.id,
            // about: info?.about,

            collectionUsernames: {
              createMany: {
                data: info?.collectionUsernames?.map((username) => ({
                  username: username,
                })) || [],
              }
            }
          }
        })

        // Задержка 1.5 секунды между запросами (безопасный интервал)
        await this.delay(1500);
        
      } catch (error) {
        // console.error(`Ошибка при обработке ${scammer.username}:`, error);
        // // При ошибке FloodWait увеличиваем задержку
        // if (error?.errorMessage?.includes('FLOOD_WAIT')) {
        //   const waitTime = parseInt(error.errorMessage.match(/\d+/)?.[0] || '60');
        //   console.log(`FloodWait ошибка, ждем ${waitTime} секунд...`);
        //   await this.delay(waitTime * 1000);
        // } else {
        //   await this.delay(2000); // 2 секунды при других ошибках
        // }
      }
    }

    console.log('Обновление завершено!')
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getRegistrationDateByTelegramId(telegramId: number | string): Date {
    const id = typeof telegramId === 'string' ? parseInt(telegramId) : telegramId;
    
    // Реперные точки: известные ID и их примерные даты регистрации
    // Обновленные более точные данные
    const referencePoints = [
      { id: 1, date: new Date('2015-06-01') },
      { id: 10000, date: new Date('2015-06-01') },
      { id: 100000, date: new Date('2015-06-01') },
      { id: 1000000, date: new Date('2015-06-01') },
      { id: 10000000, date: new Date('2015-06-01') },
      { id: 50000000, date: new Date('2015-06-01') },
      { id: 100000000, date: new Date('2015-06-01') },
      { id: 150000000, date: new Date('2015-10-01') },
      { id: 200000000, date: new Date('2016-02-01') },
      { id: 250000000, date: new Date('2016-06-01') },
      { id: 300000000, date: new Date('2016-11-01') },
      { id: 350000000, date: new Date('2017-02-01') },
      { id: 400000000, date: new Date('2017-06-01') },
      { id: 450000000, date: new Date('2017-09-01') },
      { id: 500000000, date: new Date('2017-11-01') },
      { id: 550000000, date: new Date('2018-02-01') },
      { id: 600000000, date: new Date('2018-05-01') },
      { id: 650000000, date: new Date('2018-07-01') },
      { id: 700000000, date: new Date('2018-10-01') },
      { id: 750000000, date: new Date('2018-10-01') },
      { id: 800000000, date: new Date('2019-03-01') },
      { id: 850000000, date: new Date('2019-03-01') },
      { id: 900000000, date: new Date('2019-07-01') },
      { id: 950000000, date: new Date('2019-07-01') },
      { id: 1000000000, date: new Date('2019-10-01') },
      { id: 1050000000, date: new Date('2019-10-01') },
      { id: 1100000000, date: new Date('2020-02-01') },
      { id: 1150000000, date: new Date('2020-03-01') },
      { id: 1200000000, date: new Date('2020-03-01') },
      { id: 1250000000, date: new Date('2020-03-01') },
      { id: 1300000000, date: new Date('2020-06-01') },
      { id: 1400000000, date: new Date('2020-10-01') },
      { id: 1500000000, date: new Date('2021-01-01') },
      { id: 1600000000, date: new Date('2021-01-01') },
      { id: 1700000000, date: new Date('2021-03-01') },
      { id: 1900000000, date: new Date('2021-07-01') },
      { id: 2000000000, date: new Date('2021-09-01') },
      { id: 2500000000, date: new Date('2022-03-01') },
      { id: 3000000000, date: new Date('2022-03-01') },
      { id: 4500000000, date: new Date('2022-03-01') },
      { id: 5000000000, date: new Date('2022-03-01') },
      { id: 5500000000, date: new Date('2022-06-01') },
      { id: 5550000000, date: new Date('2022-06-01') },
      { id: 5800000000, date: new Date('2025-10-01') },
      { id: 5900000000, date: new Date('2025-10-01') },
      { id: 8003158848, date: new Date('2025-10-01') }
    ];
    

    // Найти две ближайшие реперные точки для интерполяции
    let lowerPoint = referencePoints[0];
    let upperPoint = referencePoints[referencePoints.length - 1];

    for (let i = 0; i < referencePoints.length - 1; i++) {
      if (id >= referencePoints[i].id && id <= referencePoints[i + 1].id) {
        lowerPoint = referencePoints[i];
        upperPoint = referencePoints[i + 1];
        break;
      }
    }

    // Если ID меньше минимального
    if (id < referencePoints[0].id) {
      return referencePoints[0].date;
    }

    // Если ID больше максимального
    if (id > referencePoints[referencePoints.length - 1].id) {
      return upperPoint.date;
    }

    // Линейная интерполяция между двумя точками
    const idDiff = upperPoint.id - lowerPoint.id;
    const dateDiff = upperPoint.date.getTime() - lowerPoint.date.getTime();
    const progress = (id - lowerPoint.id) / idDiff;
    const estimatedTime = lowerPoint.date.getTime() + (dateDiff * progress);

    return new Date(estimatedTime);
  }

  getRegistrationDateString(telegramId: number | string): string {
    const date = this.getRegistrationDateByTelegramId(telegramId);
    const month = date.toLocaleString('ru-RU', { month: 'long' });
    const year = date.getFullYear();
    // Делаем первую букву месяца заглавной
    const monthCapitalized = month.charAt(0).toUpperCase() + month.slice(1);
    return `${monthCapitalized} ${year}`;
  }

  async getUserData(id: string | number): Promise<{
    id: string;
    about: string;
    username: string | null;
    collectionUsernames: string[];
    registrationDate: Date;
    registrationDateString: string;
  } | null> {
    try {
      const user = await this.client.invoke(
        new Api.users.GetFullUser({
          id: id,
        })
      );

      if (!user) return;

      const userId = user.fullUser.id.toString();
      const registrationDate = this.getRegistrationDateByTelegramId(userId);
      const registrationDateString = this.getRegistrationDateString(userId);
      
      console.log('User ID:', userId);
      console.log('Дата регистрации:', registrationDateString);
      
      // Раскомментируй для отладки и поиска полей с датами:
      // console.log('Полный объект user:', JSON.stringify(user, null, 2))

      return {
        id: userId,
        username: (user as any)?.users[0]?.username || (user as any)?.users[0]?.usernames[0]?.username || null,
        about: user.fullUser.about,
        collectionUsernames: (user as any)?.users[0]?.usernames?.slice(1).map((username: any) => username.username) || null,
        registrationDate: registrationDate,
        registrationDateString: registrationDateString,
      }
    } catch (error) {
      console.error(`Ошибка при получении информации пользователя ${id}:`);
      return null;
    }
  }


}