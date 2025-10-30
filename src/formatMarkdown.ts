/**
 * Formats LLM analysis result into a structured Markdown PR comment
 * @param resultJson - The CodeReviewResult object from LLM analysis
 * @returns Formatted Markdown string for PR comment
 */
export function formatLlmResultToMarkdown(resultJson: any): string {
  const result = resultJson;
  
  let markdown = `## 🤖 AI Review Summary\n\n`;
  markdown += `${result.summary}\n\n`;
  
  // Key Issues section - sorted by severity
  if (result.code_quality?.length > 0 || result.security_issues?.length > 0 || result.performance_issues?.length > 0) {
    markdown += `## 🔍 Key Issues\n\n`;
    
    // Combine all issues with severity for sorting
    const allIssues: Array<{type: string, issue: any, severity: string}> = [];
    
    result.security_issues?.forEach((issue: any) => {
      allIssues.push({type: 'Security', issue, severity: issue.severity || 'medium'});
    });
    
    result.code_quality?.forEach((issue: any) => {
      allIssues.push({type: 'Code Quality', issue, severity: issue.severity || 'medium'});
    });
    
    result.performance_issues?.forEach((issue: any) => {
      allIssues.push({type: 'Performance', issue, severity: issue.severity || 'medium'});
    });
    
    // Sort by severity: critical > high > medium > low
    const severityOrder = {critical: 0, high: 1, medium: 2, low: 3};
    allIssues.sort((a, b) => {
      const aSev = severityOrder[a.severity.toLowerCase() as keyof typeof severityOrder] ?? 3;
      const bSev = severityOrder[b.severity.toLowerCase() as keyof typeof severityOrder] ?? 3;
      return aSev - bSev;
    });
    
    allIssues.forEach(({type, issue}) => {
      const severityEmoji = getSeverityEmoji(issue.severity);
      const fileInfo = getFileInfo(issue.file, issue.line_start, issue.line_end);
      
      markdown += `### ${severityEmoji} ${type}: ${issue.description}\n`;
      markdown += `**Dosya:** ${fileInfo}\n`;
      if (issue.impact) {
        markdown += `**Etki:** ${issue.impact}\n`;
      }
      markdown += `\n`;
    });
  }
  
  // Suggested Fixes section
  if (result.code_quality?.length > 0 || result.security_issues?.length > 0 || result.performance_issues?.length > 0) {
    markdown += `## 🔧 Suggested Fixes\n\n`;
    
    const allFixableIssues = [
      ...(result.security_issues || []),
      ...(result.code_quality || []),
      ...(result.performance_issues || [])
    ].filter(issue => issue.suggestion);
    
    allFixableIssues.forEach((issue, index) => {
      const fileInfo = getFileInfo(issue.file, issue.line_start, issue.line_end);
      markdown += `### ${index + 1}. ${issue.description}\n`;
      markdown += `**Dosya:** ${fileInfo}\n\n`;
      
      if (issue.suggestion) {
        if (issue.suggestion.length > 200) {
          markdown += `<details>\n<summary>Önerilen Çözüm</summary>\n\n`;
          markdown += `\`\`\`typescript\n${issue.suggestion}\n\`\`\`\n\n`;
          markdown += `</details>\n\n`;
        } else {
          markdown += `**Önerilen Çözüm:**\n`;
          markdown += `\`\`\`typescript\n${issue.suggestion}\n\`\`\`\n\n`;
        }
      }
    });
  }
  
  // Tests to Add section
  if (result.tests_to_add?.length > 0) {
    markdown += `## 🧪 Tests to Add\n\n`;
    
    result.tests_to_add.forEach((test: any, index: number) => {
      const fileInfo = getFileInfo(test.file, test.line_start, test.line_end);
      markdown += `### ${index + 1}. ${test.description}\n`;
      markdown += `**Test Türü:** ${test.type}\n`;
      markdown += `**Dosya:** ${fileInfo}\n`;
      
      if (test.test_case) {
        if (test.test_case.length > 300) {
          markdown += `\n<details>\n<summary>Örnek Test Kodu</summary>\n\n`;
          markdown += `\`\`\`typescript\n${test.test_case}\n\`\`\`\n\n`;
          markdown += `</details>\n\n`;
        } else {
          markdown += `\n**Örnek Test:**\n`;
          markdown += `\`\`\`typescript\n${test.test_case}\n\`\`\`\n\n`;
        }
      } else {
        markdown += `\n`;
      }
    });
  }
  
  // Footer with confidence
  if (result.confidence_level) {
    markdown += `---\n`;
    markdown += `*Güven Seviyesi: ${result.confidence_level}% | AI tarafından oluşturuldu*\n`;
  }
  
  return markdown;
}

/**
 * Helper function to get severity emoji
 */
function getSeverityEmoji(severity: string): string {
  switch (severity?.toLowerCase()) {
    case 'critical': return '🚨';
    case 'high': return '⚠️';
    case 'medium': return '⚡';
    case 'low': return '💡';
    default: return '📝';
  }
}

/**
 * Helper function to format file information with line ranges
 */
function getFileInfo(file: string, lineStart?: number, lineEnd?: number): string {
  if (!file) return 'Bilinmeyen dosya';
  
  if (lineStart && lineEnd && lineStart !== lineEnd) {
    return `\`${file}\` (satır ${lineStart}-${lineEnd})`;
  } else if (lineStart) {
    return `\`${file}\` (yaklaşık satır ${lineStart})`;
  }
  
  return `\`${file}\``;
}

// ../src/formatMarkdown.ts

// analyzePipeline.ts içinde tanımlanan 'Finding' arayüzünü
// burada yeniden tanımlıyoruz (veya paylaşılan bir types dosyasından import ediyoruz).
export interface Finding {
  line: number;
  type: 'CRITICAL_BUG' | 'STYLE_SUGGESTION';
  message: string;
  severity: "Kural İhlali" | "Yüksek" | "Orta" | "Düşük";
  confidence: number;
}

/**
 * Analiz bulgularını (findings) alır ve GitHub yorumu için
 * güzel formatlanmış bir Markdown metnine dönüştürür.
 * Bulguları güven skoruna göre gruplar.
 */
export function formatFindingsToMarkdown(findings: Finding[]): string {
  if (findings.length === 0) {
    return "✅ **Analiz Tamamlandı: Herhangi bir kritik sorun veya öneri bulunamadı!**";
  }

  let markdownReport = "### 🤖 Pull Request Analiz Raporu\n\n";

  // 1. Kritik Hataları Grupla (%90 üzerinde güven)
  const criticalBugs = findings.filter(f => f.confidence > 0.9);
  if (criticalBugs.length > 0) {
    markdownReport += "## 🚨 Kritik Hatalar (%95 Güven)\n";
    markdownReport += "Bu bulgular, kodun çalışmasını engelleyebilecek veya ciddi güvenlik açıkları oluşturabilecek yüksek öncelikli sorunlardır.\n\n";
    
    criticalBugs.forEach(bug => {
      markdownReport += `
**Satır ${bug.line}:**
**${bug.severity}**
\`\`\`
${bug.message}
\`\`\`
`;
    });
    markdownReport += "\n---\n";
  }

  // 2. Stil Önerilerini Grupla (%90 ve altı güven)
  const styleSuggestions = findings.filter(f => f.confidence <= 0.9);
  if (styleSuggestions.length > 0) {
    markdownReport += "## 💡 İyileştirme Önerileri (%70 Güven)\n";
    markdownReport += "Bu bulgular, 'Clean Code' prensipleri, okunabilirlik ve en iyi pratikler ile ilgili önerilerdir. Kodun kalitesini ve sürdürülebilirliğini artırır.\n\n";
    
    styleSuggestions.forEach(suggestion => {
      markdownReport += `
**Satır ${suggestion.line}:**
**${suggestion.severity}**
\`\`\`
${suggestion.message}
\`\`\`
`;
    });
  }

  return markdownReport;
}
