import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/txt';
import { Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';

const S = strings.reading;

export type ParagraphProps = {
  title: string;
  body: string;
  /** 근거가 된 차트 요소. 서버가 준 낱말을 그대로 잇는다. 비어 있으면 근거 줄을 그리지 않는다 */
  basis: string[];
};

/** 글의 문단 하나: 근거 줄(작게) · 제목 · 본문. 요약 해석과 심층 리포트가 함께 쓴다. */
export function Paragraph({ title, body, basis }: ParagraphProps) {
  return (
    <View style={styles.root}>
      {basis.length > 0 ? (
        <Txt variant="label" color="gray">
          {[S.basisLabel, ...basis].join(S.basisSeparator)}
        </Txt>
      ) : null}
      <Txt variant="heading">{title}</Txt>
      <Txt variant="body">{body}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.xs },
});
