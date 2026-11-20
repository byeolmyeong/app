import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { Avatar, isAvatarId } from '@/components/avatar';
import { GlowBackdrop } from '@/components/glow';
import { Txt } from '@/components/txt';
import { BrandColors, Colors, LineWidth, NicknameCardLayout as L, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';

const C = strings.home.card;
const M = strings.main;

export type NicknameCardProps = {
  /** `GET /account` 의 닉네임 · 프로필 그림. 받지 못했거나 옛 계정이면 null — 그 칸을 빼고 그린다 */
  nickname: string | null;
  avatar: number | null;
  /** 해 별자리 이름("쌍둥이자리" — 서버 차트의 SUN). 없으면 null */
  sunSign: string | null;
  /** 별명을 받은 지 며칠(받은 날 1일). 요약 해석에 만든 때가 없으면 null */
  days: number | null;
  /** 받아 둔 요약 해석의 한 줄 별명. 아직 없으면 null */
  headline: string | null;
  onOpen: () => void;
};

/** 뒤에 옅게 깔린 별자리 선과 네 갈래 별(보드 11 의 장식). 화면 읽기에서 숨긴다 */
function Constellation() {
  return (
    <View aria-hidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={styles.art}>
      <Svg width={L.art.width} height={L.art.height} viewBox="0 0 160 140">
        <G fill="none" stroke={BrandColors.constellation} strokeWidth={1}>
          <Path d="M55 15L51 32L39 40" />
          <Path d="M51 32L63 38L83 36L119 60L143 92" />
          <Path d="M83 36L72 75L54 89L30 83L19 110" />
          <Path d="M54 89L48 128" />
        </G>
        <G fill={Colors.ink}>
          {[[55, 15, 2], [51, 32, 2], [39, 40, 2], [63, 38, 2], [83, 36, 2.4], [143, 92, 2], [72, 75, 2], [54, 89, 2.4], [30, 83, 2], [19, 110, 2], [48, 128, 2]].map(
            ([cx, cy, r]) => (
              <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
            ),
          )}
        </G>
        <Path transform="translate(119 60)" fill={BrandColors.core} d="M0,-8 Q1.4,-1.4 8,0 Q1.4,1.4 0,8 Q-1.4,1.4 -8,0 Q-1.4,-1.4 0,-8Z" />
      </Svg>
    </View>
  );
}

/**
 * 홈의 별명 카드(결정 047 의 1-2, 보드 11 · 11-1): 프로필 그림 · "○○ 님" · "해 별자리 · 별명을 받은 지 N일" · 한 줄 별명 · 풀이 읽기.
 * 카드 전체를 누르면 내 별명(풀이 글)으로 간다. 브랜드 자리라 오른쪽 위에 옅은 빛과 별자리 장식이 있다(결정 035).
 */
export function NicknameCard({ nickname, avatar, sunSign, days, headline, onOpen }: NicknameCardProps) {
  const meta = [sunSign, days !== null ? `${C.daysPrefix}${days}${C.daysSuffix}` : null].filter(Boolean).join(C.separator);
  return (
    <Pressable testID="nickname-card" accessibilityRole="button" onPress={onOpen} style={styles.card}>
      <GlowBackdrop color={BrandColors.cardGlow} extent={L.glow.extent} centerX={L.glow.x} centerY={L.glow.y} />
      <Constellation />
      <View style={styles.row}>
        {isAvatarId(avatar) ? <Avatar id={avatar} size={L.avatar} /> : null}
        <View style={styles.names}>
          {nickname ? (
            <Txt variant="heading">
              {nickname}
              {C.nicknameSuffix}
            </Txt>
          ) : null}
          {meta ? (
            <Txt variant="caption" color="gray">
              {meta}
            </Txt>
          ) : null}
        </View>
      </View>
      {headline ? (
        <Txt variant="cardTitle" keepAll style={styles.headline}>
          {headline}
        </Txt>
      ) : (
        <Txt variant="body" color="gray" style={styles.headline}>
          {M.readingEmpty}
        </Txt>
      )}
      <View style={styles.more}>
        <Txt variant="captionStrong" color="gray">
          {headline ? C.read : M.readingCta}
        </Txt>
        <Svg width={L.chevron} height={L.chevron} viewBox="0 0 24 24" fill="none">
          <Path d="M9 6l6 6-6 6" stroke={Colors.gray} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </View>
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
    padding: L.padding,
  },
  art: { position: 'absolute', right: L.art.right, top: L.art.top, opacity: L.art.opacity },
  row: { flexDirection: 'row', alignItems: 'center', gap: L.rowGap },
  names: { flexShrink: 1 },
  headline: { marginTop: L.headlineTop },
  more: { flexDirection: 'row', alignItems: 'center', gap: Spacing.hairline, marginTop: L.moreTop },
});
