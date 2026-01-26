// i18n system with auto-detection and manual override
export type SupportedLanguage = 'en' | 'ko' | 'zh' | 'vi';

export interface TranslationKeys {
  // Navigation
  'nav.dashboard': string;
  'nav.videos': string;
  'nav.create': string;
  'nav.logout': string;
  'nav.login': string;
  'nav.profile': string;
  'nav.user': string;
  'nav.comingSoon': string;
  
  // Common actions
  'action.create': string;
  'action.edit': string;
  'action.delete': string;
  'action.cancel': string;
  'action.save': string;
  'action.retry': string;
  'action.refresh': string;
  'action.download': string;
  'action.copy': string;
  'action.back': string;
  'action.next': string;
  'action.prev': string;
  'action.submit': string;
  'action.close': string;
  'action.clearFilters': string;
  'action.pause': string;
  'action.resume': string;
  
  // Video statuses
  'status.draft': string;
  'status.queued': string;
  'status.processing': string;
  'status.completed': string;
  'status.failed': string;
  'status.all': string;
  'status.processingWithProgress': string;
  
  // Video list
  'videoList.title': string;
  'videoList.filmInbox': string;
  'videoList.search': string;
  'videoList.searchPlaceholder': string;
  'videoList.sortBy': string;
  'videoList.sortNewest': string;
  'videoList.sortOldest': string;
  'videoList.lastUpdated': string;
  'videoList.page': string;
  'videoList.createVideo': string;
  'videoList.engine': string;
  'videoList.quickActions': string;
  'videoList.openDetail': string;
  'videoList.retryTask': string;
  'videoList.retryComingSoon': string;
  
  // Empty states
  'empty.noVideos.title': string;
  'empty.noVideos.description': string;
  'empty.noVideos.action': string;
  'empty.noResults.title': string;
  'empty.noResults.description': string;
  'empty.noResultsWithFilters.title': string;
  'empty.noResultsWithFilters.description': string;
  'empty.noResultsWithFilters.action': string;
  'empty.loading': string;
  'empty.createFirstFilm': string;
  
  // Create video
  'create.title': string;
  'create.createFilm': string;
  'create.form.title': string;
  'create.form.titlePlaceholder': string;
  'create.form.titleRequired': string;
  'create.form.titleMaxLength': string;
  'create.form.prompt': string;
  'create.form.promptPlaceholder': string;
  'create.form.promptRequired': string;
  'create.form.promptMaxLength': string;
  'create.form.engine': string;
  'create.form.params': string;
  'create.form.paramsOptional': string;
  'create.form.paramsInvalid': string;
  'create.form.creating': string;
  'create.form.created': string;
  'create.form.characterCount': string;
  'create.form.fixErrors': string;
  'create.form.mockEngine': string;
  'create.form.runwayEngine': string;
  'create.form.validatingJson': string;
  'create.form.viewTask': string;
  'create.form.createAndView': string;
  
  // Debug panel
  'debug.panel': string;
  'debug.endpoint': string;
  'debug.method': string;
  'debug.status': string;
  'debug.requestId': string;
  'debug.idempotency': string;
  'debug.timestamp': string;
  'debug.headers': string;
  'debug.errorDetails': string;
  'debug.code': string;
  'debug.message': string;
  'debug.retryWithSameKey': string;
  'debug.retryDescription': string;
  'debug.pending': string;
  'debug.na': string;
  
  // Video detail
  'detail.videoNotAvailable': string;
  'detail.videoNotPlayable': string;
  'detail.generating': string;
  'detail.queued': string;
  'detail.failed': string;
  'detail.progress': string;
  'detail.copyInfo': string;
  'detail.taskId': string;
  'detail.videoUrl': string;
  'detail.requestId': string;
  'detail.copied': string;
  'detail.retryVideo': string;
  'detail.refreshPage': string;
  'detail.openNewTab': string;
  'detail.videoNotAvailableDescription': string;
  'detail.generatingDescription': string;
  'detail.queuedDescription': string;
  'detail.failedUnknownReason': string;
  'detail.autoRefresh': string;
  'detail.autoRefreshDescription': string;
  
  // Error messages
  'error.networkError': string;
  'error.serverError': string;
  'error.unauthorized': string;
  'error.forbidden': string;
  'error.notFound': string;
  'error.validationError': string;
  'error.tooManyRequests': string;
  'error.unknown': string;
  'error.requestId': string;
  'error.whatToDo': string;
  'error.checkInput': string;
  'error.tryAgain': string;
  'error.contactSupport': string;
  'error.serverSlow': string;
  'error.serverSlowDescription': string;
  'error.authRequired': string;
  'error.authRequiredDescription': string;
  'error.failedToLoadVideo': string;
  'error.deleteFailed': string;
  'error.videoUrlNotAvailable': string;
  'error.downloadFailed': string;
  'error.downloadNetworkError': string;
  'error.downloadAccessDenied': string;
  'error.downloadNotFound': string;
  'error.videoGenerationFailed': string;
  'error.cannotDeleteProcessing': string;
  
  // Loading states
  'loading.videos': string;
  'loading.video': string;
  'loading.creating': string;
  'loading.deleting': string;
  'loading.retrying': string;
  'loading.app': string;
  'loading.redirecting': string;
  'loading.validatingSession': string;
  
  // Success messages
  'success.videoCreated': string;
  'success.videoDeleted': string;
  'success.downloadStarted': string;
  'success.copied': string;
  'success.loginSuccess': string;
  'success.logoutSuccess': string;
  'success.downloadStarting': string;
  
  // Confirmation
  'confirm.delete.title': string;
  'confirm.delete.message': string;
  'confirm.delete.confirm': string;
  
  // Login
  'login.title': string;
  'login.email': string;
  'login.password': string;
  'login.submit': string;
  'login.error': string;
  'login.noToken': string;
  'login.signingIn': string;
  'login.testAccount': string;
  
  // Language
  'language.select': string;
  'language.en': string;
  'language.ko': string;
  'language.zh': string;
  'language.vi': string;
}

const translations: Record<SupportedLanguage, TranslationKeys> = {
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.videos': 'Videos',
    'nav.create': 'Create',
    'nav.logout': 'Logout',
    'nav.login': 'Login',
    'nav.profile': 'Profile',
    'nav.user': 'User',
    'nav.comingSoon': 'Coming soon',
    
    // Common actions
    'action.create': 'Create',
    'action.edit': 'Edit',
    'action.delete': 'Delete',
    'action.cancel': 'Cancel',
    'action.save': 'Save',
    'action.retry': 'Retry',
    'action.refresh': 'Refresh',
    'action.download': 'Download',
    'action.copy': 'Copy',
    'action.back': 'Back',
    'action.next': 'Next',
    'action.prev': 'Previous',
    'action.submit': 'Submit',
    'action.close': 'Close',
    'action.clearFilters': 'Clear Filters',
    'action.pause': 'Pause',
    'action.resume': 'Resume',
    
    // Video statuses
    'status.draft': 'Draft',
    'status.queued': 'Queued',
    'status.processing': 'Processing',
    'status.completed': 'Completed',
    'status.failed': 'Failed',
    'status.all': 'All',
    'status.processingWithProgress': 'Processing {progress}%',
    
    // Video list
    'videoList.title': 'Video List',
    'videoList.filmInbox': 'Film Inbox',
    'videoList.search': 'Search',
    'videoList.searchPlaceholder': 'Search by title or prompt...',
    'videoList.sortBy': 'Sort by',
    'videoList.sortNewest': 'Newest first',
    'videoList.sortOldest': 'Oldest first',
    'videoList.lastUpdated': 'Last updated',
    'videoList.page': 'Page',
    'videoList.createVideo': 'Create Video',
    'videoList.engine': 'Engine',
    'videoList.quickActions': 'Actions',
    'videoList.openDetail': 'View Details',
    'videoList.retryTask': 'Retry',
    'videoList.retryComingSoon': 'Retry feature coming soon',
    
    // Empty states
    'empty.noVideos.title': 'No videos yet',
    'empty.noVideos.description': 'Create your first video to get started',
    'empty.noVideos.action': 'Create Video',
    'empty.noResults.title': 'No results found',
    'empty.noResults.description': 'Try adjusting your search or filters',
    'empty.noResultsWithFilters.title': 'No films match your criteria',
    'empty.noResultsWithFilters.description': 'Try adjusting your search terms or filters to find what you\'re looking for',
    'empty.noResultsWithFilters.action': 'Clear Filters',
    'empty.loading': 'Loading...',
    'empty.createFirstFilm': 'Create your first film to get started',
    
    // Create video
    'create.title': 'Create Video Task',
    'create.createFilm': 'Create Film',
    'create.form.title': 'Title',
    'create.form.titlePlaceholder': 'Enter a descriptive title for your film...',
    'create.form.titleRequired': 'Title is required',
    'create.form.titleMaxLength': 'Title must be {max} characters or less',
    'create.form.prompt': 'Prompt',
    'create.form.promptPlaceholder': 'Describe what you want to create in your film...',
    'create.form.promptRequired': 'Prompt is required',
    'create.form.promptMaxLength': 'Prompt must be {max} characters or less',
    'create.form.engine': 'Engine',
    'create.form.params': 'Parameters (JSON)',
    'create.form.paramsOptional': 'optional',
    'create.form.paramsInvalid': 'Invalid JSON format',
    'create.form.creating': 'Creating...',
    'create.form.created': 'Video task created successfully',
    'create.form.characterCount': '({current}/{max})',
    'create.form.fixErrors': 'Please fix the errors in the form before submitting.',
    'create.form.mockEngine': 'Mock (for testing)',
    'create.form.runwayEngine': 'Runway',
    'create.form.validatingJson': 'Validating JSON...',
    'create.form.viewTask': 'View Task',
    'create.form.createAndView': 'Create & View',
    
    // Debug panel
    'debug.panel': 'Request Debug Panel',
    'debug.endpoint': 'Endpoint:',
    'debug.method': 'Method:',
    'debug.status': 'Status:',
    'debug.requestId': 'Request ID:',
    'debug.idempotency': 'Idempotency:',
    'debug.timestamp': 'Timestamp:',
    'debug.headers': 'Request Headers:',
    'debug.errorDetails': 'Error Details:',
    'debug.code': 'Code:',
    'debug.message': 'Message:',
    'debug.retryWithSameKey': 'Retry with Same Key',
    'debug.retryDescription': 'This will retry the request with the same idempotency key to prevent duplicates.',
    'debug.pending': 'Pending...',
    'debug.na': 'N/A',
    
    // Video detail
    'detail.videoNotAvailable': 'Video Not Available',
    'detail.videoNotPlayable': 'Video Not Playable',
    'detail.generating': 'Generating Your Video...',
    'detail.queued': 'Video Queued',
    'detail.failed': 'Video Generation Failed',
    'detail.progress': 'Progress',
    'detail.copyInfo': 'Copy Information',
    'detail.taskId': 'Task ID',
    'detail.videoUrl': 'Video URL',
    'detail.requestId': 'Request ID',
    'detail.copied': 'Copied',
    'detail.retryVideo': 'Retry Video',
    'detail.refreshPage': 'Refresh Page',
    'detail.openNewTab': 'Open in New Tab',
    'detail.videoNotAvailableDescription': 'The video generation completed but the video file is not available yet. This might be a temporary issue.',
    'detail.generatingDescription': 'Your video is being processed. This may take a few minutes.',
    'detail.queuedDescription': 'Your video is in the queue and will start processing soon.',
    'detail.failedUnknownReason': 'Video generation failed for unknown reason',
    'detail.autoRefresh': 'Auto-refresh',
    'detail.autoRefreshDescription': 'Automatically check for status updates',
    
    // Error messages
    'error.networkError': 'Network error occurred',
    'error.serverError': 'Server error, please try again',
    'error.unauthorized': 'Session expired, please login again',
    'error.forbidden': 'Access denied',
    'error.notFound': 'Resource not found',
    'error.validationError': 'Invalid data',
    'error.tooManyRequests': 'Too many requests, please try again later',
    'error.unknown': 'An unknown error occurred',
    'error.requestId': 'Request ID (for support)',
    'error.whatToDo': 'What to do next:',
    'error.checkInput': 'Check your input parameters and try again',
    'error.tryAgain': 'Wait a moment and retry - this might be a temporary issue',
    'error.contactSupport': 'Contact support with the Request ID if the problem persists',
    'error.serverSlow': 'Server is taking longer than expected',
    'error.serverSlowDescription': 'The backend may be starting up. This usually takes a moment.',
    'error.authRequired': 'Authentication Required',
    'error.authRequiredDescription': 'Please log in to view videos.',
    'error.failedToLoadVideo': 'Failed to Load Video Details',
    'error.deleteFailed': 'Delete failed',
    'error.videoUrlNotAvailable': 'Video URL not available',
    'error.downloadFailed': 'Download failed',
    'error.downloadNetworkError': 'Download failed: Network error or CORS issue',
    'error.downloadAccessDenied': 'Download failed: Access denied',
    'error.downloadNotFound': 'Download failed: Video not found',
    'error.videoGenerationFailed': 'Video generation failed',
    'error.cannotDeleteProcessing': 'Cannot delete while video is processing',
    
    // Loading states
    'loading.videos': 'Loading videos...',
    'loading.video': 'Loading video...',
    'loading.creating': 'Creating video...',
    'loading.deleting': 'Deleting...',
    'loading.retrying': 'Retrying...',
    'loading.app': 'Loading...',
    'loading.redirecting': 'Redirecting...',
    'loading.validatingSession': 'Validating session...',
    
    // Success messages
    'success.videoCreated': 'Video task created successfully',
    'success.videoDeleted': 'Video deleted successfully',
    'success.downloadStarted': 'Download started successfully',
    'success.copied': 'Copied to clipboard',
    'success.loginSuccess': 'Login successful',
    'success.logoutSuccess': 'Logged out successfully',
    'success.downloadStarting': 'Starting download...',
    
    // Confirmation
    'confirm.delete.title': 'Delete Video',
    'confirm.delete.message': 'Are you sure you want to delete this video? This action cannot be undone.',
    'confirm.delete.confirm': 'Delete',
    
    // Login
    'login.title': 'Sign In',
    'login.email': 'Email',
    'login.password': 'Password',
    'login.submit': 'Sign In',
    'login.error': 'Login failed',
    'login.noToken': 'No token returned from server',
    'login.signingIn': 'Signing in...',
    'login.testAccount': 'Staging Test Account',
    
    // Language
    'language.select': 'Language',
    'language.en': 'English',
    'language.ko': '한국어',
    'language.zh': '中文',
    'language.vi': 'Tiếng Việt',
  },
  
  ko: {
    // Navigation
    'nav.dashboard': '대시보드',
    'nav.videos': '비디오',
    'nav.create': '생성',
    'nav.logout': '로그아웃',
    'nav.login': '로그인',
    'nav.profile': '프로필',
    'nav.user': '사용자',
    'nav.comingSoon': '곧 출시',
    
    // Common actions
    'action.create': '생성',
    'action.edit': '편집',
    'action.delete': '삭제',
    'action.cancel': '취소',
    'action.save': '저장',
    'action.retry': '재시도',
    'action.refresh': '새로고침',
    'action.download': '다운로드',
    'action.copy': '복사',
    'action.back': '뒤로',
    'action.next': '다음',
    'action.prev': '이전',
    'action.submit': '제출',
    'action.close': '닫기',
    'action.clearFilters': '필터 지우기',
    'action.pause': '일시정지',
    'action.resume': '재개',
    
    // Video statuses
    'status.draft': '초안',
    'status.queued': '대기중',
    'status.processing': '처리중',
    'status.completed': '완료',
    'status.failed': '실패',
    'status.all': '전체',
    'status.processingWithProgress': '처리중 {progress}%',
    
    // Video list
    'videoList.title': '비디오 목록',
    'videoList.filmInbox': '창작 수신함',
    'videoList.search': '검색',
    'videoList.searchPlaceholder': '제목이나 프롬프트로 검색...',
    'videoList.sortBy': '정렬',
    'videoList.sortNewest': '최신순',
    'videoList.sortOldest': '오래된순',
    'videoList.lastUpdated': '마지막 업데이트',
    'videoList.page': '페이지',
    'videoList.createVideo': '비디오 생성',
    'videoList.engine': '엔진',
    'videoList.quickActions': '작업',
    'videoList.openDetail': '세부 정보 보기',
    'videoList.retryTask': '재시도',
    'videoList.retryComingSoon': '재시도 기능 곧 출시',
    
    // Empty states
    'empty.noVideos.title': '아직 비디오가 없습니다',
    'empty.noVideos.description': '첫 번째 비디오를 생성해보세요',
    'empty.noVideos.action': '비디오 생성',
    'empty.noResults.title': '결과를 찾을 수 없습니다',
    'empty.noResults.description': '검색어나 필터를 조정해보세요',
    'empty.noResultsWithFilters.title': '조건에 맞는 영상이 없습니다',
    'empty.noResultsWithFilters.description': '검색어나 필터를 조정하여 원하는 내용을 찾아보세요',
    'empty.noResultsWithFilters.action': '필터 지우기',
    'empty.loading': '로딩중...',
    'empty.createFirstFilm': '첫 번째 영상을 만들어 시작하세요',
    
    // Create video
    'create.title': '비디오 작업 생성',
    'create.createFilm': '영상 생성',
    'create.form.title': '제목',
    'create.form.titlePlaceholder': '영상에 대한 설명적인 제목을 입력하세요...',
    'create.form.titleRequired': '제목은 필수입니다',
    'create.form.titleMaxLength': '제목은 {max}자 이하여야 합니다',
    'create.form.prompt': '프롬프트',
    'create.form.promptPlaceholder': '영상에서 만들고 싶은 내용을 설명하세요...',
    'create.form.promptRequired': '프롬프트는 필수입니다',
    'create.form.promptMaxLength': '프롬프트는 {max}자 이하여야 합니다',
    'create.form.engine': '엔진',
    'create.form.params': '매개변수 (JSON)',
    'create.form.paramsOptional': '선택사항',
    'create.form.paramsInvalid': '잘못된 JSON 형식',
    'create.form.creating': '생성중...',
    'create.form.created': '비디오 작업이 성공적으로 생성되었습니다',
    'create.form.characterCount': '({current}/{max})',
    'create.form.fixErrors': '제출하기 전에 양식의 오류를 수정해주세요.',
    'create.form.mockEngine': '모의 (테스트용)',
    'create.form.runwayEngine': 'Runway',
    'create.form.validatingJson': 'JSON 검증중...',
    'create.form.viewTask': '작업 보기',
    'create.form.createAndView': '생성 및 보기',
    
    // Debug panel
    'debug.panel': '요청 디버그 패널',
    'debug.endpoint': '엔드포인트:',
    'debug.method': '메소드:',
    'debug.status': '상태:',
    'debug.requestId': '요청 ID:',
    'debug.idempotency': '멱등성:',
    'debug.timestamp': '타임스탬프:',
    'debug.headers': '요청 헤더:',
    'debug.errorDetails': '오류 세부사항:',
    'debug.code': '코드:',
    'debug.message': '메시지:',
    'debug.retryWithSameKey': '동일한 키로 재시도',
    'debug.retryDescription': '중복을 방지하기 위해 동일한 멱등성 키로 요청을 재시도합니다.',
    'debug.pending': '대기중...',
    'debug.na': '해당없음',
    
    // Video detail
    'detail.videoNotAvailable': '비디오를 사용할 수 없음',
    'detail.videoNotPlayable': '비디오를 재생할 수 없음',
    'detail.generating': '비디오 생성중...',
    'detail.queued': '비디오 대기중',
    'detail.failed': '비디오 생성 실패',
    'detail.progress': '진행률',
    'detail.copyInfo': '정보 복사',
    'detail.taskId': '작업 ID',
    'detail.videoUrl': '비디오 URL',
    'detail.requestId': '요청 ID',
    'detail.copied': '복사됨',
    'detail.retryVideo': '비디오 재시도',
    'detail.refreshPage': '페이지 새로고침',
    'detail.openNewTab': '새 탭에서 열기',
    'detail.videoNotAvailableDescription': '비디오 생성이 완료되었지만 비디오 파일을 아직 사용할 수 없습니다. 일시적인 문제일 수 있습니다.',
    'detail.generatingDescription': '비디오가 처리 중입니다. 몇 분 정도 걸릴 수 있습니다.',
    'detail.queuedDescription': '비디오가 대기열에 있으며 곧 처리가 시작됩니다.',
    'detail.failedUnknownReason': '알 수 없는 이유로 비디오 생성이 실패했습니다',
    'detail.autoRefresh': '자동 새로고침',
    'detail.autoRefreshDescription': '상태 업데이트를 자동으로 확인',
    
    // Error messages
    'error.networkError': '네트워크 오류가 발생했습니다',
    'error.serverError': '서버 오류, 다시 시도해주세요',
    'error.unauthorized': '세션이 만료되었습니다. 다시 로그인해주세요',
    'error.forbidden': '접근이 거부되었습니다',
    'error.notFound': '리소스를 찾을 수 없습니다',
    'error.validationError': '잘못된 데이터',
    'error.tooManyRequests': '너무 많은 요청, 나중에 다시 시도해주세요',
    'error.unknown': '알 수 없는 오류가 발생했습니다',
    'error.requestId': '요청 ID (지원용)',
    'error.whatToDo': '다음 단계:',
    'error.checkInput': '입력 매개변수를 확인하고 다시 시도하세요',
    'error.tryAgain': '잠시 기다렸다가 재시도하세요 - 일시적인 문제일 수 있습니다',
    'error.contactSupport': '문제가 지속되면 요청 ID와 함께 지원팀에 문의하세요',
    'error.serverSlow': '서버 응답이 예상보다 오래 걸리고 있습니다',
    'error.serverSlowDescription': '백엔드가 시작 중일 수 있습니다. 보통 잠시 걸립니다.',
    'error.authRequired': '인증 필요',
    'error.authRequiredDescription': '비디오를 보려면 로그인해주세요.',
    'error.failedToLoadVideo': '비디오 세부 정보 로드 실패',
    'error.deleteFailed': '삭제 실패',
    'error.videoUrlNotAvailable': '비디오 URL을 사용할 수 없습니다',
    'error.downloadFailed': '다운로드 실패',
    'error.downloadNetworkError': '다운로드 실패: 네트워크 오류 또는 CORS 문제',
    'error.downloadAccessDenied': '다운로드 실패: 접근 거부',
    'error.downloadNotFound': '다운로드 실패: 비디오를 찾을 수 없음',
    'error.videoGenerationFailed': '비디오 생성 실패',
    'error.cannotDeleteProcessing': '비디오 처리 중에는 삭제할 수 없습니다',
    
    // Loading states
    'loading.videos': '비디오 로딩중...',
    'loading.video': '비디오 로딩중...',
    'loading.creating': '비디오 생성중...',
    'loading.deleting': '삭제중...',
    'loading.retrying': '재시도중...',
    'loading.app': '로딩중...',
    'loading.redirecting': '리디렉션중...',
    'loading.validatingSession': '세션 검증중...',
    
    // Success messages
    'success.videoCreated': '비디오 작업이 성공적으로 생성되었습니다',
    'success.videoDeleted': '비디오가 성공적으로 삭제되었습니다',
    'success.downloadStarted': '다운로드가 성공적으로 시작되었습니다',
    'success.copied': '클립보드에 복사되었습니다',
    'success.loginSuccess': '로그인 성공',
    'success.logoutSuccess': '로그아웃 성공',
    'success.downloadStarting': '다운로드 시작중...',
    
    // Confirmation
    'confirm.delete.title': '비디오 삭제',
    'confirm.delete.message': '이 비디오를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
    'confirm.delete.confirm': '삭제',
    
    // Login
    'login.title': '로그인',
    'login.email': '이메일',
    'login.password': '비밀번호',
    'login.submit': '로그인',
    'login.error': '로그인 실패',
    'login.noToken': '서버에서 토큰이 반환되지 않았습니다',
    'login.signingIn': '로그인 중...',
    'login.testAccount': '스테이징 테스트 계정',
    
    // Language
    'language.select': '언어',
    'language.en': 'English',
    'language.ko': '한국어',
    'language.zh': '中文',
    'language.vi': 'Tiếng Việt',
  },
  
  zh: {
    // Navigation
    'nav.dashboard': '仪表板',
    'nav.videos': '视频',
    'nav.create': '创建',
    'nav.logout': '登出',
    'nav.login': '登录',
    'nav.profile': '个人资料',
    'nav.user': '用户',
    'nav.comingSoon': '即将推出',
    
    // Common actions
    'action.create': '创建',
    'action.edit': '编辑',
    'action.delete': '删除',
    'action.cancel': '取消',
    'action.save': '保存',
    'action.retry': '重试',
    'action.refresh': '刷新',
    'action.download': '下载',
    'action.copy': '复制',
    'action.back': '返回',
    'action.next': '下一页',
    'action.prev': '上一页',
    'action.submit': '提交',
    'action.close': '关闭',
    'action.clearFilters': '清除筛选',
    'action.pause': '暂停',
    'action.resume': '恢复',
    
    // Video statuses
    'status.draft': '草稿',
    'status.queued': '排队中',
    'status.processing': '处理中',
    'status.completed': '已完成',
    'status.failed': '失败',
    'status.all': '全部',
    'status.processingWithProgress': '处理中 {progress}%',
    
    // Video list
    'videoList.title': '视频列表',
    'videoList.filmInbox': '创作收件箱',
    'videoList.search': '搜索',
    'videoList.searchPlaceholder': '按标题或提示搜索...',
    'videoList.sortBy': '排序',
    'videoList.sortNewest': '最新优先',
    'videoList.sortOldest': '最旧优先',
    'videoList.lastUpdated': '最后更新',
    'videoList.page': '页面',
    'videoList.createVideo': '创建视频',
    'videoList.engine': '引擎',
    'videoList.quickActions': '操作',
    'videoList.openDetail': '查看详情',
    'videoList.retryTask': '重试',
    'videoList.retryComingSoon': '重试功能即将推出',
    
    // Empty states
    'empty.noVideos.title': '还没有视频',
    'empty.noVideos.description': '创建您的第一个视频开始使用',
    'empty.noVideos.action': '创建视频',
    'empty.noResults.title': '未找到结果',
    'empty.noResults.description': '尝试调整您的搜索或筛选条件',
    'empty.noResultsWithFilters.title': '没有符合条件的影片',
    'empty.noResultsWithFilters.description': '尝试调整搜索词或筛选条件来找到您要找的内容',
    'empty.noResultsWithFilters.action': '清除筛选',
    'empty.loading': '加载中...',
    'empty.createFirstFilm': '创建您的第一部影片开始使用',
    
    // Create video
    'create.title': '创建视频任务',
    'create.createFilm': '创建影片',
    'create.form.title': '标题',
    'create.form.titlePlaceholder': '为您的影片输入描述性标题...',
    'create.form.titleRequired': '标题是必需的',
    'create.form.titleMaxLength': '标题必须少于{max}个字符',
    'create.form.prompt': '提示',
    'create.form.promptPlaceholder': '描述您想在影片中创建的内容...',
    'create.form.promptRequired': '提示是必需的',
    'create.form.promptMaxLength': '提示必须少于{max}个字符',
    'create.form.engine': '引擎',
    'create.form.params': '参数 (JSON)',
    'create.form.paramsOptional': '可选',
    'create.form.paramsInvalid': '无效的JSON格式',
    'create.form.creating': '创建中...',
    'create.form.created': '视频任务创建成功',
    'create.form.characterCount': '({current}/{max})',
    'create.form.fixErrors': '请在提交前修复表单中的错误。',
    'create.form.mockEngine': '模拟 (测试用)',
    'create.form.runwayEngine': 'Runway',
    'create.form.validatingJson': '验证JSON中...',
    'create.form.viewTask': '查看任务',
    'create.form.createAndView': '创建并查看',
    
    // Debug panel
    'debug.panel': '请求调试面板',
    'debug.endpoint': '端点:',
    'debug.method': '方法:',
    'debug.status': '状态:',
    'debug.requestId': '请求ID:',
    'debug.idempotency': '幂等性:',
    'debug.timestamp': '时间戳:',
    'debug.headers': '请求头:',
    'debug.errorDetails': '错误详情:',
    'debug.code': '代码:',
    'debug.message': '消息:',
    'debug.retryWithSameKey': '使用相同密钥重试',
    'debug.retryDescription': '这将使用相同的幂等性密钥重试请求以防止重复。',
    'debug.pending': '等待中...',
    'debug.na': '不适用',
    
    // Video detail
    'detail.videoNotAvailable': '视频不可用',
    'detail.videoNotPlayable': '视频无法播放',
    'detail.generating': '正在生成您的视频...',
    'detail.queued': '视频排队中',
    'detail.failed': '视频生成失败',
    'detail.progress': '进度',
    'detail.copyInfo': '复制信息',
    'detail.taskId': '任务ID',
    'detail.videoUrl': '视频URL',
    'detail.requestId': '请求ID',
    'detail.copied': '已复制',
    'detail.retryVideo': '重试视频',
    'detail.refreshPage': '刷新页面',
    'detail.openNewTab': '在新标签页中打开',
    'detail.videoNotAvailableDescription': '视频生成已完成，但视频文件尚不可用。这可能是临时问题。',
    'detail.generatingDescription': '您的视频正在处理中。这可能需要几分钟时间。',
    'detail.queuedDescription': '您的视频在队列中，很快就会开始处理。',
    'detail.failedUnknownReason': '视频生成因未知原因失败',
    'detail.autoRefresh': '自动刷新',
    'detail.autoRefreshDescription': '自动检查状态更新',
    
    // Error messages
    'error.networkError': '发生网络错误',
    'error.serverError': '服务器错误，请重试',
    'error.unauthorized': '会话已过期，请重新登录',
    'error.forbidden': '访问被拒绝',
    'error.notFound': '未找到资源',
    'error.validationError': '无效数据',
    'error.tooManyRequests': '请求过多，请稍后重试',
    'error.unknown': '发生未知错误',
    'error.requestId': '请求ID（用于支持）',
    'error.whatToDo': '下一步操作：',
    'error.checkInput': '检查您的输入参数并重试',
    'error.tryAgain': '等待片刻后重试 - 这可能是临时问题',
    'error.contactSupport': '如果问题持续存在，请携带请求ID联系支持团队',
    'error.serverSlow': '服务器响应时间超出预期',
    'error.serverSlowDescription': '后端可能正在启动中。通常需要一点时间。',
    'error.authRequired': '需要身份验证',
    'error.authRequiredDescription': '请登录以查看视频。',
    'error.failedToLoadVideo': '加载视频详情失败',
    'error.deleteFailed': '删除失败',
    'error.videoUrlNotAvailable': '视频URL不可用',
    'error.downloadFailed': '下载失败',
    'error.downloadNetworkError': '下载失败：网络错误或CORS问题',
    'error.downloadAccessDenied': '下载失败：访问被拒绝',
    'error.downloadNotFound': '下载失败：未找到视频',
    'error.videoGenerationFailed': '视频生成失败',
    'error.cannotDeleteProcessing': '视频处理中无法删除',
    
    // Loading states
    'loading.videos': '加载视频中...',
    'loading.video': '加载视频中...',
    'loading.creating': '创建视频中...',
    'loading.deleting': '删除中...',
    'loading.retrying': '重试中...',
    'loading.app': '加载中...',
    'loading.redirecting': '重定向中...',
    'loading.validatingSession': '验证会话中...',
    
    // Success messages
    'success.videoCreated': '视频任务创建成功',
    'success.videoDeleted': '视频删除成功',
    'success.downloadStarted': '下载开始成功',
    'success.copied': '已复制到剪贴板',
    'success.loginSuccess': '登录成功',
    'success.logoutSuccess': '登出成功',
    'success.downloadStarting': '开始下载...',
    
    // Confirmation
    'confirm.delete.title': '删除视频',
    'confirm.delete.message': '您确定要删除此视频吗？此操作无法撤销。',
    'confirm.delete.confirm': '删除',
    
    // Login
    'login.title': '登录',
    'login.email': '邮箱',
    'login.password': '密码',
    'login.submit': '登录',
    'login.error': '登录失败',
    'login.noToken': '服务器未返回令牌',
    'login.signingIn': '登录中...',
    'login.testAccount': '测试账户',
    
    // Language
    'language.select': '语言',
    'language.en': 'English',
    'language.ko': '한국어',
    'language.zh': '中文',
    'language.vi': 'Tiếng Việt',
  },
  
  vi: {
    // Navigation
    'nav.dashboard': 'Bảng điều khiển',
    'nav.videos': 'Video',
    'nav.create': 'Tạo mới',
    'nav.logout': 'Đăng xuất',
    'nav.login': 'Đăng nhập',
    'nav.profile': 'Hồ sơ',
    'nav.user': 'Người dùng',
    'nav.comingSoon': 'Sắp ra mắt',
    
    // Common actions
    'action.create': 'Tạo',
    'action.edit': 'Chỉnh sửa',
    'action.delete': 'Xóa',
    'action.cancel': 'Hủy',
    'action.save': 'Lưu',
    'action.retry': 'Thử lại',
    'action.refresh': 'Làm mới',
    'action.download': 'Tải xuống',
    'action.copy': 'Sao chép',
    'action.back': 'Quay lại',
    'action.next': 'Tiếp theo',
    'action.prev': 'Trước',
    'action.submit': 'Gửi',
    'action.close': 'Đóng',
    'action.clearFilters': 'Xóa Bộ lọc',
    'action.pause': 'Tạm dừng',
    'action.resume': 'Tiếp tục',
    
    // Video statuses
    'status.draft': 'Bản nháp',
    'status.queued': 'Đang chờ',
    'status.processing': 'Đang xử lý',
    'status.completed': 'Hoàn thành',
    'status.failed': 'Thất bại',
    'status.all': 'Tất cả',
    'status.processingWithProgress': 'Đang xử lý {progress}%',
    
    // Video list
    'videoList.title': 'Danh sách Video',
    'videoList.filmInbox': 'Hộp thư Sáng tạo',
    'videoList.search': 'Tìm kiếm',
    'videoList.searchPlaceholder': 'Tìm theo tiêu đề hoặc mô tả...',
    'videoList.sortBy': 'Sắp xếp',
    'videoList.sortNewest': 'Mới nhất',
    'videoList.sortOldest': 'Cũ nhất',
    'videoList.lastUpdated': 'Cập nhật lần cuối',
    'videoList.page': 'Trang',
    'videoList.createVideo': 'Tạo Video',
    'videoList.engine': 'Engine',
    'videoList.quickActions': 'Thao tác',
    'videoList.openDetail': 'Xem Chi tiết',
    'videoList.retryTask': 'Thử lại',
    'videoList.retryComingSoon': 'Tính năng thử lại sắp ra mắt',
    
    // Empty states
    'empty.noVideos.title': 'Chưa có video nào',
    'empty.noVideos.description': 'Tạo video đầu tiên để bắt đầu',
    'empty.noVideos.action': 'Tạo Video',
    'empty.noResults.title': 'Không tìm thấy kết quả',
    'empty.noResults.description': 'Thử điều chỉnh tìm kiếm hoặc bộ lọc',
    'empty.noResultsWithFilters.title': 'Không có phim nào phù hợp',
    'empty.noResultsWithFilters.description': 'Thử điều chỉnh từ khóa tìm kiếm hoặc bộ lọc để tìm nội dung bạn muốn',
    'empty.noResultsWithFilters.action': 'Xóa Bộ lọc',
    'empty.loading': 'Đang tải...',
    'empty.createFirstFilm': 'Tạo bộ phim đầu tiên để bắt đầu',
    
    // Create video
    'create.title': 'Tạo Tác vụ Video',
    'create.createFilm': 'Tạo Phim',
    'create.form.title': 'Tiêu đề',
    'create.form.titlePlaceholder': 'Nhập tiêu đề mô tả cho bộ phim của bạn...',
    'create.form.titleRequired': 'Tiêu đề là bắt buộc',
    'create.form.titleMaxLength': 'Tiêu đề phải có tối đa {max} ký tự',
    'create.form.prompt': 'Mô tả',
    'create.form.promptPlaceholder': 'Mô tả những gì bạn muốn tạo trong bộ phim...',
    'create.form.promptRequired': 'Mô tả là bắt buộc',
    'create.form.promptMaxLength': 'Mô tả phải có tối đa {max} ký tự',
    'create.form.engine': 'Engine',
    'create.form.params': 'Tham số (JSON)',
    'create.form.paramsOptional': 'tùy chọn',
    'create.form.paramsInvalid': 'Định dạng JSON không hợp lệ',
    'create.form.creating': 'Đang tạo...',
    'create.form.created': 'Tác vụ video đã được tạo thành công',
    'create.form.characterCount': '({current}/{max})',
    'create.form.fixErrors': 'Vui lòng sửa lỗi trong biểu mẫu trước khi gửi.',
    'create.form.mockEngine': 'Giả lập (để thử nghiệm)',
    'create.form.runwayEngine': 'Runway',
    'create.form.validatingJson': 'Đang xác thực JSON...',
    'create.form.viewTask': 'Xem Tác vụ',
    'create.form.createAndView': 'Tạo & Xem',
    
    // Debug panel
    'debug.panel': 'Bảng Gỡ lỗi Yêu cầu',
    'debug.endpoint': 'Điểm cuối:',
    'debug.method': 'Phương thức:',
    'debug.status': 'Trạng thái:',
    'debug.requestId': 'ID Yêu cầu:',
    'debug.idempotency': 'Tính bất biến:',
    'debug.timestamp': 'Dấu thời gian:',
    'debug.headers': 'Tiêu đề Yêu cầu:',
    'debug.errorDetails': 'Chi tiết Lỗi:',
    'debug.code': 'Mã:',
    'debug.message': 'Thông báo:',
    'debug.retryWithSameKey': 'Thử lại với Cùng Khóa',
    'debug.retryDescription': 'Điều này sẽ thử lại yêu cầu với cùng khóa bất biến để tránh trùng lặp.',
    'debug.pending': 'Đang chờ...',
    'debug.na': 'Không có',
    
    // Video detail
    'detail.videoNotAvailable': 'Video Không Khả Dụng',
    'detail.videoNotPlayable': 'Video Không Thể Phát',
    'detail.generating': 'Đang Tạo Video Của Bạn...',
    'detail.queued': 'Video Đang Chờ',
    'detail.failed': 'Tạo Video Thất Bại',
    'detail.progress': 'Tiến độ',
    'detail.copyInfo': 'Sao Chép Thông Tin',
    'detail.taskId': 'ID Tác vụ',
    'detail.videoUrl': 'URL Video',
    'detail.requestId': 'ID Yêu cầu',
    'detail.copied': 'Đã sao chép',
    'detail.retryVideo': 'Thử Lại Video',
    'detail.refreshPage': 'Làm Mới Trang',
    'detail.openNewTab': 'Mở Trong Tab Mới',
    'detail.videoNotAvailableDescription': 'Việc tạo video đã hoàn thành nhưng tệp video chưa khả dụng. Đây có thể là vấn đề tạm thời.',
    'detail.generatingDescription': 'Video của bạn đang được xử lý. Quá trình này có thể mất vài phút.',
    'detail.queuedDescription': 'Video của bạn đang trong hàng đợi và sẽ bắt đầu xử lý sớm.',
    'detail.failedUnknownReason': 'Tạo video thất bại vì lý do không xác định',
    'detail.autoRefresh': 'Tự động làm mới',
    'detail.autoRefreshDescription': 'Tự động kiểm tra cập nhật trạng thái',
    
    // Error messages
    'error.networkError': 'Lỗi mạng đã xảy ra',
    'error.serverError': 'Lỗi máy chủ, vui lòng thử lại',
    'error.unauthorized': 'Phiên đã hết hạn, vui lòng đăng nhập lại',
    'error.forbidden': 'Truy cập bị từ chối',
    'error.notFound': 'Không tìm thấy tài nguyên',
    'error.validationError': 'Dữ liệu không hợp lệ',
    'error.tooManyRequests': 'Quá nhiều yêu cầu, vui lòng thử lại sau',
    'error.unknown': 'Đã xảy ra lỗi không xác định',
    'error.requestId': 'ID Yêu cầu (để hỗ trợ)',
    'error.whatToDo': 'Các bước tiếp theo:',
    'error.checkInput': 'Kiểm tra tham số đầu vào và thử lại',
    'error.tryAgain': 'Đợi một chút và thử lại - có thể là vấn đề tạm thời',
    'error.contactSupport': 'Liên hệ hỗ trợ với ID Yêu cầu nếu vấn đề vẫn tiếp tục',
    'error.serverSlow': 'Máy chủ phản hồi chậm hơn dự kiến',
    'error.serverSlowDescription': 'Backend có thể đang khởi động. Thường mất một chút thời gian.',
    'error.authRequired': 'Yêu cầu Xác thực',
    'error.authRequiredDescription': 'Vui lòng đăng nhập để xem video.',
    'error.failedToLoadVideo': 'Không thể tải chi tiết video',
    'error.deleteFailed': 'Xóa thất bại',
    'error.videoUrlNotAvailable': 'URL video không khả dụng',
    'error.downloadFailed': 'Tải xuống thất bại',
    'error.downloadNetworkError': 'Tải xuống thất bại: Lỗi mạng hoặc vấn đề CORS',
    'error.downloadAccessDenied': 'Tải xuống thất bại: Truy cập bị từ chối',
    'error.downloadNotFound': 'Tải xuống thất bại: Không tìm thấy video',
    'error.videoGenerationFailed': 'Tạo video thất bại',
    'error.cannotDeleteProcessing': 'Không thể xóa khi video đang được xử lý',
    
    // Loading states
    'loading.videos': 'Đang tải video...',
    'loading.video': 'Đang tải video...',
    'loading.creating': 'Đang tạo video...',
    'loading.deleting': 'Đang xóa...',
    'loading.retrying': 'Đang thử lại...',
    'loading.app': 'Đang tải...',
    'loading.redirecting': 'Đang chuyển hướng...',
    'loading.validatingSession': 'Đang xác thực phiên...',
    
    // Success messages
    'success.videoCreated': 'Tác vụ video đã được tạo thành công',
    'success.videoDeleted': 'Video đã được xóa thành công',
    'success.downloadStarted': 'Tải xuống đã bắt đầu thành công',
    'success.copied': 'Đã sao chép vào clipboard',
    'success.loginSuccess': 'Đăng nhập thành công',
    'success.logoutSuccess': 'Đăng xuất thành công',
    'success.downloadStarting': 'Bắt đầu tải xuống...',
    
    // Confirmation
    'confirm.delete.title': 'Xóa Video',
    'confirm.delete.message': 'Bạn có chắc chắn muốn xóa video này? Hành động này không thể hoàn tác.',
    'confirm.delete.confirm': 'Xóa',
    
    // Login
    'login.title': 'Đăng nhập',
    'login.email': 'Email',
    'login.password': 'Mật khẩu',
    'login.submit': 'Đăng nhập',
    'login.error': 'Đăng nhập thất bại',
    'login.noToken': 'Máy chủ không trả về token',
    'login.signingIn': 'Đang đăng nhập...',
    'login.testAccount': 'Tài khoản Test',
    
    // Language
    'language.select': 'Ngôn ngữ',
    'language.en': 'English',
    'language.ko': '한국어',
    'language.zh': '中文',
    'language.vi': 'Tiếng Việt',
  },
};

// Auto-detect language based on browser/region
export function detectLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') return 'en';
  
  // Get browser language
  const browserLang = navigator.language || (navigator as any).userLanguage;
  const langCode = browserLang.toLowerCase().split('-')[0];
  
  // Map language codes to supported languages
  const langMap: Record<string, SupportedLanguage> = {
    'ko': 'ko',
    'zh': 'zh',
    'vi': 'vi',
    'en': 'en',
  };
  
  return langMap[langCode] || 'en';
}

// Get stored language preference
export function getStoredLanguage(): SupportedLanguage | null {
  if (typeof window === 'undefined') return null;
  
  const stored = localStorage.getItem('preferred-language');
  if (stored && Object.keys(translations).includes(stored)) {
    return stored as SupportedLanguage;
  }
  
  return null;
}

// Store language preference
export function setStoredLanguage(lang: SupportedLanguage): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('preferred-language', lang);
}

// Get current language (stored preference or auto-detected)
export function getCurrentLanguage(): SupportedLanguage {
  return getStoredLanguage() || detectLanguage();
}

// Translation function with interpolation
export function t(key: keyof TranslationKeys, params?: Record<string, string | number>): string {
  const lang = getCurrentLanguage();
  let text = translations[lang][key] || translations.en[key] || key;
  
  // Simple interpolation
  if (params) {
    Object.entries(params).forEach(([param, value]) => {
      text = text.replace(new RegExp(`\\{${param}\\}`, 'g'), String(value));
    });
  }
  
  return text;
}

// Get all translations for a language
export function getTranslations(lang: SupportedLanguage): TranslationKeys {
  return translations[lang] || translations.en;
}

// Check if language is supported
export function isSupportedLanguage(lang: string): lang is SupportedLanguage {
  return Object.keys(translations).includes(lang);
}

export { translations };