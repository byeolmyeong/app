import { Platform } from 'react-native';

/**
 * 공유 주소 `<웹 주소>/s/<shareId>`. 웹 주소는 `EXPO_PUBLIC_WEB_URL`(.env.example)이고, 없으면 웹에서는 지금 주소의 origin 이다.
 * 둘 다 없으면(앱에 변수가 없을 때) null — 링크를 만들 수 없다.
 */
export function shareUrlOf(shareId: string): string | null {
  const origin =
    process.env.EXPO_PUBLIC_WEB_URL ||
    (Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : '');
  return origin ? `${origin.replace(/\/+$/, '')}/s/${encodeURIComponent(shareId)}` : null;
}
