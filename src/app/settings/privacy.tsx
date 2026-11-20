import { TextPage } from '@/components/text-page';
import { privacy } from '@/content/legal';
import { useSignupAgree } from '@/features/auth/signup-agree';
import { goBackOrHome } from '@/features/chart/chart-empty';

/** 개인정보 처리방침. 글은 랜딩(byeolmyeong.com/privacy)과 같은 원본 `src/content/legal.ts` 에 있다(결정 043). 가입 약관 단계에서 열면 맨 아래 동의하기(결정 044). */
export default function PrivacyScreen() {
  const onAgree = useSignupAgree('privacy');
  return <TextPage doc={privacy} onBack={goBackOrHome} onAgree={onAgree} />;
}
