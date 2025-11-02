import { UsersService } from '@/users/users.service';
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';
import { DatabaseService } from '../database/database.service';
import { TelegramService } from '../telegram/telegram.service';

interface TickerInfo {
  symbol: string;
  lastPrice: string;
  prevPrice24h: string;
  price24hPcnt: string;
  highPrice24h: string;
  lowPrice24h: string;
}

interface BybitResponse {
  retCode: number;
  retMsg: string;
  result: {
    category: string;
    list: Array<{
      symbol: string;
      lastPrice: string;
      prevPrice24h: string;
      price24hPcnt: string;
      highPrice24h: string;
      lowPrice24h: string;
    }>;
  };
}


@Injectable()
export class BybitService {
  private readonly logger = new Logger(BybitService.name);
  private readonly apiUrl: string;
  private readonly updateIntervalMinutes = 3; // Интервал обновления в минутах
  private previousPrices: Map<string, { price: number; timestamp: Date }> = new Map();
  private changePercentMessage = 5
  private symbolNotifications: Map<string, Date[]> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly telegramService: TelegramService,

    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {
    this.apiUrl = this.configService.get<string>('BYBIT_API_URL', 'https://api.bybit.com');
  }

  onModuleInit() {
    this.checkPrices()
  }

  @Cron('0 */5 * * * *')
  async checkPrices() {
    this.logger.log('Starting price check...');

    try {
      const response = await axios.get<BybitResponse>(
        `${this.apiUrl}/v5/market/tickers`,
        {
          params: {
            category: 'spot',
          },
        },
      );

      if (response.data.retCode !== 0) {
        this.logger.error(`Bybit API error: ${response.data.retMsg}`);
        return;
      }

      const tickers = response.data.result.list;
      const currentTime = new Date();

      // Фильтруем только USDT пары и вычисляем рост за 3 минуты
      const usdtPairs = tickers
        .filter(ticker => ticker.symbol.endsWith('USDT'))
        .map(ticker => {
          const currentPrice = parseFloat(ticker.lastPrice);
          const symbol = ticker.symbol;

          // Получаем предыдущую цену
          const previousData = this.previousPrices.get(symbol);
          let changePercent = 0;

          if (previousData) {
            // Вычисляем процент изменения за 3 минуты
            changePercent = ((currentPrice - previousData.price) / previousData.price) * 100;
          }

          // Сохраняем текущую цену для следующего сравнения
          this.previousPrices.set(symbol, {
            price: currentPrice,
            timestamp: currentTime
          });

          return {
            ...ticker,
            changePercent,
            hasPreviousData: !!previousData,
            previousPrice: previousData?.price ?? null,
          };
        })
        .filter(ticker => ticker.hasPreviousData) // Только те, у которых есть предыдущие данные
        // Фильтруем по абсолютному изменению (и рост, и падение)
        .filter(t => Math.abs(t.changePercent) >= this.changePercentMessage)
        // Сортируем по модулю изменения
        .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));



      console.log(usdtPairs);

      if (usdtPairs.length === 0) {
        this.logger.log('No symbols passed threshold, skipping this check');
        return;
      }

      // Получаем всех пользователей из БД
      const users = await this.databaseService.user.findMany({
        where: {
          banned: false,
        },
      });

      // const users = [await this.usersService.findUserByTelegramId('2027571609')]

      // Формируем и отправляем сообщение по каждому активу, прошедшему порог
      for (const ticker of usdtPairs) {
        const base = ticker.symbol.replace('USDT', '');
        const isPump = ticker.changePercent >= 0;
        const emoji = isPump ? '🟩' : '🟥';
        const label = isPump ? 'Pump' : 'Dump';
        const sign = isPump ? '+' : '-';

        const currentPrice = parseFloat(ticker.lastPrice);
        const previousPrice = typeof ticker.previousPrice === 'number' ? ticker.previousPrice : currentPrice;

        const fromStr = previousPrice.toFixed(3);
        const toStr = currentPrice.toFixed(3);

        // Подсчитываем количество сигналов за 24 часа для данного символа
        const now = new Date();
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const history = this.symbolNotifications.get(base) || [];
        const recent = history.filter(d => d >= dayAgo);
        recent.push(now);
        this.symbolNotifications.set(base, recent);
        const signals24h = recent.length;

        const message = `〽️ByBit - just now - ${base}\n${emoji} ${label}: ${sign}${Math.abs(ticker.changePercent).toFixed(1)}%(${fromStr}-${toStr})\n🔉 Signal 24h: ${signals24h}`;

        // Отправляем сообщение каждому пользователю
        for (const user of users) {
          try {
            await this.telegramService.sendMessage(user.telegramId, message);
          } catch (error: any) {
            this.logger.error(`Failed to send message to user ${user.telegramId}: ${error?.message || error}`);
          }
        }
      }

      this.logger.log(`Signals sent for ${usdtPairs.length} symbols to ${users.length} users`);
    } catch (error: any) {
      this.logger.error(`Error checking prices: ${error?.message || error}`);
    }
  }


  @Cron('0 0 * * *')
  async cleanupOldPrices() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Очищаем старые цены из памяти
    for (const [symbol, priceData] of this.previousPrices.entries()) {
      if (priceData.timestamp < oneDayAgo) {
        this.previousPrices.delete(symbol);
      }
    }

    this.logger.log('Old price data cleaned up');
  }
}

