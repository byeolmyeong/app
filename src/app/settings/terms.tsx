import { TextPage } from '@/components/text-page';
import { terms } from '@/content/legal';
import { goBackOrHome } from '@/features/chart/chart-empty';

/** 이용약관. 글은 랜딩(byeolmyeong.com/terms)과 같은 원본 `src/content/legal.ts` 에 있다(결정 042). */
export default function TermsScreen() {
  return <TextPage doc={terms} onBack={goBackOrHome} />;
}
