import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { useSlideUp } from '@/components/slide-up';
import { Txt } from '@/components/txt';
import { Colors, LegalLayout, LineWidth, Radius, ScreenPaddingX, Sizes, Spacing, StepLayout } from '@/constants/theme';
import { legalInfo, type LegalBlock, type LegalDocument } from '@/content/legal';
import { strings } from '@/content/strings';

const L = strings.legal;

export type TextPageProps = {
  /** 약관 · 처리방침 같은 글 한 편(`src/content/legal.ts`). 머리의 제목은 글의 title 이다 */
  doc: LegalDocument;
  onBack: () => void;
  /** 있으면 맨 아래에 "동의하기" 를 둔다 — 가입 약관 단계에서 연 글(결정 044) */
  onAgree?: () => void;
};

/**
 * 글만 있는 화면(약관 · 처리방침 · 마케팅 수신 동의, 결정 043 · 044 시안 보드 6-2). 머리는 가운데 제목과 왼쪽 뒤로(꺾쇠),
 * 그 아래 시행일 한 줄. 본문은 랜딩(byeolmyeong.com)의 같은 글과 같은 순서로 머리말 → 조항(제목 · 문단 · 글머리 목록 · 번호 목록 · 표)
 * → 마지막 시행 문구다. 표는 폰 폭에서 칸이 좁아지지 않게 행마다 카드 한 장으로 쌓고, 카드 안에 "머리 · 값" 을 위아래로 적는다.
 * 가입 약관 단계에서 연 글이면 맨 아래에 "동의하기" 가 위로 사라지는 바탕 위에 떠 있다.
 * 아래에서 올라오는 창이다(결정 067 의 1): 웹은 이 화면이 스스로 올라오고, 뒤로 · 동의하기는 내려간 뒤에 돌아간다.
 */
export function TextPage({ doc, onBack, onAgree }: TextPageProps) {
  const { style, close, ref, hidden } = useSlideUp();
  return (
    <Animated.View testID="slide-up-page" ref={ref} aria-hidden={hidden} style={style}>
      <TextPageScreen doc={doc} onBack={() => close(onBack)} onAgree={onAgree ? () => close(onAgree) : undefined} />
    </Animated.View>
  );
}

function TextPageScreen({ doc, onBack, onAgree }: TextPageProps) {
  return (
    <Screen scroll={false} nav={<Header title={doc.title} onBack={onBack} />} bottomInset={onAgree ? Sizes.stepBottom : undefined}>
      <ScrollView
        style={styles.fill}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={onAgree ? styles.contentWithAgree : styles.content}>
        <View testID="legal-body" style={styles.body}>
          <Txt variant="caption" color="hint">
            {`${L.effectiveLabel} ${legalInfo.effective}`}
          </Txt>
          <Txt variant="small" color="gray" keepAll style={styles.intro}>
            {doc.intro}
          </Txt>
          {doc.sections.map((section) => (
            <View key={section.title} testID="legal-section" style={styles.section}>
              <Txt variant="bodyStrong" accessibilityRole="header">
                {section.title}
              </Txt>
              {section.blocks.map((block, i) => (
                <Block key={i} block={block} />
              ))}
            </View>
          ))}
          <Txt variant="caption" color="hint" style={styles.closing}>
            {doc.closing}
          </Txt>
        </View>
      </ScrollView>
      {onAgree ? (
        <View style={styles.agree}>
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Svg width="100%" height="100%">
              <Defs>
                <LinearGradient id="legalAgreeFade" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={Colors.paper} stopOpacity={0} />
                  <Stop offset={String(FADE_SOLID)} stopColor={Colors.paper} stopOpacity={1} />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#legalAgreeFade)" />
            </Svg>
          </View>
          <Button label={L.agree} onPress={onAgree} />
        </View>
      ) : null}
    </Screen>
  );
}

/** 머리: 가운데 제목 · 왼쪽 뒤로(가입 단계와 같은 꺾쇠, 누르는 칸 40) */
function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel={strings.common.backLabel} onPress={onBack} style={styles.back}>
        <Svg width={StepLayout.backIcon} height={StepLayout.backIcon} viewBox="0 0 24 24" fill="none">
          <Path d="M15 5l-7 7 7 7" stroke={Colors.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Pressable>
      <Txt variant="subhead" accessibilityRole="header" numberOfLines={1} style={styles.title}>
        {title}
      </Txt>
    </View>
  );
}

function Block({ block }: { block: LegalBlock }) {
  if ('p' in block) {
    return (
      <Txt variant="small" color="gray" keepAll style={styles.block}>
        {block.p}
      </Txt>
    );
  }
  if ('ul' in block || 'ol' in block) {
    const items = 'ul' in block ? block.ul : block.ol;
    return (
      <View style={[styles.block, styles.list]}>
        {items.map((item, i) => (
          <View key={item} style={styles.item}>
            <Txt variant="small" color="hint" style={styles.marker}>
              {'ul' in block ? L.bullet : `${i + 1}${L.numberSuffix}`}
            </Txt>
            <Txt variant="small" color="gray" keepAll style={styles.itemText}>
              {item}
            </Txt>
          </View>
        ))}
      </View>
    );
  }
  const { head, rows } = block.table;
  return (
    <View style={[styles.block, styles.list]}>
      {rows.map((row) => (
        <View key={row.join('|')} testID="legal-table-card" style={styles.card}>
          {row.map((cell, c) => (
            <View key={c}>
              <Txt variant="small" color="hint">
                {head[c]}
              </Txt>
              <Txt variant="small" color={c === 0 ? 'ink' : 'gray'} keepAll>
                {cell}
              </Txt>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const BACK_LEFT = ScreenPaddingX + StepLayout.backInset;
/** 가림막은 버튼 위 칸(위 40 · 버튼 56)만 그린다(아래 34 는 화면 여백). 시안의 가림막 전체에서 다 차는 자리를 이 칸의 비율로 옮긴다 */
const FADE_HEIGHT = LegalLayout.agreeFade + Sizes.buttonHeight;
const FADE_SOLID = (LegalLayout.agreeFadeSolid * (FADE_HEIGHT + Sizes.stepBottom)) / FADE_HEIGHT;

const styles = StyleSheet.create({
  header: {
    height: Sizes.stepHeader,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: BACK_LEFT + StepLayout.back,
  },
  back: {
    position: 'absolute',
    left: BACK_LEFT,
    top: (Sizes.stepHeader - StepLayout.back) / 2,
    width: StepLayout.back,
    height: StepLayout.back,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { textAlign: 'center' },
  fill: { flex: 1 },
  content: { paddingBottom: Spacing.lg },
  /** 맨 아래 문구가 동의하기 위로 올라올 만큼 더 굴린다 */
  contentWithAgree: { paddingBottom: LegalLayout.agreeFade + Sizes.buttonHeight + Spacing.lg },
  body: { paddingHorizontal: ScreenPaddingX, paddingTop: Spacing.xs },
  intro: { marginTop: Spacing.lg },
  section: { marginTop: Spacing.lg },
  block: { marginTop: LegalLayout.blockGap },
  list: { gap: LegalLayout.blockGap },
  item: { flexDirection: 'row', gap: Spacing.xxs },
  /** 글머리 · 번호 칸. 번호가 한 자리라 칸 폭은 고정이다 */
  marker: { width: Spacing.md },
  itemText: { flex: 1 },
  card: {
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: Radius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.fill,
  },
  closing: { marginTop: Spacing.xl, paddingTop: Spacing.md, borderTopWidth: LineWidth, borderTopColor: Colors.hair },
  agree: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: LegalLayout.agreeFade,
    paddingHorizontal: ScreenPaddingX,
  },
});
