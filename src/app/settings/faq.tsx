import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { TextLink } from '@/components/text-link';
import { Txt } from '@/components/txt';
import { Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { goBackOrHome } from '@/features/chart/chart-empty';
import { FaqList } from '@/features/support/faq-list';
import { useFaqs } from '@/features/support/use-faqs';

const F = strings.faq;

/**
 * 자주 묻는 질문(결정 024 · 028). 질문과 답은 관리자가 적은 것을 서버에서 받는다(`GET /faqs`, 세션 없이).
 * 받지 못하면 "다시 시도" 를, 등록된 질문이 없으면 문의하기로 가는 줄을 보여 준다.
 */
export default function FaqScreen() {
  const { state, retry } = useFaqs();
  const nav = <NavBar title={F.title} onBack={goBackOrHome} chevron />;

  if (state.status === 'loading')
    return (
      <Screen nav={nav}>
        <View style={styles.status}>
          <Txt variant="table" color="gray">
            {F.loading}
          </Txt>
        </View>
      </Screen>
    );

  if (state.status === 'failed')
    return (
      <Screen nav={nav}>
        <View style={styles.status}>
          <Txt variant="body">
            {state.error === 'NETWORK' || state.error === 'LIMIT' ? F.failed[state.error] : F.failed.OTHER}
          </Txt>
          <Button label={F.retry} onPress={retry} />
        </View>
      </Screen>
    );

  if (state.faqs.length === 0)
    return (
      <Screen nav={nav}>
        <View style={styles.status}>
          <Txt variant="subhead">{F.empty}</Txt>
          <Txt variant="table" color="gray">
            {F.emptyNote}
          </Txt>
          <TextLink label={F.toInquiry} onPress={() => router.push('/my/inquiries/new')} />
        </View>
      </Screen>
    );

  return (
    <Screen nav={nav}>
      <FaqList items={state.faqs} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  status: { gap: Spacing.md, paddingTop: Spacing.lg },
});
