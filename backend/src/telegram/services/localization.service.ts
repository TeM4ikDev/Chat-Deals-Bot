import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';


@Injectable()
export class LocalizationService {
  private translations: Map<string, any> = new Map();
  private readonly logger = new Logger(LocalizationService.name);

  constructor() {
    this.loadTranslations();
  }

  private loadTranslations() {
    try {
      // Используем абсолютный путь к директории проекта
      const projectRoot = process.cwd();
      console.log(projectRoot)
      // backend\src\telegram\locales
      const localesPath = path.join(projectRoot, 'src', 'telegram', 'locales');
      // this.logger.debug(`Loading translations from: ${localesPath}`);

      // console.log(`Checking if directory exists: ${localesPath}`);
      if (!fs.existsSync(localesPath)) {
        this.logger.error(`Locales directory not found at: ${localesPath}`);
        return;
      }

      console.log(`Directory exists: ${localesPath}`);

      const files = fs.readdirSync(localesPath);
      this.logger.debug(`Found files: ${files.join(', ')}`);

      files.forEach(file => {
        if (file.endsWith('.json')) {
          const lang = file.replace('.json', '');
          const filePath = path.join(localesPath, file);
          console.log(`Checking if file exists: ${filePath}`);
          this.logger.debug(`Loading ${lang} from ${filePath}`);
          
          if (!fs.existsSync(filePath)) {
            this.logger.error(`Translation file not found: ${filePath}`);
            return;
          }

          console.log(`File exists: ${filePath}`);

          const content = JSON.parse(
            fs.readFileSync(filePath, 'utf-8')
          );
          this.translations.set(lang, content);
          this.logger.debug(`Loaded ${lang} translations: ${JSON.stringify(content)}`);
        }
      });
    } catch (error: any) {
      this.logger.error(`Error loading translations: ${error?.message || 'Unknown error'}`, error?.stack);
    }
  }

  getT(key: string, lang: string = 'ru'): string {
    try {
      
      const translation = this.translations.get(lang);
      if (!translation) {
        this.logger.warn(`No translations found for language: ${lang}`);
        return key;
      }

      const keys = key.split('.');
      let result = translation;

      for (const k of keys) {
        if (result && typeof result === 'object') {
          result = result[k];
        } else {
          this.logger.warn(`Translation not found for key: ${key}`);
          return key;
        }
      }

      const finalResult = typeof result === 'string' ? result : key;
    //   this.logger.debug(`Translation result: ${finalResult}`);
      // return this.escapeMarkdown(finalResult);
      return finalResult
    } catch (error: any) {
      this.logger.error(`Error getting translation: ${error?.message || 'Unknown error'}`, error?.stack);
      return key;
    }
  }

  escapeMarkdown(text: string): string {
    if (!text) return text;
    return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
  }
} 