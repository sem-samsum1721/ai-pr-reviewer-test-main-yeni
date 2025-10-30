import { jest } from '@jest/globals';

// Mock the entire github module
jest.mock('../src/github', () => {
  const mockOctokit = {
    pulls: {
      listFiles: jest.fn(),
    },
    repos: {
      getContent: jest.fn(),
    },
    issues: {
      createComment: jest.fn(),
    },
  };

  return {
    getPrChangedFiles: jest.fn(),
    getFileContent: jest.fn(),
    postPrComment: jest.fn(),
    listRepositoryPullRequests: jest.fn(),
    listAccessibleRepositories: jest.fn(),
    setGitHubAuthToken: jest.fn(),
    octokit: mockOctokit,
    __mockOctokit: mockOctokit,
  };
});

describe('GitHub Module', () => {
  let mockModule: any;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    mockModule = require('../src/github');
  });

  describe('getPrChangedFiles', () => {
    it('should return changed files with correct format', async () => {
      const mockFiles = [
        {
          filename: 'src/utils.ts',
          status: 'modified',
          additions: 10,
          deletions: 5,
          changes: 15,
          raw_url: 'https://raw.githubusercontent.com/testowner/test-repo/abc123/src/utils.ts',
          patch: '@@ -1,3 +1,4 @@\n import { test } from "test";\n+import { newFunction } from "new";\n'
        },
        {
          filename: 'src/new-file.ts',
          status: 'added',
          additions: 25,
          deletions: 0,
          changes: 25,
          raw_url: 'https://raw.githubusercontent.com/testowner/test-repo/abc123/src/new-file.ts',
          patch: '@@ -0,0 +1,25 @@\n+export function newFunction() {\n+  return "hello";\n+}'
        }
      ];

      mockModule.getPrChangedFiles.mockResolvedValue(mockFiles);

      const result = await mockModule.getPrChangedFiles('testowner', 'test-repo', 123);

      expect(mockModule.getPrChangedFiles).toHaveBeenCalledWith('testowner', 'test-repo', 123);
      expect(result).toEqual(mockFiles);
    });

    it('should handle empty PR files', async () => {
      mockModule.getPrChangedFiles.mockResolvedValue([]);

      const result = await mockModule.getPrChangedFiles('testowner', 'test-repo', 456);

      expect(result).toEqual([]);
    });

    it('should handle API errors', async () => {
      mockModule.getPrChangedFiles.mockRejectedValue(new Error('API Error'));

      await expect(mockModule.getPrChangedFiles('testowner', 'test-repo', 789))
        .rejects.toThrow('API Error');
    });
  });

  describe('getFileContent', () => {
    it('should return file content as string', async () => {
      const expectedContent = 'console.log("Hello World");';
      mockModule.getFileContent.mockResolvedValue(expectedContent);

      const result = await mockModule.getFileContent('testowner', 'test-repo', 'main', 'src/test.ts');

      expect(mockModule.getFileContent).toHaveBeenCalledWith('testowner', 'test-repo', 'main', 'src/test.ts');
      expect(result).toBe(expectedContent);
    });

    it('should handle file not found', async () => {
      mockModule.getFileContent.mockRejectedValue(new Error('Not Found'));

      await expect(mockModule.getFileContent('testowner', 'test-repo', 'main', 'nonexistent.ts'))
        .rejects.toThrow('Not Found');
    });
  });

  describe('postPrComment', () => {
    it('should post comment successfully', async () => {
      const mockResponse = {
        id: 12345,
        body: 'Test comment',
        html_url: 'https://github.com/testowner/test-repo/pull/123#issuecomment-12345'
      };

      mockModule.postPrComment.mockResolvedValue(mockResponse);

      const result = await mockModule.postPrComment('testowner', 'test-repo', 123, 'Test comment');

      expect(mockModule.postPrComment).toHaveBeenCalledWith('testowner', 'test-repo', 123, 'Test comment');
      expect(result).toEqual(mockResponse);
    });

    it('should handle comment posting errors', async () => {
      mockModule.postPrComment.mockRejectedValue(new Error('Comment failed'));

      await expect(mockModule.postPrComment('testowner', 'test-repo', 123, 'Test comment'))
        .rejects.toThrow('Comment failed');
    });
  });
});


