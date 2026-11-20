import { TextPage } from '@/components/text-page';
import { privacy } from '@/content/legal';
import { goBackOrHome } from '@/features/chart/chart-empty';

/**
 * 개인정보 처리방침. 글은 랜딩(byeolmyeong.com/privacy)과 같은 원본 `src/content/legal.ts` 에 있다(결정 043).
 * 알리는 글이라 동의하기가 없다 — 가입 때의 동의는 개인정보 수집 · 이용 동의(`/settings/privacy-consent`)에서 받는다(결정 045).
 */
export default function PrivacyScreen() {
  return <TextPage doc={privacy} onBack={goBackOrHome} />;
}
