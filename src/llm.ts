import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import "dotenv/config";

// --- Ortam Değişkenlerini Yükle ---
const MODEL_NAME = process.env.GOOGLE_AI_MODEL || "gemini-1.5-pro-latest";
const API_KEY = process.env.GOOGLE_AI_API_KEY;
if (!API_KEY) {
  throw new Error("GOOGLE_AI_API_KEY ortam değişkeni ayarlanmamış.");
}

// --- API İstemcisini Başlat ---
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({
  model: MODEL_NAME,
  // Her fonksiyon kendi sistem talimatını (system instruction) sağlayacak
});

// --- Güvenlik Ayarları ---
// LLM'in kodları "tehlikeli" olarak algılayıp engellememesi için ayarlar.
const generationConfig = {
  temperature: 0.2,
  topK: 1,
  topP: 1,
  maxOutputTokens: 8192,
};

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// --- Paylaşılan Yardımcılar ---
function tryParseJsonFromText(responseText: string): any {
  const jsonMatch = responseText.match(/```json([\s\S]*?)```/);
  if (jsonMatch && jsonMatch[1]) {
    try {
      return JSON.parse(jsonMatch[1].trim());
    } catch (e) {
      console.error("LLM yanıtı JSON bloktan parse edilemedi:", e);
    }
  }
  try {
    return JSON.parse(responseText);
  } catch (e) {
    console.error("LLM yanıtı JSON olarak parse edilemedi (doğrudan metin):", responseText);
    return null;
  }
}

// --- Paylaşılan Arayüzler (Interfaces) ---

// 1. Uzman Arayüzü: Kritik Hatalar
export interface CriticalBug extends AnalysisFinding {
  type: 'CRITICAL_BUG';
}

// 2. Uzman Arayüzü: Stil Önerileri
export interface StyleSuggestion extends AnalysisFinding {
  type: 'STYLE_SUGGESTION';
}

// --- Çekirdek LLM Çağrı Fonksiyonu (Özel) ---
/**
 * Belirli bir sistem talimatı (prompt) ile LLM'i çağıran genel fonksiyon.
 * Çıktıyı JSON olarak bekler ve parse eder.
 */
async function callGenerativeModel(
  systemInstruction: string,
  diffContent: string
): Promise<AnalysisFinding[]> {
  try {
    const chat = model.startChat({
      generationConfig,
      safetySettings,
      history: [
        { role: "user", parts: [{ text: systemInstruction }] },
        { role: "model", parts: [{ text: "Anlaşıldı. Lütfen analiz edilecek kod 'diff' içeriğini sağlayın." }] },
      ],
    });

    const result = await chat.sendMessage(`İşte analiz edilecek diff:\n\n${diffContent}`);
    const responseText = result.response.text();
    const parsed = tryParseJsonFromText(responseText);
    if (!parsed || !Array.isArray(parsed)) {
      console.error("LLM yanıtı beklenen JSON dizi formatında değil:", responseText);
      return [];
    }
    return parsed;
  } catch (error) {
    console.error("Google AI API çağrısında hata:", error);
    return []; // Hata durumunda boş dizi döndür
  }
}

// --- 1. UZMAN FONKSİYON: Tufano Modülü (%95 Güven) ---
const CRITICAL_BUG_PROMPT = `
SENİN GÖREVİN: Sen, son derece titiz, detaycı ve SADECE KANITA dayalı çalışan bir kod inceleme (code review) asistanısın. Görevin, sana git diff formatında sunulan kod değişikliklerini, aşağıda listelenen "PROJEYE ÖZEL ZORUNLU KURAL SETİ"ne göre analiz etmektir. 

EN ÖNEMLİ PRENSİP (SIFIR HALÜSİNASYON KURALI): 

ASLA KURAL UYDURMA: Yorumların SADECE ve SADECE aşağıda listelenen kurallara dayanmalıdır. Listede olmayan (örn: "performans şöyle daha iyi olurdu" gibi) genel tavsiyelerde BULUNMA. 

ASLA KOD UYDURMA: Yorumların SADECE git diff içerisinde + ile başlayan (eklenen) satırlarla ilgili olabilir. Değişmeyen veya silinen kod hakkında yorum YAPMA. 

KANIT GÖSTER: Yaptığın her yorumun, hangi kuralı ihlal ettiğini ve bu ihlalin diff içinde hangi satırda olduğunu net bir şekilde belirtmesi ZORUNLUDUR. 

BİLMİYORSAN SUS: Eğer bir kuralı (örneğin "Test Coverage") mevcut diff bilgisiyle doğrulayamıyorsan, o kural hakkında YORUM YAPMA. 

PROJEYE ÖZEL ZORUNLU KURAL SETİ (SADECE BUNLARI KONTROL ET):

1. Tüm veritabanı işlemleri Repository katmanından geçmelidir - doğrudan DatabaseManager çağrılmamalı
2. API endpoint'lerinde mutlaka input validation yapılmalı
3. Hata yönetimi için custom exception sınıfları kullanılmalı
4. Loglama için merkezi logger servisi kullanılmalı
5. Tüm async işlemlerde error handling yapılmalı
6. Security critical kodlarda sanitization zorunludur
7. Config dosyaları .env üzerinden okunmalıdır
8. Tüm external API çağrılarında timeout ve retry mekanizması olmalıdır

KAPSAM VE SINIRLILIKLAR (ÖNEMLİ): 

KONTROL EDEBİLECEKLERİN: Magic number, fonksiyon uzunluğu, isimlendirme, try-catch, gereksiz yorum gibi diff dosyasına bakarak statik olarak analiz edilebilecek kuralları kontrol et. 

KONTROL EDEMEYECEKLERİN: Kod tekrarı ve test coverage gibi kurallar, projenin tamamını veya harici araçların çıktısını gerektirir. Bu diff analizinde bu kuralları kontrol etmeyi DENEME. Bu konularda yorum YAPMA. 

ANALİZ TALİMATLARI (EĞİTİCİ STİLDE): 

diff dosyasını satır satır tara. 

SADECE + ile başlayan satırlarda, yukarıdaki "PROJEYE ÖZEL ZORUNLU KURAL SETİ"nden (ve "Kapsam" dahilinde olanlardan) bir ihlal ara. 

Bir ihlal bulursan, "Eğitici Ekip Arkadaşı" formatında bir yorum oluştur: 

Sorun: Hangi kuralın ihlal edildiğini açıkla. 

Neden (Eğitim): Bu kuralın neden önemli olduğunu (örn: "Magic number'lar kodun okunabilirliğini ve bakımını zorlaştırır...") bir junior geliştiriciye öğretir gibi anlat. 

Öneri: Kodun nasıl düzeltilmesi gerektiğini öner. 

ÇIKTI FORMATI: Bulgularını AŞAĞIDAKİ JSON FORMATINDA bir dizi olarak döndür. Eğer hiçbir sorun veya öneri bulamazsan, boş bir dizi [] döndür. 

[
  {
    "line": <integer: Diff dosyasındaki ilgili satır numarası>,
    "comment": <string: (ANALİZ TALİMATLARI - Madde 3'e uygun olarak) Sorunu, nedeni ve öneriyi içeren öğretici yorum.>,
    "severity": <"Kural İhlali" | "Yüksek" | "Orta" | "Düşük">
  }
]

SADECE kritik hatalara odaklan:
1. Null Pointer / Null Reference riskleri
2. Kaynak sızıntıları
3. Güvenlik açıkları (SQL Injection, XSS, komut enjeksiyonu)
4. 'Off-by-one' döngü hataları
5. Sonsuz döngü riskleri
6. Senkronizasyon/Thread sorunları

Eğer HİÇBİR kritik hata bulamazsan, boş bir dizi [] döndür.
Yorum veya giriş metni ekleme. Sadece JSON çıktısı ver.
`;

/**
 * Bir kod diff'ini analiz ederek kritik, yüksek güvenilirlikli hataları bulur.
 */
export async function findCriticalBugs(diff: string): Promise<CriticalBug[]> {
  console.log("LLM Modülü: Kritik hatalar aranıyor...");
  const results = await callGenerativeModel(CRITICAL_BUG_PROMPT, diff);
  return results as CriticalBug[];
}

// --- 2. UZMAN FONKSİYON: Stil Önerileri (%85 Güven) ---
const STYLE_SUGGESTION_PROMPT = `
SENİN GÖREVİN: Sen, son derece titiz, detaycı ve SADECE KANITA dayalı çalışan bir kod inceleme (code review) asistanısın. Görevin, sana git diff formatında sunulan kod değişikliklerini, aşağıda listelenen "PROJEYE ÖZEL ZORUNLU KURAL SETİ"ne göre analiz etmektir. 

EN ÖNEMLİ PRENSİP (SIFIR HALÜSİNASYON KURALI): 

ASLA KURAL UYDURMA: Yorumların SADECE ve SADECE aşağıda listelenen kurallara dayanmalıdır. Listede olmayan (örn: "performans şöyle daha iyi olurdu" gibi) genel tavsiyelerde BULUNMA. 

ASLA KOD UYDURMA: Yorumların SADECE git diff içerisinde + ile başlayan (eklenen) satırlarla ilgili olabilir. Değişmeyen veya silinen kod hakkında yorum YAPMA. 

KANIT GÖSTER: Yaptığın her yorumun, hangi kuralı ihlal ettiğini ve bu ihlalin diff içinde hangi satırda olduğunu net bir şekilde belirtmesi ZORUNLUDUR. 

BİLMİYORSAN SUS: Eğer bir kuralı (örneğin "Test Coverage") mevcut diff bilgisiyle doğrulayamıyorsan, o kural hakkında YORUM YAPMA. 

PROJEYE ÖZEL ZORUNLU KURAL SETİ (SADECE BUNLARI KONTROL ET):

1. Tüm veritabanı işlemleri Repository katmanından geçmelidir - doğrudan DatabaseManager çağrılmamalı
2. API endpoint'lerinde mutlaka input validation yapılmalı
3. Hata yönetimi için custom exception sınıfları kullanılmalı
4. Loglama için merkezi logger servisi kullanılmalı
5. Tüm async işlemlerde error handling yapılmalı
6. Security critical kodlarda sanitization zorunlu
7. Config dosyaları .env üzerinden okunmalı
8. Tüm external API çağrılarında timeout ve retry mekanizması olmalı

KAPSAM VE SINIRLILIKLAR (ÖNEMLİ): 

KONTROL EDEBİLECEKLERİN: Magic number (Madde 1), Fonksiyon uzunluğu (Madde 3), İsimlendirme (Madde 4), Try-catch (Madde 5), Gereksiz yorum (Madde 7) gibi diff dosyasına bakarak statik olarak analiz edilebilecek kuralları kontrol et. 

KONTROL EDEMEYECEKLERİN: Kod tekrarı (Madde 2) ve Test coverage (Madde 8) gibi kurallar, projenin tamamını veya harici araçların çıktısını gerektirir. Bu diff analizinde bu kuralları kontrol etmeyi DENEME. Bu konularda yorum YAPMA. 

ANALİZ TALİMATLARI (EĞİTİCİ STİLDE): 

diff dosyasını satır satır tara. 

SADECE + ile başlayan satırlarda, yukarıdaki "PROJEYE ÖZEL ZORUNLU KURAL SETİ"nden (ve "Kapsam" dahilinde olanlardan) bir ihlal ara. 

Bir ihlal bulursan, "Eğitici Ekip Arkadaşı" formatında bir yorum oluştur: 

Sorun: Hangi kuralın ihlal edildiğini açıkla. 

Neden (Eğitim): Bu kuralın neden önemli olduğunu (örn: "Magic number'lar kodun okunabilirliğini ve bakımını zorlaştırır...") bir junior geliştiriciye öğretir gibi anlat. 

Öneri: Kodun nasıl düzeltilmesi gerektiğini öner. 

ÇIKTI FORMATI: Bulgularını AŞAĞIDAKİ JSON FORMATINDA bir dizi olarak döndür. Eğer hiçbir sorun veya öneri bulamazsan, boş bir dizi [] döndür. 

[
  {
    "line": <integer: Diff dosyasındaki `+` ile başlayan ihlalin satır numarası>,
    "comment": <string: (ANALİZ TALİMATLARI - Madde 3'e uygun olarak) Sorunu, nedeni ve öneriyi içeren öğretici yorum.>,
    "severity": <"Kural İhlali" | "Yüksek" | "Orta" | "Düşük">
  }
]

Eğer HİÇBİR stil önerisi bulamazsan, boş bir dizi [] döndür.
Yorum veya giriş metni ekleme. Sadece JSON çıktısı ver.
`;

/**
 * Bir kod diff'ini analiz ederek stil, mimari ve en iyi pratik önerileri bulur.
 */
export async function findStyleSuggestions(diff: string): Promise<StyleSuggestion[]> {
  console.log("LLM Modülü: Stil ve mimari önerileri aranıyor...");
  const results = await callGenerativeModel(STYLE_SUGGESTION_PROMPT, diff);
  return results as StyleSuggestion[];
}

// --- Yeni Analiz Formatı Interface'leri ---
export interface AnalysisFinding {
  line: number;
  comment: string;
  severity: "Kural İhlali" | "Yüksek" | "Orta" | "Düşük";
}

// --- Mevcut Akış ile Uyumluluk: Önceden var olan türler ve fonksiyonlar ---
interface CodeQualityIssue {
  file: string;
  lines: string;
  issue: string;
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
  example_fix: string;
}

interface SecurityIssue {
  file: string;
  lines: string;
  issue: string;
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
  example_fix: string;
}

interface PerformanceIssue {
  file: string;
  lines: string;
  issue: string;
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
  example_fix: string;
}

interface TestToAdd {
  file: string;
  test_desc: string;
  example_test_snippet: string;
}

interface CodeReviewResult {
  summary: string;
  code_quality: CodeQualityIssue[];
  security_issues: SecurityIssue[];
  performance_issues: PerformanceIssue[];
  tests_to_add: TestToAdd[];
  confidence: 'low' | 'medium' | 'high';
}

interface PrAnalysisInput {
  owner: string;
  repo: string;
  pr: number;
  files: Array<{
    filename: string;
    patch?: string;
    raw?: string;
  }>;
}

/**
 * PR verisini analiz ederek yapılandırılmış JSON inceleme döndürür.
 */
export async function analyzePrData(prData: PrAnalysisInput): Promise<CodeReviewResult> {
  try {
    const systemPrompt = `You are a meticulous senior code reviewer assistant. When given one or multiple file diffs/contents you must produce a single JSON object describing:\n- summary: short PR summary (3 sentences max)\n- code_quality: [ {file, lines (approx), issue, severity, suggestion, example_fix (code)} ]\n- security_issues: [ {file, lines, issue, severity, suggestion, example_fix} ]\n- performance_issues: [ {file, lines, issue, severity, suggestion, example_fix} ]\n- tests_to_add: [ {file, test_desc, example_test_snippet} ]\n- confidence: "low"/"medium"/"high"\n\nRules:\n- Severity ∈ {low, medium, high}.\n- If uncertain, mark confidence: low and prefix issues with "possible".\n- Do not hallucinate — if you are not sure it's a security bug, label it as "possible security issue" and explain why in issue.\n- Return ONLY JSON, no extra text.`;

    const userPrompt = `Analyze the following PR data (JSON with files array). Files can contain patch or raw content. If file is large, analyze changed hunks in patch. Output JSON as described.\n\n${JSON.stringify(prData, null, 2)}`;

    const chat = model.startChat({ generationConfig: { ...generationConfig, temperature: 0.1 }, safetySettings });
    const result = await chat.sendMessage(`${systemPrompt}\n\n${userPrompt}`);
    const responseText = result.response.text();
    const parsed = tryParseJsonFromText(responseText);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('LLM yanıtı JSON değil');
    }
    return parsed as CodeReviewResult;
  } catch (error) {
    console.error('PR analysis error:', error);
    return {
      summary: 'Analysis failed due to technical error',
      code_quality: [],
      security_issues: [],
      performance_issues: [],
      tests_to_add: [],
      confidence: 'low'
    };
  }
}

/**
 * Tek bir dosya kodu için genel inceleme (Markdown).
 */
export async function analyzeCode(code: string, filename: string): Promise<string> {
  try {
    const system = `You are a senior code reviewer. Analyze the provided code for:\n1. Code quality and best practices\n2. Potential bugs or issues\n3. Security vulnerabilities\n4. Performance improvements\n5. Readability and maintainability\n\nProvide constructive feedback in markdown format.`;

    const user = `Please review the following code from file: ${filename}\n\n\`\`\`\n${code}\n\`\`\`\n\nProvide a comprehensive code review:`;

    const chat = model.startChat({ generationConfig: { ...generationConfig, temperature: 0.3, maxOutputTokens: 2000 }, safetySettings });
    const result = await chat.sendMessage(`${system}\n\n${user}`);
    return result.response.text();
  } catch (error) {
    console.error('LLM analysis error:', error);
    throw new Error(`LLM analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Birden fazla dosya incelemesinden özet çıkarır.
 */
export async function generateSummaryReview(reviews: Array<{ filename: string, review: string | CodeReviewResult }>): Promise<string> {
  try {
    const reviewText = reviews.map(r => {
      if (typeof r.review === 'string') {
        return `File: ${r.filename}\nReview: ${r.review}`;
      } else {
        const jsonReview = r.review as CodeReviewResult;
        return `File: ${r.filename}\nSummary: ${jsonReview.summary}\nCode Quality Issues: ${jsonReview.code_quality.length}\nSecurity Issues: ${jsonReview.security_issues.length}\nPerformance Issues: ${jsonReview.performance_issues.length}\nTests to Add: ${jsonReview.tests_to_add.length}\nConfidence: ${jsonReview.confidence}`;
      }
    }).join('\n\n---\n\n');

    const system = 'You are a senior technical lead. Create a comprehensive summary review from multiple individual code reviews.';
    const user = `Please create a summary review from these individual code reviews:\n\n${reviewText}\n\nProvide a comprehensive summary with key findings and recommendations:`;

    const chat = model.startChat({ generationConfig: { ...generationConfig, temperature: 0.2, maxOutputTokens: 1200 }, safetySettings });
    const result = await chat.sendMessage(`${system}\n\n${user}`);
    return result.response.text();
  } catch (error) {
    console.error('Summary generation error:', error);
    return 'Failed to generate summary review';
  }
}

/**
 * Birden fazla CodeReviewResult nesnesini tek bir derli incelemeye dönüştürür.
 */
export function aggregateCodeReviews(reviews: Array<{ filename: string, review: CodeReviewResult }>): CodeReviewResult {
  const aggregated: CodeReviewResult = {
    summary: '',
    code_quality: [],
    security_issues: [],
    performance_issues: [],
    tests_to_add: [],
    confidence: 'high'
  };

  reviews.forEach(({ review }) => {
    aggregated.code_quality.push(...review.code_quality);
    aggregated.security_issues.push(...review.security_issues);
    aggregated.performance_issues.push(...review.performance_issues);
    aggregated.tests_to_add.push(...review.tests_to_add);

    if (review.confidence === 'low') {
      aggregated.confidence = 'low';
    } else if (review.confidence === 'medium' && aggregated.confidence === 'high') {
      aggregated.confidence = 'medium';
    }
  });

  const totalIssues = aggregated.code_quality.length + aggregated.security_issues.length + aggregated.performance_issues.length;
  const fileCount = reviews.length;

  aggregated.summary = `PR contains ${fileCount} file${fileCount > 1 ? 's' : ''} with ${totalIssues} total issue${totalIssues !== 1 ? 's' : ''} identified. ${aggregated.security_issues.length > 0 ? `${aggregated.security_issues.length} security concern${aggregated.security_issues.length > 1 ? 's' : ''} found.` : 'No security issues detected.'} ${aggregated.tests_to_add.length > 0 ? `${aggregated.tests_to_add.length} test${aggregated.tests_to_add.length > 1 ? 's' : ''} recommended.` : ''}`;

  return aggregated;
}

// --- Yeni Talimatlara Göre PR Analiz Fonksiyonu ---
/**
 * Verilen git diff içeriğini, kullanıcının belirttiği talimatlara göre analiz eder.
 * Hem kritik hataları hem de stil önerilerini tek bir çağrıda döndürür.
 */
export async function analyzePrWithCustomRules(diff: string): Promise<{
  criticalBugs: AnalysisFinding[];
  styleSuggestions: AnalysisFinding[];
}> {
  console.log("LLM Modülü: Özel kurallara göre PR analizi başlatılıyor...");
  
  try {
    // Kritik hataları ve stil önerilerini paralel olarak ara
    const [criticalBugs, styleSuggestions] = await Promise.all([
      findCriticalBugs(diff),
      findStyleSuggestions(diff)
    ]);
    
    return {
      criticalBugs,
      styleSuggestions
    };
  } catch (error) {
    console.error("Özel kurallarla PR analizinde hata:", error);
    return {
      criticalBugs: [],
      styleSuggestions: []
    };
  }
}