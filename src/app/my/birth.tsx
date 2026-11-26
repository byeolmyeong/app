import { router, usePreventRemove } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Button } from '@/components/button';
import { Dialog } from '@/components/dialog';
import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { Toast, useToast } from '@/components/toast';
import { Txt } from '@/components/txt';
import { Colors, MyLayout, ScreenPaddingX, Spacing, StateLayout } from '@/constants/theme';
import { strings } from '@/content/strings';
import { clearDeviceData } from '@/features/auth/delete-account';
import { BirthFields, useBirthFields } from '@/features/chart/birth-fields';
import { birthInputOf, sameBirth, type BirthProfile } from '@/features/chart/birth-input';
import { useBirthProfile, type StoredBirth } from '@/features/chart/use-birth-profile';
import { useMyAccount } from '@/features/my/use-my-account';
import { revealNextReading } from '@/features/reading/reveal-once';
import { api, type BirthInput } from '@/lib/api';

const B = strings.my.birth;
const H = strings.home;
const L = MyLayout.birth;

// 주소로 바로 열어 돌아갈 곳이 없으면 들어오는 곳인 내 정보로(결정 084)
const back = () => (router.canGoBack() ? router.back() : router.replace('/my/account'));

/**
 * 출생 정보 수정(결정 056 의 6, 보드 16-4): 안내 · 생년월일 · 시각(모름) · 태어난 곳(온보딩 8 과 같은 칸) · 맨 아래 "수정하기".
 * "바꾸기" → 가운데 창으로 한 번 더 묻고 → 차트를 받아 서버에 저장(`PUT /profile` — 바뀌면 서버가 옛 별명 · 풀이 저장분을 지운다, 서버 결정 041)
 * → 기기에 둔 이 사람의 것(별명 · 풀이 · 이번 달 · 오늘의 하늘 보관)을 모두 지우고 새 출생 정보만 둔 뒤 → 별명 짓는 중부터(`/reading?from=birth`)
 * → 새 별명 공개(보드 10, 별명이 같아도 한 번 — 소유자 2026-11-20) → 풀이.
 * 바뀐 것이 없으면 묻지 않고 돌아간다(시각 "모름" 인 채 곳만 바꿨으면 기기의 곳만 바꾼다). 만 14세 미만 날짜는 서버가 거절하고(403 `UNDER_AGE`)
 * 생년월일 칸 아래에 알린다. 그 밖의 실패는 이 화면에 머물며 짧은 알림(결정 065 의 1). 기기 · 서버의 출생 정보가 어긋나지 않게 서버가 받은 뒤에만
 * 기기를 바꾼다 — 저장의 응답을 잃었으면(끊김 · 서버 오류) `GET /profile` 로 서버에 새 값이 있는지 확인한다. 바꾸는 동안은 뒤로 갈 수 없다.
 */
export default function BirthChangeScreen() {
  const { loaded, profile, chart, save } = useBirthProfile();
  // 기기 저장소를 읽은 뒤에 칸을 채운다(읽기 전에 만들면 빈 칸으로 남는다)
  if (!loaded) return <Screen nav={<NavBar chevron title={B.title} onBack={back} />}>{null}</Screen>;
  return <BirthChangeForm stored={profile && chart ? { profile, chart } : null} save={save} />;
}

/** 서버에 보내는 값이 같은가(시각 "모름" 이면 곳은 서버로 가지 않는다) */
const sameInput = (a: BirthInput, b: BirthInput) => a.date === b.date && a.time === b.time && a.placeId === b.placeId;

/** 저장(`PUT /profile`) 실패가 확실하지 않은가 — 닿지 못했거나 서버 오류면 서버가 이미 저장했을 수 있다(4xx 는 확실한 거절) */
const uncertain = (r: { error: string; status?: number }) => r.error === 'NETWORK' || r.error === 'INVALID' || (r.error === 'SERVER' && (r.status ?? 500) >= 500);

function BirthChangeForm({ stored, save }: { stored: StoredBirth | null; save: (value: StoredBirth) => Promise<void> }) {
  const fields = useBirthFields(stored?.profile);
  const { toast, show, hide } = useToast();
  // 바꾼 뒤 새 별명 공개(보드 10)에 쓸 닉네임(소유자 2026-11-20 — 별명이 같아도 한 번 보인다). 받지 못했으면 공개 없이 글로
  const { account } = useMyAccount();
  const [asking, setAsking] = useState<{ profile: BirthProfile; input: BirthInput } | null>(null);
  const [busy, setBusy] = useState(false);
  /** 바꾸기를 마쳐 떠날 곳. 뒤로 막기가 풀린 뒤에 떠난다(막힌 채로 떠나면 막기에 걸린다) */
  const [leave, setLeave] = useState<'reading' | 'back' | null>(null);
  /** 바꾸는 중(두 번 눌러도 한 번만) */
  const sending = useRef(false);

  // 바꾸는 동안은 뒤로(머리 · 손짓 · 기기 뒤로 단추)를 막는다 — 떠난 화면에서 결과가 보이지 않게
  usePreventRemove(busy, () => {});
  useEffect(() => {
    if (!leave || busy) return;
    if (leave === 'back') return back();
    if (router.canDismiss()) router.dismissAll();
    router.replace({ pathname: '/reading', params: { from: 'birth' } });
  }, [leave, busy]);

  async function onSubmit() {
    const v = fields.validate();
    if (!v) return;
    if (stored && sameBirth(stored.profile, v.profile)) return back();
    // 서버로 가는 값이 같으면(시각 "모름" 인 채 곳만 바꿨다) 별명 · 풀이는 그대로다 — 묻지 않고 기기의 곳만 바꾼다
    if (stored && sameInput(birthInputOf(stored.profile), v.input)) {
      await save({ profile: v.profile, chart: stored.chart });
      return setLeave('back');
    }
    setAsking({ profile: v.profile, input: v.input });
  }

  /** 저장했는지 서버에 물어본다(응답을 잃었을 때) — 새 값이 저장돼 있으면 true */
  async function savedOnServer(input: BirthInput): Promise<boolean> {
    const r = await api.getProfile();
    return r.ok && sameInput(r.data, input);
  }

  async function change(next: { profile: BirthProfile; input: BirthInput }) {
    setAsking(null);
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    try {
      const chart = await api.createChart(next.input);
      if (!chart.ok) return show('error', chart.error === 'NETWORK' || chart.error === 'LIMIT' ? H.requestErrors[chart.error] : H.requestErrors.OTHER);
      const saved = await api.saveProfile(next.input);
      if (!saved.ok) {
        if (saved.code === 'UNDER_AGE') return fields.setDateError(H.requestErrors.UNDER_AGE);
        if (!(uncertain(saved) && (await savedOnServer(next.input))))
          return show('error', saved.error === 'NETWORK' ? H.requestErrors.NETWORK : strings.my.account.saveFailed);
      }
      if (account?.nickname) revealNextReading(account.nickname);
      try {
        // 옛 출생 정보로 만든 것이 보이지 않게 이 사람의 기기 보관을 모두 지우고 새 출생 정보만 둔다(기기 값은 남는다)
        await clearDeviceData();
        await save({ profile: next.profile, chart: chart.data });
      } finally {
        // 기기에 두지 못했어도 서버에는 새 값이 있다 — 기기가 비면 홈이 서버의 것으로 되살린다(결정 029)
        setLeave('reading');
      }
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  return (
    <Screen
      scroll={false}
      nav={
        <NavBar
          chevron
          title={B.title}
          onBack={() => {
            if (!busy) back();
          }}
        />
      }>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.fill} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.notice}>
            <Svg width={L.noticeIcon} height={L.noticeIcon} viewBox="0 0 24 24" fill="none" style={styles.noticeIcon}>
              <Circle cx={12} cy={12} r={9} stroke={Colors.accentText} strokeWidth={1.8} />
              <Path d="M12 7.5v6M12 16.5v.01" stroke={Colors.accentText} strokeWidth={2} strokeLinecap="round" />
            </Svg>
            <Txt variant="small" color="body" keepAll style={styles.noticeText}>
              {B.notice}
            </Txt>
          </View>
          <BirthFields control={fields} />
        </ScrollView>
        <View style={styles.footer}>
          {/* 알림이 버튼 폭 그대로 뜨게 여백 없는 칸으로 감싼다 */}
          <View>
            <Toast toast={toast} onClose={hide} above="button" />
            <Button label={B.submit} onPress={onSubmit} disabled={busy} />
          </View>
        </View>
      </KeyboardAvoidingView>
      {asking ? (
        <Dialog
          title={B.confirm.title}
          body={B.confirm.body}
          cancel={{ label: B.confirm.cancel, onPress: () => setAsking(null) }}
          confirm={{ label: B.confirm.ok, onPress: () => void change(asking) }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  /** 머리 아래 12, 묶음 사이 22(보드 16-4) */
  content: { gap: L.gap, paddingTop: MyLayout.gap, paddingHorizontal: ScreenPaddingX, paddingBottom: Spacing.md },
  notice: {
    flexDirection: 'row',
    gap: L.noticeGap,
    paddingVertical: L.noticePadV,
    paddingHorizontal: L.noticePadH,
    borderRadius: L.noticeRadius,
    backgroundColor: Colors.fill,
  },
  noticeIcon: { marginTop: L.noticeIconTop },
  noticeText: { flex: 1 },
  footer: { paddingHorizontal: ScreenPaddingX, paddingBottom: StateLayout.bottom },
});
