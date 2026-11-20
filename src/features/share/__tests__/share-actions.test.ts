import * as Clipboard from 'expo-clipboard';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { PixelRatio, Share } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { saveImage, sendImage, sendLink, shareStory } from '@/features/share/share-actions';
import * as web from '@/features/share/share-actions.web';
import { openStory } from '@/features/share/story';

jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn(async () => 'file:///tmp/card.png') }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(async () => true), shareAsync: jest.fn(async () => {}) }));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(async () => true) }));
jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true, status: 'granted', expires: 'never' })),
  Asset: { create: jest.fn(async () => ({ id: 'asset-1' })) },
}));
jest.mock('@/features/share/story', () => ({ openStory: jest.fn(async () => 'OPENED') }));
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

describe('앱의 이미지 저장 · 스토리(결정 053 의 1 · 5)', () => {
  const denied = { granted: false, canAskAgain: false, status: 'denied', expires: 'never' };

  it('저장: 쓰기 권한만 묻고(읽기 없음) 카드를 1080×1920 PNG 로 찍어 사진 앱에 넣는다', async () => {
    jest.spyOn(PixelRatio, 'get').mockReturnValue(3);
    expect(await saveImage(view)).toBe('SAVED');
    expect(requestPermissionsAsync).toHaveBeenCalledWith(true);
    expect(captureRef).toHaveBeenCalledWith(view, { format: 'png', quality: 1, result: 'tmpfile', width: 360, height: 640 });
    expect(Asset.create).toHaveBeenCalledWith('file:///tmp/card.png');
  });

  it('저장: 권한을 막았으면 찍지 않고 DENIED, 찍거나 넣다 실패하면 FAILED 다', async () => {
    (requestPermissionsAsync as jest.Mock).mockResolvedValueOnce(denied);
    expect(await saveImage(view)).toBe('DENIED');
    expect(captureRef).not.toHaveBeenCalled();
    expect(Asset.create).not.toHaveBeenCalled();
    (captureRef as jest.Mock).mockRejectedValueOnce(new Error('x'));
    expect(await saveImage(view)).toBe('FAILED');
    (Asset.create as jest.Mock).mockRejectedValueOnce(new Error('x'));
    expect(await saveImage(view)).toBe('FAILED');
    (requestPermissionsAsync as jest.Mock).mockRejectedValueOnce(new Error('x'));
    expect(await saveImage(view)).toBe('FAILED');
  });

  it('스토리: 카드 PNG 를 인스타그램 스토리로 연다', async () => {
    expect(await shareStory(view, 'app-id')).toBe('OPENED');
    expect(openStory).toHaveBeenCalledWith('file:///tmp/card.png', 'app-id');
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
  });

  it('스토리: 인스타그램이 없거나 열지 못하면 같은 이미지를 기기 공유 창으로 넘긴다', async () => {
    for (const result of ['NOT_INSTALLED', 'FAILED'] as const) {
      jest.clearAllMocks();
      (openStory as jest.Mock).mockResolvedValueOnce(result);
      expect(await shareStory(view, 'app-id')).toBe('SHARED');
      expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///tmp/card.png', { mimeType: 'image/png', UTI: 'public.png' });
    }
  });

  it('스토리: 찍지 못했거나 공유 창도 열 수 없으면 FAILED 다', async () => {
    (captureRef as jest.Mock).mockRejectedValueOnce(new Error('x'));
    expect(await shareStory(view, 'app-id')).toBe('FAILED');
    expect(openStory).not.toHaveBeenCalled();
    (openStory as jest.Mock).mockResolvedValueOnce('NOT_INSTALLED');
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValueOnce(false);
    expect(await shareStory(view, 'app-id')).toBe('FAILED');
    (openStory as jest.Mock).mockResolvedValueOnce('FAILED');
    (Sharing.shareAsync as jest.Mock).mockRejectedValueOnce(new Error('x'));
    expect(await shareStory(view, 'app-id')).toBe('FAILED');
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

  it('이미지: 카드 속 그림은 숨은 원본 <img> 로 그려 1080 에서도 흐리지 않다(결정 036)', async () => {
    g.document = { createElement: jest.fn(() => ({ href: '', download: '', click: jest.fn() })) };
    mockHtml2canvas.mockResolvedValue({ toDataURL: jest.fn(() => 'data:image/png;base64,AAAA') });
    await web.sendImage(view);
    const { onclone } = mockHtml2canvas.mock.calls[0][1] as { onclone: (doc: unknown, el: unknown) => void };
    // react-native-web 의 Image 는 그림을 배경으로 그리고, 같은 그림의 <img> 를 투명하게 숨겨 둔다
    const hidden = [{ style: { opacity: '0', zIndex: '-1' } }, { style: { opacity: '0', zIndex: '-1' } }];
    onclone({}, { querySelectorAll: (selector: string) => (selector === 'img' ? hidden : []) });
    for (const img of hidden) expect(img.style).toEqual({ opacity: '1', zIndex: '0' });
  });

  it('이미지: 그리지 못하면 false 다', async () => {
    mockHtml2canvas.mockRejectedValue(new Error('x'));
    expect(await web.sendImage(view)).toBe(false);
  });

  it('저장(공유 v2): PNG 를 내려받으면 SAVED, 그리지 못하면 FAILED · 스토리는 없다(FAILED)', async () => {
    const anchor = { href: '', download: '', click: jest.fn() };
    g.document = { createElement: jest.fn(() => anchor) };
    mockHtml2canvas.mockResolvedValue({ toDataURL: jest.fn(() => 'data:image/png;base64,AAAA') });
    expect(await web.saveImage(view)).toBe('SAVED');
    expect(anchor.click).toHaveBeenCalledTimes(1);
    expect(mockHtml2canvas.mock.calls[0][1]).toMatchObject({ scale: 1080 / 220 });
    mockHtml2canvas.mockRejectedValue(new Error('x'));
    expect(await web.saveImage(view)).toBe('FAILED');
    expect(await web.shareStory(view, 'app-id')).toBe('FAILED');
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
