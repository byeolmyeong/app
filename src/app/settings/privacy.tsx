import { TextPage } from '@/components/text-page';
import { strings } from '@/content/strings';
import { goBackOrHome } from '@/features/chart/chart-empty';

const L = strings.legal;

/** 개인정보 처리방침. 글은 `strings.legal.privacy` 에 있다(지금은 자리표시). */
export default function PrivacyScreen() {
  return (
    <TextPage
      title={L.privacy.title}
      onBack={goBackOrHome}
      notice={L.placeholderNotice}
      paragraphs={L.privacy.paragraphs}
    />
  );
}
