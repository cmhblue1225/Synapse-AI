// Synapse Browser Extension - Popup Interface Handler
console.log('🎨 Synapse Popup Interface 로드됨');

// DOM 요소들
const elements = {
  // 상태 관련
  statusDot: document.getElementById('statusDot'),
  statusText: document.getElementById('statusText'),

  // 액션 버튼들
  clipPageBtn: document.getElementById('clipPageBtn'),
  quickNoteBtn: document.getElementById('quickNoteBtn'),
  openSynapseBtn: document.getElementById('openSynapseBtn'),

  // 빠른 노트 폼
  quickNoteForm: document.getElementById('quickNoteForm'),
  noteTitle: document.getElementById('noteTitle'),
  noteContent: document.getElementById('noteContent'),
  noteTags: document.getElementById('noteTags'),
  saveNoteBtn: document.getElementById('saveNoteBtn'),
  cancelNoteBtn: document.getElementById('cancelNoteBtn'),

  // 통계 및 기타
  totalClips: document.getElementById('totalClips'),
  pendingClips: document.getElementById('pendingClips'),
  recentClips: document.getElementById('recentClips'),

  // 하단 버튼들
  settingsBtn: document.getElementById('settingsBtn'),
  helpBtn: document.getElementById('helpBtn'),

  // 로딩 및 알림
  loadingOverlay: document.getElementById('loadingOverlay'),
  notification: document.getElementById('notification'),
  notificationMessage: document.getElementById('notificationMessage'),
  notificationClose: document.getElementById('notificationClose')
};

// 설정 및 상태 관리
let settings = {
  apiUrl: 'http://localhost:3001',
  autoClip: true,
  smartTags: true,
  notifications: true
};

let connectionStatus = 'checking'; // 'online', 'offline', 'checking'

// 초기화
document.addEventListener('DOMContentLoaded', async () => {
  console.log('📋 Popup DOM 로드 완료');

  try {
    // 설정 로드
    await loadSettings();

    // 연결 상태 확인
    await checkConnection();

    // 통계 업데이트
    await updateStats();

    // 최근 수집 내역 로드
    await loadRecentClips();

    // 이벤트 리스너 등록
    setupEventListeners();

    console.log('✅ Popup 초기화 완료');
  } catch (error) {
    console.error('❌ Popup 초기화 오류:', error);
    showNotification('초기화 중 오류가 발생했습니다.', 'error');
  }
});

// 설정 로드
async function loadSettings() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    if (response) {
      settings = { ...settings, ...response };
    }
  } catch (error) {
    console.error('❌ 설정 로드 오류:', error);
  }
}

// 연결 상태 확인
async function checkConnection() {
  updateConnectionStatus('connecting');

  try {
    const response = await fetch(`${settings.apiUrl}/api/health`, {
      method: 'GET',
      timeout: 5000
    });

    if (response.ok) {
      updateConnectionStatus('online');
    } else {
      updateConnectionStatus('offline');
    }
  } catch (error) {
    console.error('❌ 연결 확인 오류:', error);
    updateConnectionStatus('offline');
  }
}

// 연결 상태 UI 업데이트
function updateConnectionStatus(status) {
  connectionStatus = status;

  elements.statusDot.className = 'status-dot';

  switch (status) {
    case 'online':
      elements.statusDot.classList.add('online');
      elements.statusText.textContent = '온라인';
      break;
    case 'offline':
      elements.statusDot.classList.add('offline');
      elements.statusText.textContent = '오프라인';
      break;
    case 'connecting':
      elements.statusDot.classList.add('connecting');
      elements.statusText.textContent = '연결 확인 중...';
      break;
  }
}

// 통계 업데이트
async function updateStats() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_PENDING_CLIPS' });
    const pendingClips = response?.clips || [];

    // 총 수집 개수 (임시로 로컬 스토리지에서 가져오기)
    chrome.storage.local.get(['totalClipsCount'], (result) => {
      const totalCount = result.totalClipsCount || 0;
      elements.totalClips.textContent = totalCount.toString();
    });

    // 대기 중인 클립 개수
    elements.pendingClips.textContent = pendingClips.length.toString();

  } catch (error) {
    console.error('❌ 통계 업데이트 오류:', error);
  }
}

// 최근 수집 내역 로드
async function loadRecentClips() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_PENDING_CLIPS' });
    const clips = response?.clips || [];

    // 최근 5개만 표시
    const recentClips = clips.slice(0, 5);

    elements.recentClips.innerHTML = '';

    if (recentClips.length === 0) {
      elements.recentClips.innerHTML = `
        <div class="text-sm text-gray-500 italic p-3 bg-gray-50 rounded-md">
          아직 수집된 내용이 없습니다
        </div>
      `;
      return;
    }

    recentClips.forEach(clip => {
      const clipElement = createClipElement(clip);
      elements.recentClips.appendChild(clipElement);
    });

  } catch (error) {
    console.error('❌ 최근 수집 내역 로드 오류:', error);
  }
}

// 클립 요소 생성
function createClipElement(clip) {
  const clipDiv = document.createElement('div');
  clipDiv.className = 'clip-item';

  const iconSvg = getClipIcon(clip.type);

  clipDiv.innerHTML = `
    <div class="clip-icon">
      ${iconSvg}
    </div>
    <div class="clip-content">
      <div class="clip-title">${clip.title}</div>
      <div class="clip-meta">${formatDate(clip.timestamp)} • ${getClipTypeLabel(clip.type)}</div>
    </div>
    <div class="clip-status pending"></div>
  `;

  // 클릭 시 Synapse 앱에서 열기
  clipDiv.addEventListener('click', () => {
    chrome.tabs.create({ url: `${settings.apiUrl}/knowledge/${clip.id || ''}` });
  });

  return clipDiv;
}

// 클립 타입별 아이콘
function getClipIcon(type) {
  switch (type) {
    case 'text_selection':
      return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>';
    case 'webpage':
      return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';
    case 'link':
      return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>';
    default:
      return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 11H7v6h2v-6zm4 0h-2v6h2v-6zm4 0h-2v6h2v-6zm2-7v2H3V4h4V2h10v2h4zm-2 4H5v12c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V8z"/></svg>';
  }
}

// 클립 타입 라벨
function getClipTypeLabel(type) {
  switch (type) {
    case 'text_selection': return '텍스트';
    case 'webpage': return '웹페이지';
    case 'link': return '링크';
    default: return '기타';
  }
}

// 날짜 포맷팅
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now - date) / (1000 * 60));

  if (diffInMinutes < 1) return '방금';
  if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}시간 전`;
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

// 이벤트 리스너 설정
function setupEventListeners() {
  // 현재 페이지 수집 버튼
  elements.clipPageBtn.addEventListener('click', async () => {
    showLoading('페이지를 수집하고 있습니다...');

    try {
      // 현재 활성 탭 정보 가져오기
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // 백그라운드 스크립트에 페이지 수집 요청
      await chrome.runtime.sendMessage({
        type: 'CLIP_CURRENT_PAGE',
        tab: tab
      });

      hideLoading();
      showNotification('페이지가 성공적으로 수집되었습니다!', 'success');

      // 통계 업데이트
      await updateStats();
      await loadRecentClips();

    } catch (error) {
      hideLoading();
      console.error('❌ 페이지 수집 오류:', error);
      showNotification('페이지 수집 중 오류가 발생했습니다.', 'error');
    }
  });

  // 빠른 노트 버튼
  elements.quickNoteBtn.addEventListener('click', () => {
    elements.quickNoteForm.classList.toggle('hidden');
    if (!elements.quickNoteForm.classList.contains('hidden')) {
      elements.noteTitle.focus();
    }
  });

  // 빠른 노트 저장
  elements.saveNoteBtn.addEventListener('click', async () => {
    const title = elements.noteTitle.value.trim();
    const content = elements.noteContent.value.trim();
    const tags = elements.noteTags.value.trim();

    if (!title || !content) {
      showNotification('제목과 내용을 모두 입력해주세요.', 'warning');
      return;
    }

    showLoading('노트를 저장하고 있습니다...');

    try {
      const noteData = {
        type: 'quick_note',
        title: title,
        content: content,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        timestamp: new Date().toISOString(),
        metadata: {
          source: 'browser_extension',
          quick_note: true
        }
      };

      await chrome.runtime.sendMessage({
        type: 'SAVE_QUICK_NOTE',
        noteData: noteData
      });

      // 폼 초기화
      elements.noteTitle.value = '';
      elements.noteContent.value = '';
      elements.noteTags.value = '';
      elements.quickNoteForm.classList.add('hidden');

      hideLoading();
      showNotification('노트가 성공적으로 저장되었습니다!', 'success');

      // 통계 업데이트
      await updateStats();
      await loadRecentClips();

    } catch (error) {
      hideLoading();
      console.error('❌ 노트 저장 오류:', error);
      showNotification('노트 저장 중 오류가 발생했습니다.', 'error');
    }
  });

  // 빠른 노트 취소
  elements.cancelNoteBtn.addEventListener('click', () => {
    elements.noteTitle.value = '';
    elements.noteContent.value = '';
    elements.noteTags.value = '';
    elements.quickNoteForm.classList.add('hidden');
  });

  // Synapse 열기 버튼
  elements.openSynapseBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: settings.apiUrl });
  });

  // 설정 버튼
  elements.settingsBtn.addEventListener('click', () => {
    // 설정 페이지 열기 (향후 구현)
    showNotification('설정 기능은 곧 추가될 예정입니다.', 'warning');
  });

  // 도움말 버튼
  elements.helpBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: `${settings.apiUrl}/help` });
  });

  // 알림 닫기
  elements.notificationClose.addEventListener('click', hideNotification);

  // 키보드 단축키
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 's':
          e.preventDefault();
          elements.clipPageBtn.click();
          break;
        case 'n':
          e.preventDefault();
          elements.quickNoteBtn.click();
          break;
        case 'o':
          e.preventDefault();
          elements.openSynapseBtn.click();
          break;
      }
    }

    if (e.key === 'Escape') {
      if (!elements.quickNoteForm.classList.contains('hidden')) {
        elements.cancelNoteBtn.click();
      }
    }
  });
}

// 로딩 표시
function showLoading(message = '처리 중...') {
  elements.loadingOverlay.querySelector('.loading-text').textContent = message;
  elements.loadingOverlay.classList.remove('hidden');
}

// 로딩 숨기기
function hideLoading() {
  elements.loadingOverlay.classList.add('hidden');
}

// 알림 표시
function showNotification(message, type = 'success') {
  elements.notification.className = `notification ${type}`;
  elements.notificationMessage.textContent = message;
  elements.notification.classList.remove('hidden');

  // 3초 후 자동 숨김
  setTimeout(hideNotification, 3000);
}

// 알림 숨기기
function hideNotification() {
  elements.notification.classList.add('hidden');
}

// 주기적 업데이트 (30초마다)
setInterval(async () => {
  try {
    await checkConnection();
    await updateStats();
  } catch (error) {
    console.error('❌ 주기적 업데이트 오류:', error);
  }
}, 30000);

console.log('✅ Synapse Popup Interface 설정 완료');