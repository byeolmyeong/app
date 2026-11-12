/**
 * 웹의 공유: 이미지 저장 · 링크 복사(결정 025). 앱은 `share-actions.ts` 가 같은 이름으로 시스템 공유 시트를 연다.
 * react-native-view-shot 의 웹 구현은 배율을 정할 수 없어 쓰지 않고, 그것이 쓰는 html2canvas-pro 를 직접 부른다.
 */
import * as Clipboard from 'expo-clipboard';
import { html2canvas } from 'html2canvas-pro';

import { Colors } from '@/constants/theme';
import { SHARE_IMAGE } from '@/features/share/share-card';

import type { CardRef } from './share-actions';

const FILE_NAME = 'byeolmyeong-card.png';

/** 카드 요소를 가로 1080 이 되는 배율로 그려 PNG 로 내려받는다 */
export async function sendImage(card: CardRef): Promise<boolean> {
  try {
    const element = card.current as unknown as HTMLElement | null;
    if (!element) return false;
    const canvas = await html2canvas(element, {
      scale: SHARE_IMAGE.width / element.offsetWidth,
      backgroundColor: Colors.paper,
    });
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = FILE_NAME;
    link.click();
    return true;
  } catch {
    return false;
  }
}

/** 공유 주소를 클립보드에 복사한다. 브라우저가 막으면 false */
export async function sendLink(url: string): Promise<boolean> {
  try {
    return await Clipboard.setStringAsync(url);
  } catch {
    return false;
  }
}
