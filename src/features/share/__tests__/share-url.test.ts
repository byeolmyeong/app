import { Platform } from 'react-native';

import { shareUrlOf } from '@/features/share/share-url';

const g = globalThis as { window?: unknown };
const realWindow = g.window;

afterEach(() => {
  delete process.env.EXPO_PUBLIC_WEB_URL;
  g.window = realWindow;
  jest.restoreAllMocks();
});

describe('공유 주소', () => {
  it('EXPO_PUBLIC_WEB_URL 뒤에 /s/<shareId> 를 붙인다(끝의 / 는 뗀다)', () => {
    process.env.EXPO_PUBLIC_WEB_URL = 'https://app.example.test/';
    expect(shareUrlOf('AbC-_123')).toBe('https://app.example.test/s/AbC-_123');
  });

  it('변수가 없으면 웹에서는 지금 주소의 origin 을 쓴다', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    g.window = { location: { origin: 'https://web.example.test' } };
    expect(shareUrlOf('abc')).toBe('https://web.example.test/s/abc');
  });

  it('변수도 없고 웹도 아니면 주소를 만들지 못한다', () => {
    expect(shareUrlOf('abc')).toBeNull();
  });
});
