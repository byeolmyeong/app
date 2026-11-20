import { TextPage } from '@/components/text-page';
import { privacyConsent } from '@/content/legal';
import { useSignupAgree } from '@/features/auth/signup-agree';
import { goBackOrHome } from '@/features/chart/chart-empty';

/**
 * 개인정보 수집 · 이용 동의(결정 045): 목적 · 항목 · 보유 기간 · 거부할 권리. 글은 랜딩(byeolmyeong.com/privacy-consent)과 같은 원본 `src/content/legal.ts` 에 있다.
 * 가입 약관 단계의 "[필수] 개인정보 수집 · 이용 · 보기" 가 이 화면을 열고, 맨 아래 동의하기가 그 항목을 켠다(결정 044 · 045).
 */
export default function PrivacyConsentScreen() {
  const onAgree = useSignupAgree('privacy');
  return <TextPage doc={privacyConsent} onBack={goBackOrHome} onAgree={onAgree} />;
}
