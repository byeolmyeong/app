import { useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View, type TextStyle } from 'react-native';

import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { Field, FieldInput } from '@/components/field';
import { Sheet } from '@/components/sheet';
import { Txt } from '@/components/txt';
import { Colors, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { sendImage, sendLink, type CardRef } from '@/features/share/share-actions';
import { ShareCardView } from '@/features/share/share-card';
import { shareUrlOf } from '@/features/share/share-url';
import { useShareCard } from '@/features/share/use-share-card';
import type { Relation, ShareRequest } from '@/lib/api';

const S = strings.share;
const MY_NAME_MAX = 20;
/** 시트는 웹에서 글자 커서를 숨긴다(치는 칸이 없다고 보고). 이름 칸에서는 다시 보이게 한다 */
const caret = (Platform.OS === 'web' ? { caretColor: Colors.ink } : {}) as TextStyle;

/** 무엇을 공유하는가. 궁합 점수는 내 이름을, 랭킹은 이름 표시 여부를 시트 안에서 받는다 */
export type ShareTarget =
  | { kind: 'READING' }
  | { kind: 'SCORE'; synastryId: string }
  | { kind: 'RANKING'; relation: Relation }
  | { kind: 'NEXT_TURN' };

/** 마지막에 적은 내 이름. 앱이 켜져 있는 동안 메모리에만 둔다(기기 저장소에 두지 않는다. 결정 025) */
let lastMyName = '';

/**
 * "공유하기" 버튼과 그것이 여는 시트(결정 025): 카드 미리보기와 공유 버튼.
 * 공유는 시트를 열 때 만든다(화면을 여는 것만으로는 `POST /shares` 를 부르지 않는다). 열 때마다 처음 상태로 시작한다.
 */
export function ShareEntry({ target, label = S.open }: { target: ShareTarget; label?: string }) {
  const [visible, setVisible] = useState(false);
  /** 연 횟수. 열 때마다 시트의 내용을 새로 만든다 */
  const [opened, setOpened] = useState(0);
  return (
    <>
      <Button
        variant="line"
        label={label}
        onPress={() => {
          setOpened((n) => n + 1);
          setVisible(true);
        }}
      />
      <Sheet visible={visible} onClose={() => setVisible(false)} title={S.sheetTitle}>
        {opened > 0 ? <ShareBody key={opened} target={target} /> : null}
      </Sheet>
    </>
  );
}

function ShareBody({ target }: { target: ShareTarget }) {
  /** 궁합 점수 카드에 적을 내 이름. 받기 전에는 null */
  const [myName, setMyName] = useState<string | null>(null);
  /** 랭킹 카드의 이름을 그대로 보일지. 꺼진 채로 시작한다 */
  const [showNames, setShowNames] = useState(false);
  const request = useMemo<ShareRequest | null>(() => {
    if (target.kind === 'SCORE')
      return myName === null ? null : { kind: 'SCORE', synastryId: target.synastryId, myName };
    if (target.kind === 'RANKING') return { kind: 'RANKING', relation: target.relation, showNames };
    return { kind: target.kind };
  }, [target, myName, showNames]);
  const { state, retry } = useShareCard(request);
  const cardRef: CardRef = useRef(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (target.kind === 'SCORE' && myName === null) return <MyNameForm onSubmit={setMyName} />;

  const web = Platform.OS === 'web';
  const url = state.status === 'done' ? shareUrlOf(state.shareId) : null;

  return (
    <View style={styles.body}>
      {state.status === 'loading' ? (
        <Txt variant="table" color="gray" style={styles.center}>
          {S.making}
        </Txt>
      ) : state.status === 'failed' ? (
        state.notFound ? (
          <Txt variant="body">{S.nothing[target.kind]}</Txt>
        ) : (
          <>
            <Txt variant="body">
              {state.error === 'NETWORK' || state.error === 'LIMIT' ? S.failed[state.error] : S.failed.OTHER}
            </Txt>
            <Button label={S.retry} onPress={retry} />
          </>
        )
      ) : (
        <View style={styles.preview}>
          <ShareCardView ref={cardRef} card={state.card} />
        </View>
      )}
      {target.kind === 'RANKING' && !(state.status === 'failed' && state.notFound) ? (
        <Checkbox
          label={S.showNames}
          checked={showNames}
          onChange={(checked) => {
            setNotice(null);
            setShowNames(checked);
          }}
        />
      ) : null}
      {state.status === 'done' ? (
        <>
          <View style={styles.actions}>
            <View style={styles.action}>
              <Button
                label={web ? S.actions.saveImage : S.actions.shareImage}
                onPress={async () => {
                  const ok = await sendImage(cardRef);
                  setNotice(ok ? (web ? S.notices.saved : null) : S.notices.imageFailed);
                }}
              />
            </View>
            <View style={styles.action}>
              <Button
                variant="line"
                label={web ? S.actions.copyLink : S.actions.shareLink}
                disabled={url === null}
                onPress={async () => {
                  if (url === null) return;
                  const ok = await sendLink(url);
                  setNotice(ok ? (web ? S.notices.copied : null) : S.notices.linkFailed);
                }}
              />
            </View>
          </View>
          {notice ? (
            <Txt variant="label" color="gray" style={styles.center}>
              {notice}
            </Txt>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

/** 궁합 점수 카드의 첫 단계: 카드에 적을 내 이름(앞뒤 공백을 뗀 1~20자)을 받는다 */
function MyNameForm({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [value, setValue] = useState(lastMyName);
  const [error, setError] = useState<string | null>(null);
  const submit = () => {
    const name = value.trim();
    if (name.length === 0) return setError(S.myName.errors.required);
    if (name.length > MY_NAME_MAX) return setError(S.myName.errors.tooLong);
    lastMyName = name;
    onSubmit(name);
  };
  return (
    <View style={styles.body}>
      <Field label={S.myName.label} hint={S.myName.hint} error={error ?? undefined}>
        <FieldInput
          value={value}
          placeholder={S.myName.placeholder}
          invalid={error !== null}
          style={caret}
          onChangeText={(text) => {
            setValue(text);
            setError(null);
          }}
          onSubmitEditing={submit}
        />
      </Field>
      <Button label={S.myName.submit} onPress={submit} />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: Spacing.md },
  preview: { alignItems: 'center' },
  center: { textAlign: 'center' },
  actions: { flexDirection: 'row', gap: Spacing.xs },
  action: { flex: 1 },
});
