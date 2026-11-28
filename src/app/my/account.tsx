import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Avatar, isAvatarId, type AvatarId } from '@/components/avatar';
import { Dialog } from '@/components/dialog';
import { ListCard, ListCardRow } from '@/components/list-card';
import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { Toast, useToast } from '@/components/toast';
import { Txt } from '@/components/txt';
import { Colors, MyLayout, ScreenPaddingX, Sizes, Spacing, StateLayout } from '@/constants/theme';
import { strings } from '@/content/strings';
import { AvatarSheet } from '@/features/auth/avatar-sheet';
import { signOut } from '@/features/auth/sign-out';
import { ProviderBadge, hasProviderMark } from '@/features/my/provider-badge';
import { useMyAccount } from '@/features/my/use-my-account';
import { api } from '@/lib/api';

const A = strings.my.account;
const LO = strings.my.logout;
const L = MyLayout.account;

/** 마크가 없는 공급자(개발용)의 이름 글자(결정 103 의 1). 모르는 공급자면 아무것도 적지 않는다 */
const providerName = (provider: string) => (A.providers as Record<string, string>)[provider] ?? '';

/**
 * 내 정보(결정 084 — 056 의 3 의 계정 화면, 보드 16-1): 위 가운데 프로필 그림(누르면 고르기 시트 16-6) · 닉네임(16-5) · 출생 정보(누르면
 * 출생 정보 수정 16-4) · 연결된 계정(공급자 마크만 — 이메일은 보이지 않는다, 결정 103 의 1)을 한 카드에, 로그아웃(가운데 창 16-9)은 따로 한 카드,
 * 맨 아래 작은 밑줄 글자 "계정 삭제"(16-10). 화면이 스크롤되지 않으니 줄을 따로 카드로 나누지 않는다.
 * 닉네임 · 출생 정보 줄은 이름과 꺾쇠 › 만 — 지금 값은 마이 별명 카드에 있다(결정 087). 그래서 기기에 출생 정보가 없어도 줄 모양은 같다.
 * 계정을 받지 못해도(끊김) 로그아웃 · 계정 삭제는 늘 보인다. 프로필은 고르면 바로 저장하고 바뀐 모습만 보인다 — 못 바꿨을 때만 짧은 알림(결정 065 의 1, 소유자 2026-11-21).
 */
export default function AccountScreen() {
  const { account, setAccount } = useMyAccount();
  const { toast, show, hide } = useToast();
  const [sheet, setSheet] = useState(false);
  const [asking, setAsking] = useState(false);
  /** 저장 · 로그아웃이 진행 중(두 번 눌러도 한 번만) */
  const busy = useRef(false);
  const avatar = account && isAvatarId(account.avatar) ? account.avatar : null;

  async function pickAvatar(id: AvatarId) {
    setSheet(false);
    if (busy.current || id === avatar) return;
    busy.current = true;
    const res = await api.updateAccount({ avatar: id });
    busy.current = false;
    // 바뀐 그림이 곧 알림이다 — 성공 알림은 띄우지 않는다(소유자 2026-11-21). 못 바꿨을 때만 짧은 알림
    if (res.ok) setAccount(res.data);
    else show('error', A.saveFailed);
  }

  async function logout() {
    if (busy.current) return;
    busy.current = true;
    // 서버 세션 지우기가 실패해도 기기에서는 로그아웃한다(결정 034). 쌓인 화면을 걷어 내고 로그인 화면만 남긴다
    await signOut();
    busy.current = false;
    setAsking(false);
    if (router.canDismiss()) router.dismissAll();
    router.replace('/login');
  }

  // 연결된 계정 줄(결정 103 의 1): 공급자 마크만 — 이메일은 보이지 않는다. 마크가 없는 개발용 계정만 이름 글자
  const provider = account?.provider ?? null;
  return (
    <Screen scroll={false} nav={<NavBar chevron title={A.title} onBack={() => (router.canGoBack() ? router.back() : router.replace('/my'))} />}>
      <View style={styles.body}>
        <Pressable accessibilityRole="button" accessibilityLabel={A.editAvatar} onPress={() => setSheet(true)} style={styles.avatar}>
          {avatar ? <Avatar id={avatar} size={Sizes.avatarLarge} /> : <View testID="avatar-empty" style={styles.avatarEmpty} />}
          <View style={styles.edit}>
            <Svg width={Sizes.avatarEditIcon} height={Sizes.avatarEditIcon} viewBox="0 0 24 24" fill="none">
              <Path d="M4 20h4L19 9l-4-4L4 16v4z" stroke={Colors.ink} strokeWidth={2} strokeLinejoin="round" />
            </Svg>
          </View>
        </Pressable>
        <ListCard>
          <ListCardRow label={A.nickname} onPress={() => router.push('/my/nickname')} />
          <ListCardRow label={A.birth} onPress={() => router.push('/my/birth')} />
          {provider !== null ? (
            <ListCardRow
              label={A.linked}
              trailing={
                hasProviderMark(provider) ? (
                  <ProviderBadge provider={provider} />
                ) : (
                  <Txt variant="small" color="gray" numberOfLines={1}>
                    {providerName(provider)}
                  </Txt>
                )
              }
            />
          ) : null}
        </ListCard>
        <ListCard>
          <ListCardRow label={A.logout} chevron={false} onPress={() => setAsking(true)} />
        </ListCard>
      </View>
      <View style={styles.footer}>
        <Toast toast={toast} onClose={hide} above="tabs" />
        <Pressable accessibilityRole="button" onPress={() => router.push('/my/delete')} style={styles.delete}>
          <Txt variant="captionStrong" color="hint" style={styles.deleteText}>
            {A.delete}
          </Txt>
        </Pressable>
      </View>
      <AvatarSheet visible={sheet} value={avatar ?? 1} onConfirm={(id) => void pickAvatar(id)} onClose={() => setSheet(false)} />
      {asking ? (
        <Dialog
          title={LO.title}
          body={LO.body}
          cancel={{ label: LO.cancel, onPress: () => setAsking(false) }}
          confirm={{ label: LO.confirm, onPress: () => void logout() }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  /** 머리 아래 12, 카드끼리 12(보드 16-1) */
  body: { flex: 1, gap: MyLayout.gap, paddingTop: MyLayout.gap, paddingHorizontal: ScreenPaddingX },
  avatar: {
    alignSelf: 'center',
    width: Sizes.avatarLarge,
    height: Sizes.avatarLarge,
    marginTop: L.avatarTop,
    marginBottom: L.avatarBottom,
  },
  avatarEmpty: { width: Sizes.avatarLarge, height: Sizes.avatarLarge, borderRadius: Sizes.avatarLarge / 2, backgroundColor: Colors.fill },
  edit: {
    position: 'absolute',
    right: -Spacing.hairline,
    bottom: -Spacing.hairline,
    width: Sizes.avatarEdit,
    height: Sizes.avatarEdit,
    borderRadius: Sizes.avatarEdit / 2,
    backgroundColor: Colors.hair,
    borderWidth: Spacing.hairline,
    borderColor: Colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** 계정 삭제는 맨 아래 가운데 작은 밑줄 글자(아래 34) */
  footer: { alignItems: 'center', paddingHorizontal: ScreenPaddingX, paddingBottom: StateLayout.bottom },
  delete: { height: L.deleteRow, paddingHorizontal: Spacing.sm, justifyContent: 'center' },
  deleteText: { textDecorationLine: 'underline' },
});
