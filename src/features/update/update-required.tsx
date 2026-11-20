import * as Linking from 'expo-linking';
import { useState } from 'react';

import { StateScreen } from '@/components/state-screen';
import { strings } from '@/content/strings';

const U = strings.update;

export type UpdateRequiredProps = {
  /** 관리자가 적은 안내(그냥 글자). 없거나 비었으면 기본 문구를 쓴다 */
  message: string | null;
  /** 스토어 주소. 없으면 버튼 대신 설명 아래에 안내 한 줄을 둔다 */
  storeUrl: string | null;
};

/**
 * 막는 화면(결정 027 · 059, 보드 17-1). 실패 화면 틀(결정 061)에 "새 버전이 나왔어요" · 두 줄 설명 · 주 버튼 "업데이트" 하나.
 * 갈 곳이 없어 나중에 하기 · 뒤로 가기 · 닫기가 없다. 스토어 주소가 없거나 열지 못하면 설명 아래 줄로 알린다.
 */
export function UpdateRequired({ message, storeUrl }: UpdateRequiredProps) {
  const [openFailed, setOpenFailed] = useState(false);

  async function openStore(url: string) {
    try {
      await Linking.openURL(url);
      setOpenFailed(false);
    } catch {
      setOpenFailed(true);
    }
  }

  const text = message?.trim() ? message : U.body;
  const note = !storeUrl ? U.noStore : openFailed ? U.openFailed : null;
  return (
    <StateScreen
      title={U.title}
      body={note ? `${text}\n${note}` : text}
      primary={storeUrl ? { label: U.open, onPress: () => void openStore(storeUrl) } : undefined}
    />
  );
}
