// Jest setup file for test environment
import { jest } from '@jest/globals';

// Mock environment variables
process.env.GITHUB_TOKEN = 'test-token';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.GOOGLE_AI_API_KEY = 'test-google-key';

// Global test timeout
jest.setTimeout(10000);