import { TextPage } from '@/components/text-page';
import { privacy } from '@/content/legal';
import { goBackOrHome } from '@/features/chart/chart-empty';

/** 개인정보 처리방침. 글은 랜딩(byeolmyeong.com/privacy)과 같은 원본 `src/content/legal.ts` 에 있다(결정 043). */
export default function PrivacyScreen() {
  return <TextPage doc={privacy} onBack={goBackOrHome} />;
}
