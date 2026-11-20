import { useMemo, useRef, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View, type TextStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { Field, FieldInput } from '@/components/field';
import { Sheet } from '@/components/sheet';
import { Toast, useToast } from '@/components/toast';
import { Txt } from '@/components/txt';
import { Colors, Sizes, Spacing, StepLayout } from '@/constants/theme';
import { strings } from '@/content/strings';
import { saveImage, shareStory, type CardRef } from '@/features/share/share-actions';
import { SHARE_IMAGE, ShareCardView } from '@/features/share/share-card';
import { storyAppId } from '@/features/share/story';
import { useShareCard } from '@/features/share/use-share-card';
import type { MeArea, Relation, ShareRequest } from '@/lib/api';

const S = strings.share;
const MY_NAME_MAX = 20;
/** 시트는 웹에서 글자 커서를 숨긴다(치는 칸이 없다고 보고). 이름 칸에서는 다시 보이게 한다 */
const caret = (Platform.OS === 'web' ? { caretColor: Colors.ink } : {}) as TextStyle;

/**
 * 무엇을 공유하는가. 공유 v2 넷(결정 053): 내 별명 · 나 탭 영역 · 오늘의/그날의 하늘(그 날) · 다음 큰 변화.
 * 궁합 점수(내 이름을 시트 안에서 받는다) · 랭킹(이름 표시 여부)은 1.1.0 궁합 코드가 쓴다(1.0.0 에서는 열리지 않는다, 결정 055).
 */
export type ShareTarget =
  | { kind: 'NICKNAME' }
  | { kind: 'ME_AREA'; area: MeArea }
  | { kind: 'DAY_SKY'; date: string }
  | { kind: 'NEXT_BIG' }
  | { kind: 'SCORE'; synastryId: string }
  | { kind: 'RANKING'; relation: Relation };

/** 마지막에 적은 내 이름. 앱이 켜져 있는 동안 메모리에만 둔다(기기 저장소에 두지 않는다. 결정 025) */
let lastMyName = '';

/**
 * "공유하기" 와 그것이 여는 시트(결정 053 의 1, 보드 12-4 · 12-5 · 12-13 · 11-6 · 14-5): 제목 없이 카드 미리보기와 아래 버튼.
 * 공유는 시트를 열 때 한 번 만든다(화면을 여는 것만으로는 `POST /shares` 를 부르지 않는다). 열 때마다 처음 상태로 시작한다.
 * trigger="icon" 이면 보조 버튼 대신 머리 오른쪽의 공유 아이콘으로 연다(내 별명 · 나 탭 · 오늘의/그날의 하늘 — 보드 12 · 12-8 · 11-6).
 */
export function ShareEntry({ target, label = S.open, trigger = 'button' }: { target: ShareTarget; label?: string; trigger?: 'button' | 'icon' }) {
  const [visible, setVisible] = useState(false);
  /** 연 횟수. 열 때마다 시트의 내용을 새로 만든다 */
  const [opened, setOpened] = useState(0);
  const open = () => {
    setOpened((n) => n + 1);
    setVisible(true);
  };
  return (
    <>
      {trigger === 'icon' ? (
        <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={Spacing.xxs} onPress={open} style={styles.icon}>
          <Svg width={Sizes.navIcon} height={Sizes.navIcon} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 15V4M7.5 8.5L12 4l4.5 4.5M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"
              stroke={Colors.ink}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>
      ) : (
        <Button variant="line" label={label} onPress={open} />
      )}
      <Sheet visible={visible} onClose={() => setVisible(false)}>
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
    if (target.kind === 'ME_AREA') return { kind: 'ME_AREA', area: target.area };
    if (target.kind === 'DAY_SKY') return { kind: 'DAY_SKY', date: target.date };
    return { kind: target.kind };
  }, [target, myName, showNames]);
  const { state, retry } = useShareCard(request);
  const cardRef: CardRef = useRef(null);
  const { toast, show, hide } = useToast();
  /** 이미지를 찍는 동안 버튼을 다시 누르지 못하게(같은 그림이 두 장 저장되지 않게) */
  const [busy, setBusy] = useState(false);

  if (target.kind === 'SCORE' && myName === null) return <MyNameForm onSubmit={setMyName} />;

  // 스토리는 앱에서, Meta 앱 ID 가 있는 빌드에서만(웹은 storyAppId 가 늘 null)
  const appId = storyAppId();
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };
  // 결과는 모두 짧은 알림(결정 065 의 1) — 시트 안에 글을 붙이지 않는다
  const save = () =>
    run(async () => {
      const result = await saveImage(cardRef);
      if (result === 'SAVED') show('success', S.notices.saved);
      else show('error', result === 'DENIED' ? S.notices.photosDenied : S.notices.saveFailed);
    });
  const story = () =>
    run(async () => {
      if ((await shareStory(cardRef, appId)) === 'FAILED') show('error', S.notices.storyFailed);
    });
  // 사진 접근을 막았다는 알림은 누르면 설정을 연다(결정 065 의 1 "설정 열기")
  const closeToast = () => {
    if (toast?.text === S.notices.photosDenied) void Linking.openSettings();
    hide();
  };

  return (
    <View style={styles.body}>
      {state.status === 'loading' ? (
        <View style={styles.pending}>
          <Txt variant="table" color="gray" style={styles.center}>
            {S.making}
          </Txt>
        </View>
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
        <Checkbox label={S.showNames} checked={showNames} onChange={setShowNames} />
      ) : null}
      {state.status === 'done' ? (
        // 주 버튼은 맨 아래, 보조는 그 위(결정 061 의 5). 스토리가 없으면 "이미지 저장" 이 주 버튼이다
        <View style={styles.actions}>
          <Toast toast={toast} onClose={closeToast} above="button" />
          <Button variant={appId ? 'line' : 'primary'} label={S.actions.saveImage} onPress={save} />
          {appId ? <Button label={S.actions.story} onPress={story} /> : null}
        </View>
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
  icon: {
    width: StepLayout.back,
    height: StepLayout.back,
    marginRight: StepLayout.backInset,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { gap: Spacing.lg },
  preview: { alignItems: 'center' },
  /** 카드를 만드는 동안 미리보기 자리를 그대로 둔다(시트가 들썩이지 않게) */
  pending: {
    alignSelf: 'center',
    width: Sizes.shareCardWidth,
    height: Math.round((Sizes.shareCardWidth * SHARE_IMAGE.height) / SHARE_IMAGE.width),
    justifyContent: 'center',
  },
  center: { textAlign: 'center' },
  actions: { gap: Spacing.xs },
});
