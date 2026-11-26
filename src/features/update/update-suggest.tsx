import * as Linking from 'expo-linking';

import { Dialog } from '@/components/dialog';
import { strings } from '@/content/strings';

const S = strings.update.suggest;

export type UpdateSuggestProps = {
  storeUrl: string;
  /** 창을 닫는다. 어느 버튼이든 이 최신 버전은 다시 묻지 않는다 */
  onDone: () => void;
};

/** 업데이트 권유(결정 059, 보드 17): 홈 위 가운데 창. "나중에" 는 닫기만 하고, "업데이트" 는 스토어를 연다(열지 못해도 닫는다). */
export function UpdateSuggest({ storeUrl, onDone }: UpdateSuggestProps) {
  function update() {
    onDone();
    Linking.openURL(storeUrl).catch(() => {});
  }

  return <Dialog title={S.title} body={S.body} cancel={{ label: S.later, onPress: onDone }} confirm={{ label: S.update, onPress: update }} />;
}
