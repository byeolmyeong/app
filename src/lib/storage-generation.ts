/**
 * 기기 보관의 세대 표식(공유 카드 기억 · 오늘의 하늘 · 이번 달). 요청을 시작할 때 `storageGeneration` 으로 읽고, 답이 왔을 때
 * `isSameGeneration` 이 참일 때만 보관한다 — 그 사이 로그아웃 · 계정 삭제 · 출생 정보 바꾸기로 기기를 지웠으면(표식도 `byeolmyeong.` 이라
 * 함께 지워진다) 늦게 온 답이 앞사람의 것을 다시 써 넣지 않는다(리뷰 #66). 표식 키는 보관마다 따로 둔다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

/** 표식을 만드는 중(처음 동시에 부른 요청들이 같은 세대를 쓰게) */
const creating = new Map<string, Promise<string>>();

/** 지금 세대. 없으면(처음 · 기기를 지운 뒤) 새로 만든다 */
export async function storageGeneration(key: string): Promise<string> {
  const current = await AsyncStorage.getItem(key);
  if (current) return current;
  const running = creating.get(key);
  if (running) return running;
  const made = (async () => {
    const next = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await AsyncStorage.setItem(key, next);
    return next;
  })().finally(() => creating.delete(key));
  creating.set(key, made);
  return made;
}

/** 요청을 시작할 때의 세대가 아직 그대로인가. 읽지 못하면 아니라고 본다(보관하지 않는다) */
export async function isSameGeneration(key: string, gen: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(key)) === gen;
  } catch {
    return false;
  }
}
