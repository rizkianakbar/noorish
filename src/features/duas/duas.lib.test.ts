import { describe, expect, it } from 'vitest';
import dailyDuas from '../../../public/duas/daily-dua.json' with { type: 'json' };
import { categoryForHour, groupDailyDuas, repeatCount, shortTitle, splitVerseNumbers } from './duas.lib.ts';

describe('repeatCount', () => {
  it('reads how many times a dua is said, in English or Indonesian', () => {
    expect(repeatCount('Recite 3x')).toBe(3);
    expect(repeatCount('Dibaca 3 kali')).toBe(3);
    expect(repeatCount('100 times')).toBe(100);
    expect(repeatCount('Dibaca 1x')).toBeNull();
    expect(repeatCount('Read in the morning')).toBeNull();
    expect(repeatCount(null)).toBeNull();
  });
});

describe('categoryForHour', () => {
  it('opens on the dhikr for the time of day', () => {
    expect(categoryForHour(5)).toBe('morning-dhikr');
    expect(categoryForHour(11)).toBe('morning-dhikr');
    expect(categoryForHour(13)).toBe('daily-dua');
    expect(categoryForHour(16)).toBe('evening-dhikr');
    expect(categoryForHour(23)).toBe('daily-dua');
  });
});

describe('shortTitle', () => {
  it('drops the word every title in a list starts with', () => {
    expect(shortTitle('Doa Sebelum Makan')).toBe('Sebelum Makan');
    expect(shortTitle('Supplication for Breaking the Fast')).toBe('For Breaking the Fast');
    expect(shortTitle('Travel Supplication')).toBe('Travel Supplication');
    expect(shortTitle('Sayyid al-Istighfar')).toBe('Sayyid al-Istighfar');
  });
});

describe('splitVerseNumbers', () => {
  it('pulls "(n)" verse numbers out of the text', () => {
    expect(splitVerseNumbers('qul huwa allahu ahad (1) allahu samad (2)')).toEqual([
      'qul huwa allahu ahad',
      1,
      ' allahu samad',
      2,
    ]);
    expect(splitVerseNumbers('no numbers')).toEqual(['no numbers']);
  });
});

describe('groupDailyDuas', () => {
  it('puts every daily dua in exactly one group', () => {
    const groups = groupDailyDuas(dailyDuas);
    expect(groups.flatMap((g) => g.duas)).toHaveLength(dailyDuas.length);
    expect(groups.find((g) => g.key === 'other')).toBeUndefined();
  });
});
