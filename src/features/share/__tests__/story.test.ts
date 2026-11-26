import { Linking, Platform } from 'react-native';
import Share from 'react-native-share';

import { Colors } from '@/constants/theme';
import { openStory, storyAppId } from '@/features/share/story';
import * as web from '@/features/share/story.web';

const mockShare = Share as unknown as { shareSingle: jest.Mock; isPackageInstalled: jest.Mock };
const APP_ID = '1162644856216782';
const URI = 'file:///cache/card.png';

beforeEach(() => {
  jest.clearAllMocks();
  mockShare.shareSingle.mockResolvedValue({ success: true, message: '' });
  mockShare.isPackageInstalled.mockResolvedValue({ isInstalled: true, message: '' });
  jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
});

afterEach(() => {
  jest.restoreAllMocks();
  delete process.env.EXPO_PUBLIC_META_APP_ID;
});

describe('인스타그램 스토리 열기(결정 053 의 1)', () => {
  it('카드 PNG 를 스토리의 배경으로 넘기고, 위 · 아래 바탕은 카드의 바탕색이다', async () => {
    expect(await openStory(URI, APP_ID)).toBe('OPENED');
    expect(mockShare.shareSingle).toHaveBeenCalledWith({
      social: 'instagramstories',
      appId: APP_ID,
      backgroundImage: URI,
      backgroundTopColor: Colors.paper,
      backgroundBottomColor: Colors.paper,
    });
  });

  it('iOS: 인스타그램 스토리 주소를 열 수 없으면(앱이 없으면) NOT_INSTALLED 이고 넘기지 않는다', async () => {
    (Linking.canOpenURL as jest.Mock).mockResolvedValue(false);
    expect(await openStory(URI, APP_ID)).toBe('NOT_INSTALLED');
    expect(Linking.canOpenURL).toHaveBeenCalledWith('instagram-stories://share');
    expect(mockShare.shareSingle).not.toHaveBeenCalled();
  });

  it('안드로이드: 인스타그램 패키지가 없으면 NOT_INSTALLED 다', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    mockShare.isPackageInstalled.mockResolvedValue({ isInstalled: false, message: '' });
    expect(await openStory(URI, APP_ID)).toBe('NOT_INSTALLED');
    expect(mockShare.isPackageInstalled).toHaveBeenCalledWith('com.instagram.android');
    expect(mockShare.shareSingle).not.toHaveBeenCalled();
  });

  it('앱 ID 가 없거나, 넘기다 실패하거나 던지면 FAILED 다(던지지 않는다)', async () => {
    expect(await openStory(URI, null)).toBe('FAILED');
    expect(mockShare.shareSingle).not.toHaveBeenCalled();
    mockShare.shareSingle.mockResolvedValueOnce({ success: false, message: 'x' });
    expect(await openStory(URI, APP_ID)).toBe('FAILED');
    mockShare.shareSingle.mockRejectedValueOnce(new Error('x'));
    expect(await openStory(URI, APP_ID)).toBe('FAILED');
    (Linking.canOpenURL as jest.Mock).mockRejectedValueOnce(new Error('x'));
    expect(await openStory(URI, APP_ID)).toBe('FAILED');
  });

  it('앱 ID 는 EXPO_PUBLIC_META_APP_ID 에서 읽고, 비어 있으면 null 이다', () => {
    expect(storyAppId()).toBeNull();
    process.env.EXPO_PUBLIC_META_APP_ID = '  ';
    expect(storyAppId()).toBeNull();
    process.env.EXPO_PUBLIC_META_APP_ID = ` ${APP_ID} `;
    expect(storyAppId()).toBe(APP_ID);
  });

  it('웹에는 스토리가 없다: 앱 ID 가 있어도 null, 열기는 FAILED', async () => {
    process.env.EXPO_PUBLIC_META_APP_ID = APP_ID;
    expect(web.storyAppId()).toBeNull();
    expect(await web.openStory(URI, APP_ID)).toBe('FAILED');
    expect(mockShare.shareSingle).not.toHaveBeenCalled();
  });
});
