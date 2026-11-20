/**
 * 웹의 공유: 이미지 저장(PNG 내려받기)만(결정 053 의 1 · 5). 앱은 `share-actions.ts` 가 같은 이름으로 사진 앱 · 스토리를 한다.
 * react-native-view-shot 의 웹 구현은 배율을 정할 수 없어 쓰지 않고, 그것이 쓰는 html2canvas-pro 를 직접 부른다.
 */
import { html2canvas } from 'html2canvas-pro';

import { Colors } from '@/constants/theme';
import { SHARE_IMAGE } from '@/features/share/share-card';

import type { CardRef, SaveResult, StoryShareResult } from './share-actions';

const FILE_NAME = 'byeolmyeong-card.png';

/** 웹에는 스토리가 없다(시트에 버튼이 없다, 결정 053 의 1) */
export async function shareStory(_card: CardRef, _appId: string | null): Promise<StoryShareResult> {
  return 'FAILED';
}

/**
 * 이미지 저장: 카드 요소를 가로 1080 이 되는 배율로 그려 PNG 로 내려받는다(사진 앱 · 권한 없음).
 * 미리보기 높이는 화면 픽셀로 반올림돼 9:16 에서 1~2px 어긋나므로, 그린 그림을 정확히 1080×1920 칸에 옮겨 담는다.
 */
export async function saveImage(card: CardRef): Promise<SaveResult> {
  try {
    const element = card.current as unknown as HTMLElement | null;
    if (!element) return 'FAILED';
    const drawn = await html2canvas(element, {
      scale: SHARE_IMAGE.width / element.offsetWidth,
      backgroundColor: Colors.paper,
      onclone: showSourceImages,
    });
    const canvas = document.createElement('canvas');
    canvas.width = SHARE_IMAGE.width;
    canvas.height = SHARE_IMAGE.height;
    canvas.getContext('2d')?.drawImage(drawn, 0, 0, SHARE_IMAGE.width, SHARE_IMAGE.height);
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = FILE_NAME;
    link.click();
    return 'SAVED';
  } catch {
    return 'FAILED';
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
