/**
 * 인스타그램 스토리 공유(결정 053 의 1): 카드 PNG 를 스토리 편집 화면의 배경으로 넘긴다. 올리기는 사용자가 인스타그램에서 누른다.
 * Meta 앱 ID 가 있어야 한다(없으면 인스타그램이 거절한다). 연결은 react-native-share — iOS 는 붙여넣기 보드(5분 뒤 사라짐) + instagram-stories 주소,
 * 안드로이드는 ADD_TO_STORY 인텐트다. 웹은 `story.web.ts`(스토리가 없다). 실패는 던지지 않고 값으로 돌려준다(시트가 기기 공유 창으로 넘긴다).
 */
import { Linking, Platform } from 'react-native';
import Share, { Social } from 'react-native-share';

import { Colors } from '@/constants/theme';

export type StoryResult = 'OPENED' | 'NOT_INSTALLED' | 'FAILED';

const IOS_STORY_URL = 'instagram-stories://share';
const ANDROID_PACKAGE = 'com.instagram.android';

/** 이 빌드의 Meta 앱 ID(`EXPO_PUBLIC_META_APP_ID`, 비밀 아님). 없으면 null — 스토리 버튼을 숨긴다 */
export function storyAppId(): string | null {
  return process.env.EXPO_PUBLIC_META_APP_ID?.trim() || null;
}

async function instagramInstalled(): Promise<boolean> {
  if (Platform.OS === 'android') return (await Share.isPackageInstalled(ANDROID_PACKAGE)).isInstalled;
  return Linking.canOpenURL(IOS_STORY_URL);
}

/** 카드 PNG 파일(uri)을 인스타그램 스토리의 배경으로 연다. 앱이 없으면 NOT_INSTALLED, 앱 ID 가 없거나 열지 못하면 FAILED */
export async function openStory(uri: string, appId: string | null): Promise<StoryResult> {
  if (!appId) return 'FAILED';
  try {
    if (!(await instagramInstalled())) return 'NOT_INSTALLED';
    const { success } = await Share.shareSingle({
      social: Social.InstagramStories,
      appId,
      backgroundImage: uri,
      backgroundTopColor: Colors.paper,
      backgroundBottomColor: Colors.paper,
    });
    return success ? 'OPENED' : 'FAILED';
  } catch {
    return 'FAILED';
  }
}
