import { TextPage } from '@/components/text-page';
import { marketing } from '@/content/legal';
import { goBackOrHome } from '@/features/chart/chart-empty';

/** 마케팅 정보 수신 동의 약관. 글은 랜딩(byeolmyeong.com/marketing-terms)과 같은 원본 `src/content/legal.ts` 에 있다(결정 043). */
export default function MarketingScreen() {
  return <TextPage doc={marketing} onBack={goBackOrHome} />;
}
