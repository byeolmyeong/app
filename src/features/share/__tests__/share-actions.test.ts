import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { PixelRatio, Share } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { sendImage, sendLink } from '@/features/share/share-actions';
import * as web from '@/features/share/share-actions.web';

jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn(async () => 'file:///tmp/card.png') }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(async () => true), shareAsync: jest.fn(async () => {}) }));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(async () => true) }));
const mockHtml2canvas = jest.fn();
jest.mock('html2canvas-pro', () => ({ html2canvas: (...args: unknown[]) => mockHtml2canvas(...args) }));

const view = { current: { offsetWidth: 220 } } as never;
const g = globalThis as { document?: unknown };

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

describe('앱의 공유(시스템 공유 시트)', () => {
  it('이미지: 카드를 1080×1920 PNG 파일로 만들어 공유 시트로 보낸다', async () => {
    jest.spyOn(PixelRatio, 'get').mockReturnValue(3);
    expect(await sendImage(view)).toBe(true);
    expect(captureRef).toHaveBeenCalledWith(view, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
      width: 360,
      height: 640,
    });
    expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///tmp/card.png', {
      mimeType: 'image/png',
      UTI: 'public.png',
    });
  });

  it('이미지: 공유할 수 없는 기기이거나 만들다 실패하면 false 다', async () => {
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValueOnce(false);
    expect(await sendImage(view)).toBe(false);
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
    (captureRef as jest.Mock).mockRejectedValueOnce(new Error('x'));
    expect(await sendImage(view)).toBe(false);
  });

  it('링크: 주소를 공유 시트로 보낸다', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction', activityType: undefined });
    expect(await sendLink('https://app.example.test/s/abc')).toBe(true);
    expect(share).toHaveBeenCalledWith({ message: 'https://app.example.test/s/abc' });
    share.mockRejectedValueOnce(new Error('x'));
    expect(await sendLink('u')).toBe(false);
  });
});

describe('웹의 공유(이미지 저장 · 링크 복사)', () => {
  afterEach(() => {
    delete g.document;
  });

  it('이미지: 카드를 가로 1080 이 되는 배율로 그려 PNG 로 내려받는다', async () => {
    const anchor = { href: '', download: '', click: jest.fn() };
    g.document = { createElement: jest.fn(() => anchor) };
    mockHtml2canvas.mockResolvedValue({ toDataURL: jest.fn(() => 'data:image/png;base64,AAAA') });
    expect(await web.sendImage(view)).toBe(true);
    expect(mockHtml2canvas.mock.calls[0][0]).toBe((view as { current: unknown }).current);
    expect(mockHtml2canvas.mock.calls[0][1]).toMatchObject({ scale: 1080 / 220 });
    expect(anchor.href).toBe('data:image/png;base64,AAAA');
    expect(anchor.download).toMatch(/\.png$/);
    expect(anchor.click).toHaveBeenCalledTimes(1);
  });

  it('이미지: 그리지 못하면 false 다', async () => {
    mockHtml2canvas.mockRejectedValue(new Error('x'));
    expect(await web.sendImage(view)).toBe(false);
  });

  it('링크: 주소를 클립보드에 복사하고, 브라우저가 막으면 false 다', async () => {
    expect(await web.sendLink('https://app.example.test/s/abc')).toBe(true);
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('https://app.example.test/s/abc');
    (Clipboard.setStringAsync as jest.Mock).mockResolvedValueOnce(false);
    expect(await web.sendLink('u')).toBe(false);
    (Clipboard.setStringAsync as jest.Mock).mockRejectedValueOnce(new Error('x'));
    expect(await web.sendLink('u')).toBe(false);
  });
});
