// src/analyzePipeline.ts

import * as github from './github';
import * as llm from './llm';
import * as formatter from './formatMarkdown';
import { sendToWebSocket } from './websocketManager';

// Adım 1'deki (llm.ts) tipleri ve yeni birleşik tipi import edelim
import { CriticalBug, StyleSuggestion, AnalysisFinding } from './llm';

/**
 * Uygulamanın geri kalanında kullanılacak birleşik bulgu (finding) arayüzü.
 * Güven skorunu (confidence) içerir.
 */
export interface Finding {
  line: number;
  type: 'CRITICAL_BUG' | 'STYLE_SUGGESTION';
  message: string;
  severity: "Kural İhlali" | "Yüksek" | "Orta" | "Düşük";
  confidence: number; // %95 veya %70
}

/**
 * Bir PR webhook olayını alır ve analiz sürecini baştan sona yönetir.
 * @param prData GitHub webhook'undan gelen Pull Request olayı
 */
export async function runAnalysisPipeline(prData: any) {
  try {
    // 1. UI'a ilk durumu bildir
    sendToWebSocket({ status: 'ANALYSIS_STARTED', message: 'GitHub\'dan PR verileri alınıyor...' });

    // 2. GitHub'dan 'diff' içeriğini al
    const diffUrl = prData.pull_request?.diff_url;
    if (!diffUrl) {
      throw new Error('PR verisi "diff_url" içermiyor.');
    }
    const diffContent = await github.getDiff(diffUrl);

    if (!diffContent || diffContent.trim() === '') {
      throw new Error('GitHub\'dan diff içeriği alınamadı veya içerik boş.');
    }

    // 3. UI'a analiz aşamasını bildir
    sendToWebSocket({
      status: 'ANALYSIS_RUNNING',
      message: 'LLM analizi başlatıldı (Kritik Hatalar ve Stil Önerileri)...'
    });

    // 4. İKİ LLM UZMANINI AYNI ANDA (PARALEL) ÇAĞIR
    const [bugResults, suggestionResults] = await Promise.all([
      llm.findCriticalBugs(diffContent),
      llm.findStyleSuggestions(diffContent)
    ]);

    sendToWebSocket({ status: 'ANALYSIS_PROCESSING', message: 'Sonuçlar birleştiriliyor...' });

    // 5. Sonuçları işleyin ve GÜVEN SKORLARINI atayın
    const criticalFindings: Finding[] = bugResults.map((bug: AnalysisFinding) => ({
      line: bug.line,
      type: 'CRITICAL_BUG',
      message: bug.comment,
      severity: bug.severity,
      confidence: 0.95 // %95 Güven - Tufano Modülü
    }));

    const styleFindings: Finding[] = suggestionResults.map((suggestion: AnalysisFinding) => ({
      line: suggestion.line,
      type: 'STYLE_SUGGESTION',
      message: suggestion.comment,
      severity: suggestion.severity,
      confidence: 0.70 // %70 Güven - Svyatkovskiy Modülü
    }));

    // 6. Tüm bulguları tek bir listede birleştir
    let allFindings: Finding[] = [...criticalFindings, ...styleFindings];
    allFindings.sort((a, b) => a.line - b.line); // Satır numarasına göre sırala

    // 7. Markdown raporu oluştur (Adım 3'te oluşturulacak)
    const markdownReport = formatter.formatFindingsToMarkdown(allFindings);

    // 8. Nihai raporu ve ham veriyi UI'a gönder
    sendToWebSocket({
      status: 'ANALYSIS_COMPLETE',
      report: markdownReport,
      findings: allFindings // Ham veriyi UI'da zengin bir gösterim için gönder
    });

    console.log("Analiz başarıyla tamamlandı.");

  } catch (error) {
    console.error("Analiz pipeline sırasında bir hata oluştu:", error);
    // Hata durumunda UI'a hata mesajı gönder
    sendToWebSocket({
      status: 'ANALYSIS_FAILED',
      error: (error instanceof Error ? error.message : 'Bilinmeyen bir pipeline hatası oluştu.')
    });
  }
}

/**
 * Mevcut API akışı ile uyumluluk için: owner/repo/prNumber üzerinden manuel analiz.
 * API (src/api.ts) tarafından çağrılır.
 */
export async function analyzePipeline(owner: string, repo: string, prNumber: number): Promise<void> {
  const diffUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}.diff`;
  const prData = { pull_request: { diff_url: diffUrl } };
  await runAnalysisPipeline(prData);
}
