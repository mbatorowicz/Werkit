import { pl } from './pl';
import { en } from './en';

const dictionaries = {
  pl,
  en
};

export type Locale = keyof typeof dictionaries;

// Obecnie na sztywno zwraca PL, w przyszłości można pobierać z cookies/nagłówków
export const getDictionary = (locale: Locale = 'pl') => dictionaries[locale];
