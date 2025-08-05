import * as path from 'path';

export const IMAGE_PATHS = {
  SCAMMER: path.join(__dirname, '../../../public/scammer.jpg'),
  UNKNOWN: path.join(__dirname, '../../../public/noinfo.png'),
  GARANT: path.join(__dirname, '../../../public/garant.jpg'),
  SUSPICIOUS: path.join(__dirname, '../../../public/suspicious.jpg')
};

export enum SCENES {
 SCAMMER_FORM = 'SCAMMERFORM',
 APPEAL_FORM = 'APPEALFORM'
}

export const BOT_NAME = 'svdbasebot';
export const SUPPORT = ''