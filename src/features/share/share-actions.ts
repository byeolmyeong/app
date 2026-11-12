/**
 * 앱(iOS · Android)의 공유: 시스템 공유 시트(결정 025). 웹은 `share-actions.web.ts` 가 같은 이름으로 저장 · 복사를 한다.
 * 실패는 던지지 않고 false 로 돌려준다(화면이 안내한다). 사용자가 공유 시트를 그냥 닫은 것은 실패가 아니다.
 */
import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import { PixelRatio, Share, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { SHARE_IMAGE } from '@/features/share/share-card';

export type CardRef = RefObject<React.ComponentRef<typeof View> | null>;

/** 카드 뷰를 스토리 크기의 PNG 파일로 만들어 공유 시트로 보낸다 */
export async function sendImage(card: CardRef): Promise<boolean> {
  try {
    if (!(await Sharing.isAvailableAsync())) return false;
    // captureRef 의 크기는 화면 단위라 기기 배율로 나눠야 1080×1920 픽셀이 된다.
    const ratio = PixelRatio.get();
    const uri = await captureRef(card, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
      width: SHARE_IMAGE.width / ratio,
      height: SHARE_IMAGE.height / ratio,
    });
    await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png' });
    return true;
  } catch {
    return false;
  }
}

/** 공유 주소를 공유 시트로 보낸다 */
export async function sendLink(url: string): Promise<boolean> {
  try {
    await Share.share({ message: url });
    return true;
  } catch {
    return false;
  }
}
