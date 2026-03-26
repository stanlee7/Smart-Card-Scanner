import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface BusinessCardData {
  name: string;
  title: string;
  company: string;
  mobile_phone: string;
  office_phone: string;
  email: string;
  address: string;
}

export async function scanBusinessCard(base64Image: string): Promise<BusinessCardData> {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `당신은 OCR 및 데이터 구조화 전문 AI입니다. 이미지를 분석하여 다음 원칙에 따라 순수한 JSON 객체만 반환하십시오. 
(1) 왜곡 없이 정확히 추출. 
(2) 없는 정보는 빈 문자열("") 처리. 
(3) 전화번호 형식 유지. 
(4) 직함과 부서는 분리. 
(5) 마크다운 태그 사용 금지.`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: "이름" },
      title: { type: Type.STRING, description: "직함 및 직책" },
      company: { type: Type.STRING, description: "회사명" },
      mobile_phone: { type: Type.STRING, description: "휴대전화 번호" },
      office_phone: { type: Type.STRING, description: "회사 유선 전화 번호" },
      email: { type: Type.STRING, description: "이메일 주소" },
      address: { type: Type.STRING, description: "주소" },
    },
    required: ["name", "title", "company", "mobile_phone", "office_phone", "email", "address"],
  };

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          parts: [
            { text: "이 명함 이미지에서 정보를 추출해줘." },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image.split(",")[1] || base64Image,
              },
            },
          ],
        },
      ],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    const text = response.text;
    if (!text) throw new Error("AI 응답이 비어있습니다.");
    
    return JSON.parse(text) as BusinessCardData;
  } catch (error) {
    console.error("OCR Error:", error);
    throw error;
  }
}
