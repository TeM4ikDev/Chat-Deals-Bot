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

    // @Inject(forwardRef(() => UsersService))
    // private readonly usersService: UsersService
  ) { }

  client: TelegramClientClass

  apiId = 29514923
  apiHash = "95def91b17083ec9e21c34065ed00508"
  session = new StringSession(this.configService.get('TELEGRAM_SESSION'))

  async onModuleInit() {
    await this.createClient();
    await this.updatePrevUsersCollectionUsernames();
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
     
    })

    console.log(scammers.length)

    return


    for (const scammer of scammers) {
      const info = await this.getUserData(scammer.username)
      console.log(info)

      if (!info) continue;

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

    }

  }

  async getUserData(id: string | number): Promise<{
    id: string;
    about: string;
    username: string | null;
    collectionUsernames: string[];
  } | null> {
    try {
      const user = await this.client.invoke(
        new Api.users.GetFullUser({
          id: id,
        })
      );

      if (!user) return;

      return {
        id: user.fullUser.id.toString(),
        username: (user as any)?.users[0]?.username || (user as any)?.users[0]?.usernames[0]?.username || null,
        about: user.fullUser.about,
        collectionUsernames: (user as any)?.users[0]?.usernames?.slice(1).map((username: any) => username.username) || null,
      }
    } catch (error) {
      console.error(`Ошибка при получении информации пользователя ${id}:`);
      return null;
    }
  }


}