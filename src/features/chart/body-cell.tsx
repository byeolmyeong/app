import { StyleSheet } from 'react-native';

import { Txt } from '@/components/txt';
import { strings } from '@/content/strings';

/** 표의 천체 이름 칸. 역행이면 이름 뒤에 작게 적는다. */
export function BodyCell({ name, retrograde }: { name: string; retrograde: boolean }) {
  return (
    <Txt variant="table" style={styles.name}>
      {name}
      {retrograde ? (
        <Txt variant="table" color="gray" style={styles.mark}>
          {` ${strings.detail.retrograde}`}
        </Txt>
      ) : null}
    </Txt>
  );
}

const styles = StyleSheet.create({
  name: { fontWeight: '700' },
  mark: { fontWeight: '500' },
});
