import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View, type TextStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { Field, FieldInput } from '@/components/field';
import { Sheet } from '@/components/sheet';
import { Toast, useToast } from '@/components/toast';
import { useLoadingPhase } from '@/components/use-loading-phase';
import { Txt } from '@/components/txt';
import { Colors, Sizes, Spacing, StepLayout } from '@/constants/theme';
import { strings } from '@/content/strings';
import { saveImage, shareStory, type CardRef } from '@/features/share/share-actions';
import { ShareCardSkeleton, ShareCardView } from '@/features/share/share-card';
import { useSession } from '@/features/auth/use-session';
import { prefetchShare } from '@/features/share/share-cache';
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
 * 공유는 시트를 열 때 만든다 — 화면을 여는 것만으로는 `POST /shares` 를 부르지 않는다(서버 결정 012 "공유하는 순간만 저장", 결정 053 의 3).
 * 대신 화면에 들어올 때 저장 없는 미리보기(`POST /shares/preview`)로 카드를 받아 두어 첫 열기도 바로 보인다(소유자 2026-11-21).
 * 전에 받은 카드(share-cache.ts)가 있으면 먼저 보이고 뒤에서 확인한다. 열 때마다 처음 상태로 시작한다.
 * trigger="icon" 이면 보조 버튼 대신 머리 오른쪽의 공유 아이콘으로 연다(내 별명 · 나 탭 · 오늘의/그날의 하늘 — 보드 12 · 12-8 · 11-6),
 * "cardIcon" 이면 카드 안 오른쪽 위의 작은 아이콘(그 자리를 채우는 누르는 칸, 시기 · 인생의 다음 큰 변화 — 보드 14 인생).
 */
export function ShareEntry({ target, label = S.open, trigger = 'button' }: { target: ShareTarget; label?: string; trigger?: 'button' | 'icon' | 'cardIcon' }) {
  const [visible, setVisible] = useState(false);
  /** 연 횟수. 열 때마다 시트의 내용을 새로 만든다 */
  const [opened, setOpened] = useState(0);
  // 미리 받기는 기억하는 종류만(궁합 카드는 내 이름 · 이름 표시에 따라 달라 받지 않는다)
  const prefetchKey = target.kind === 'NICKNAME' || target.kind === 'NEXT_BIG' || target.kind === 'ME_AREA' || target.kind === 'DAY_SKY' ? JSON.stringify(target) : null;
  // 로그인이 확인된 뒤에만(확인 전에 부르면 토큰 없이 401 — 다른 화면과 같게, 결정 073)
  const signedIn = useSession().status === 'signedIn';
  useEffect(() => {
    if (prefetchKey && signedIn) void prefetchShare(JSON.parse(prefetchKey) as ShareRequest);
  }, [prefetchKey, signedIn]);
  const open = () => {
    setOpened((n) => n + 1);
    setVisible(true);
  };
  return (
    <>
      {trigger !== 'button' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          hitSlop={trigger === 'icon' ? Spacing.xxs : undefined}
          onPress={open}
          style={trigger === 'icon' ? styles.icon : styles.cardIcon}>
          <Svg
            width={trigger === 'icon' ? Sizes.navIcon : Sizes.cardShareIcon}
            height={trigger === 'icon' ? Sizes.navIcon : Sizes.cardShareIcon}
            viewBox="0 0 24 24"
            fill="none">
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
  /** 기다림을 다시 시작한 횟수(10초가 넘어 "다시 시도" 를 누르면 기다림 단계를 처음부터 센다) */
  const [round, setRound] = useState(0);
  const cardRef: CardRef = useRef(null);
  const { toast, show, hide } = useToast();
  /** 이미지를 찍는 동안 버튼을 다시 누르지 못하게(같은 그림이 두 장 저장되지 않게). 같은 순간의 두 번 눌림도 막도록 ref */
  const busy = useRef(false);

  if (target.kind === 'SCORE' && myName === null) return <MyNameForm onSubmit={setMyName} />;

  // 스토리는 앱에서, Meta 앱 ID 가 있는 빌드에서만(웹은 storyAppId 가 늘 null)
  const appId = storyAppId();
  const run = async (action: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true;
    try {
      await action();
    } finally {
      busy.current = false;
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
        <CardPending
          key={round}
          kind={target.kind}
          onRetry={() => {
            setRound((n) => n + 1);
            retry();
          }}
        />
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

/**
 * 카드를 기다리는 동안(결정 065 의 2 · 071): 0.3초가 넘으면 카드 모양 뼈대, 10초가 넘으면 실패 안내와 "다시 시도"(그 사이 버튼은 없다).
 * 다시 시도하면 새로 그려져 처음부터 센다.
 */
function CardPending({ kind, onRetry }: { kind: ShareTarget['kind']; onRetry: () => void }) {
  const phase = useLoadingPhase(true);
  if (phase === 'timeout')
    return (
      <>
        <Txt variant="body">{S.failed.OTHER}</Txt>
        <Button label={S.retry} onPress={onRetry} />
      </>
    );
  return (
    <View style={styles.preview}>
      <ShareCardSkeleton kind={kind} bars={phase === 'skeleton'} />
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
  /** 카드 안 공유 아이콘: 감싼 자리(누르는 칸)를 꽉 채운다 */
  cardIcon: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { gap: Spacing.lg },
  preview: { alignItems: 'center' },
  actions: { gap: Spacing.xs },
});
