import { TextPage } from '@/components/text-page';
import { strings } from '@/content/strings';
import { goBackOrHome } from '@/features/chart/chart-empty';

const L = strings.legal;

/** 이용약관. 글은 `strings.legal.terms` 에 있다(지금은 자리표시). */
export default function TermsScreen() {
  return (
    <TextPage
      title={L.terms.title}
      onBack={goBackOrHome}
      notice={L.placeholderNotice}
      paragraphs={L.terms.paragraphs}
    />
  );
}
