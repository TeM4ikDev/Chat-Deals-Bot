import * as path from 'path';

export const IMAGE_PATHS = {
  SCAMMER: path.join(__dirname, '../../../public/scammer.jpg'),
  UNKNOWN: path.join(__dirname, '../../../public/noinfo.png'),
  GARANT: path.join(__dirname, '../../../public/garant.jpg'),
  SUSPICIOUS: path.join(__dirname, '../../../public/suspicious.jpg'),
  OGUREC: path.join(__dirname, '../../../public/ogurec.png'),
  PROGRAMMER: path.join(__dirname, '../../../public/programmer.mp4'),
  BOT: path.join(__dirname, '../../../public/bot.png')
};

export enum SCENES {
  SCAMMER_FORM = 'SCAMMERFORM',
  APPEAL_FORM = 'APPEALFORM',
  NEWS = 'NEWS'
}

export const BOT_NAME = 'svdbasebot';
export const SUPPORT = ''

export const CUSTOM_INFO = {
  PROGRAMMER_INFO: `*👨‍💻 Разработчик проекта* @svdbasebot\n\n💡 *Стек:* \`React, TypeScript, NestJS, Tailwind, Prisma, Node.js, Telegram Bot API\`\n\n📬 *Связь:* [@TeM4ik20](https://t.me/TeM4ik20)`,
  BOT_INFO: `*🤖 Бот проекта* @giftthread\n\n*Владелец:* [@SVDProject](https://t.me/SVDProject)\n\n📬 *Разработчик:* [@TeM4ik20](https://t.me/TeM4ik20)`
}

