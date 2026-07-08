document.addEventListener('DOMContentLoaded', () => {
  const diaryTextarea = document.getElementById('diary-textarea');
  const btnVoice = document.getElementById('btn-voice');
  const btnAnalysis = document.getElementById('btn-analysis');
  const aiResponseBox = document.getElementById('ai-response-box');
  const aiResponseText = document.getElementById('ai-response-text');

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
      });

    } catch (err) {
      enableUI();
      console.error(err);
      aiResponseText.innerHTML = `<span style="color: #f87171; font-weight: 500;">⚠️ 네트워크 연결 실패</span><br><br>서버와 연결을 설정할 수 없습니다. 터미널에서 백엔드 서버가 올바르게 실행 중인지 확인해 주세요.`;
    }
  });
});
