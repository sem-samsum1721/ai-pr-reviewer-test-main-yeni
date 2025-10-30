import { runAnalysisPipeline } from '../src/analyzePipeline';

// Sample GitHub PR webhook payload
const samplePrPayload = {
  action: "opened",
  number: 123,
  pull_request: {
    id: 1,
    number: 123,
    state: "open",
    title: "Add new feature for user authentication",
    body: "This PR adds JWT-based authentication system with proper error handling and validation.",
    user: {
      login: "developer123",
      id: 12345,
      avatar_url: "https://github.com/images/error/developer123_happy.gif",
      type: "User"
    },
    head: {
      label: "developer123:feature/auth",
      ref: "feature/auth",
      sha: "abc123def456",
      repo: {
        id: 567890,
        name: "test-repo",
        full_name: "testowner/test-repo",
        owner: {
          login: "testowner",
          id: 98765,
          type: "User"
        },
        private: false,
        html_url: "https://github.com/testowner/test-repo",
        clone_url: "https://github.com/testowner/test-repo.git",
        default_branch: "main"
      }
    },
    base: {
      label: "testowner:main",
      ref: "main",
      sha: "def456abc123",
      repo: {
        id: 567890,
        name: "test-repo",
        full_name: "testowner/test-repo",
        owner: {
          login: "testowner",
          id: 98765,
          type: "User"
        },
        private: false,
        html_url: "https://github.com/testowner/test-repo",
        clone_url: "https://github.com/testowner/test-repo.git",
        default_branch: "main"
      }
    },
    merged: false,
    mergeable: true,
    mergeable_state: "clean",
    comments: 0,
    review_comments: 0,
    commits: 3,
    additions: 150,
    deletions: 25,
    changed_files: 5,
    html_url: "https://github.com/testowner/test-repo/pull/123",
    diff_url: "https://github.com/testowner/test-repo/pull/123.diff",
    patch_url: "https://github.com/testowner/test-repo/pull/123.patch"
  },
  repository: {
    id: 567890,
    name: "test-repo",
    full_name: "testowner/test-repo",
    owner: {
      login: "testowner",
      id: 98765,
      avatar_url: "https://github.com/images/error/testowner_happy.gif",
      type: "User"
    },
    private: false,
    html_url: "https://github.com/testowner/test-repo",
    description: "A test repository for PR review automation",
    clone_url: "https://github.com/testowner/test-repo.git",
    default_branch: "main"
  },
  sender: {
    login: "developer123",
    id: 12345,
    avatar_url: "https://github.com/images/error/developer123_happy.gif",
    type: "User"
  }
};

const isDirect = process.argv.includes('--direct') || process.env.SIMULATE_DIRECT === '1';

async function simulatePr() {
  if (isDirect) {
    console.log('🚀 Running runAnalysisPipeline directly (no HTTP)...');
    await runAnalysisPipeline(samplePrPayload);
    console.log('✅ Direct simulation completed. Check frontend for live updates.');
    return;
  }

  const webhookUrl = 'http://localhost:3000/webhook';
  console.log('🚀 Simulating GitHub PR webhook (HTTP POST)...');
  console.log(`📡 Sending POST request to: ${webhookUrl}`);
  console.log(`📋 Payload: PR #${samplePrPayload.number} from ${samplePrPayload.repository.full_name}`);

  try {
    const { default: fetch } = await import('node-fetch');
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Event': 'pull_request',
        'X-GitHub-Delivery': 'test-delivery-' + Date.now(),
        'User-Agent': 'GitHub-Hookshot/test'
      },
      body: JSON.stringify(samplePrPayload)
    });

    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const responseText = await response.text();
      console.log('✅ Webhook simulation successful!');
      if (responseText) {
        console.log('📄 Response:', responseText);
      }
    } else {
      const errorText = await response.text();
      console.error('❌ Webhook simulation failed!');
      console.error('Error:', errorText);
    }

  } catch (error) {
    console.error('❌ Network error during webhook simulation:');
    console.error(error);
    console.log('\n💡 Make sure your server is running on http://localhost:3000');
    console.log('   Run: npm run dev');
  }
}

// Run the simulation
simulatePr();