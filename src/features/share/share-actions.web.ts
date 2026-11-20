/**
 * 웹의 공유: 이미지 저장 · 링크 복사(결정 025). 앱은 `share-actions.ts` 가 같은 이름으로 시스템 공유 시트를 연다.
 * react-native-view-shot 의 웹 구현은 배율을 정할 수 없어 쓰지 않고, 그것이 쓰는 html2canvas-pro 를 직접 부른다.
 */
import * as Clipboard from 'expo-clipboard';
import { html2canvas } from 'html2canvas-pro';

import { Colors } from '@/constants/theme';
import { SHARE_IMAGE } from '@/features/share/share-card';

import type { CardRef, SaveResult, StoryShareResult } from './share-actions';

const FILE_NAME = 'byeolmyeong-card.png';

/** 이미지 저장(공유 v2, 결정 053 의 5): 웹은 PNG 내려받기다(사진 앱 · 권한 없음) */
export async function saveImage(card: CardRef): Promise<SaveResult> {
  return (await sendImage(card)) ? 'SAVED' : 'FAILED';
}

/** 웹에는 스토리가 없다(시트에 버튼이 없다, 결정 053 의 1) */
export async function shareStory(_card: CardRef, _appId: string | null): Promise<StoryShareResult> {
  return 'FAILED';
}

/** 카드 요소를 가로 1080 이 되는 배율로 그려 PNG 로 내려받는다 */
export async function sendImage(card: CardRef): Promise<boolean> {
  try {
    const element = card.current as unknown as HTMLElement | null;
    if (!element) return false;
    const canvas = await html2canvas(element, {
      scale: SHARE_IMAGE.width / element.offsetWidth,
      backgroundColor: Colors.paper,
      onclone: showSourceImages,
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

/**
 * react-native-web 의 Image 는 그림을 배경으로 그리고 같은 그림의 <img> 를 투명하게 숨겨 둔다.
 * html2canvas 는 배경 그림을 화면 크기로 줄였다가 키워 흐리게 만들므로, 복제본에서 숨은 <img> 를 드러내 원본 해상도로 그리게 한다(결정 036).
 */
function showSourceImages(_doc: unknown, element: { querySelectorAll: (selector: string) => ArrayLike<{ style: { opacity: string; zIndex: string } }> }) {
  for (const img of Array.from(element.querySelectorAll('img'))) {
    img.style.opacity = '1';
    img.style.zIndex = '0';
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
