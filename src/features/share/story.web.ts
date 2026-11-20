/** 웹에는 인스타그램 스토리 편집 화면을 여는 길이 없다(결정 053 의 1 — 웹은 이미지 저장만). 앱은 `story.ts` */
import type { StoryResult } from './story';

export function storyAppId(): string | null {
  return null;
}

export async function openStory(_uri: string, _appId: string | null): Promise<StoryResult> {
  return 'FAILED';
}
