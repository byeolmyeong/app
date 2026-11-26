import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Avatar, isAvatarId } from '@/components/avatar';
import { CardConstellation, type CardConstellationArt } from '@/components/card-constellation';
import { GlowBackdrop } from '@/components/glow';
import { PlaceholderCircle, PlaceholderLine } from '@/components/placeholder';
import { Txt } from '@/components/txt';
import { BrandColors, Colors, FontWeight, LineWidth, MyLayout } from '@/constants/theme';
import { strings } from '@/content/strings';

const L = MyLayout.card;
const C = strings.my.card;
/** 카드를 누르면 가는 곳 — 화면 읽기 이름 끝에 붙인다 */
const OPEN = strings.my.account.title;

export type MyCardProps = {
  /** `GET /account` 의 닉네임 · 프로필 그림. 받지 못했거나 옛 계정이면 null — 그 칸을 빼고 그린다 */
  nickname: string | null;
  avatar: number | null;
  /** 계정을 아직 모른다(처음 — 기기에도 없고 받기 전): 그림 · 이름 자리에 같은 크기의 흐린 자리표 */
  accountPending?: boolean;
  /** 해 별자리 이름("물병자리" — 서버 차트의 SUN). 없으면 null */
  sunSign: string | null;
  /** 오른쪽 위에 그릴 해 별자리 그림(서버 차트의 SUN 으로 화면이 고른다). 없으면 그리지 않는다 */
  art: CardConstellationArt | null;
  /** 별명을 받은 지 며칠(받은 날 1일). 요약 해석에 만든 때가 없으면 null */
  days: number | null;
  /** 받아 둔 요약 해석의 한 줄 별명. 없으면 null */
  headline: string | null;
  /** 출생 정보 한 줄. 기기에 출생 정보가 없으면 null */
  birthLine: string | null;
  /** 카드 어디를 눌러도 내 정보(`/my/account`)로 간다 */
  onOpen: () => void;
};

/**
 * 마이 위의 별명 카드(결정 056 의 1 · 084, 보드 16): 프로필 그림 · 닉네임 · "해 별자리 · 별명을 받은 지 N일" · 한 줄 별명 · 출생 정보 한 줄.
 * 카드 전체를 누르면 내 정보로 가고, 이름 줄 끝에 꺾쇠를 둔다(버튼 둘은 결정 084 로 뺐다 — 출생 정보 수정은 내 정보 안에서 들어간다).
 * 홈 카드와 같은 빛과 별자리 장식을 오른쪽 위에 둔다.
 */
export function MyCard({ nickname, avatar, accountPending = false, sunSign, art, days, headline, birthLine, onOpen }: MyCardProps) {
  const meta = [sunSign, days !== null ? `${C.daysPrefix}${days}${C.daysSuffix}` : null].filter(Boolean).join(C.separator);
  // 보이는 글 차례대로 + 가는 곳(결정 078 의 1 과 같은 방식) — 비어 있는 칸은 빼고 읽는다
  const label = [nickname, meta, headline, birthLine, OPEN].filter(Boolean).join(C.labelSeparator);
  return (
    <Pressable testID="my-card" accessibilityRole="button" accessibilityLabel={label} onPress={onOpen} style={styles.card}>
      <GlowBackdrop color={BrandColors.cardGlow} extent={L.glow.extent} centerX={L.glow.x} centerY={L.glow.y} />
      <CardConstellation art={art} />
      <View style={styles.row}>
        {accountPending ? <PlaceholderCircle testID="avatar-placeholder" size={L.avatar} /> : isAvatarId(avatar) ? <Avatar id={avatar} size={L.avatar} /> : null}
        <View style={styles.names}>
          {accountPending ? <PlaceholderLine testID="nickname-placeholder" variant="section" width={L.namePlaceholder} /> : null}
          {nickname ? <Txt variant="section">{nickname}</Txt> : null}
          {meta ? (
            <Txt variant="caption" color="gray">
              {meta}
            </Txt>
          ) : null}
        </View>
        <Svg testID="my-card-chevron" width={L.chevron} height={L.chevron} viewBox="0 0 24 24" fill="none">
          <Path d="M9 6l6 6-6 6" stroke={Colors.hint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </View>
      {headline ? (
        <Txt variant="input" color="inkSoft" keepAll style={styles.headline}>
          {headline}
        </Txt>
      ) : null}
      {birthLine ? (
        <Txt variant="caption" color="accentText" style={styles.birth}>
          {birthLine}
        </Txt>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: L.radius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.raised,
    paddingTop: L.paddingTop,
    paddingHorizontal: L.padding,
    paddingBottom: L.padding,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: L.rowGap },
  /** 이름 칸이 남은 폭을 써서 꺾쇠가 줄 끝에 붙는다 */
  names: { flex: 1, gap: L.namesGap },
  headline: { marginTop: L.headlineTop, lineHeight: L.headlineLine, fontWeight: FontWeight.medium },
  birth: { marginTop: L.birthTop },
});
