/**
 * 화면 문구의 단일 출처. 화면과 부품에 문구를 직접 적지 않는다.
 * 1.1.0 에서 영어를 붙일 때 이 파일과 같은 모양의 번역만 추가한다.
 * 천체·별자리·각도의 키는 서버가 주는 식별자다(서버 저장소 "API 계약").
 */
export const strings = {
  appName: '별명',
  common: {
    back: '←',
    backLabel: '뒤로',
    arrow: '→',
    timeColon: ':',
    none: '—',
    /** 앱의 아래 탭 줄을 화면 읽기가 부르는 이름(리포트의 영역 탭과 구분) */
    bottomTabsLabel: '아래 탭',
  },
  /** 로그인(결정 034 · 042 · 044). 버튼 문구는 셋 다 영문 이름 + "로 로그인"(결정 044 — 카카오 · 구글은 공급자 가이드 문구와 다르다) */
  login: {
    /** 로고 아래 한 줄 */
    tagline: '별이 붙여 준 나의 별명',
    /** 웹은 구글이 그리는 GIS 버튼이라 이 문구를 쓰지 않는다(GIS 의 "로그인" 문구, 결정 044) */
    google: 'Google로 로그인',
    apple: 'Apple로 로그인',
    kakao: 'Kakao로 로그인',
    /** 이 기기에서 마지막에 쓴 공급자 버튼의 배지(결정 044). 화면 읽기에서는 버튼 이름 뒤에 ", 최근 로그인" 으로 붙는다 */
    recent: '최근 로그인',
    recentSeparator: ', ',
    /** 새 사람인데 공급자가 이메일을 주지 않았다(서버 `EMAIL_REQUIRED`, 결정 039). 시스템 알림 창 한 번 */
    emailRequired: {
      title: '이메일 제공에 동의해야 가입할 수 있어요',
      body: '다시 로그인하면서 이메일 제공에 동의해 주세요.',
    },
    dev: '개발용으로 들어가기',
    signingIn: '로그인하는 중이에요',
    failed: '로그인하지 못했어요. 잠시 뒤 다시 시도해 주세요.',
    underAge: '만 14세 이상만 가입할 수 있어요. 가입이 끝나지 않았어요.',
    expired: '가입 시간이 지났어요. 다시 로그인해 주세요.',
    signupTitle: '출생 정보를 알려 주세요',
  },
  /** 처음 켰을 때 한 번 보이는 소개 2장(결정 042 · 055 의 5 — 나 → 시기, 궁합 장은 1.1.0). 제목은 피그마 보드처럼 한 줄(좁은 화면에서는 저절로 줄이 바뀐다) */
  intro: {
    slides: [
      {
        title: '별이 지어 주는 나의 별명',
        body: '태어난 순간의 하늘을 계산해 나를 설명하는 글로 풀어 드려요. 점성술을 몰라도 술술 읽혀요.',
      },
      {
        title: '지금 나는 어떤 시기일까',
        body: '지금 지나고 있는 시기와 앞으로의 큰 흐름을 하늘의 움직임으로 살펴봐요.',
      },
    ],
    /** 둘째 장 그림의 시기 줄 */
    timeline: { past: '지나온 시기', now: '지금', ahead: '앞으로' },
    skip: '건너뛰기',
    next: '다음',
    start: '시작하기',
  },
  /** 단계식 가입의 공통(결정 042): 진행 막대의 화면 읽기 이름 "1 / 3" 의 가운데 */
  steps: { separator: ' / ' },
  /** 가입 1단계: 약관 동의(필수 2 · 선택 2). 선택은 기본 꺼짐(정보통신망법 제50조) */
  terms: {
    title: '서비스 이용에 동의해 주세요',
    guide: '별명을 쓰려면 아래 약관에 동의가 필요해요.',
    all: '모두 동의',
    required: '[필수]',
    optional: '[선택]',
    items: {
      terms: '이용약관',
      privacy: '개인정보 수집 · 이용',
      push: '푸시 알림 받기',
      marketing: '마케팅 정보 수신',
    },
    marketingNote: '이벤트 · 혜택 소식을 앱 푸시와 이메일로 보내요. 선택은 동의하지 않아도 가입할 수 있어요.',
    view: '보기',
    /** "보기" 링크의 화면 읽기 이름(무엇을 보는지) */
    viewLabels: {
      terms: '이용약관 보기',
      privacy: '개인정보 수집 · 이용 보기',
      marketing: '마케팅 정보 수신 보기',
    },
    /** 마지막 단계에서 서버가 약관 동의를 받지 않았다(`TERMS_REQUIRED` — 약관 버전이 바뀜). 체크를 풀고 이 한 줄을 보인다 */
    rejected: '약관이 바뀌었어요. 앱을 업데이트한 뒤 다시 동의해 주세요.',
    next: '다음',
  },
  /** 가입 2단계: 닉네임 · 프로필(결정 042). 오류 문구는 한 줄로 짧게(소유자) */
  nickname: {
    title: '어떻게 불러 드릴까요?',
    guide: '프로필과 닉네임은 나중에 마이에서 바꿀 수 있어요.',
    label: '닉네임',
    placeholder: '예: 새벽별',
    rule: '한글 · 영문으로 2~10자',
    invalidChar: '한글 · 영문만 쓸 수 있어요.',
    taken: '이미 있는 닉네임이에요.',
    /** 닉네임 확인을 서버에 묻지 못했다(인터넷은 home.requestErrors.NETWORK) */
    checkFailed: '닉네임을 확인하지 못했어요. 잠시 뒤 다시 눌러 주세요.',
    next: '다음',
    /** 위 가운데 프로필 그림을 누르는 버튼과 고르기 시트의 화면 읽기 이름. 화면에는 글자로 보이지 않는다 */
    editAvatar: '프로필 바꾸기',
    avatarSheet: '프로필',
    confirm: '확인',
    /** 프로필 8종의 화면 읽기 이름(1~8 순서). 화면에는 보이지 않는다 */
    avatars: ['별이', '웃는 별이', '윙크 별이', '조는 별이', '달', '하트', '불꽃', '구슬'],
  },
  /** 태어난 곳 고르기 시트(결정 042): 검색 · 시 · 도 칩 → 시 · 군 · 구 목록. 자리 글자는 예시 없이 */
  birthSheet: {
    searchPlaceholder: '동네 이름으로 찾기',
    clearSearch: '지우기',
    regions: '시 · 도',
    noResult: '찾는 동네가 없어요.',
    /** 서버에서 지역 목록을 받는 동안 */
    loading: '지역 목록을 불러오는 중이에요',
  },
  /** 별명 짓는 중(결정 042). 안내 문구 셋이 차례로 바뀐다. "길면 1분쯤 걸려요" 는 넣지 않는다(소유자) */
  /** 공통 상태(결정 061): 연결 끊김 띠(보드 20) — 화면마다의 실패 문구는 그 화면의 문구에 둔다 */
  states: {
    /** 처음 불러올 때 뼈대(보드 24)를 화면 읽기가 읽는 말 */
    loading: '불러오는 중이에요',
    offline: { title: '인터넷 연결이 끊겼어요', body: '연결되면 새로 불러올게요' },
    /** 볼 게 없는데 끊겼을 때(보드 20-1) */
    offlineEmpty: { title: '인터넷에 연결되어 있지 않아요', body: '와이파이나 데이터를 확인한 뒤\n다시 시도해 주세요.', retry: '다시 시도' },
    /** 화면 전체를 못 불러왔을 때(보드 19) — 제목은 화면마다 */
    loadFail: {
      title: { home: '홈을 불러오지 못했어요', reading: '내 별명을 불러오지 못했어요', report: '리포트를 불러오지 못했어요' },
      body: '잠깐 문제가 생겼어요.\n다시 보기를 누르면 다시 불러와요.',
      retry: '다시 보기',
    },
  },
  making: {
    title: '별명을 짓는 중이에요',
    lines: [
      '태어난 순간의 하늘을 계산하고 있어요',
      '해와 달이 어디에 있었는지 읽고 있어요',
      '나에게 어울리는 별명을 고르고 있어요',
    ],
    /** 가입 직후 별명을 짓지 못했을 때(보드 9-1). 나 탭에서 연 풀이의 실패는 states.loadFail(보드 19) */
    fail: { title: '별명을 짓지 못했어요', body: '잠깐 문제가 생겼어요.\n다시 짓기를 누르면 처음부터 다시 지어요.', retry: '다시 짓기' },
  },
  /** 별명 공개(결정 044, 보드 10): 가입 직후 풀이가 다 지어지면 한 번. "새벽별 님의 별명은" 의 뒷말과 아래 버튼 */
  reveal: {
    nicknameSuffix: '님의 별명은',
    read: '풀이 읽기',
  },
  /** 아래 탭 넷, 이 순서(결정 055 의 2 — 궁합 탭은 1.1.0) */
  tabs: { home: '홈', me: '나', timing: '시기', my: '마이' },
  /** 마이: 출생 정보와 설정의 줄을 한 화면에(결정 038) */
  my: {
    title: '마이',
    birthLabel: '출생 정보',
    editBirth: '바꾸기',
    /** 줄 묶음의 제목 */
    help: '도움',
    info: '약관 · 정보',
  },
  /** 마이에 펼치는 설정의 줄(F7 · F9, 결정 034 · 038). 알림은 푸시가 생길 때 더한다 */
  settings: {
    privacy: '개인정보 처리방침',
    /** 가입 때 동의한 글을 다시 보는 줄(결정 045) */
    privacyConsent: '개인정보 수집 · 이용 동의',
    terms: '이용약관',
    faq: '자주 묻는 질문',
    inquiry: '문의하기',
    version: '앱 버전',
    logout: '로그아웃',
    deleteAccount: '계정 삭제',
    deleteSheet: {
      title: '계정을 삭제할까요?',
      body: '계정과 출생 정보, 받은 풀이와 리포트가 서버와 이 기기에서 모두 지워져요. 되돌릴 수 없어요.',
      confirm: '삭제',
      deleting: '삭제하는 중',
      cancel: '취소',
      failed: {
        NETWORK: '인터넷 연결을 확인하고 다시 시도해 주세요.',
        OTHER: '계정을 삭제하지 못했어요. 잠시 뒤 다시 시도해 주세요.',
      },
    },
  },
  /**
   * 약관 · 처리방침 · 마케팅 수신 동의 화면(`TextPage`)의 글 밖 표시. 글 자체는 랜딩과 같은 원본 `src/content/legal.ts` 에 있다(결정 043).
   */
  legal: {
    /** 글머리 목록(ul)의 표시 */
    bullet: '•',
    /** 번호 목록(ol)의 번호 뒤: "1." */
    numberSuffix: '.',
    /** 머리 아래 한 줄: "시행일 2026년 11월 19일"(날짜는 글의 시행일, 결정 044) */
    effectiveLabel: '시행일',
    /** 가입 약관 단계에서 연 글의 맨 아래 버튼: 그 항목을 켜고 약관 단계로(결정 044) */
    agree: '동의하기',
  },
  /**
   * 자주 묻는 질문(결정 024 · 028)의 화면 문구. 질문과 답은 여기에 싣지 않는다 — 관리자가 적은 것을 서버에서 받는다.
   */
  faq: {
    title: '자주 묻는 질문',
    loading: '질문을 불러오는 중이에요',
    empty: '아직 등록된 질문이 없어요',
    emptyNote: '궁금한 점은 문의하기로 보내 주세요.',
    toInquiry: '문의하기',
    retry: '다시 시도',
    failed: {
      NETWORK: '인터넷 연결을 확인하고 다시 시도해 주세요.',
      LIMIT: '요청이 많아요. 잠시 뒤 다시 시도해 주세요.',
      OTHER: '질문을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.',
    },
  },
  /** 강제 업데이트(결정 027 · 059, 보드 17-1). body 는 관리자가 적은 안내가 없을 때의 기본 문구다. 버튼은 "업데이트하기" 가 아니라 "업데이트" */
  update: {
    title: '새 버전이 나왔어요',
    body: '이 버전은 더 이상 쓸 수 없어요.\n업데이트한 뒤에 이어서 볼 수 있어요.',
    open: '업데이트',
    noStore: '스토어에서 앱을 최신 버전으로 업데이트해 주세요.',
    openFailed: '스토어를 열지 못했어요. 스토어에서 직접 업데이트해 주세요.',
    /** 업데이트 권유(결정 059, 보드 17): 최신 버전보다 낮을 때 홈 위 가운데 창으로 한 번 */
    suggest: { title: '새 버전이 나왔어요', body: '새 기능이 더해졌어요.\n지금 업데이트할까요?', later: '나중에', update: '업데이트' },
  },
  /** 점검 안내(결정 030 · 060, 보드 18). body 는 늘 마지막 줄이다 — 관리자의 안내가 있으면 그 다음 줄, 없으면 혼자. 버튼은 없다 */
  maintenance: {
    title: '지금 별명을 손보고 있어요',
    body: '끝나면 저절로 이어서 볼 수 있어요.',
  },
  /** 문의하기(결정 024). 종류의 키는 서버가 받는 식별자다. 적은 내용과 이메일은 기기에 남기지 않는다 */
  inquiry: {
    title: '문의하기',
    intro: '궁금한 점이나 불편했던 점을 적어 보내 주세요.',
    categoryLabel: '어떤 문의인가요',
    categories: { ACCOUNT: '계정', READING: '풀이/리포트', SYNASTRY: '궁합', BUG: '오류 신고', OTHER: '기타' },
    bodyLabel: '문의 내용',
    bodyPlaceholder: '어느 화면에서 무슨 일이 있었는지 적어 주시면 도움이 돼요.',
    bodyHint: '10자 이상 적어 주세요.',
    /** 글자 수: "12 / 2000자" */
    countSeparator: ' / ',
    countUnit: '자',
    emailLabel: '답장 받을 이메일',
    emailPlaceholder: '선택 사항이에요',
    emailHint: '답장이 필요할 때만 적어 주세요.',
    submit: '보내기',
    sending: '보내는 중',
    errors: {
      categoryRequired: '문의 종류를 골라 주세요',
      bodyTooShort: '10자 이상 적어 주세요',
      bodyTooLong: '2000자까지 적을 수 있어요',
      emailFormat: '이메일 주소를 다시 확인해 주세요',
    },
    /** INVALID_BODY · INVALID_EMAIL 은 서버가 오류 본문에 적어 주는 이름이다 */
    failed: {
      NETWORK: '인터넷 연결을 확인하고 다시 눌러 주세요.',
      LIMIT: '문의를 여러 번 보내셨어요. 잠시 뒤 다시 보내 주세요.',
      INVALID_BODY: '문의 내용을 다시 확인해 주세요. 10자부터 2000자까지 보낼 수 있어요.',
      INVALID_EMAIL: '이메일 주소를 다시 확인해 주세요.',
      OTHER: '문의를 보내지 못했어요. 잠시 뒤 다시 눌러 주세요.',
    },
    done: {
      title: '문의를 보냈어요',
      body: '보내 주신 내용을 잘 받았어요.',
      /** 온 곳(마이 · 자주 묻는 질문)으로 돌아간다. 돌아갈 곳이 없으면 마이 */
      back: '돌아가기',
    },
  },
  /** 홈 별명 카드에서 받아 둔 풀이가 아직 없을 때(결정 047) */
  main: {
    readingEmpty: '아직 별명을 짓지 않았어요.',
    readingCta: '내 별명 읽기',
  },
  birth: {
    title: '출생 정보',
  },
  home: {
    title: '별이 붙여 준\n나의 별명',
    subtitle: '태어난 순간의 하늘을 계산해\n나를 설명하는 글로 풀어 드립니다.',
    /** 기기에 출생 정보가 없어 서버에 저장된 것을 확인하는 동안(결정 029) */
    restoring: '불러오는 중이에요',
    /** 홈 별명 카드(결정 047 의 1-2, 보드 11 · 11-1): "새벽별 님" · "물병자리 · 별명을 받은 지 12일" · 풀이 읽기 */
    card: {
      nicknameSuffix: ' 님',
      separator: ' · ',
      daysPrefix: '별명을 받은 지 ',
      daysSuffix: '일',
      read: '풀이 읽기',
    },
    dateLabel: '생년월일',
    datePlaceholder: '2000-06-15',
    timeLabel: '태어난 시각',
    timePlaceholder: '시각 선택',
    timeUnknownValue: '모름',
    timeUnknown: '태어난 시각을 몰라요',
    /** 시각 "모름" 을 켰을 때 시각 칸 아래(결정 042) */
    timeUnknownNote: '태어난 시각을 몰라 하우스와 상승점은 보여 드리지 않아요.',
    timeConfirm: '확인',
    placeLabel: '태어난 곳',
    placePlaceholder: '시·도, 시·군·구 선택',
    placeSheetTitle: '태어난 곳',
    /** 시·도 칩에 적는 짧은 이름. 없는 이름은 그대로 적는다 */
    regionShort: {
      서울특별시: '서울',
      부산광역시: '부산',
      대구광역시: '대구',
      인천광역시: '인천',
      광주광역시: '광주',
      대전광역시: '대전',
      울산광역시: '울산',
      세종특별자치시: '세종',
      경기도: '경기',
      강원특별자치도: '강원',
      충청북도: '충북',
      충청남도: '충남',
      전북특별자치도: '전북',
      전라남도: '전남',
      경상북도: '경북',
      경상남도: '경남',
      제주특별자치도: '제주',
    } as Record<string, string>,
    submit: '내 별명 읽기',
    submitting: '하늘을 계산하는 중',
    placeLoadFailed: '출생지 목록을 불러오지 못했어요.',
    placeRetry: '다시 불러오기',
    errors: {
      dateFormat: '예: 2000-06-15',
      dateTooEarly: '1900년부터 받아요',
      dateFuture: '오늘까지만 받아요',
      timeFormat: '예: 21:00',
      timeRequired: '태어난 시각을 골라 주세요',
      placeRequired: '태어난 곳을 골라 주세요',
      /**
       * 가입 때 서버가 만 14세 미만으로 거절했다(403 `UNDER_AGE`). 생년월일 칸 아래에 보인다(보드 8-4).
       * 서버가 가입권을 지워 날짜를 고쳐도 다시 로그인해야 한다 — 오타를 고친 성인도 이 문구를 본다
       */
      underAge: '만 14세 이상만 가입할 수 있어요.',
    },
    requestErrors: {
      NETWORK: '인터넷 연결을 확인하고 다시 눌러 주세요.',
      LIMIT: '요청이 많아요. 잠시 뒤 다시 눌러 주세요.',
      OTHER: '하늘을 계산하지 못했어요. 잠시 뒤 다시 눌러 주세요.',
      /** 서버가 만 14세 미만 날짜를 거절했다(PUT /profile 403, 서버 결정 021) */
      UNDER_AGE: '만 14세 미만이 되는 날짜로는 바꿀 수 없어요.',
    },
  },
  chart: {
    wheelLabel: '출생 차트 휠',
    keySunCaption: '힘을 내는 방식',
    keyMoonCaption: '편안함을 느끼는 방식',
    keyAscCaption: '처음 보이는 모습',
    /** 별자리 이름 뒤에 붙이는 말: 전갈 → 전갈자리 */
    signSuffix: '자리',
    keySun: '나의 중심',
    keyMoon: '나의 마음',
    keyAsc: '나의 첫인상',
    empty: '출생 정보를 먼저 넣어 주세요.',
    goHome: '출생 정보 넣기',
    timeUnknownNote: '태어난 시각을 몰라 하우스와 상승점은 보여 드리지 않아요.',
  },
  /** 내 하늘 지도(시안 13 · 13-1 · 13-2). 용어의 별명과 뜻은 아래 glossary */
  skyMap: {
    title: '내 하늘 지도',
    wheelLabel: '태어난 순간의 하늘 지도',
    /** 휠의 읽기 이름 뒤에 붙는 고른 별 */
    selectedPrefix: '고른 별: ',
    hint: '별을 누르면 지도에서 그 자리가 빛나요',
    listHeading: '별마다 있던 자리',
    separator: ' · ',
    /** 5 → 5하우스 */
    houseSuffix: '하우스',
    /** 상승점 · 중천 줄: 1 → 1하우스가 시작되는 곳 */
    houseStartSuffix: '하우스가 시작되는 곳',
    timeUnknownNote: '태어난 시각을 몰라 하우스와 첫인상 · 꿈의 자리는 보여 드리지 않아요.',
    detail: '차트 자세히',
    relations: '다른 별과의 관계',
    relationsQuestion: '별과 별의 관계가 뭔가요?',
    relationsTip: '두 별이 하늘에서 이루는 각도로 읽어요.',
    noRelations: '다른 별과 이루는 큰 각도는 없어요.',
    /** 물음표의 읽기 이름: 물병자리 → 물병자리가 뭔가요? */
    questionSuffix: '가 뭔가요?',
    /** 별자리 · 하우스 팁: 열두 개 중 몇째인지 */
    signTipPrefix: '해가 지나는 하늘길을 열두 별자리로 나눈 것 중 ',
    signTipSuffix: ' 자리예요.',
    houseTipPrefix: '하늘을 열두 칸으로 나눈 것 중 ',
    houseTipSuffix: ' 칸이에요.',
    ordinals: ['첫째', '둘째', '셋째', '넷째', '다섯째', '여섯째', '일곱째', '여덟째', '아홉째', '열째', '열한째', '열두째'],
  },
  reading: {
    title: '내 별명',
    generating: '별명을 짓는 중이에요',
    /** 문단 머리의 근거 줄: "근거 · 태양 · 쌍둥이 · 6하우스". 뒤의 낱말들은 서버가 준다 */
    basisLabel: '근거',
    basisSeparator: ' · ',
    strengths: '강점',
    cautions: '보완점',
    bullet: '·',
    /** 방향성 "이성" 화면(`/direction`)으로 들어가는 줄(결정 023) */
    seeDirection: '연애에서 해 볼 만한 것 보기',
    seeChart: '내 차트 보기',
    /** 앞날·건강·투자를 단정하지 않는다(golden-rules "프로젝트 규칙") */
    disclaimer: '오락과 자기 성찰을 위한 내용이에요. 앞날을 알려 주거나 전문가의 조언을 대신하지 않습니다.',
    failed: {
      NETWORK: '인터넷 연결을 확인하고 다시 시도해 주세요.',
      LIMIT: '요청이 많아요. 잠시 뒤 다시 시도해 주세요.',
      OTHER: '글을 받아 오지 못했어요. 잠시 뒤 다시 시도해 주세요.',
    },
    retry: '다시 시도',
  },
  /** 방향성 제시(F10)의 이성 주제. 조언형으로만 쓴다. 앞일을 단정하지 않는다(결정 023) */
  direction: {
    title: '연애에서 해 볼 만한 것',
    generating: '해 볼 만한 것을 고르는 중이에요',
    generatingNote: '내 하늘에서 연애와 닿는 자리를 글로 옮기고 있어요. 20초쯤 걸려요.',
    failed: {
      NETWORK: '인터넷 연결을 확인하고 다시 시도해 주세요.',
      LIMIT: '요청이 많아요. 잠시 뒤 다시 시도해 주세요.',
      OTHER: '글을 받아 오지 못했어요. 잠시 뒤 다시 시도해 주세요.',
    },
    retry: '다시 시도',
    /** 미래 주제: 심층 리포트 시기 탭의 끝(결정 026). 언제인지는 위의 "지금 나의 구간" 이 보여 준다 */
    future: {
      heading: '이 시기에 해 볼 만한 것',
      generating: '해 볼 만한 것을 고르는 중이에요',
      generatingNote: '지금 지나는 시기를 글로 옮기고 있어요. 처음에는 20초쯤 걸려요.',
      failed: {
        NETWORK: '인터넷 연결을 확인하고 다시 시도해 주세요.',
        LIMIT: '요청이 많아요. 잠시 뒤 다시 시도해 주세요.',
        OTHER: '글을 받아 오지 못했어요. 잠시 뒤 다시 시도해 주세요.',
      },
      retry: '다시 시도',
    },
    /** 궁합 주제: 궁합 결과에서 들어가는 화면(결정 026). 상대의 출생 정보는 글을 처음 만들 때만 다시 받는다 */
    synastry: {
      title: '이 사이에서 해 볼 만한 것',
      /** 궁합 결과 화면에서 들어가는 버튼 */
      entry: '이 사이에서 해 볼 만한 것',
      generating: '해 볼 만한 것을 고르는 중이에요',
      generatingNote: '두 사람의 하늘이 닿는 자리를 글로 옮기고 있어요. 처음에는 20초쯤 걸려요.',
      reenter: '상대의 출생 정보는 저장하지 않아요. 글을 쓰려면 궁합을 볼 때 넣은 상대의 출생 정보를 다시 넣어 주세요.',
      submit: '해 볼 만한 것 보기',
      mismatch: '이 궁합을 볼 때 넣은 출생 정보와 달라요. 그때와 같은 생년월일 · 시각 · 곳을 넣어 주세요.',
      invalidBirth: '넣은 출생 정보를 다시 확인해 주세요.',
      profileChanged: '이 궁합을 본 뒤에 내 출생 정보가 바뀌었어요. 궁합을 새로 본 다음 다시 열어 주세요.',
      recalculate: '궁합 새로 보기',
      failed: {
        NETWORK: '인터넷 연결을 확인하고 다시 시도해 주세요.',
        LIMIT: '요청이 많아요. 잠시 뒤 다시 시도해 주세요.',
        OTHER: '글을 받아 오지 못했어요. 잠시 뒤 다시 시도해 주세요.',
      },
      retry: '다시 시도',
    },
  },
  report: {
    title: '심층 리포트',
    /** 영역 탭 줄을 화면 읽기가 부르는 이름(아래 탭과 구분) */
    areasLabel: '리포트 영역',
    checking: '리포트를 확인하고 있어요',
    intro: '성격 · 관계 · 일 · 감정 · 시기, 다섯 가지로 나를 길게 풀어 드려요.',
    request: '리포트 받기',
    writing: '리포트를 쓰는 중이에요',
    writingNote: '1~2분쯤 걸려요. 화면을 나갔다가 다시 들어와도 돼요.',
    /** 영역 탭. 키는 서버가 주는 식별자다 */
    areas: { PERSONALITY: '성격', RELATIONSHIP: '관계', WORK: '일', EMOTION: '감정', TIMING: '시기' },
    /**
     * 시기 탭(결정 021 · 031). 행성 · 각도 이름을 쓰지 않고, 무슨 일이 일어난다고 단정하지 않는다("~하기 쉬운 시기").
     * 종류 · 영역 · 크기 · 변곡점의 키는 서버가 주는 식별자다. 앱이 셈한 "몇 년 뒤" 같은 숫자를 적지 않는다.
     */
    timing: {
      /** 네 부분의 제목과 한 줄 설명(결정 031) */
      sections: {
        now: { heading: '지금', intro: '오늘 내가 지나고 있는 시기예요.' },
        near: {
          heading: '올해 · 내년',
          intro: '오늘부터 내년 끝까지 걸치는 시기를 빠짐없이 모았어요. 줄을 누르면 설명이 펼쳐져요.',
        },
        ahead: { heading: '앞으로', intro: '내년 뒤에 오는 시기예요. 다음 변곡점과 큰 변화를 먼저 보여 드려요.' },
        past: { heading: '지나온 시기', intro: '이미 지나온 변곡점과 구간이에요. 새것부터 보여 드려요.' },
      },
      nowNone: '지금은 걸쳐 있는 구간이 없어요.',
      milestoneNow: '지금 지나는 변곡점',
      nextIntervalLabel: '다음 구간',
      nextMilestoneLabel: '다음 변곡점',
      milestonesDone: '네 번의 변곡점을 모두 지나왔어요.',
      /** 날짜 뒤에 붙인다: "2027년 2월까지" · "2027년 3월부터" */
      untilSuffix: '까지',
      fromSuffix: '부터',
      /** F4 가 정한 고지 문구 */
      notice: '시기는 행성의 주기를 계산한 것이고, 무슨 일이 일어날지를 말하지 않습니다.',
      timeUnknownNotice: '태어난 시각을 몰라서 첫인상(상승점)에 닿는 구간과 운명처럼 느껴지는 만남 구간은 뺐어요.',
      /** 올해 · 내년의 묶음. 해 글자(서버가 준 오늘의 해와 그다음 해) 뒤에 붙인다: "2026년 남은 기간에 시작" · "2027년에 시작" */
      nearOngoing: '지금 지나는 중',
      nearThisYearSuffix: '년 남은 기간에 시작',
      nearNextYearSuffix: '년에 시작',
      nearThisYearNoneSuffix: '년 남은 기간에 새로 시작하는 구간은 없어요.',
      nearNextYearNoneSuffix: '년에 새로 시작하는 구간은 없어요.',
      /** 만 42 · 58세가 누구에게나 보이는 까닭. 나이는 F4 가 정한 마디의 나이를 옮긴 것이다(계산하지 않는다) */
      milestonesNote:
        '변곡점은 누구나 비슷한 나이(만 21 · 29 · 42 · 58세 무렵)에 한 번씩 지나는 네 번의 마디예요. 그래서 누구에게나 이 나이가 보여요. 정확한 해는 내 차트로 계산한 값이에요.',
      laterMilestonesLabel: '그 뒤의 변곡점',
      aheadIntervalsLabel: '내년 뒤에 시작하는 구간',
      aheadNone: '내년 뒤에 시작하는 구간은 없어요.',
      pastShow: '지나온 시기 보기',
      pastHide: '지나온 시기 접기',
      pastMilestonesLabel: '지나온 변곡점',
      pastIntervalsLabel: '지나온 구간',
      pastNone: '아직 지나온 변곡점이나 구간이 없어요.',
      milestoneKinds: {
        SATURN_SQUARE: '첫 번째 변곡점',
        SATURN_RETURN: '두 번째 변곡점',
        URANUS_OPPOSITION: '세 번째 변곡점',
        SECOND_SATURN_RETURN: '네 번째 변곡점',
      },
      nearest: '지금과 가장 가까워요',
      /** 접어 둔 나머지 구간(작은 변화 · 기회 · 만남)을 펴는 버튼. 뒤에 "(12개)" 가 붙는다 */
      showAll: '작은 변화와 기회도 보기',
      showBig: '큰 변화만 보기',
      kinds: { CHANGE: '변화', OPPORTUNITY: '기회', FATED: '운명처럼 느껴지는 만남' },
      /** 종류가 무엇인지 올해 · 내년의 목록 위에 한 줄씩 적는다 */
      kindNotes: {
        CHANGE: '익숙한 방식이 달라지기 쉬운 시기',
        OPPORTUNITY: '도움이 되는 사람을 만나거나 인연이 열리기 쉬운 시기',
        FATED: '운명처럼 느껴지는 만남이 생기기 쉬운 시기',
      },
      areas: { PEOPLE: '사람·인연', WORK: '일', MONEY: '돈', SELF: '나 자신' },
      sizes: { BIG: '큰 변화', SMALL: '작은 변화' },
      now: '지금',
      /** 뒤에 남은 개수를 붙인다: "이전 구간 더 보기 (5개)" */
      earlier: '이전 구간 더 보기',
      later: '이후 구간 더 보기',
      countSuffix: '개',
      /** 날짜와 나이의 낱말: "2026년 3월 ~ 2027년 1월", "2029년 · 만 29세" */
      yearSuffix: '년',
      monthSuffix: '월',
      periodSeparator: ' ~ ',
      agePrefix: '만 ',
      ageSuffix: '세',
      separator: ' · ',
    },
    failed: {
      NETWORK: '인터넷 연결을 확인하고 다시 시도해 주세요.',
      LIMIT: '요청이 많아요. 잠시 뒤 다시 시도해 주세요.',
      OTHER: '리포트를 쓰지 못했어요. 잠시 뒤 다시 시도해 주세요.',
    },
    retry: '다시 시도',
  },
  /** 궁합(직접 입력). 점수와 그 옆의 말은 서버가 준 것을 그대로 보여 준다(결정 010, 서버 결정 008) */
  synastry: {
    title: '궁합',
    /** 관계 유형. 키는 서버가 주는 식별자다(결정 020) */
    relations: { LOVE: '연애', FRIEND: '친구', WORK: '일', FAMILY: '가족' },
    entry: {
      intro: '두 사람의 하늘을 겹쳐, 나에게 이 사람이 어떤 사이인지 봐요. 상대의 출생 정보는 저장하지 않아요.',
      relationLabel: '어떤 사이인가요',
      nameLabel: '상대를 부를 이름',
      namePlaceholder: '예: 지우',
      submit: '궁합 보기',
      calculating: '궁합을 보는 중이에요',
      calculatingNote: '두 사람의 하늘을 겹쳐 글로 옮기고 있어요. 길면 1분쯤 걸려요.',
      errors: {
        relationRequired: '어떤 사이인지 골라 주세요',
        nameRequired: '부를 이름을 적어 주세요',
      },
      failed: {
        NETWORK: '인터넷 연결을 확인하고 다시 눌러 주세요.',
        LIMIT: '요청이 많아요. 잠시 뒤 다시 눌러 주세요.',
        OTHER: '궁합을 보지 못했어요. 잠시 뒤 다시 눌러 주세요.',
      },
    },
    result: {
      nameSeparator: ' · ',
      scoreCaption: '나 기준 점수',
      scoreUnit: '점',
      wheelHeading: '두 사람의 하늘',
      wheelCaption: '고리 안쪽의 채운 점은 나, 바깥의 빈 점은 상대예요. 가운데 선은 두 사람의 천체가 서로 이루는 각도입니다.',
      noWheel: '겹친 그림은 궁합을 본 직후에만 볼 수 있어요. 상대의 출생 정보를 저장하지 않기 때문이에요.',
      getReport: '궁합 리포트 받기',
      seeReport: '궁합 리포트 보기',
      loading: '궁합을 불러오고 있어요',
      notFound: '이 궁합을 찾을 수 없어요.',
      goEntry: '궁합 보러 가기',
      failed: {
        NETWORK: '인터넷 연결을 확인하고 다시 시도해 주세요.',
        LIMIT: '요청이 많아요. 잠시 뒤 다시 시도해 주세요.',
        OTHER: '궁합을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.',
      },
      retry: '다시 시도',
    },
    report: {
      title: '궁합 리포트',
      checking: '리포트를 확인하고 있어요',
      intro: '끌림 · 대화 · 갈등 · 오래가기, 네 가지로 두 사람 사이를 길게 풀어 드려요.',
      reenter: '상대의 출생 정보는 저장하지 않아요. 리포트를 쓰려면 궁합을 볼 때 넣은 상대의 출생 정보를 다시 넣어 주세요.',
      request: '리포트 받기',
      writing: '리포트를 쓰는 중이에요',
      writingNote: '1~2분쯤 걸려요. 화면을 나갔다가 다시 들어와도 돼요.',
      /** 영역 탭. 키는 서버가 주는 식별자다 */
      areas: { ATTRACTION: '끌림', TALK: '대화', CONFLICT: '갈등', LASTING: '오래가기' },
      failed: {
        NETWORK: '인터넷 연결을 확인하고 다시 시도해 주세요.',
        LIMIT: '요청이 많아요. 잠시 뒤 다시 시도해 주세요.',
        OTHER: '리포트를 쓰지 못했어요. 잠시 뒤 다시 시도해 주세요.',
      },
      mismatch: '이 궁합을 볼 때 넣은 출생 정보와 달라요. 그때와 같은 생년월일 · 시각 · 곳을 넣어 주세요.',
      profileChanged: '이 궁합을 본 뒤에 내 출생 정보가 바뀌었어요. 궁합을 새로 본 다음 리포트를 받아 주세요.',
      recalculate: '궁합 새로 보기',
      retry: '다시 시도',
    },
    ranking: {
      title: '궁합 랭킹',
      keywordSeparator: ' · ',
      loading: '랭킹을 불러오고 있어요',
      empty: '아직 이 사이로 본 궁합이 없어요.',
      failed: {
        NETWORK: '인터넷 연결을 확인하고 다시 시도해 주세요.',
        LIMIT: '요청이 많아요. 잠시 뒤 다시 시도해 주세요.',
        OTHER: '랭킹을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.',
      },
    },
    /** 지금까지 본 궁합의 목록(궁합 시작 화면 아래) */
    past: {
      heading: '지난 궁합',
      seeRanking: '궁합 랭킹 보기',
    },
    /** 궁합 지우기. 결과 화면의 줄과 확인 시트. 서버가 그 궁합의 리포트와 방향성 글도 함께 지운다 */
    delete: {
      entry: '이 궁합 지우기',
      title: '이 궁합을 지울까요?',
      body: '이 궁합의 결과와 궁합 리포트, 조언(이 사이에서 해 볼 만한 것)이 함께 지워져요. 이미 만든 공유 링크는 지워지지 않고 남아요. 되돌릴 수 없어요.',
      confirm: '지우기',
      deleting: '지우는 중',
      cancel: '취소',
      failed: {
        NETWORK: '인터넷 연결을 확인하고 다시 시도해 주세요.',
        OTHER: '궁합을 지우지 못했어요. 잠시 뒤 다시 시도해 주세요.',
      },
    },
    /** 겹친 휠: 내 점과 상대 점을 한 고리에 그린 그림 */
    overlay: {
      wheelLabel: '두 사람의 하늘을 겹친 그림',
      mine: '나',
    },
  },
  /**
   * 공유(F6, 결정 025). 카드에는 서버가 준 `card` 의 값과 앱 이름 · 한 줄 소개만 적는다.
   * 출생 정보 · 근거 · 리포트 본문은 어디에도 적지 않는다. 계절 · 관계의 키는 서버가 주는 식별자다.
   */
  share: {
    /** 카드 아래와 공유 페이지에 적는 한 줄 소개 */
    tagline: '태어난 순간의 하늘로 읽는 나',
    open: '공유하기',
    openNextTurn: '다음 변곡점 공유하기',
    sheetTitle: '공유하기',
    making: '카드를 만들고 있어요',
    /** 공유할 것이 없을 때(서버의 404) */
    nothing: {
      READING: '공유할 풀이가 아직 없어요.',
      SCORE: '이 궁합은 공유할 수 없어요.',
      RANKING: '이 사이로 본 궁합이 없어 공유할 랭킹이 없어요.',
      NEXT_TURN: '공유할 다음 변곡점이 없어요.',
    },
    failed: {
      NETWORK: '인터넷 연결을 확인하고 다시 시도해 주세요.',
      LIMIT: '요청이 많아요. 잠시 뒤 다시 시도해 주세요.',
      OTHER: '카드를 만들지 못했어요. 잠시 뒤 다시 시도해 주세요.',
    },
    retry: '다시 시도',
    /** 궁합 점수 카드에 적을 내 이름. 서버에 내 이름이 없어 공유할 때 묻는다 */
    myName: {
      label: '내 이름',
      placeholder: '예: 동환',
      hint: '카드에 상대의 이름과 나란히 적혀요.',
      submit: '카드 만들기',
      errors: {
        required: '내 이름을 적어 주세요',
        tooLong: '이름은 20자까지 적을 수 있어요',
      },
    },
    /** 랭킹 카드. 꺼져 있으면 서버가 이름을 이니셜로 줄여 준다 */
    showNames: '이름 그대로 보이기',
    /** 앱은 시스템 공유 시트, 웹은 저장 · 복사 */
    actions: {
      shareImage: '이미지 공유',
      shareLink: '링크 공유',
      saveImage: '이미지 저장',
      copyLink: '링크 복사',
    },
    notices: {
      saved: '이미지를 저장했어요.',
      copied: '링크를 복사했어요.',
      imageFailed: '이미지를 만들지 못했어요. 잠시 뒤 다시 눌러 주세요.',
      linkFailed: '링크를 보내지 못했어요. 잠시 뒤 다시 눌러 주세요.',
    },
    card: {
      readingLabel: '내 별명',
      scoreLabel: '궁합',
      namesSeparator: ' × ',
      scoreUnit: '점',
      /** "내 친구 궁합 TOP 3": 가운데에 관계 유형이 들어간다 */
      rankingPrefix: '내 ',
      rankingSuffix: ' 궁합 TOP 3',
      /** "내 다음 변곡점은" 아래에 "2027년 봄" */
      nextTurnLead: '내 다음 변곡점은',
      yearSuffix: '년 ',
      seasons: { SPRING: '봄', SUMMER: '여름', AUTUMN: '가을', WINTER: '겨울' },
    },
    /** 공유 페이지(`/s/<공유 식별자>`). 로그인 없이 열린다 */
    page: {
      loading: '카드를 불러오고 있어요',
      notFound: '없거나 공유가 끝난 카드예요.',
      failed: {
        NETWORK: '인터넷 연결을 확인하고 다시 시도해 주세요.',
        LIMIT: '요청이 많아요. 잠시 뒤 다시 시도해 주세요.',
        OTHER: '카드를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.',
      },
      retry: '다시 시도',
      cta: '나도 보러 가기',
      /** 링크를 붙였을 때 보이는 제목 · 설명 */
      metaTitle: '별명 — 태어난 순간의 하늘로 읽는 나',
      metaDescription: '태어난 순간의 하늘을 용어 없이 풀어 드려요. 나도 보러 가기.',
    },
  },
  detail: {
    title: '차트 자세히',
    helpLabel: '이 표 읽는 법',
    /** 탭마다 표 위에 적는 한 줄 */
    intro: {
      planets: '천체마다 맡은 주제가 있어요. 그 천체가 어느 별자리에 있었는지로 그 주제가 드러나는 방식을 읽습니다.',
      houses: '하우스는 삶의 열두 영역이에요. 각 영역이 어느 별자리에서 시작하는지를 보여 줍니다.',
      aspects: '두 천체가 특별한 각도를 이루면 두 주제를 함께 읽어요. 어떤 사이인지가 각도의 종류입니다.',
    },
    tabs: { planets: '행성', houses: '하우스', aspects: '각도' },
    columns: {
      body: '천체',
      sign: '별자리',
      degree: '도수',
      house: '하우스',
      pair: '두 천체',
      aspect: '각도',
      orb: '오차',
      motion: '방향',
    },
    retrograde: '역행',
    applying: '다가가는 중',
    separating: '멀어지는 중',
    am: '오전',
    pm: '오후',
  },
  /**
   * 물음표 버튼을 누르면 나오는 설명. 점성술에서 무엇을 뜻하는지만 적는다.
   * 사람의 앞날이나 성격을 단정하지 않는다(golden-rules "프로젝트 규칙").
   */
  help: {
    buttonLabel: '설명 보기',
    mark: '?',
    /** 말풍선(InfoTip)이 열려 있을 때 물음표의 읽기 이름 */
    tipClose: '팁 닫기',
    close: '확인',
    overlay: {
      title: '겹친 그림 읽는 법',
      items: [
        { term: '가운데 고리', text: '하늘을 열두 칸으로 나눈 별자리예요. 두 사람의 점을 같은 고리에 함께 놓았습니다.' },
        { term: '안쪽의 채운 점', text: '내가 태어난 순간 해·달·행성이 있던 자리예요. 점 옆 글자는 이름의 줄임말입니다(해, 달, 수, 금, 화, 목, 토, 천, 해왕, 명).' },
        { term: '바깥의 빈 점', text: '상대가 태어난 순간 해·달·행성이 있던 자리예요.' },
        { term: '가운데 선', text: '상대의 천체가 내 해·달·수성·금성·화성과 특별한 각도를 이룰 때 잇는 선이에요. 실선은 잘 어울리는 각도, 점선은 서로 당기는 각도입니다. 같은 자리에 겹친 둘은 선 없이 함께 읽어요.' },
        { term: '왼쪽 끝의 선', text: '내가 태어난 순간 동쪽 지평선에 떠오르던 자리(상승점)예요. 내 태어난 시각을 알 때만 그립니다.' },
      ],
    },
    planets: {
      title: '행성 표 읽는 법',
      items: [
        { term: '천체', text: '해·달·행성마다 맡은 주제가 있어요. 태양 중심, 달 마음, 수성 생각과 말, 금성 애정과 취향, 화성 행동, 목성 넓히는 힘, 토성 책임과 끈기, 천왕성 변화, 해왕성 상상, 명왕성 깊은 변화.' },
        { term: '별자리', text: '그 천체의 주제가 어떤 식으로 드러나는지를 말해요. 같은 금성이어도 별자리에 따라 표현이 달라진다고 봅니다.' },
        { term: '도수', text: '별자리 한 칸(30도) 안에서의 정확한 자리예요. 24°40′ 은 24도 40분이라는 뜻입니다. 해석에는 크게 쓰이지 않아요.' },
        { term: '하우스', text: '그 주제가 삶의 어느 영역에서 드러나는지를 말해요. 1은 나, 7은 가까운 관계, 10은 일과 사회입니다.' },
        { term: '역행', text: '지구에서 볼 때 그 행성이 뒤로 가는 것처럼 보이던 때예요. 점성술에서는 그 주제를 안으로 되짚는 것으로 봅니다.' },
        { term: '그 밖의 지점', text: '북쪽 교점(나아가는 방향), 릴리스(감춰 둔 마음), 행운점(편안한 자리), 버텍스(뜻밖의 만남), 상승점(첫인상), 중천(사회에서의 모습)은 행성이 아니라 계산으로 구한 자리예요.' },
      ],
    },
    houses: {
      title: '하우스 표 읽는 법',
      items: [
        { term: '하우스', text: '삶의 열두 영역이에요. 1 나, 2 돈과 가진 것, 3 배움과 말, 4 집과 뿌리, 5 사랑과 놀이, 6 일상과 건강 습관, 7 가까운 관계, 8 깊은 나눔, 9 넓은 세계, 10 일과 사회, 11 친구와 모임, 12 혼자만의 시간.' },
        { term: '별자리 · 도수', text: '그 영역이 시작되는 자리예요. 그 영역을 어떤 태도로 대하는지를 별자리로 읽습니다.' },
      ],
    },
    aspects: {
      title: '각도 표 읽는 법',
      items: [
        { term: '두 천체', text: '서로 특별한 각도를 이루는 둘이에요. 점성술에서는 두 주제가 함께 움직이는 것으로 봅니다.' },
        { term: '각도', text: '합(0도)은 하나로 섞임, 육분(60도)과 삼분(120도)은 자연스럽게 어울림, 사분(90도)과 충(180도)은 서로 당겨서 조율이 필요한 사이로 봅니다.' },
        { term: '오차', text: '정확한 각도에서 얼마나 벗어났는지예요. 작을수록 그 사이가 또렷하다고 봅니다.' },
        { term: '방향', text: '"다가가는 중"은 정확한 각도로 가까워지던 때, "멀어지는 중"은 지나온 때예요.' },
      ],
    },
  },
  /** 천체가 맡은 주제(점성술에서 그렇게 본다는 뜻). 표에서 이름 아래에 작게 적는다 */
  bodyMeanings: {
    SUN: '나의 중심',
    MOON: '마음',
    MERCURY: '생각과 말',
    VENUS: '애정과 취향',
    MARS: '행동',
    JUPITER: '넓히는 힘',
    SATURN: '책임과 끈기',
    URANUS: '변화',
    NEPTUNE: '상상',
    PLUTO: '깊은 변화',
    NORTH_NODE: '나아가는 방향',
    LILITH: '감춰 둔 마음',
    FORTUNE: '편안한 자리',
    VERTEX: '뜻밖의 만남',
    ASC: '첫인상',
    MC: '사회에서의 모습',
  } as Record<string, string>,
  /** 하우스 번호가 가리키는 삶의 영역 */
  houseMeanings: {
    1: '나',
    2: '돈과 가진 것',
    3: '배움과 말',
    4: '집과 뿌리',
    5: '사랑과 놀이',
    6: '일상',
    7: '가까운 관계',
    8: '깊은 나눔',
    9: '넓은 세계',
    10: '일과 사회',
    11: '친구와 모임',
    12: '혼자만의 시간',
  } as Record<string, string>,
  /** 각도의 종류가 뜻하는 사이 */
  aspectMeanings: {
    CONJUNCTION: '하나로 섞임',
    SEXTILE: '어울림',
    SQUARE: '조율이 필요',
    TRINE: '잘 어울림',
    OPPOSITION: '서로 당김',
  } as Record<string, string>,
  bodies: {
    SUN: '태양',
    MOON: '달',
    MERCURY: '수성',
    VENUS: '금성',
    MARS: '화성',
    JUPITER: '목성',
    SATURN: '토성',
    URANUS: '천왕성',
    NEPTUNE: '해왕성',
    PLUTO: '명왕성',
    NORTH_NODE: '북쪽 교점',
    LILITH: '릴리스',
    FORTUNE: '행운점',
    VERTEX: '버텍스',
    ASC: '상승점',
    MC: '중천',
  },
  /** 휠 안에 쓰는 짧은 이름 */
  bodiesShort: {
    SUN: '해',
    MOON: '달',
    MERCURY: '수',
    VENUS: '금',
    MARS: '화',
    JUPITER: '목',
    SATURN: '토',
    URANUS: '천',
    NEPTUNE: '해왕',
    PLUTO: '명',
  },
  signs: {
    ARIES: '양',
    TAURUS: '황소',
    GEMINI: '쌍둥이',
    CANCER: '게',
    LEO: '사자',
    VIRGO: '처녀',
    LIBRA: '천칭',
    SCORPIO: '전갈',
    SAGITTARIUS: '사수',
    CAPRICORN: '염소',
    AQUARIUS: '물병',
    PISCES: '물고기',
  },
  aspects: {
    CONJUNCTION: '합',
    SEXTILE: '육분',
    SQUARE: '사분',
    TRINE: '삼분',
    OPPOSITION: '충',
  },
  /**
   * 용어 사전: 내 하늘 지도(시안 13 · 13-1)와 나 탭의 "이렇게 풀이한 이유"가 함께 쓴다. 키는 서버가 주는 식별자다.
   * 별명은 시안의 말을 따르고, 시안에 없는 것은 같은 말투로 채웠다(채운 목록: docs/plans/2026-11-20-sky-map.md 실행 기록).
   * name 이름 · nickname 별명 · topic 목록에 적는 짧은 주제 · meaning 한 줄 뜻. 사람을 단정하지 않는다(golden-rules).
   */
  glossary: {
    bodies: {
      SUN: { name: '해', nickname: '나의 중심', topic: '나의 중심', meaning: '내가 힘을 내는 방식' },
      MOON: { name: '달', nickname: '나의 마음', topic: '마음', meaning: '편안함을 느끼는 방식' },
      MERCURY: { name: '수성', nickname: '말을 맡은 별', topic: '말과 생각', meaning: '생각하고 말을 건네는 방식' },
      VENUS: { name: '금성', nickname: '좋아하는 것', topic: '좋아하는 것', meaning: '끌리고 좋아하는 것' },
      MARS: { name: '화성', nickname: '밀어붙이는 힘', topic: '밀어붙이는 힘', meaning: '원하는 것을 향해 움직이는 방식' },
      JUPITER: { name: '목성', nickname: '기회를 맡은 별', topic: '기회', meaning: '넓히고 키워 가는 힘' },
      SATURN: { name: '토성', nickname: '책임을 맡은 별', topic: '책임', meaning: '버티며 차곡차곡 쌓아 가는 힘' },
      URANUS: { name: '천왕성', nickname: '변화를 맡은 별', topic: '변화', meaning: '틀을 깨고 새롭게 바꾸는 힘' },
      NEPTUNE: { name: '해왕성', nickname: '꿈을 맡은 별', topic: '꿈과 상상', meaning: '보이지 않는 것을 그려 보는 힘' },
      PLUTO: { name: '명왕성', nickname: '깊은 변화를 맡은 별', topic: '깊은 변화', meaning: '끝까지 파고들어 새로 태어나는 힘' },
    },
    /** 상승점 · 중천. short 는 휠의 축 옆에 적는 짧은 이름이다 */
    angles: {
      ASC: { name: '상승점', nickname: '첫인상의 자리', short: '첫인상', meaning: '처음 만난 사람에게 보이는 모습' },
      MC: { name: '중천', nickname: '꿈의 자리', short: '꿈', meaning: '오래 바라고 이루고 싶은 모습' },
    },
    signs: {
      ARIES: { nickname: '용기', meaning: '먼저 나서고 바로 움직이는 성향' },
      TAURUS: { nickname: '꾸준함', meaning: '천천히, 그러나 단단하게 쌓아 가는 성향' },
      GEMINI: { nickname: '호기심', meaning: '궁금한 게 많고 생각과 말이 빠른 성향' },
      CANCER: { nickname: '다정함', meaning: '가까운 사람을 품고 돌보는 성향' },
      LEO: { nickname: '당당함', meaning: '나를 드러내고 빛나고 싶은 성향' },
      VIRGO: { nickname: '꼼꼼함', meaning: '작은 것까지 살피고 다듬는 성향' },
      LIBRA: { nickname: '균형', meaning: '균형을 찾고 함께 어울리는 성향' },
      SCORPIO: { nickname: '깊이', meaning: '한번 마음먹으면 깊이 파고드는 성향' },
      SAGITTARIUS: { nickname: '모험', meaning: '넓은 세상으로 나아가고 싶은 성향' },
      CAPRICORN: { nickname: '성실함', meaning: '목표를 세우고 차근차근 쌓는 성향' },
      AQUARIUS: { nickname: '자유로움', meaning: '자유롭고 독창적인 성향' },
      PISCES: { nickname: '공감', meaning: '다른 마음에 깊이 스며드는 성향' },
    },
    houses: {
      1: { nickname: '나 자신의 자리', topic: '나 자신', meaning: '나를 드러내는 모습 · 시작하는 힘' },
      2: { nickname: '돈과 가치의 자리', topic: '돈과 가치', meaning: '돈 · 가진 것 · 소중히 여기는 것' },
      3: { nickname: '배움과 말의 자리', topic: '배움과 말', meaning: '배우는 것 · 말 · 가까운 이웃' },
      4: { nickname: '집과 가족의 자리', topic: '집과 가족', meaning: '집 · 가족 · 마음의 뿌리' },
      5: { nickname: '즐거움의 자리', topic: '즐거움', meaning: '노는 것 · 만드는 것 · 연애' },
      6: { nickname: '일상의 자리', topic: '일상', meaning: '하루하루의 일 · 습관 · 돌봄' },
      7: { nickname: '관계의 자리', topic: '관계', meaning: '가까운 짝 · 함께하는 사람' },
      8: { nickname: '깊은 나눔의 자리', topic: '깊은 나눔', meaning: '깊은 관계 · 함께 나누는 것' },
      9: { nickname: '넓은 세상의 자리', topic: '넓은 세상', meaning: '먼 곳 · 공부 · 넓은 생각' },
      10: { nickname: '일과 사회의 자리', topic: '일과 사회', meaning: '일 · 사회에서의 모습 · 이루고 싶은 것' },
      11: { nickname: '친구와 모임의 자리', topic: '친구와 모임', meaning: '친구 · 모임 · 바라는 내일' },
      12: { nickname: '혼자만의 자리', topic: '혼자만의 시간', meaning: '혼자만의 시간 · 숨은 마음 · 쉼' },
    },
    /** 각도의 말(시안: 합 · 사분 · 육분. 삼분 · 충은 같은 말투의 기본값) */
    aspects: {
      CONJUNCTION: { phrase: '겹쳐요', meaning: '두 별이 같은 자리에서 만나요' },
      SEXTILE: { phrase: '잘 어울려요', meaning: '두 별이 서로 돕기 좋은 각도예요' },
      SQUARE: { phrase: '부딪혀요', meaning: '두 별이 다른 쪽으로 당겨 맞춰 가야 해요' },
      TRINE: { phrase: '자연스럽게 통해요', meaning: '두 별의 힘이 막힘없이 흘러요' },
      OPPOSITION: { phrase: '마주 봐요', meaning: '두 별이 하늘의 맞은편에서 서로를 비춰요' },
    },
  },
} as const;
