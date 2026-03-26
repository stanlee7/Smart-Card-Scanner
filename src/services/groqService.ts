import Groq from "groq-sdk";

export interface BusinessCardData {
  name: string;
  title: string;
  company: string;
  mobile_phone: string;
  office_phone: string;
  email: string;
  address: string;
}

const getGroqApiKey = () => {
  const key = process.env.GROQ_API_KEY;
  if (!key || key === "MY_GROQ_API_KEY" || key === "") {
    return null;
  }
  return key;
};

export async function scanWithGroq(base64Image: string): Promise<BusinessCardData> {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    throw new Error("GROQ_API_KEY_MISSING");
  }

  const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });
  
  // Llama 3.2 Vision 모델 사용
  const model = "llama-3.2-11b-vision-preview";

  const prompt = `당신은 OCR 및 데이터 구조화 전문 AI입니다. 이미지를 분석하여 다음 원칙에 따라 순수한 JSON 객체만 반환하십시오. 
(1) 왜곡 없이 정확히 추출. 
(2) 없는 정보는 빈 문자열("") 처리. 
(3) 전화번호 형식 유지. 
(4) 직함과 부서는 분리. 
(5) 마크다운 태그 사용 금지.

반환해야 하는 JSON 형식:
{
  "name": "이름",
  "title": "직함 및 직책",
  "company": "회사명",
  "mobile_phone": "휴대전화 번호",
  "office_phone": "회사 유선 전화 번호",
  "email": "이메일 주소",
  "address": "주소"
}`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: base64Image,
              },
            },
          ],
        },
      ],
      model: model,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("Groq 응답이 비어있습니다.");
    
    return JSON.parse(content) as BusinessCardData;
  } catch (error) {
    console.error("Groq OCR Error:", error);
    throw error;
  }
}
