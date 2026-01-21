// i18n system with auto-detection and manual override
export type SupportedLanguage = 'en' | 'ko' | 'zh' | 'vi';

export interface TranslationKeys {
  // Navigation
  'nav.dashboard': string;
  'nav.videos': string;
  'nav.create': string;
  'nav.logout': string;
  'nav.login': string;
  
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
  
  // Video statuses
  'status.queued': string;
  'status.processing': string;
  'status.completed': string;
  'status.failed': string;
  'status.all': string;
  
  // Video list
  'videoList.title': string;
  'videoList.search': string;
  'videoList.sortBy': string;
  'videoList.sortNewest': string;
  'videoList.sortOldest': string;
  'videoList.lastUpdated': string;
  'videoList.page': string;
  'videoList.createVideo': string;
  
  // Empty states
  'empty.noVideos.title': string;
  'empty.noVideos.description': string;
  'empty.noVideos.action': string;
  'empty.noResults.title': string;
  'empty.noResults.description': string;
  'empty.loading': string;
  
  // Create video
  'create.title': string;
  'create.form.title': string;
  'create.form.titleRequired': string;
  'create.form.titleMaxLength': string;
  'create.form.prompt': string;
  'create.form.promptRequired': string;
  'create.form.promptMaxLength': string;
  'create.form.engine': string;
  'create.form.params': string;
  'create.form.paramsOptional': string;
  'create.form.paramsInvalid': string;
  'create.form.creating': string;
  'create.form.created': string;
  'create.form.characterCount': string;
  
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
  
  // Loading states
  'loading.videos': string;
  'loading.video': string;
  'loading.creating': string;
  'loading.deleting': string;
  'loading.retrying': string;
  
  // Success messages
  'success.videoCreated': string;
  'success.videoDeleted': string;
  'success.downloadStarted': string;
  'success.copied': string;
  
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
    
    // Video statuses
    'status.queued': 'Queued',
    'status.processing': 'Processing',
    'status.completed': 'Completed',
    'status.failed': 'Failed',
    'status.all': 'All',
    
    // Video list
    'videoList.title': 'Video List',
    'videoList.search': 'Search',
    'videoList.sortBy': 'Sort by',
    'videoList.sortNewest': 'Newest first',
    'videoList.sortOldest': 'Oldest first',
    'videoList.lastUpdated': 'Last updated',
    'videoList.page': 'Page',
    'videoList.createVideo': 'Create Video',
    
    // Empty states
    'empty.noVideos.title': 'No videos yet',
    'empty.noVideos.description': 'Create your first video to get started',
    'empty.noVideos.action': 'Create Video',
    'empty.noResults.title': 'No results found',
    'empty.noResults.description': 'Try adjusting your search or filters',
    'empty.loading': 'Loading...',
    
    // Create video
    'create.title': 'Create Video Task',
    'create.form.title': 'Title',
    'create.form.titleRequired': 'Title is required',
    'create.form.titleMaxLength': 'Title must be {max} characters or less',
    'create.form.prompt': 'Prompt',
    'create.form.promptRequired': 'Prompt is required',
    'create.form.promptMaxLength': 'Prompt must be {max} characters or less',
    'create.form.engine': 'Engine',
    'create.form.params': 'Parameters (JSON)',
    'create.form.paramsOptional': 'optional',
    'create.form.paramsInvalid': 'Invalid JSON format',
    'create.form.creating': 'Creating...',
    'create.form.created': 'Video task created successfully',
    'create.form.characterCount': '({current}/{max})',
    
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
    
    // Loading states
    'loading.videos': 'Loading videos...',
    'loading.video': 'Loading video...',
    'loading.creating': 'Creating video...',
    'loading.deleting': 'Deleting...',
    'loading.retrying': 'Retrying...',
    
    // Success messages
    'success.videoCreated': 'Video task created successfully',
    'success.videoDeleted': 'Video deleted successfully',
    'success.downloadStarted': 'Download started successfully',
    'success.copied': 'Copied to clipboard',
    
    // Confirmation
    'confirm.delete.title': 'Delete Video',
    'confirm.delete.message': 'Are you sure you want to delete this video? This action cannot be undone.',
    'confirm.delete.confirm': 'Delete',
    
    // Login
    'login.title': 'Login',
    'login.email': 'Email',
    'login.password': 'Password',
    'login.submit': 'Sign In',
    'login.error': 'Login failed',
    
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
    
    // Video statuses
    'status.queued': '대기중',
    'status.processing': '처리중',
    'status.completed': '완료',
    'status.failed': '실패',
    'status.all': '전체',
    
    // Video list
    'videoList.title': '비디오 목록',
    'videoList.search': '검색',
    'videoList.sortBy': '정렬',
    'videoList.sortNewest': '최신순',
    'videoList.sortOldest': '오래된순',
    'videoList.lastUpdated': '마지막 업데이트',
    'videoList.page': '페이지',
    'videoList.createVideo': '비디오 생성',
    
    // Empty states
    'empty.noVideos.title': '아직 비디오가 없습니다',
    'empty.noVideos.description': '첫 번째 비디오를 생성해보세요',
    'empty.noVideos.action': '비디오 생성',
    'empty.noResults.title': '결과를 찾을 수 없습니다',
    'empty.noResults.description': '검색어나 필터를 조정해보세요',
    'empty.loading': '로딩중...',
    
    // Create video
    'create.title': '비디오 작업 생성',
    'create.form.title': '제목',
    'create.form.titleRequired': '제목은 필수입니다',
    'create.form.titleMaxLength': '제목은 {max}자 이하여야 합니다',
    'create.form.prompt': '프롬프트',
    'create.form.promptRequired': '프롬프트는 필수입니다',
    'create.form.promptMaxLength': '프롬프트는 {max}자 이하여야 합니다',
    'create.form.engine': '엔진',
    'create.form.params': '매개변수 (JSON)',
    'create.form.paramsOptional': '선택사항',
    'create.form.paramsInvalid': '잘못된 JSON 형식',
    'create.form.creating': '생성중...',
    'create.form.created': '비디오 작업이 성공적으로 생성되었습니다',
    'create.form.characterCount': '({current}/{max})',
    
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
    
    // Loading states
    'loading.videos': '비디오 로딩중...',
    'loading.video': '비디오 로딩중...',
    'loading.creating': '비디오 생성중...',
    'loading.deleting': '삭제중...',
    'loading.retrying': '재시도중...',
    
    // Success messages
    'success.videoCreated': '비디오 작업이 성공적으로 생성되었습니다',
    'success.videoDeleted': '비디오가 성공적으로 삭제되었습니다',
    'success.downloadStarted': '다운로드가 성공적으로 시작되었습니다',
    'success.copied': '클립보드에 복사되었습니다',
    
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
    
    // Video statuses
    'status.queued': '排队中',
    'status.processing': '处理中',
    'status.completed': '已完成',
    'status.failed': '失败',
    'status.all': '全部',
    
    // Video list
    'videoList.title': '视频列表',
    'videoList.search': '搜索',
    'videoList.sortBy': '排序',
    'videoList.sortNewest': '最新优先',
    'videoList.sortOldest': '最旧优先',
    'videoList.lastUpdated': '最后更新',
    'videoList.page': '页面',
    'videoList.createVideo': '创建视频',
    
    // Empty states
    'empty.noVideos.title': '还没有视频',
    'empty.noVideos.description': '创建您的第一个视频开始使用',
    'empty.noVideos.action': '创建视频',
    'empty.noResults.title': '未找到结果',
    'empty.noResults.description': '尝试调整您的搜索或筛选条件',
    'empty.loading': '加载中...',
    
    // Create video
    'create.title': '创建视频任务',
    'create.form.title': '标题',
    'create.form.titleRequired': '标题是必需的',
    'create.form.titleMaxLength': '标题必须少于{max}个字符',
    'create.form.prompt': '提示',
    'create.form.promptRequired': '提示是必需的',
    'create.form.promptMaxLength': '提示必须少于{max}个字符',
    'create.form.engine': '引擎',
    'create.form.params': '参数 (JSON)',
    'create.form.paramsOptional': '可选',
    'create.form.paramsInvalid': '无效的JSON格式',
    'create.form.creating': '创建中...',
    'create.form.created': '视频任务创建成功',
    'create.form.characterCount': '({current}/{max})',
    
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
    
    // Loading states
    'loading.videos': '加载视频中...',
    'loading.video': '加载视频中...',
    'loading.creating': '创建视频中...',
    'loading.deleting': '删除中...',
    'loading.retrying': '重试中...',
    
    // Success messages
    'success.videoCreated': '视频任务创建成功',
    'success.videoDeleted': '视频删除成功',
    'success.downloadStarted': '下载开始成功',
    'success.copied': '已复制到剪贴板',
    
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
    
    // Video statuses
    'status.queued': 'Đang chờ',
    'status.processing': 'Đang xử lý',
    'status.completed': 'Hoàn thành',
    'status.failed': 'Thất bại',
    'status.all': 'Tất cả',
    
    // Video list
    'videoList.title': 'Danh sách Video',
    'videoList.search': 'Tìm kiếm',
    'videoList.sortBy': 'Sắp xếp',
    'videoList.sortNewest': 'Mới nhất',
    'videoList.sortOldest': 'Cũ nhất',
    'videoList.lastUpdated': 'Cập nhật lần cuối',
    'videoList.page': 'Trang',
    'videoList.createVideo': 'Tạo Video',
    
    // Empty states
    'empty.noVideos.title': 'Chưa có video nào',
    'empty.noVideos.description': 'Tạo video đầu tiên để bắt đầu',
    'empty.noVideos.action': 'Tạo Video',
    'empty.noResults.title': 'Không tìm thấy kết quả',
    'empty.noResults.description': 'Thử điều chỉnh tìm kiếm hoặc bộ lọc',
    'empty.loading': 'Đang tải...',
    
    // Create video
    'create.title': 'Tạo Tác vụ Video',
    'create.form.title': 'Tiêu đề',
    'create.form.titleRequired': 'Tiêu đề là bắt buộc',
    'create.form.titleMaxLength': 'Tiêu đề phải có tối đa {max} ký tự',
    'create.form.prompt': 'Mô tả',
    'create.form.promptRequired': 'Mô tả là bắt buộc',
    'create.form.promptMaxLength': 'Mô tả phải có tối đa {max} ký tự',
    'create.form.engine': 'Engine',
    'create.form.params': 'Tham số (JSON)',
    'create.form.paramsOptional': 'tùy chọn',
    'create.form.paramsInvalid': 'Định dạng JSON không hợp lệ',
    'create.form.creating': 'Đang tạo...',
    'create.form.created': 'Tác vụ video đã được tạo thành công',
    'create.form.characterCount': '({current}/{max})',
    
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
    
    // Loading states
    'loading.videos': 'Đang tải video...',
    'loading.video': 'Đang tải video...',
    'loading.creating': 'Đang tạo video...',
    'loading.deleting': 'Đang xóa...',
    'loading.retrying': 'Đang thử lại...',
    
    // Success messages
    'success.videoCreated': 'Tác vụ video đã được tạo thành công',
    'success.videoDeleted': 'Video đã được xóa thành công',
    'success.downloadStarted': 'Tải xuống đã bắt đầu thành công',
    'success.copied': 'Đã sao chép vào clipboard',
    
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