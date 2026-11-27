---
type: decision
tags: [푸시, 안드로이드, 알림 채널, 권한, Play]
status: active
last_reviewed: 2026-11-27
superseded_by:
---
# 098. 안드로이드도 앱을 쓰는 중에 온 푸시를 위에서 내려오는 배너로 띄운다(중요도 HIGH 채널 · 안드로이드만 소리 허용) · 쓰지 않는 권한 넷을 막는다

> 상태: 활성 · 결정일 2026-11-27(Play 비공개 테스트 versionCode 2 를 검토에 보낸 뒤, 다음 빌드 versionCode 3 에 넣는다) · 결정 076 의 5 를 대체하고, 076 의 1 중 "소리 없이" 는 안드로이드에서만 대체한다(iOS 는 그대로)

## 맥락
- 결정 076 의 5: 안드로이드는 앱을 쓰는 중에 온 푸시가 상태 막대 · 알림 목록에만 보이고, 위에서 내려오는 배너(heads-up)가 뜨지 않는다. 코드로 원인 둘을 확인했다(expo-notifications 58).
  1. 포그라운드 처리기가 `shouldPlaySound: false` 를 주면 `ExpoNotificationBuilder` 가 소리도 진동도 없는 알림에 `setSilent(true)` 를 건다. 안드로이드는 조용하게 만든 알림을 위로 띄우지 않는다.
  2. 앱이 만드는 채널 `default` 의 중요도가 `DEFAULT` 다. 안드로이드 문서는 내려오는 배너를 `IMPORTANCE_HIGH`("소리를 내고 heads-up 으로 보인다")에만 준다.
- 원격 푸시가 고르는 채널(같은 코드):
  - 앱이 켜져 있을 때(Expo 가 띄움): `notification.channelId` → `data.channelId` → 없으면 Expo 대체 채널(`expo_notifications_fallback_notification_channel`, 중요도 HIGH).
  - FCM 이 직접 띄울 때: 매니페스트의 `com.google.firebase.messaging.default_notification_channel_id` 를 쓴다. 이 값은 expo-notifications 플러그인의 `defaultChannel` 이 넣는다.
- 서버(`ExpoPush.kt`)는 지금 `to · title · body · data · sound` 만 보내고 channelId 는 보내지 않는다. Expo 푸시 문서는 channelId 가 없으면 "Default" 채널을 쓴다고만 하고, 정확한 id 는 적지 않았다.
- 한 번 만든 채널의 중요도는 앱이 바꿀 수 없다(안드로이드 · Expo 문서: "만든 뒤에는 이름과 설명만 바꿀 수 있다").
- Play 에 올린 AAB 매니페스트에 쓰지 않는 권한이 보였다. 어디서 오는지:
  - `SYSTEM_ALERT_WINDOW`: Expo 안드로이드 템플릿이 앱 매니페스트에 넣는다(react-native 는 debug 매니페스트에만 둔다).
  - `MODIFY_AUDIO_SETTINGS`: expo-audio(플러그인 · 라이브러리 매니페스트).
  - `USE_BIOMETRIC` · `USE_FINGERPRINT`: expo-secure-store 가 의존하는 `androidx.biometric`.
  - `DUMP`: 앱이 요청하는 권한이 아니다. `androidx.profileinstaller` 의 receiver 를 보호하는 `android:permission` 으로 보인다(시스템 · adb 만 부를 수 있게). versionCode 3 AAB 에서 확인한다.

## 결정
1. **채널 `default` 를 중요도 HIGH 로 만든다.** 이름("알림")과 id 는 그대로다 — 서버를 고치지 않는다.
2. **expo-notifications 플러그인에 `defaultChannel: "default"`.** FCM 이 직접 띄우는 푸시도 같은 채널로 모인다.
3. **포그라운드 처리기: 안드로이드만 `shouldPlaySound: true`.**
   - 소리 · 진동은 채널을 따른다. 안드로이드는 조용하게 만든 알림을 위로 띄우지 않기 때문이다.
   - iOS 는 076 의 1 그대로 소리 없이 배너만 띄운다. 보고 있는 화면이 가리키는 알림은 두 운영체제 모두 띄우지 않는다.
4. **이미 설치된 기기는 채널 중요도가 바뀌지 않는다.**
   - versionCode 2 를 받은 비공개 테스트 기기는 `DEFAULT` 로 남는다. 앱을 지웠다 다시 깔거나 앱 데이터를 지운 뒤부터 배너가 뜬다.
   - 새 채널 id 로 옮기고 서버가 그 id 로 보내면 기존 기기도 바뀐다. 하지만 출시 전이라 테스터뿐이고 서버 운영 배포가 막 끝나, 이번에는 하지 않는다.
5. **`android.blockedPermissions` 에 넷을 더한다.**
   - `SYSTEM_ALERT_WINDOW`: 다른 앱 위에 그리기. 앱이 쓰지 않는다.
   - `MODIFY_AUDIO_SETTINGS`: 1.0.0 에서 음악을 껐고(결정 069), 재생에는 필요 없다.
   - `USE_BIOMETRIC` · `USE_FINGERPRINT`: SecureStore 를 `requireAuthentication` 없이 쓴다(get · set · delete 만).
6. **남기는 것**
   - 푸시: INTERNET · ACCESS_NETWORK_STATE · POST_NOTIFICATIONS · RECEIVE_BOOT_COMPLETED · VIBRATE · WAKE_LOCK · FCM 의 c2dm RECEIVE.
   - `WRITE_EXTERNAL_STORAGE`(maxSdkVersion 32): 안드로이드 9 이하에서 공유 카드를 사진 앱에 저장할 때 쓴다(`share-actions.ts` 의 `requestPermissionsAsync(true)` — 11 이상은 권한 없이 저장).
   - 읽기 권한(READ_EXTERNAL_STORAGE · READ_MEDIA_VISUAL_USER_SELECTED)은 이미 막혀 있다.

## 근거
- 내려오는 배너는 채널 중요도와 "알림이 울리는가" 둘 다 필요하다. 하나만 고치면 뜨지 않는다.
- 같은 id 를 쓰면 서버 계약이 그대로라 운영 서버를 다시 배포하지 않는다.
- 권한은 적을수록 Play 데이터 보안 답안과 사용자 신뢰에 좋다. 막은 넷은 코드에서 쓰는 곳이 없다.

## 대안
- 새 채널 id(HIGH) + 서버 channelId — 기존 기기까지 고쳐진다. 서버 변경이 필요하고, 설정 화면에 옛 채널이 남는다. 출시 뒤 필요하면 다시 본다.
- 안드로이드도 소리 없이 두기 — 배너가 뜨지 않는다(076 의 5 그대로).
- 진동만 있고 소리는 없는 채널 — 앱을 쓰지 않을 때 온 푸시까지 소리가 없어진다.

## 결과 · 재검토 조건
- 서버 제안(하지 않음): 푸시에 `channelId: "default"` 를 함께 보내면 앱을 쓰는 중에 온 푸시도 Expo 대체 채널 대신 `default` 로 간다. 휴대폰 설정에 채널이 하나만 보이게 된다. `priority: "high"` 는 절전 중 늦게 오는 것을 줄인다.
- versionCode 3 AAB 에서 확인할 것: 막은 넷이 매니페스트에 없는지, `DUMP` 가 receiver 의 보호 권한인지.
- 실제 기기에서 확인할 것: 새로 깐 기기에서 앱을 쓰는 중 푸시가 위로 내려오는지, 보고 있는 화면의 알림은 뜨지 않는지.
