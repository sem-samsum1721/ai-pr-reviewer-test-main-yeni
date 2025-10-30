import { formatLlmResultToMarkdown } from '../src/formatMarkdown';

describe('Format Module', () => {
  describe('formatLlmResultToMarkdown', () => {
    const mockCodeReviewResult = {
      summary: "Bu PR'da 2 güvenlik sorunu ve 1 kod kalitesi problemi tespit edildi. Genel olarak iyi yapılandırılmış.",
      code_quality: [
        {
          description: "Unused import statements",
          severity: "low",
          file: "src/utils.ts",
          line_start: 1,
          line_end: 3,
          suggestion: "import { onlyUsedFunction } from 'library';"
        }
      ],
      security_issues: [
        {
          description: "SQL Injection vulnerability",
          severity: "critical",
          file: "src/database.ts",
          line_start: 45,
          line_end: 50,
          impact: "Veritabanı güvenliği risk altında",
          suggestion: "const query = 'SELECT * FROM users WHERE id = ?';\ndb.query(query, [userId]);"
        }
      ],
      performance_issues: [
        {
          description: "Inefficient loop operation",
          severity: "medium",
          file: "src/processor.ts",
          line_start: 120,
          line_end: 125,
          suggestion: "Use Array.map() instead of forEach for better performance"
        }
      ],
      tests_to_add: [
        {
          description: "Add unit tests for authentication flow",
          type: "unit",
          file: "src/auth.ts",
          line_start: 10,
          line_end: 50,
          test_case: "describe('Authentication', () => {\n  it('should validate user credentials', () => {\n    expect(auth.validate('user', 'pass')).toBe(true);\n  });\n});"
        }
      ],
      confidence_level: 85
    };

    it('should include AI Review Summary section', () => {
      const result = formatLlmResultToMarkdown(mockCodeReviewResult);
      
      expect(result).toContain('## 🤖 AI Review Summary');
      expect(result).toContain(mockCodeReviewResult.summary);
    });

    it('should include Key Issues section with severity sorting', () => {
      const result = formatLlmResultToMarkdown(mockCodeReviewResult);
      
      expect(result).toContain('## 🔍 Key Issues');
      expect(result).toContain('### 🚨 Security: SQL Injection vulnerability');
      expect(result).toContain('### ⚡ Performance: Inefficient loop operation');
      expect(result).toContain('### 💡 Code Quality: Unused import statements');
    });

    it('should display file information with line ranges', () => {
      const result = formatLlmResultToMarkdown(mockCodeReviewResult);
      
      expect(result).toContain('**Dosya:** `src/database.ts` (satır 45-50)');
      expect(result).toContain('**Dosya:** `src/utils.ts` (satır 1-3)');
      expect(result).toContain('**Dosya:** `src/processor.ts` (satır 120-125)');
    });

    it('should include Suggested Fixes section with code blocks', () => {
      const result = formatLlmResultToMarkdown(mockCodeReviewResult);
      
      expect(result).toContain('## 🔧 Suggested Fixes');
      expect(result).toContain('**Önerilen Çözüm:**');
      expect(result).toContain('```typescript');
      expect(result).toContain("const query = 'SELECT * FROM users WHERE id = ?';");
    });

    it('should include Tests to Add section', () => {
      const result = formatLlmResultToMarkdown(mockCodeReviewResult);
      
      expect(result).toContain('## 🧪 Tests to Add');
      expect(result).toContain('Add unit tests for authentication flow');
      expect(result).toContain('**Test Türü:** unit');
      expect(result).toContain('**Örnek Test:**');
    });

    it('should include confidence level in footer', () => {
      const result = formatLlmResultToMarkdown(mockCodeReviewResult);
      
      expect(result).toContain('*Güven Seviyesi: 85% | AI tarafından oluşturuldu*');
    });

    it('should use collapsible details for long code suggestions', () => {
      const longSuggestionResult = {
        ...mockCodeReviewResult,
        security_issues: [
          {
            description: "Long code suggestion test",
            severity: "high",
            file: "src/test.ts",
            line_start: 1,
            line_end: 10,
            suggestion: "a".repeat(250) // Long suggestion > 200 chars
          }
        ]
      };

      const result = formatLlmResultToMarkdown(longSuggestionResult);
      
      expect(result).toContain('<details>');
      expect(result).toContain('<summary>Önerilen Çözüm</summary>');
      expect(result).toContain('</details>');
    });

    it('should use collapsible details for long test cases', () => {
      const longTestResult = {
        ...mockCodeReviewResult,
        tests_to_add: [
          {
            description: "Long test case",
            type: "integration",
            file: "src/test.ts",
            line_start: 1,
            line_end: 20,
            test_case: "a".repeat(350) // Long test case > 300 chars
          }
        ]
      };

      const result = formatLlmResultToMarkdown(longTestResult);
      
      expect(result).toContain('<details>');
      expect(result).toContain('<summary>Örnek Test Kodu</summary>');
      expect(result).toContain('</details>');
    });

    it('should handle empty result gracefully', () => {
      const emptyResult = {
        summary: "Herhangi bir sorun bulunamadı.",
        code_quality: [],
        security_issues: [],
        performance_issues: [],
        tests_to_add: [],
        confidence_level: 95
      };

      const result = formatLlmResultToMarkdown(emptyResult);
      
      expect(result).toContain('## 🤖 AI Review Summary');
      expect(result).toContain('Herhangi bir sorun bulunamadı.');
      expect(result).toContain('*Güven Seviyesi: 95% | AI tarafından oluşturuldu*');
      expect(result).not.toContain('## 🔍 Key Issues');
      expect(result).not.toContain('## 🔧 Suggested Fixes');
      expect(result).not.toContain('## 🧪 Tests to Add');
    });

    it('should handle missing file information', () => {
      const noFileResult = {
        summary: "Test summary",
        code_quality: [
          {
            description: "Issue without file info",
            severity: "medium"
          }
        ],
        security_issues: [],
        performance_issues: [],
        tests_to_add: [],
        confidence_level: 80
      };

      const result = formatLlmResultToMarkdown(noFileResult);
      
      expect(result).toContain('**Dosya:** Bilinmeyen dosya');
    });

    it('should sort issues by severity correctly', () => {
      const mixedSeverityResult = {
        summary: "Mixed severity test",
        code_quality: [
          { description: "Low issue", severity: "low", file: "test1.ts" },
          { description: "Critical issue", severity: "critical", file: "test2.ts" },
          { description: "Medium issue", severity: "medium", file: "test3.ts" },
          { description: "High issue", severity: "high", file: "test4.ts" }
        ],
        security_issues: [],
        performance_issues: [],
        tests_to_add: [],
        confidence_level: 90
      };

      const result = formatLlmResultToMarkdown(mixedSeverityResult);
      
      // Check that critical appears before high, high before medium, medium before low
      const criticalIndex = result.indexOf('🚨');
      const highIndex = result.indexOf('⚠️');
      const mediumIndex = result.indexOf('⚡');
      const lowIndex = result.indexOf('💡');
      
      expect(criticalIndex).toBeLessThan(highIndex);
      expect(highIndex).toBeLessThan(mediumIndex);
      expect(mediumIndex).toBeLessThan(lowIndex);
    });
  });
});