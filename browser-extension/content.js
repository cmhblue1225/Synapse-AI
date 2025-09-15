// Synapse Browser Extension - Content Script
console.log('📄 Synapse Content Script 로드됨');

// 페이지에서 인텔리전트 텍스트 선택 기능
let isSelecting = false;
let selectionOverlay = null;

// 페이지 로드 완료 후 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initContentScript);
} else {
  initContentScript();
}

function initContentScript() {
  console.log('🔧 Content Script 초기화');

  // 선택 오버레이 생성
  createSelectionOverlay();

  // 스마트 선택 기능 설정
  setupSmartSelection();

  // 키보드 단축키 설정
  setupKeyboardShortcuts();

  console.log('✅ Content Script 초기화 완료');
}

// 선택 오버레이 생성
function createSelectionOverlay() {
  selectionOverlay = document.createElement('div');
  selectionOverlay.id = 'synapse-selection-overlay';
  selectionOverlay.style.cssText = `
    position: fixed;
    top: -100px;
    left: -100px;
    background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%);
    color: white;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    pointer-events: none;
    opacity: 0;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    backdrop-filter: blur(10px);
  `;
  selectionOverlay.textContent = 'Synapse로 수집하려면 우클릭하세요';
  document.body.appendChild(selectionOverlay);
}

// 스마트 선택 기능 설정
function setupSmartSelection() {
  let selectionTimeout;

  document.addEventListener('mouseup', () => {
    clearTimeout(selectionTimeout);
    selectionTimeout = setTimeout(handleTextSelection, 100);
  });

  document.addEventListener('keyup', () => {
    clearTimeout(selectionTimeout);
    selectionTimeout = setTimeout(handleTextSelection, 100);
  });

  document.addEventListener('click', hideSelectionOverlay);
}

// 텍스트 선택 처리
function handleTextSelection() {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();

  if (selectedText.length > 10 && selectedText.length < 5000) {
    showSelectionOverlay(selection);
  } else {
    hideSelectionOverlay();
  }
}

// 선택 오버레이 표시
function showSelectionOverlay(selection) {
  if (!selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  if (rect.width === 0 && rect.height === 0) return;

  const overlay = selectionOverlay;
  const x = rect.left + window.scrollX + (rect.width / 2) - (overlay.offsetWidth / 2);
  const y = rect.top + window.scrollY - overlay.offsetHeight - 10;

  overlay.style.left = `${Math.max(10, Math.min(x, window.innerWidth - overlay.offsetWidth - 10))}px`;
  overlay.style.top = `${Math.max(10, y)}px`;
  overlay.style.opacity = '1';
  overlay.style.transform = 'translateY(0)';
}

// 선택 오버레이 숨김
function hideSelectionOverlay() {
  if (selectionOverlay) {
    selectionOverlay.style.opacity = '0';
    selectionOverlay.style.transform = 'translateY(-10px)';
  }
}

// 키보드 단축키 설정
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+S (또는 Cmd+Shift+S): 현재 페이지 수집
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      clipCurrentPage();
    }

    // Ctrl+Shift+C (또는 Cmd+Shift+C): 선택된 텍스트 수집
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      clipSelectedText();
    }

    // ESC: 오버레이 숨김
    if (e.key === 'Escape') {
      hideSelectionOverlay();
    }
  });
}

// 현재 페이지 수집
async function clipCurrentPage() {
  console.log('📄 페이지 수집 시작');

  try {
    showNotification('페이지를 분석하고 있습니다...', 'info');

    const pageData = extractPageContent();

    const clipData = {
      type: 'webpage',
      title: pageData.title,
      content: pageData.content,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      metadata: {
        ...pageData,
        userInitiated: true,
        source: 'keyboard_shortcut'
      }
    };

    // 백그라운드 스크립트로 전송
    const response = await chrome.runtime.sendMessage({
      type: 'CLIP_CONTENT',
      clipData: clipData
    });

    if (response && response.success) {
      showNotification('페이지가 Synapse에 수집되었습니다!', 'success');
    } else {
      throw new Error('수집 실패');
    }

  } catch (error) {
    console.error('❌ 페이지 수집 오류:', error);
    showNotification('페이지 수집 중 오류가 발생했습니다.', 'error');
  }
}

// 선택된 텍스트 수집
async function clipSelectedText() {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();

  if (!selectedText) {
    showNotification('수집할 텍스트를 선택해주세요.', 'warning');
    return;
  }

  console.log('📝 선택 텍스트 수집:', selectedText.substring(0, 50));

  try {
    showNotification('선택된 텍스트를 수집하고 있습니다...', 'info');

    const clipData = {
      type: 'text_selection',
      title: `텍스트 발췌 - ${document.title}`,
      content: selectedText,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      metadata: {
        pageTitle: document.title,
        pageUrl: window.location.href,
        selectionText: selectedText,
        userInitiated: true,
        source: 'keyboard_shortcut',
        wordCount: selectedText.split(/\s+/).length
      }
    };

    // 백그라운드 스크립트로 전송
    const response = await chrome.runtime.sendMessage({
      type: 'CLIP_CONTENT',
      clipData: clipData
    });

    if (response && response.success) {
      showNotification('선택된 텍스트가 Synapse에 수집되었습니다!', 'success');
      hideSelectionOverlay();

      // 선택 해제
      selection.removeAllRanges();
    } else {
      throw new Error('수집 실패');
    }

  } catch (error) {
    console.error('❌ 텍스트 수집 오류:', error);
    showNotification('텍스트 수집 중 오류가 발생했습니다.', 'error');
  }
}

// 페이지 콘텐츠 추출 (background.js의 extractPageContent 함수와 동일)
function extractPageContent() {
  const article = document.querySelector('article') ||
                  document.querySelector('[role="main"]') ||
                  document.querySelector('main') ||
                  document.body;

  // 불필요한 요소들 제거
  const elementsToRemove = ['script', 'style', 'nav', 'header', 'footer', 'aside', '.ad', '.advertisement', '.popup', '.modal'];
  const content = article.cloneNode(true);

  elementsToRemove.forEach(selector => {
    const elements = content.querySelectorAll(selector);
    elements.forEach(el => el.remove());
  });

  // 메타데이터 추출
  const getMetaContent = (name) => {
    const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"], meta[property="og:${name}"]`);
    return meta ? meta.content : '';
  };

  const textContent = content.textContent?.trim() || '';
  const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;

  return {
    title: document.title || 'Untitled',
    content: textContent,
    description: getMetaContent('description'),
    keywords: getMetaContent('keywords'),
    author: getMetaContent('author'),
    publishedTime: getMetaContent('article:published_time'),
    modifiedTime: getMetaContent('article:modified_time'),
    siteName: getMetaContent('site_name'),
    imageUrl: getMetaContent('image'),
    wordCount: wordCount,
    readingTime: Math.ceil(wordCount / 200), // 분 단위 예상 읽기 시간
    url: window.location.href,
    domain: window.location.hostname,
    pathname: window.location.pathname,
    language: document.documentElement.lang || 'ko',
    charset: document.characterSet || 'UTF-8'
  };
}

// 알림 표시 (페이지 내 토스트 알림)
function showNotification(message, type = 'info') {
  // 기존 알림 제거
  const existingNotification = document.getElementById('synapse-notification');
  if (existingNotification) {
    existingNotification.remove();
  }

  // 알림 요소 생성
  const notification = document.createElement('div');
  notification.id = 'synapse-notification';

  const bgColor = {
    success: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    error: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
    warning: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    info: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)'
  };

  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${bgColor[type] || bgColor.info};
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 500;
    z-index: 10001;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    backdrop-filter: blur(10px);
    animation: synapseSlideIn 0.3s ease-out;
    max-width: 350px;
    word-wrap: break-word;
  `;

  // CSS 애니메이션 추가
  if (!document.getElementById('synapse-animations')) {
    const style = document.createElement('style');
    style.id = 'synapse-animations';
    style.textContent = `
      @keyframes synapseSlideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes synapseSlideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  notification.textContent = message;
  document.body.appendChild(notification);

  // 3초 후 자동 제거
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'synapseSlideOut 0.3s ease-in forwards';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }
  }, 3000);
}

// 백그라운드 스크립트에서 메시지 수신
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'EXTRACT_PAGE_CONTENT':
      const pageData = extractPageContent();
      sendResponse({ success: true, data: pageData });
      break;

    case 'SHOW_NOTIFICATION':
      showNotification(request.message, request.notificationType);
      sendResponse({ success: true });
      break;

    case 'HIGHLIGHT_ELEMENT':
      if (request.selector) {
        highlightElement(request.selector);
      }
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }
});

// 요소 하이라이트 (디버깅 및 사용자 피드백용)
function highlightElement(selector) {
  const element = document.querySelector(selector);
  if (!element) return;

  const originalStyle = element.style.cssText;
  element.style.cssText += `
    outline: 3px solid #3B82F6 !important;
    outline-offset: 2px !important;
    background-color: rgba(59, 130, 246, 0.1) !important;
  `;

  setTimeout(() => {
    element.style.cssText = originalStyle;
  }, 2000);
}

console.log('✅ Synapse Content Script 설정 완료');