import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { strings } from '@/content/strings';
import { goBackOrHome } from '@/features/chart/chart-empty';
import { FaqList } from '@/features/support/faq-list';

const F = strings.faq;

/** 자주 묻는 질문(결정 024). 질문과 답은 `strings.faq.items` 에 있다. */
export default function FaqScreen() {
  return (
    <Screen nav={<NavBar title={F.title} onBack={goBackOrHome} />}>
      <FaqList items={F.items} />
    </Screen>
  );
}
