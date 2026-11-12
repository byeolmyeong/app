import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Sheet } from '@/components/sheet';
import { Txt } from '@/components/txt';
import { Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { deleteSynastry } from '@/features/synastry/delete-synastry';
import type { ApiErrorKind } from '@/lib/api';

const D = strings.synastry.delete;

export type SynastryDeleteSheetProps = {
  visible: boolean;
  /** 지울 궁합 */
  id: string;
  onClose: () => void;
  /** 서버에서 지운 뒤 */
  onDeleted: () => void;
};

/**
 * 궁합을 지울지 한 번 더 묻는 시트(계정 삭제 시트와 같은 꼴). "지우기" 를 눌러야 서버에 요청한다.
 * 실패하면 이유를 적고 시트를 열어 둔다. 스스로 다시 요청하지 않고, 다시 누를 때만 한다.
 */
export function SynastryDeleteSheet({ visible, id, onClose, onDeleted }: SynastryDeleteSheetProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiErrorKind | null>(null);

  async function confirm() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const r = await deleteSynastry(id);
    setBusy(false);
    if (r.ok) onDeleted();
    else setError(r.error);
  }

  function close() {
    // 지우는 동안에는 닫지 않는다(결과를 보지 못한 채 화면에 남지 않게).
    if (busy) return;
    setError(null);
    onClose();
  }

  return (
    <Sheet visible={visible} onClose={close} title={D.title}>
      <Txt variant="body" color="gray" style={styles.body}>
        {D.body}
      </Txt>
      {error ? (
        <Txt variant="label" color="danger" style={styles.body}>
          {error === 'NETWORK' ? D.failed.NETWORK : D.failed.OTHER}
        </Txt>
      ) : null}
      <View style={styles.buttons}>
        <Button variant="danger" label={busy ? D.deleting : D.confirm} disabled={busy} onPress={() => void confirm()} />
        <Button variant="line" label={D.cancel} disabled={busy} onPress={close} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { textAlign: 'center' },
  buttons: { gap: Spacing.xs },
});
