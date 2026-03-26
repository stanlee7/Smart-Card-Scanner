import React, { useState, useRef } from 'react';
import { Camera, Upload, Loader2, Check, User, Briefcase, Building2, Phone, Mail, MapPin, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { scanBusinessCard, BusinessCardData } from './services/geminiService';
import { scanWithGroq } from './services/groqService';

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [data, setData] = useState<BusinessCardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiMode, setApiMode] = useState<'gemini' | 'groq'>('gemini');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const optimizeImage = (base64String: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = base64String;
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const optimizedImage = await optimizeImage(base64String);
        setImage(optimizedImage);
        performScan(optimizedImage);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerUpload = (useCamera: boolean) => {
    if (fileInputRef.current) {
      if (useCamera) {
        fileInputRef.current.setAttribute('capture', 'environment');
      } else {
        fileInputRef.current.removeAttribute('capture');
      }
      fileInputRef.current.click();
    }
  };

  const performScan = async (base64Image: string) => {
    setIsScanning(true);
    setError(null);
    setData(null);
    
    try {
      let result;
      if (apiMode === 'gemini') {
        result = await scanBusinessCard(base64Image);
      } else {
        result = await scanWithGroq(base64Image);
      }
      setData(result);
    } catch (err: any) {
      if (err.message === "API_KEY_MISSING") {
        setError("Gemini API 키가 설정되지 않았습니다. AI Studio의 'Secrets' 메뉴에서 GEMINI_API_KEY를 추가해주세요.");
      } else if (err.message === "GROQ_API_KEY_MISSING") {
        setError("Groq API 키가 설정되지 않았습니다. 환경 변수에 GROQ_API_KEY를 추가해주세요.");
      } else {
        setError(`${apiMode === 'gemini' ? 'Gemini' : 'Groq'} 인식에 실패했습니다. 이미지 화질을 확인하거나 다시 시도해주세요.`);
      }
      console.error(err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleInputChange = (field: keyof BusinessCardData, value: string) => {
    if (data) {
      setData({ ...data, [field]: value });
    }
  };

  const reset = () => {
    setImage(null);
    setData(null);
    setError(null);
  };

  const saveContact = () => {
    if (!data) return;
    
    // vCard generation
    const vCard = `BEGIN:VCARD
VERSION:3.0
FN:${data.name}
ORG:${data.company}
TITLE:${data.title}
TEL;TYPE=CELL:${data.mobile_phone}
TEL;TYPE=WORK:${data.office_phone}
EMAIL:${data.email}
ADR;TYPE=WORK:;;${data.address}
END:VCARD`;

    const blob = new Blob([vCard], { type: 'text/vcard' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${data.name}.vcf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert("연락처 파일(.vcf)이 생성되었습니다.");
  };

  return (
    <div className="min-h-screen bg-toss-gray-50 flex flex-col items-center justify-start p-4 pb-32">
      <header className="w-full max-w-md flex justify-between items-center py-6 mb-4">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold text-toss-gray-900">명함 스캐너</h1>
          <div className="flex gap-2 mt-2">
            <button 
              onClick={() => setApiMode('gemini')}
              className={`text-xs px-2 py-1 rounded-md transition-colors ${apiMode === 'gemini' ? 'bg-toss-blue text-white' : 'bg-toss-gray-100 text-toss-gray-600'}`}
            >
              Gemini
            </button>
            <button 
              onClick={() => setApiMode('groq')}
              className={`text-xs px-2 py-1 rounded-md transition-colors ${apiMode === 'groq' ? 'bg-toss-blue text-white' : 'bg-toss-gray-100 text-toss-gray-600'}`}
            >
              Groq (Fast)
            </button>
          </div>
        </div>
        {image && (
          <button onClick={reset} className="p-2 text-toss-gray-600 hover:bg-toss-gray-100 rounded-full transition-colors">
            <X size={24} />
          </button>
        )}
      </header>

      <main className="w-full max-w-md space-y-6">
        {!image && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="toss-card flex flex-col items-center justify-center py-20 border-2 border-dashed border-toss-gray-100"
          >
            <div className="bg-toss-gray-50 p-6 rounded-full mb-6">
              <Camera size={48} className="text-toss-blue" />
            </div>
            <h2 className="text-xl font-semibold mb-2">명함을 스캔해보세요</h2>
            <p className="text-toss-gray-600 text-center mb-8 px-4">
              명함을 촬영하거나 앨범에서 이미지를 선택하면 AI가 자동으로 정보를 추출합니다.
            </p>
            <div className="flex flex-col w-full gap-3">
              <button 
                onClick={() => triggerUpload(true)}
                className="toss-button w-full flex items-center justify-center gap-2"
              >
                <Camera size={20} />
                카메라 촬영
              </button>
              <button 
                onClick={() => triggerUpload(false)}
                className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-toss-gray-100 text-toss-gray-900 font-semibold transition-all active:scale-95"
              >
                <Upload size={20} />
                갤러리에서 선택
              </button>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept="image/*" 
              className="hidden" 
            />
          </motion.div>
        )}

        {isScanning && (
          <div className="toss-card flex flex-col items-center justify-center py-16">
            <Loader2 size={48} className="text-toss-blue animate-spin mb-4" />
            <p className="text-lg font-medium text-toss-gray-900">명함을 분석하고 있어요</p>
            <p className="text-sm text-toss-gray-600 mt-1">잠시만 기다려주세요...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-center font-medium">
            {error}
          </div>
        )}

        {data && !isScanning && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Image Thumbnail */}
            <div className="toss-card p-0 overflow-hidden">
              <img 
                src={image!} 
                alt="Business Card" 
                className="w-full h-48 object-contain bg-toss-gray-900"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Data Fields */}
            <div className="toss-card space-y-5">
              <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                <Check size={20} className="text-green-500" />
                추출된 정보
              </h3>
              
              <Field 
                label="이름" 
                value={data.name} 
                onChange={(v) => handleInputChange('name', v)} 
                icon={<User size={18} />} 
              />
              <Field 
                label="직함 및 직책" 
                value={data.title} 
                onChange={(v) => handleInputChange('title', v)} 
                icon={<Briefcase size={18} />} 
              />
              <Field 
                label="회사명" 
                value={data.company} 
                onChange={(v) => handleInputChange('company', v)} 
                icon={<Building2 size={18} />} 
              />
              <Field 
                label="휴대전화" 
                value={data.mobile_phone} 
                onChange={(v) => handleInputChange('mobile_phone', v)} 
                icon={<Phone size={18} />} 
              />
              <Field 
                label="회사 전화" 
                value={data.office_phone} 
                onChange={(v) => handleInputChange('office_phone', v)} 
                icon={<Phone size={18} />} 
              />
              <Field 
                label="이메일" 
                value={data.email} 
                onChange={(v) => handleInputChange('email', v)} 
                icon={<Mail size={18} />} 
              />
              <Field 
                label="주소" 
                value={data.address} 
                onChange={(v) => handleInputChange('address', v)} 
                icon={<MapPin size={18} />} 
              />
            </div>
          </motion.div>
        )}
      </main>

      {/* Fixed Bottom CTA */}
      <AnimatePresence>
        {data && !isScanning && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-toss-gray-100 flex justify-center"
          >
            <button 
              onClick={saveContact}
              className="toss-button w-full max-w-md shadow-lg shadow-toss-blue/20"
            >
              연락처 저장
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon: React.ReactNode;
}

function Field({ label, value, onChange, icon }: FieldProps) {
  return (
    <div>
      <label className="toss-label flex items-center gap-1">
        {icon}
        {label}
      </label>
      <input 
        type="text" 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="toss-input"
        placeholder={`${label}을(를) 입력하세요`}
      />
    </div>
  );
}
