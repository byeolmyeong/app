import { StyleSheet, View } from 'react-native';

import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/txt';
import { Spacing } from '@/constants/theme';

export type TextPageProps = {
  title: string;
  onBack: () => void;
  /** 본문 위에 회색으로 적는 안내 한 줄 */
  notice?: string;
  paragraphs: readonly string[];
};

/** 글만 있는 화면(처리방침 · 약관). 머리의 제목, 안내 한 줄, 문단들. */
export function TextPage({ title, onBack, notice, paragraphs }: TextPageProps) {
  return (
    <Screen nav={<NavBar title={title} onBack={onBack} />}>
      <View style={styles.body}>
        {notice ? (
          <Txt variant="label" color="gray">
            {notice}
          </Txt>
        ) : null}
        {paragraphs.map((paragraph) => (
          <Txt key={paragraph} variant="body">
            {paragraph}
          </Txt>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: Spacing.md, paddingTop: Spacing.md },
});
