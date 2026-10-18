import { describe, expect, test } from 'vitest';
import raw from '../../../data/defaults.json';
import { defaultsSchema } from './defaults.schema';

describe('defaultsSchema', () => {
  test('parses data/defaults.json', () => {
    const defaults = defaultsSchema.parse(raw);
    expect(defaults.interface.activityChoices).toEqual(['strength', 'boxing', 'rest', 'busy', 'sick']);
    expect(defaults.shopping.defaultHorizonDays).toBe(5);
  });

  test('rejects a time that is not HH:MM', () => {
    const tampered = structuredClone(raw);
    tampered.schedule.workEnd = '18:30';
    expect(defaultsSchema.safeParse(tampered).success).toBe(true);

    tampered.schedule.workEnd = '6:30';
    const result = defaultsSchema.safeParse(tampered);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      path: ['schedule', 'workEnd'],
      message: 'Expected HH:MM (24 h)',
    });
  });
});
