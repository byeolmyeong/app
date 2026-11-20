/**
 * 앱(iOS · Android)의 공유. 웹은 `share-actions.web.ts` 가 같은 이름으로 내려받기를 한다.
 * 공유 v2(결정 053): 이미지 저장 = 사진 앱(쓰기 권한만), 스토리 = 인스타그램 스토리 → 없거나 실패하면 기기 공유 창.
 * 실패는 던지지 않고 값으로 돌려준다(시트가 짧은 알림으로 알린다). 사용자가 공유 창을 그냥 닫은 것은 실패가 아니다.
 */
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import { PixelRatio, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { SHARE_IMAGE } from '@/features/share/share-card';
import { openStory } from '@/features/share/story';

export type CardRef = RefObject<React.ComponentRef<typeof View> | null>;
/** 이미지 저장의 결과. DENIED 는 사진 접근을 막았을 때(설정에서 풀어야 한다) */
export type SaveResult = 'SAVED' | 'DENIED' | 'FAILED';
/** 스토리의 결과. SHARED 는 인스타그램 대신 기기 공유 창으로 넘겼을 때 */
export type StoryShareResult = 'OPENED' | 'SHARED' | 'FAILED';

/** 카드 뷰를 스토리 크기(1080×1920)의 PNG 임시 파일로 찍는다 */
function captureCard(card: CardRef): Promise<string> {
  // captureRef 의 크기는 화면 단위라 기기 배율로 나눠야 1080×1920 픽셀이 된다.
  const ratio = PixelRatio.get();
  return captureRef(card, {
    format: 'png',
    quality: 1,
    result: 'tmpfile',
    width: SHARE_IMAGE.width / ratio,
    height: SHARE_IMAGE.height / ratio,
  });
}

/** 이미지 파일을 기기 공유 창으로 보낸다 */
async function shareFile(uri: string): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png' });
  return true;
}

/** 카드를 사진 앱에 저장한다. 쓰기 권한만 묻는다(읽기 권한은 받지 않는다). 한 번 막았으면 다시 묻지 않고 DENIED */
export async function saveImage(card: CardRef): Promise<SaveResult> {
  try {
    if (!(await requestPermissionsAsync(true)).granted) return 'DENIED';
    await Asset.create(await captureCard(card));
    return 'SAVED';
  } catch {
    return 'FAILED';
  }
}

/** 카드를 인스타그램 스토리의 배경으로 연다. 인스타그램이 없거나 열지 못하면 같은 이미지를 기기 공유 창으로 넘긴다 */
export async function shareStory(card: CardRef, appId: string | null): Promise<StoryShareResult> {
  try {
    const uri = await captureCard(card);
    if ((await openStory(uri, appId)) === 'OPENED') return 'OPENED';
    return (await shareFile(uri)) ? 'SHARED' : 'FAILED';
  } catch {
    return 'FAILED';
  }
}
