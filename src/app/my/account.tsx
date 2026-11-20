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
import { maskEmail } from '@/features/my/mask-email';
import { ProviderBadge } from '@/features/my/provider-badge';
import { useMyAccount } from '@/features/my/use-my-account';
import { api } from '@/lib/api';

const A = strings.my.account;
const LO = strings.my.logout;
const L = MyLayout.account;

/** 이메일이 없는(옛) 계정은 공급자 이름만 적는다. 모르는 공급자면 아무것도 적지 않는다 */
const providerName = (provider: string) => (A.providers as Record<string, string>)[provider] ?? '';

/**
 * 계정(결정 056 의 3, 보드 16-1): 위 가운데 프로필 그림(누르면 고르기 시트 16-6) · 닉네임(16-5) · 연결된 계정(공급자 + 가린 이메일)을 한 카드에,
 * 로그아웃(가운데 창 16-9)은 따로 한 카드, 맨 아래 작은 밑줄 글자 "계정 삭제"(16-10).
 * 계정을 받지 못해도(끊김) 로그아웃 · 계정 삭제는 늘 보인다. 프로필은 고르면 바로 저장하고 짧은 알림으로 알린다(결정 065 의 1).
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
    if (res.ok) {
      setAccount(res.data);
      show('success', A.avatarSaved);
    } else show('error', A.saveFailed);
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

  const linked = account ? (account.email ? maskEmail(account.email) : providerName(account.provider)) : null;
  return (
    <Screen scroll={false} nav={<NavBar chevron title={A.title} onBack={() => router.back()} />}>
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
          <ListCardRow label={A.nickname} value={account?.nickname ?? ''} onPress={() => router.push('/my/nickname')} />
          {linked !== null ? (
            <ListCardRow
              label={A.linked}
              trailing={
                <View style={styles.linked}>
                  <ProviderBadge provider={account?.provider ?? ''} />
                  <Txt variant="desc" color="gray">
                    {linked}
                  </Txt>
                </View>
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
  linked: { flexDirection: 'row', alignItems: 'center', gap: L.badgeGap },
  /** 계정 삭제는 맨 아래 가운데 작은 밑줄 글자(아래 34) */
  footer: { alignItems: 'center', paddingHorizontal: ScreenPaddingX, paddingBottom: StateLayout.bottom },
  delete: { height: L.deleteRow, paddingHorizontal: Spacing.sm, justifyContent: 'center' },
  deleteText: { textDecorationLine: 'underline' },
});
