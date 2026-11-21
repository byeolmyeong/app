import { Asset, requestPermissionsAsync } from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { PixelRatio, Platform } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { saveImage, shareStory } from '@/features/share/share-actions';
import { loadHtml2canvas } from '@/features/share/load-html2canvas';
import * as web from '@/features/share/share-actions.web';
import { openStory } from '@/features/share/story';

jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn(async () => 'file:///tmp/card.png') }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(async () => true), shareAsync: jest.fn(async () => {}) }));
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

  it('저장: 안드로이드 11(API 30) 이상은 권한 없이 사진 앱에 넣을 수 있어 묻지 않는다(쓸데없는 권한 창 · "설정에서 허용" 오안내 없음)', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const version = jest.spyOn(Platform, 'Version', 'get').mockReturnValue(30);
    expect(await saveImage(view)).toBe('SAVED');
    expect(requestPermissionsAsync).not.toHaveBeenCalled();
    expect(Asset.create).toHaveBeenCalledWith('file:///tmp/card.png');
    // 그 아래(API 29)는 쓰기 권한을 묻는다
    version.mockReturnValue(29);
    (requestPermissionsAsync as jest.Mock).mockResolvedValueOnce(denied);
    expect(await saveImage(view)).toBe('DENIED');
    expect(requestPermissionsAsync).toHaveBeenCalledWith(true);
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

describe('웹의 이미지 저장(결정 053 의 1 · 5)', () => {
  afterEach(() => {
    delete g.document;
  });

  it('그리는 모듈(html2canvas-pro 285KB)은 첫 화면에 싣지 않고 저장을 누를 때 받는다(성능 계획 3)', async () => {
    (loadHtml2canvas as jest.Mock).mockClear();
    expect(loadHtml2canvas).not.toHaveBeenCalled();
    g.document = { createElement: jest.fn(() => ({ width: 0, height: 0, getContext: () => null, toDataURL: () => '', click: jest.fn() })) };
    mockHtml2canvas.mockResolvedValue({ width: 1080, height: 1920 });
    await web.saveImage(view);
    expect(loadHtml2canvas).toHaveBeenCalledTimes(1);
  });

  it('카드를 가로 1080 이 되는 배율로 그리고 정확히 1080×1920 에 옮겨 PNG 로 내려받는다(SAVED)', async () => {
    const anchor = { href: '', download: '', click: jest.fn() };
    const drawImage = jest.fn();
    const out = { width: 0, height: 0, getContext: jest.fn(() => ({ drawImage })), toDataURL: jest.fn(() => 'data:image/png;base64,AAAA') };
    g.document = { createElement: jest.fn((tag: string) => (tag === 'canvas' ? out : anchor)) };
    // 미리보기 높이를 반올림해 9:16 에서 조금 어긋난 그림(1080×1922)
    const drawn = { width: 1080, height: 1922 };
    mockHtml2canvas.mockResolvedValue(drawn);
    expect(await web.saveImage(view)).toBe('SAVED');
    expect(mockHtml2canvas.mock.calls[0][0]).toBe((view as { current: unknown }).current);
    expect(mockHtml2canvas.mock.calls[0][1]).toMatchObject({ scale: 1080 / 220 });
    expect([out.width, out.height]).toEqual([1080, 1920]);
    expect(drawImage).toHaveBeenCalledWith(drawn, 0, 0, 1080, 1920);
    expect(anchor.href).toBe('data:image/png;base64,AAAA');
    expect(anchor.download).toMatch(/\.png$/);
    expect(anchor.click).toHaveBeenCalledTimes(1);
  });

  it('카드 속 그림은 숨은 원본 <img> 로 그려 1080 에서도 흐리지 않다(결정 036 — 옛 카드의 별이 그림)', async () => {
    const out = { width: 0, height: 0, getContext: () => ({ drawImage: jest.fn() }), toDataURL: () => 'data:image/png;base64,AAAA' };
    g.document = { createElement: jest.fn((tag: string) => (tag === 'canvas' ? out : { href: '', download: '', click: jest.fn() })) };
    mockHtml2canvas.mockResolvedValue({ width: 1080, height: 1920 });
    await web.saveImage(view);
    const { onclone } = mockHtml2canvas.mock.calls[0][1] as { onclone: (doc: unknown, el: unknown) => void };
    // react-native-web 의 Image 는 그림을 배경으로 그리고, 같은 그림의 <img> 를 투명하게 숨겨 둔다
    const hidden = [{ style: { opacity: '0', zIndex: '-1' } }, { style: { opacity: '0', zIndex: '-1' } }];
    onclone({}, { querySelectorAll: (selector: string) => (selector === 'img' ? hidden : []) });
    for (const img of hidden) expect(img.style).toEqual({ opacity: '1', zIndex: '0' });
  });

  it('그리지 못하면 FAILED, 스토리는 웹에 없다(FAILED)', async () => {
    mockHtml2canvas.mockRejectedValue(new Error('x'));
    expect(await web.saveImage(view)).toBe('FAILED');
    expect(await web.shareStory(view, 'app-id')).toBe('FAILED');
  });
});
