const crypto = require('crypto');

const url = process.env.WEBHOOK_URL || 'http://localhost:3000/webhook';
const secret = process.env.WEBHOOK_SECRET || 'dev-secret';

// Configurable test target via env vars
const owner = process.env.TEST_OWNER || 'testowner';
const repo = process.env.TEST_REPO || 'test-repo';
const prNumber = Number(process.env.TEST_PR || 123);

// Minimal pull_request payload resembling GitHub's structure
const payload = {
  action: 'opened',
  pull_request: {
    number: prNumber,
    title: 'Test PR',
    user: { login: 'developer123' },
  },
  repository: {
    name: repo,
    owner: { login: owner },
    full_name: `${owner}/${repo}`,
  },
  sender: { login: 'developer123' },
};

const body = JSON.stringify(payload);
const signature = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');

(async () => {
  try {
    console.log('Local body length:', Buffer.byteLength(body));
    console.log('Local signature:', signature);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': signature,
        'X-GitHub-Event': 'pull_request',
        'X-GitHub-Delivery': Date.now().toString(),
        'Content-Length': Buffer.byteLength(body).toString(),
      },
      body,
    });

    console.log('Webhook response:', res.status);
    const text = await res.text();
    console.log(text);
    process.exit(res.ok ? 0 : 1);
  } catch (err) {
    console.error('Webhook request failed:', err);
    process.exit(1);
  }
})();