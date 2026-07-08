require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Enable CORS and JSON body parser
app.use(cors());
app.use(express.json());

// Serve static files from the 'public' directory with caching disabled for development
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  }
}));

// API route for diary emotion analysis
app.post('/api/analyze', async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content || content.trim() === '') {
      return res.status(400).json({ error: '일기 내용을 입력해 주세요.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // Validate the API key exists and is not the placeholder
    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE' || apiKey.trim() === '') {
      return res.status(401).json({
        error: 'GEMINI_API_KEY가 설정되지 않았습니다. 프로젝트 루트 폴더에 있는 .env 파일에서 실제 API 키를 입력해 주세요.'
      });
    }

    // Set up the context and request to Google Gemini API (gemini-2.5-flash)
    const prompt = `너는 심리 상담가야. 사용자가 작성한 일기 내용을 읽고, 사용자의 감정을 한 단어(예: 기쁨, 슬픔, 분노, 불안, 평온)로 요약해줘. 그리고 그 감정에 공감해주고, 따뜻한 응원의 메시지를 2~3문장으로 작성해줘. 답변 형식은 반드시 감정: [요약된 감정]\n\n[응원 메시지] 와 같이 줄바꿈을 포함해서 보내줘.

일기 내용:
${content}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Gemini API Error details:', errorData);
      return res.status(response.status).json({
        error: `Gemini API 호출에 실패했습니다. (상태 코드: ${response.status})`,
        details: errorData.error?.message || '알 수 없는 API 에러'
      });
    }

    const data = await response.json();
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiText) {
      return res.status(500).json({ error: 'Gemini로부터 올바른 답변을 생성받지 못했습니다.' });
    }

    res.json({ result: aiText });
  } catch (error) {
    console.error('Server error during analysis:', error);
    res.status(500).json({ error: '서버 내부 오류가 발생했습니다: ' + error.message });
  }
});

// Start listening
app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`  AI Emotion Diary app running at:`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`=================================================`);
});
