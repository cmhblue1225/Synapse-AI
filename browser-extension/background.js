// Synapse Browser Extension - Background Service Worker
console.log('🚀 Synapse Background Service Worker 시작됨');

// 확장 설치 시 초기 설정
chrome.runtime.onInstalled.addListener((details) => {
  console.log('📥 Synapse Extension 설치됨:', details);

  // 컨텍스트 메뉴 생성
  chrome.contextMenus.create({
    id: 'synapse-clip-text',
    title: 'Synapse로 텍스트 수집',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'synapse-clip-link',
    title: 'Synapse로 링크 수집',
    contexts: ['link']
  });

  chrome.contextMenus.create({
    id: 'synapse-clip-page',
    title: 'Synapse로 페이지 수집',
    contexts: ['page']
  });

  // 초기 설정 저장
  chrome.storage.sync.set({
    synapseSettings: {
      apiUrl: 'http://localhost:3001',
      autoClip: true,
      smartTags: true,
      notifications: true
    }
  });
});

// 컨텍스트 메뉴 클릭 처리
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log('📋 컨텍스트 메뉴 클릭:', info.menuItemId);

  try {
    const settings = await getSettings();

    switch (info.menuItemId) {
      case 'synapse-clip-text':
        await clipSelectedText(info, tab, settings);
        break;
      case 'synapse-clip-link':
        await clipLink(info, tab, settings);
        break;
      case 'synapse-clip-page':
        await clipPage(tab, settings);
        break;
    }
  } catch (error) {
    console.error('❌ 컨텍스트 메뉴 처리 오류:', error);
  }
});

// 설정 가져오기
async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['synapseSettings'], (result) => {
      resolve(result.synapseSettings || {});
    });
  });
}

// 선택된 텍스트 수집
async function clipSelectedText(info, tab, settings) {
  console.log('📝 텍스트 수집 시작:', info.selectionText);

  const clipData = {
    type: 'text_selection',
    content: info.selectionText,
    title: `텍스트 발췌 - ${tab.title}`,
    url: tab.url,
    timestamp: new Date().toISOString(),
    metadata: {
      pageTitle: tab.title,
      pageUrl: tab.url,
      selectionText: info.selectionText
    }
  };

  await sendToSynapse(clipData, settings);
}

// 링크 수집
async function clipLink(info, tab, settings) {
  console.log('🔗 링크 수집 시작:', info.linkUrl);

  const clipData = {
    type: 'link',
    content: `링크: ${info.linkUrl}`,
    title: info.linkText || '링크',
    url: info.linkUrl,
    timestamp: new Date().toISOString(),
    metadata: {
      linkUrl: info.linkUrl,
      linkText: info.linkText,
      pageTitle: tab.title,
      pageUrl: tab.url
    }
  };

  await sendToSynapse(clipData, settings);
}

// 페이지 전체 수집
async function clipPage(tab, settings) {
  console.log('📄 페이지 수집 시작:', tab.url);

  try {
    // 페이지 내용 추출을 위해 content script 실행
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: extractPageContent
    });

    const pageContent = results[0].result;

    const clipData = {
      type: 'webpage',
      content: pageContent.content,
      title: pageContent.title || tab.title,
      url: tab.url,
      timestamp: new Date().toISOString(),
      metadata: {
        ...pageContent,
        tabTitle: tab.title,
        tabUrl: tab.url
      }
    };

    await sendToSynapse(clipData, settings);
  } catch (error) {
    console.error('❌ 페이지 수집 오류:', error);
  }
}

// 페이지 내용 추출 함수 (content script에서 실행)
function extractPageContent() {
  const article = document.querySelector('article') ||
                  document.querySelector('[role="main"]') ||
                  document.querySelector('main') ||
                  document.body;

  // 불필요한 요소들 제거
  const elementsToRemove = ['script', 'style', 'nav', 'header', 'footer', 'aside', '.ad', '.advertisement'];
  const content = article.cloneNode(true);

  elementsToRemove.forEach(selector => {
    const elements = content.querySelectorAll(selector);
    elements.forEach(el => el.remove());
  });

  return {
    title: document.title,
    content: content.textContent?.trim() || '',
    description: document.querySelector('meta[name="description"]')?.content || '',
    keywords: document.querySelector('meta[name="keywords"]')?.content || '',
    author: document.querySelector('meta[name="author"]')?.content || '',
    publishedTime: document.querySelector('meta[property="article:published_time"]')?.content || '',
    modifiedTime: document.querySelector('meta[property="article:modified_time"]')?.content || '',
    siteName: document.querySelector('meta[property="og:site_name"]')?.content || '',
    wordCount: content.textContent?.split(/\s+/).length || 0
  };
}

// Synapse 앱으로 데이터 전송
async function sendToSynapse(clipData, settings) {
  console.log('📤 Synapse로 데이터 전송:', clipData.type);

  try {
    const apiUrl = settings.apiUrl || 'http://localhost:5176';

    // 우선 로컬 스토리지에 저장 (오프라인 대비)
    await saveToLocalStorage(clipData);

    // Synapse 앱으로 전송 시도
    const response = await fetch(`${apiUrl}/api/extension/clip`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(clipData)
    });

    if (response.ok) {
      console.log('✅ Synapse 전송 성공');

      // 성공 시 알림 표시
      if (settings.notifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'Synapse 수집 완료',
          message: `"${clipData.title}" 지식이 수집되었습니다.`
        });
      }
    } else {
      throw new Error(`API 오류: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Synapse 전송 오류:', error);

    // 오류 알림
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Synapse 수집 오류',
      message: '지식 수집 중 오류가 발생했습니다. 나중에 다시 시도됩니다.'
    });
  }
}

// 로컬 스토리지에 임시 저장
async function saveToLocalStorage(clipData) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['pendingClips'], (result) => {
      const pendingClips = result.pendingClips || [];
      pendingClips.push(clipData);

      chrome.storage.local.set({ pendingClips }, () => {
        console.log('💾 로컬 스토리지 저장 완료');
        resolve();
      });
    });
  });
}

// 주기적으로 대기 중인 클립들을 재전송 시도
setInterval(async () => {
  try {
    const result = await chrome.storage.local.get(['pendingClips']);
    const pendingClips = result.pendingClips || [];

    if (pendingClips.length > 0) {
      console.log(`🔄 대기 중인 클립 ${pendingClips.length}개 재전송 시도`);

      const settings = await getSettings();
      const failedClips = [];

      for (const clip of pendingClips) {
        try {
          const response = await fetch(`${settings.apiUrl}/api/extension/clip`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(clip)
          });

          if (!response.ok) {
            failedClips.push(clip);
          }
        } catch (error) {
          failedClips.push(clip);
        }
      }

      // 실패한 클립들만 다시 저장
      await chrome.storage.local.set({ pendingClips: failedClips });
    }
  } catch (error) {
    console.error('❌ 재전송 오류:', error);
  }
}, 30000); // 30초마다 시도

// 메시지 처리
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 메시지 수신:', request.type);

  switch (request.type) {
    case 'GET_SETTINGS':
      getSettings().then(sendResponse);
      return true; // 비동기 응답

    case 'UPDATE_SETTINGS':
      chrome.storage.sync.set({ synapseSettings: request.settings }, () => {
        sendResponse({ success: true });
      });
      return true;

    case 'GET_PENDING_CLIPS':
      chrome.storage.local.get(['pendingClips'], (result) => {
        sendResponse({ clips: result.pendingClips || [] });
      });
      return true;

    case 'CLIP_CURRENT_PAGE':
      // 팝업에서 현재 페이지 수집 요청
      clipPage(request.tab, {})
        .then(() => {
          sendResponse({ success: true });
        })
        .catch((error) => {
          console.error('❌ 페이지 수집 오류:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case 'SAVE_QUICK_NOTE':
      // 팝업에서 빠른 노트 저장 요청
      saveQuickNote(request.noteData)
        .then(() => {
          sendResponse({ success: true });
        })
        .catch((error) => {
          console.error('❌ 빠른 노트 저장 오류:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case 'CLIP_CONTENT':
      // content script에서 콘텐츠 수집 요청
      handleContentClip(request.clipData)
        .then(() => {
          sendResponse({ success: true });
        })
        .catch((error) => {
          console.error('❌ 콘텐츠 수집 오류:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;
  }
});

// 빠른 노트 저장 함수
async function saveQuickNote(noteData) {
  console.log('📝 빠른 노트 저장:', noteData.title);

  const settings = await getSettings();

  // 통계 업데이트를 위해 총 클립 수 증가
  chrome.storage.local.get(['totalClipsCount'], (result) => {
    const currentCount = result.totalClipsCount || 0;
    chrome.storage.local.set({ totalClipsCount: currentCount + 1 });
  });

  // 로컬 스토리지에 저장
  await saveToLocalStorage(noteData);

  // Synapse 앱으로 전송 시도
  try {
    const apiUrl = settings.apiUrl || 'http://localhost:5173';
    const response = await fetch(`${apiUrl}/api/extension/clip`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(noteData)
    });

    if (response.ok) {
      console.log('✅ 빠른 노트 Synapse 전송 성공');

      // 성공 시 알림 표시
      if (settings.notifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'Synapse 노트 저장 완료',
          message: `"${noteData.title}" 노트가 저장되었습니다.`
        });
      }
    } else {
      throw new Error(`API 오류: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ 빠른 노트 전송 오류:', error);

    // 오류 알림
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Synapse 노트 저장 오류',
      message: '노트 저장 중 오류가 발생했습니다. 나중에 다시 시도됩니다.'
    });
  }
}

// content script에서 온 콘텐츠 수집 처리
async function handleContentClip(clipData) {
  console.log('📋 Content Script 콘텐츠 수집:', clipData.type);

  const settings = await getSettings();

  // 통계 업데이트를 위해 총 클립 수 증가
  chrome.storage.local.get(['totalClipsCount'], (result) => {
    const currentCount = result.totalClipsCount || 0;
    chrome.storage.local.set({ totalClipsCount: currentCount + 1 });
  });

  // 로컬 스토리지에 저장
  await saveToLocalStorage(clipData);

  // Synapse 앱으로 전송 시도
  try {
    const apiUrl = settings.apiUrl || 'http://localhost:5173';
    const response = await fetch(`${apiUrl}/api/extension/clip`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(clipData)
    });

    if (response.ok) {
      console.log('✅ Content Script 콘텐츠 Synapse 전송 성공');

      // 성공 시 알림 표시
      if (settings.notifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'Synapse 수집 완료',
          message: `"${clipData.title}" 콘텐츠가 수집되었습니다.`
        });
      }
    } else {
      throw new Error(`API 오류: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Content Script 콘텐츠 전송 오류:', error);

    // 오류 알림
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Synapse 수집 오류',
      message: '콘텐츠 수집 중 오류가 발생했습니다. 나중에 다시 시도됩니다.'
    });
  }
}

console.log('✅ Synapse Background Service Worker 초기화 완료');