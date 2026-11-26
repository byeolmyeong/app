import { TextPage } from '@/components/text-page';
import { marketing } from '@/content/legal';
import { useSignupAgree } from '@/features/auth/signup-agree';
import { goBackOrHome } from '@/features/chart/chart-empty';

/** 마케팅 정보 수신 동의 약관. 글은 랜딩(byeolmyeong.com/marketing-terms)과 같은 원본 `src/content/legal.ts` 에 있다(결정 043). 가입 약관 단계에서 열면 맨 아래 동의하기(결정 044). */
export default function MarketingScreen() {
  const onAgree = useSignupAgree('marketing');
  return <TextPage doc={marketing} onBack={goBackOrHome} onAgree={onAgree} />;
}
