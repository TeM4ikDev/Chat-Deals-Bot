import { DatabaseService } from "@/database/database.service";
import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ScammerStatus } from "@prisma/client";
import input from "input"; // npm i input
import { TelegramClient as TelegramClientClass } from "telegram";
import { SocksProxyType } from "telegram/network/connection/TCPMTProxy";
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

  apiId = this.configService.get('API_ID')
  apiHash = this.configService.get('API_HASH')
  
  session = new StringSession(this.configService.get('TELEGRAM_SESSION'))

  async onModuleInit() {
    await this.createClient();
    // console.log(this.session)
    // this.updatePrevUsersCollectionUsernames();
    // await this.updateScammersRegistrationDate();
    // console.log("data", this.getRegistrationDateByTelegramId(7226605952))
  }

  async createClient() {
    try {
      this.client = new TelegramClientClass(this.session, Number(this.apiId), this.apiHash, {
        connectionRetries: 5,
        // proxy: proxy,
        // useWSS: false,
      });

      await this.client.start({
        phoneNumber: async () => await input.text("Номер телефона: "),
        password: async () => await input.text("Пароль (если есть 2FA): "),
        phoneCode: async () => await input.text("Код из Telegram: "),
        onError: (err) => console.log(err),
      });

      // console.log("Твоя session string:");
      // console.log(this.client.session.save());
      // this.client.session.save()

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
        // registrationDate: null,
        telegramId: {
          not: null
        }
      }
    })

    console.log(`Найдено scammers для обновления: ${scammers.length}`)

    for (let i = 0; i < scammers.length; i++) {
      const scammer = scammers[i];
      console.log(i, "." ,scammer.username)
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
        status: ScammerStatus.SCAMMER,
        username: {
          not: null
        },
        collectionUsernames: {
          none: {}
        }
      },
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
            telegramId: info?.telegramId,
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
    const id = BigInt(typeof telegramId === 'string' ? parseInt(telegramId) : telegramId);

    const referencePoints = [
      { id: 1n, date: new Date('2015-06-01') },
      { id: 10000n, date: new Date('2015-06-01') },
      { id: 100000n, date: new Date('2015-06-01') },
      { id: 1000000n, date: new Date('2015-06-01') },
      { id: 10000000n, date: new Date('2015-06-01') },
      { id: 50000000n, date: new Date('2015-06-01') },
      { id: 100000000n, date: new Date('2015-06-01') },
      { id: 150000000n, date: new Date('2015-10-01') },
      { id: 200000000n, date: new Date('2016-02-01') },
      { id: 250000000n, date: new Date('2016-06-01') },
      { id: 300000000n, date: new Date('2016-11-01') },
      { id: 350000000n, date: new Date('2017-02-01') },
      { id: 400000000n, date: new Date('2017-06-01') },
      { id: 450000000n, date: new Date('2017-09-01') },
      { id: 500000000n, date: new Date('2017-11-01') },
      { id: 550000000n, date: new Date('2018-02-01') },
      { id: 600000000n, date: new Date('2018-05-01') },
      { id: 650000000n, date: new Date('2018-07-01') },
      { id: 700000000n, date: new Date('2018-10-01') },
      { id: 750000000n, date: new Date('2018-10-01') },
      { id: 800000000n, date: new Date('2019-03-01') },
      { id: 850000000n, date: new Date('2019-03-01') },
      { id: 900000000n, date: new Date('2019-07-01') },
      { id: 950000000n, date: new Date('2019-07-01') },
      { id: 1000000000n, date: new Date('2019-10-01') },
      { id: 1050000000n, date: new Date('2019-10-01') },
      { id: 1100000000n, date: new Date('2020-02-01') },
      { id: 1150000000n, date: new Date('2020-03-01') },
      { id: 1200000000n, date: new Date('2020-03-01') },
      { id: 1250000000n, date: new Date('2020-03-01') },
      { id: 1300000000n, date: new Date('2020-06-01') },
      { id: 1400000000n, date: new Date('2020-10-01') },
      { id: 1500000000n, date: new Date('2021-01-01') },
      { id: 1600000000n, date: new Date('2021-01-01') },
      { id: 1700000000n, date: new Date('2021-03-01') },
      { id: 1900000000n, date: new Date('2021-07-01') },
      { id: 2000000000n, date: new Date('2021-09-01') },
      { id: 2500000000n, date: new Date('2022-03-01') },
      { id: 3000000000n, date: new Date('2022-03-01') },
      { id: 4500000000n, date: new Date('2022-03-01') },
      { id: 5000000000n, date: new Date('2022-03-01') },
      { id: 5500000000n, date: new Date('2022-06-01') },
      { id: 5550000000n, date: new Date('2022-06-01') },
      { id: 8228058902n, date: new Date('2025-09-20') }
    ];

    let lowerPoint = referencePoints[0];
    let upperPoint = referencePoints[referencePoints.length - 1];

    for (let i = 0; i < referencePoints.length - 1; i++) {
      if (id >= referencePoints[i].id && id <= referencePoints[i + 1].id) {
        lowerPoint = referencePoints[i];
        upperPoint = referencePoints[i + 1];
        break;
      }
    }

    if (id < referencePoints[0].id) return referencePoints[0].date;
    if (id > referencePoints[referencePoints.length - 1].id) return upperPoint.date;

    const idDiff = Number(upperPoint.id - lowerPoint.id);
    const dateDiff = upperPoint.date.getTime() - lowerPoint.date.getTime();
    const progress = Number(id - lowerPoint.id) / idDiff;
    const estimatedTime = lowerPoint.date.getTime() + dateDiff * progress;

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
    telegramId: string;
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
        telegramId: userId,
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