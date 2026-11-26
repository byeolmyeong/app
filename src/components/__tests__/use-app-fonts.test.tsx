import { renderHook } from '@testing-library/react-native';

import { useAppFonts } from '@/components/use-app-fonts';
import { FontFamily, FontWeight } from '@/constants/theme';

/**
 * 앱 글꼴(결정 086): expo-font 설정 플러그인(app.json)이 빌드 때 넣는다 — 굵기 셋(theme FontWeight)마다 공식 OTF 하나,
 * 안드로이드 가족 이름은 theme FontFamily, iOS 는 같은 파일 셋(가족 이름은 파일 안의 "Pretendard"). 앱이 뜰 때 이미 있어 기다리지 않는다.
 */
// 실행 때 등록(useFonts)은 늘 "아직" 으로 답한다 — 훅이 그것을 기다리면 마지막 시험이 깨진다
jest.mock('expo-font', () => ({ useFonts: () => [false, null] }));

// 시험은 저장소 맨 위에서 돈다(jest rootDir)
const fs = jest.requireActual<{ readFileSync: (file: string, encoding: 'utf8') => string; existsSync: (file: string) => boolean }>('fs');

type FontDefinition = { path: string; weight: number };
type FontPluginProps = { ios?: { fonts?: string[] }; android?: { fonts?: { fontFamily: string; fontDefinitions: FontDefinition[] }[] } };

function fontPlugin(): FontPluginProps | undefined {
  const app = JSON.parse(fs.readFileSync('app.json', 'utf8')) as { expo: { plugins: unknown[] } };
  const entry = app.expo.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-font') as [string, FontPluginProps] | undefined;
  return entry?.[1];
}

const OTF = { 400: 'Regular', 500: 'Medium', 600: 'SemiBold' } as const;

describe('앱 글꼴 — 빌드 때 넣는다(결정 086)', () => {
  it('안드로이드: theme FontFamily 한 가족에 굵기 셋(theme FontWeight)마다 공식 OTF 하나, 파일이 있다', () => {
    const families = fontPlugin()?.android?.fonts ?? [];
    expect(families.map((f) => f.fontFamily)).toEqual([FontFamily]);
    const defs = families[0].fontDefinitions;
    expect(defs.map((d) => String(d.weight)).sort()).toEqual(Object.values(FontWeight).sort());
    for (const d of defs) {
      expect(d.path).toBe(`./assets/fonts/Pretendard-${OTF[d.weight as keyof typeof OTF]}.otf`);
      expect(fs.existsSync(d.path)).toBe(true);
    }
  });

  it('iOS: 안드로이드와 같은 파일 셋', () => {
    const plugin = fontPlugin();
    const androidPaths = (plugin?.android?.fonts?.[0].fontDefinitions ?? []).map((d) => d.path);
    expect(plugin?.ios?.fonts).toHaveLength(3);
    expect([...(plugin?.ios?.fonts ?? [])].sort()).toEqual([...androidPaths].sort());
  });

  it('앱이 뜰 때 이미 있어 기다리지 않는다(스플래시는 글꼴을 기다리지 않음)', async () => {
    const { result } = await renderHook(() => useAppFonts());
    expect(result.current).toEqual([true, null]);
  });
});
