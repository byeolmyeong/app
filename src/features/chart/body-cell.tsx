import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/txt';
import { strings } from '@/content/strings';

export type BodyCellProps = {
  name: string;
  /** 역행이면 이름 뒤에 작게 적는다 */
  retrograde?: boolean;
  /** 이름 아래에 작게 적는 쉬운 말 풀이(그 천체·하우스·각도가 뜻하는 것) */
  meaning?: string;
};

/** 표의 이름 칸. 굵은 이름과 그 아래의 쉬운 말 풀이. */
export function BodyCell({ name, retrograde = false, meaning }: BodyCellProps) {
  return (
    <View>
      <Txt variant="table" style={styles.name}>
        {name}
        {retrograde ? (
          <Txt variant="table" color="gray" style={styles.mark}>
            {` ${strings.detail.retrograde}`}
          </Txt>
        ) : null}
      </Txt>
      {meaning ? (
        <Txt variant="label" color="hint">
          {meaning}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  name: { fontWeight: '700' },
  mark: { fontWeight: '500' },
});
