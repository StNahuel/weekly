import raw from '../../data/defaults.json';
import { defaultsSchema } from '../domain/schemas/defaults.schema';
import { parseSeed } from './parseSeed';

export const defaults = Object.freeze(parseSeed('defaults.json', defaultsSchema, raw));
