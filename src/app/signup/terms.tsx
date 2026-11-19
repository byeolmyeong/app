/**
 * 가입 1단계: 약관 동의(결정 041, 시안 보드 6 · 6-1). 모두 동의 + [필수] 이용약관 · [필수] 개인정보 수집 · 이용 ·
 * [선택] 푸시 알림 받기 · [선택] 마케팅 정보 수신. 필수 둘이 켜져야 다음으로 간다. 선택은 기본 꺼짐이고(정보통신망법 제50조)
 * "모두 동의" 만 넷을 한 번에 켠다. 동의와 약관 · 처리방침 버전은 가입 초안(메모리)에 두고 마지막 단계에서 한 번에 보낸다.
 * 뒤로 가면 가입을 그만둔다(가입권 · 초안을 버리고 로그인 화면으로 — 가드가 보낸다).
 */
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Button } from '@/components/button';
import { CheckBox } from '@/components/checkbox';
import { Txt } from '@/components/txt';
import { Colors, LineWidth, Radius, Sizes, Spacing, StepLayout } from '@/constants/theme';
import { LEGAL_VERSIONS } from '@/content/legal-versions';
import { strings } from '@/content/strings';
import { clearDraft, getDraft, setDraft, takeTermsRejection } from '@/features/auth/signup-draft';
import { SignupStep } from '@/features/auth/signup-step';
import { useAuth } from '@/features/auth/use-session';

const T = strings.terms;

type Key = 'terms' | 'privacy' | 'push' | 'marketing';
type Agreed = Record<Key, boolean>;

/** 줄의 순서 · 필수 여부 · "보기" 가 여는 화면(마케팅은 처리방침의 수집 · 이용 목적) */
const ITEMS: { key: Key; required: boolean; view?: { href: '/settings/terms' | '/settings/privacy'; label: string } }[] = [
  { key: 'terms', required: true, view: { href: '/settings/terms', label: T.viewLabels.terms } },
  { key: 'privacy', required: true, view: { href: '/settings/privacy', label: T.viewLabels.privacy } },
  { key: 'push', required: false },
  { key: 'marketing', required: false, view: { href: '/settings/privacy', label: T.viewLabels.marketing } },
];

const NONE: Agreed = { terms: false, privacy: false, push: false, marketing: false };

/** 체크를 바꿀 때마다 초안에 쓴다. 필수가 꺼지면 버전을 지워 앞으로 가기로 넘어가도 다음 단계가 약관 단계로 돌려보낸다 */
function writeDraft(a: Agreed) {
  const agreedRequired = a.terms && a.privacy;
  setDraft({
    termsVersion: agreedRequired ? LEGAL_VERSIONS.terms : undefined,
    privacyVersion: agreedRequired ? LEGAL_VERSIONS.privacy : undefined,
    pushConsent: a.push,
    marketingConsent: a.marketing,
  });
}

/** 초안이 있으면(닉네임 단계에서 돌아옴) 그 동의로, 없으면 모두 꺼짐 */
function initial(): Agreed {
  const d = getDraft();
  return d
    ? { terms: true, privacy: true, push: d.pushConsent, marketing: d.marketingConsent }
    : NONE;
}

export default function TermsStep() {
  const { status, cancelSignup } = useAuth();
  const [agreed, setAgreed] = useState<Agreed>(initial);
  /** 마지막 단계에서 약관이 거절되어 돌아왔다(약관 버전이 바뀜) */
  const [rejected, setRejected] = useState(false);
  /** 다음을 눌러 넘어가는 중(두 번 눌러 닉네임 단계가 두 번 쌓이지 않게). 이 화면으로 돌아오면 푼다 */
  const leaving = useRef(false);
  useFocusEffect(
    useCallback(() => {
      leaving.current = false;
      if (takeTermsRejection()) {
        setRejected(true);
        setAgreed(NONE);
      }
    }, []),
  );

  // 가입을 마친 사람이 뒤로 가기로 돌아오면 홈으로(여기서 누른 뒤로가 로그아웃시키지 않게)
  if (status === 'signedIn') return <Redirect href="/" />;

  const all = ITEMS.every((item) => agreed[item.key]);
  const canNext = agreed.terms && agreed.privacy;

  function back() {
    clearDraft();
    void cancelSignup();
  }

  function update(next: Agreed) {
    setAgreed(next);
    setRejected(false);
    writeDraft(next);
  }

  function next() {
    if (!canNext || leaving.current) return;
    leaving.current = true;
    writeDraft(agreed);
    router.push('/signup/nickname');
  }

  const toggleAll = () => update({ terms: !all, privacy: !all, push: !all, marketing: !all });

  return (
    <SignupStep
      step={1}
      onBack={back}
      title={T.title}
      guide={T.guide}
      footer={
        <View style={styles.footer}>
          {rejected ? (
            <Txt variant="caption" color="danger">
              {T.rejected}
            </Txt>
          ) : null}
          <Button label={T.next} onPress={next} disabled={!canNext} />
        </View>
      }>
      <View style={styles.list}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={T.all}
          accessibilityState={{ checked: all }}
          onPress={toggleAll}
          style={[styles.all, all && styles.allOn]}>
          <CheckBox checked={all} size={Sizes.checkRound} round />
          <Txt variant="emphasis">{T.all}</Txt>
        </Pressable>
        <View style={styles.items}>
          {ITEMS.map((item) => {
            const tag = item.required ? T.required : T.optional;
            const label = T.items[item.key];
            const view = item.view;
            return (
              <View key={item.key}>
                {item.key === 'push' ? <View testID="terms-group-gap" style={styles.groupGap} /> : null}
                <View style={styles.row}>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityLabel={`${tag} ${label}`}
                    accessibilityState={{ checked: agreed[item.key] }}
                    onPress={() => update({ ...agreed, [item.key]: !agreed[item.key] })}
                    style={styles.check}>
                    <CheckBox checked={agreed[item.key]} size={Sizes.checkSquare} />
                    <Txt variant="item" style={styles.label}>
                      <Txt variant="item" color={item.required ? 'accentText' : 'hint'}>
                        {tag}
                      </Txt>
                      {` ${label}`}
                    </Txt>
                  </Pressable>
                  {view ? (
                    <Pressable
                      accessibilityRole="link"
                      accessibilityLabel={view.label}
                      hitSlop={Spacing.xs}
                      onPress={() => router.push(view.href)}
                      style={styles.view}>
                      <Txt variant="caption" color="hint">
                        {T.view}
                      </Txt>
                      <Svg width={Sizes.chevronSmall} height={Sizes.chevronSmall} viewBox="0 0 24 24" fill="none">
                        <Path d="M9 6l6 6-6 6" stroke={Colors.hint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </Svg>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })}
          <Txt variant="note" color="hint" style={styles.note}>
            {T.marketingNote}
          </Txt>
        </View>
      </View>
    </SignupStep>
  );
}

const ROW = Sizes.listRow;

const styles = StyleSheet.create({
  list: { marginTop: StepLayout.contentTop },
  all: {
    height: Sizes.agreeAllRow,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius,
    backgroundColor: Colors.raised,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
  },
  allOn: { borderColor: Colors.primary },
  items: { paddingTop: Spacing.xs, paddingHorizontal: Spacing.md },
  groupGap: { height: Sizes.termsGroupGap },
  row: { height: ROW, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  check: { flex: 1, height: ROW, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  label: { flex: 1 },
  view: { flexDirection: 'row', alignItems: 'center', gap: Spacing.hairline },
  note: { paddingTop: Spacing.hairline, paddingLeft: Sizes.checkSquare + Spacing.sm },
  footer: { gap: Spacing.sm },
});
