document.addEventListener('DOMContentLoaded', () => {
  const diaryTextarea = document.getElementById('diary-textarea');
  const btnVoice = document.getElementById('btn-voice');
  const btnAnalysis = document.getElementById('btn-analysis');
  const aiResponseBox = document.getElementById('ai-response-box');
  const aiResponseText = document.getElementById('ai-response-text');
  const historyContainer = document.getElementById('history-container');

  let recognition = null;
  let isRecording = false;

  // Load saved content from localStorage if it exists
  const savedDiary = localStorage.getItem('diaryContent');
  const savedAIResponse = localStorage.getItem('aiResponse');
  
  if (savedDiary) {
    diaryTextarea.value = savedDiary;
  }
  if (savedAIResponse) {
    aiResponseBox.classList.add('has-content');
    aiResponseText.innerHTML = savedAIResponse.replace(/\n/g, '<br>');
  }

  // Load and render history on page load
  renderHistory();

  function renderHistory() {
    if (!historyContainer) return;
    
    const history = JSON.parse(localStorage.getItem('diaryHistory') || '[]');
    
    // Sort by latest first (descending timestamp/id)
    const sortedHistory = [...history].sort((a, b) => b.id - a.id);
    
    if (sortedHistory.length === 0) {
      historyContainer.innerHTML = `
        <div class="history-empty">
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
            <line x1="16" x2="16" y1="2" y2="6"/>
            <line x1="8" x2="8" y1="2" y2="6"/>
            <line x1="3" x2="21" y1="10" y2="10"/>
          </svg>
          <span>아직 기록된 일기가 없습니다.</span>
          <span style="font-size: 0.8rem; opacity: 0.8;">첫 일기를 작성하고 따뜻한 공감을 받아보세요.</span>
        </div>
      `;
      return;
    }
    
    historyContainer.innerHTML = sortedHistory.map(entry => {
      const formattedDiary = entry.content.replace(/\n/g, '<br>');
      const formattedAI = entry.aiResponse.replace(/\n/g, '<br>');
      return `
        <div class="history-card" data-id="${entry.id}">
          <div class="history-card-header">
            <div class="history-card-date">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span>${entry.date}</span>
            </div>
            <button class="btn-delete-history" title="기록 삭제" onclick="deleteHistoryEntry(${entry.id})">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
          <div class="history-card-body">
            <div class="history-segment">
              <div class="history-segment-label label-user">
                <span>나의 일기</span>
              </div>
              <div class="history-segment-content history-card-diary-content">${formattedDiary}</div>
            </div>
            <div class="history-segment">
              <div class="history-segment-label label-ai">
                <span>AI의 답변</span>
              </div>
              <div class="history-segment-content history-card-ai-content">${formattedAI}</div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Delete a history entry
  window.deleteHistoryEntry = (id) => {
    if (confirm('이 일기 기록을 삭제하시겠습니까?')) {
      const history = JSON.parse(localStorage.getItem('diaryHistory') || '[]');
      const updatedHistory = history.filter(entry => entry.id !== id);
      localStorage.setItem('diaryHistory', JSON.stringify(updatedHistory));
      renderHistory();
    }
  };

  // 1. Web Speech API (Speech Recognition) Setup
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'ko-KR';

    recognition.onstart = () => {
      isRecording = true;
      btnVoice.classList.add('recording');
      btnVoice.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="3" fill="currentColor"/>
        </svg>
        <span>음성 인식 중...</span>
      `;
    };

    recognition.onresult = (event) => {
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript;
      
      // Append text with spacing
      if (diaryTextarea.value.trim() === '') {
        diaryTextarea.value = transcript;
      } else {
        diaryTextarea.value += ' ' + transcript;
      }
      
      // Focus on textarea
      diaryTextarea.focus();
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      stopRecording();
      if (event.error === 'not-allowed') {
        alert('마이크 사용 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요.');
      } else {
        alert('음성 인식 중 오류가 발생했습니다: ' + event.error);
      }
    };

    recognition.onend = () => {
      stopRecording();
    };
  } else {
    // If browser doesn't support Web Speech API
    btnVoice.style.opacity = '0.5';
    btnVoice.title = '이 브라우저는 음성 입력을 지원하지 않습니다.';
    btnVoice.addEventListener('click', (e) => {
      e.preventDefault();
      alert('사용하시는 브라우저가 음성 인식을 지원하지 않습니다. Chrome 혹은 Edge 브라우저를 사용해 주세요.');
    });
  }

  function startRecording() {
    if (!recognition) return;
    try {
      recognition.start();
    } catch (e) {
      console.error('Failed to start recognition:', e);
    }
  }

  function stopRecording() {
    if (!recognition) return;
    isRecording = false;
    btnVoice.classList.remove('recording');
    btnVoice.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" x2="12" y1="19" y2="22"/>
      </svg>
      <span>음성으로 입력하기</span>
    `;
    try {
      recognition.stop();
    } catch (e) {
      // already stopped
    }
  }

  if (recognition) {
    btnVoice.addEventListener('click', (e) => {
      e.preventDefault();
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    });
  }

  // 2. Typing Effect Generator
  function typeText(element, text, callback) {
    let index = 0;
    element.innerHTML = ''; // Clear contents
    element.classList.add('typing-cursor');

    function type() {
      if (index < text.length) {
        const char = text.charAt(index);
        // support newlines correctly in typing
        if (char === '\n') {
          element.innerHTML += '<br>';
        } else {
          element.innerHTML += char;
        }
        index++;
        
        // Scroll response box to bottom as typing progresses
        const responseBox = element.parentElement;
        responseBox.scrollTop = responseBox.scrollHeight;
        
        setTimeout(type, 30); // 30ms typing speed
      } else {
        element.classList.remove('typing-cursor');
        if (callback) callback();
      }
    }
    type();
  }

  // 3. Request Analysis Action
  btnAnalysis.addEventListener('click', async (e) => {
    e.preventDefault();
    const content = diaryTextarea.value.trim();

    if (content === '') {
      alert('오늘 하루 있었던 일이나 감정을 작성해 주세요.');
      diaryTextarea.focus();
      return;
    }

    // Stop voice recording if it was running
    if (isRecording) {
      stopRecording();
    }

    // Disable inputs and buttons during analysis
    diaryTextarea.disabled = true;
    btnVoice.disabled = true;
    btnAnalysis.disabled = true;

    // Reset response style and clear text
    aiResponseBox.classList.add('has-content');
    aiResponseText.innerHTML = '';
    
    // Step 1: Loading state
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'ai-loading';
    loadingDiv.innerHTML = `
      <span></span><span></span><span></span>
      <p style="margin-left: 0.5rem; color: var(--text-secondary); font-size: 0.95rem;">
        당신의 오늘 하루를 분석하고 있습니다...
      </p>
    `;
    aiResponseBox.appendChild(loadingDiv);

    const enableUI = () => {
      if (aiResponseBox.contains(loadingDiv)) {
        aiResponseBox.removeChild(loadingDiv);
      }
      diaryTextarea.disabled = false;
      btnVoice.disabled = false;
      btnAnalysis.disabled = false;
    };

    try {
      // Transition loading message after 1.2s
      setTimeout(() => {
        if (aiResponseBox.contains(loadingDiv)) {
          loadingDiv.querySelector('p').textContent = '당신의 마음을 달래줄 따뜻한 답변을 작성하는 중...';
        }
      }, 1200);

      // Call express server endpoint
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      });

      const data = await response.json();

      enableUI();

      if (!response.ok) {
        aiResponseText.innerHTML = `<span style="color: #f87171; font-weight: 500;">⚠️ 분석 요청 실패</span><br><br>${data.error || '답변을 생성하지 못했습니다.'}`;
        if (data.details) {
          aiResponseText.innerHTML += `<br><br><small style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.4; display: block;">상세 에러 내용:<br>${data.details}</small>`;
        }
        return;
      }

      // Type out the response and save to localStorage when done
      typeText(aiResponseText, data.result, () => {
        localStorage.setItem('diaryContent', content);
        localStorage.setItem('aiResponse', data.result);

        // Save to diaryHistory
        const history = JSON.parse(localStorage.getItem('diaryHistory') || '[]');
        history.push({
          id: Date.now(),
          date: new Date().toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }),
          content: content,
          aiResponse: data.result
        });
        localStorage.setItem('diaryHistory', JSON.stringify(history));
        
        // Rerender history list
        renderHistory();
      });

    } catch (err) {
      enableUI();
      console.error(err);
      aiResponseText.innerHTML = `<span style="color: #f87171; font-weight: 500;">⚠️ 네트워크 연결 실패</span><br><br>서버와 연결을 설정할 수 없습니다. 터미널에서 백엔드 서버가 올바르게 실행 중인지 확인해 주세요.`;
    }
  });
});
