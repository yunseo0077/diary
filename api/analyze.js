export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // OPTIONS 요청(Preflight)이면 바로 응답
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // POST 요청만 허용
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST 요청만 지원합니다.' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const body = await req.json();
    const { content } = body;
    
    if (!content || content.trim() === '') {
      return new Response(JSON.stringify({ error: '일기 내용을 입력해 주세요.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Edge 런타임에서도 환경 변수에 안전하게 접근 가능
    // 이 값은 Vercel 배포 시 서버 측에만 저장되며 클라이언트에 노출되지 않습니다.
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE' || apiKey.trim() === '') {
      return new Response(JSON.stringify({
        error: 'GEMINI_API_KEY가 설정되지 않았습니다. 실제 API 키를 환경 변수에 등록해 주세요.'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const prompt = `너는 심리 상담가야. 사용자가 작성한 일기 내용을 읽고, 사용자의 감정을 한 단어(예: 기쁨, 슬픔, 분노, 불안, 평온)로 요약해줘. 그리고 그 감정에 공감해주고, 따뜻한 응원의 메시지를 2~3문장으로 작성해줘. 답변 형식은 반드시 감정: [요약된 감정]\n\n[응원 메시지] 와 같이 줄바꿈을 포함해서 보내줘.

일기 내용:
${content}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

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
      return new Response(JSON.stringify({
        error: `Gemini API 호출에 실패했습니다. (상태 코드: ${response.status})`,
        details: errorData.error?.message || '알 수 없는 API 에러'
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const data = await response.json();
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiText) {
      return new Response(JSON.stringify({ error: 'Gemini로부터 올바른 답변을 생성받지 못했습니다.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 성공적인 응답 반환
    return new Response(JSON.stringify({ result: aiText }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    console.error('Serverless function error:', error);
    return new Response(JSON.stringify({ error: '서버 내부 오류가 발생했습니다: ' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}
