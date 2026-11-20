import { useEffect } from 'react';

import { StateScreen } from '@/components/state-screen';
import { strings } from '@/content/strings';

const M = strings.maintenance;

/** 점검 화면이 떠 있는 동안 설정을 다시 받는 간격(결정 060). 끝난 뒤 금방 풀리면서 서버를 괴롭히지 않는다 */
const RECHECK_MS = 60 * 1000;

export type MaintenanceNoticeProps = {
  /** 관리자가 적은 안내(그냥 글자, 예 "오전 2:00 ~ 오전 4:00 동안 점검해요."). 있으면 첫 줄이고, 없거나 비었으면 기본 문구 한 줄이다 */
  message: string | null;
  /** 설정을 다시 받는다. 점검이 끝났으면 이 화면은 사라진다 */
  onCheck: () => Promise<void>;
};

/**
 * 점검 화면(결정 030 · 060, 보드 18). 실패 화면 틀(결정 061)에 버튼이 없다 — 기다리기만 하면 된다. 뒤로 가기 · 닫기도 없다.
 * 떠 있는 동안 1분마다 설정을 다시 받는다(앞으로 돌아올 때의 확인은 문이 한다). 세션이 필요 없다.
 */
export function MaintenanceNotice({ message, onCheck }: MaintenanceNoticeProps) {
  useEffect(() => {
    const timer = setInterval(() => void onCheck(), RECHECK_MS);
    return () => clearInterval(timer);
  }, [onCheck]);

  const note = message?.trim();
  return <StateScreen title={M.title} body={note ? `${note}\n${M.body}` : M.body} />;
}
