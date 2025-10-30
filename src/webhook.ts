import express, { Request, Response } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { runAnalysisPipeline } from './analyzePipeline';
import { emitWebhookEvent, syncPullRequests } from './api';

export const webhookRouter = express.Router();

/**
 * Verify GitHub webhook signature using timing-safe comparison
 */
function verifySignature(payload: string, signature: string, secret: string): boolean {
  if (!signature || !signature.startsWith('sha256=')) {
    console.log('❌ Invalid signature format');
    return false;
  }

  const hmac = createHmac('sha256', secret);
  hmac.update(payload, 'utf8');
  const expectedSignature = `sha256=${hmac.digest('hex')}`;

  try {
    const sigBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    
    if (sigBuffer.length !== expectedBuffer.length) {
      console.log('❌ Signature length mismatch');
      return false;
    }

    const isValid = timingSafeEqual(sigBuffer, expectedBuffer);
    console.log(`🔐 Signature verification: ${isValid ? 'VALID' : 'INVALID'}`);
    return isValid;
  } catch (error) {
    console.log('❌ Signature verification error:', error);
    return false;
  }
}

/**
 * Log webhook event details
 */
function logWebhookEvent(req: Request): void {
  const { action, pull_request, repository, sender } = req.body;
  
  console.log('\n🎯 === WEBHOOK EVENT RECEIVED ===');
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log(`🔗 Event: ${req.headers['x-github-event'] || 'unknown'}`);
  console.log(`⚡ Action: ${action || 'N/A'}`);
  
  if (repository) {
    console.log(`📁 Repository: ${repository.full_name}`);
  }
  
  if (pull_request) {
    console.log(`🔢 PR Number: #${pull_request.number}`);
    console.log(`📝 PR Title: ${pull_request.title}`);
    console.log(`👤 PR Author: ${pull_request.user?.login || 'unknown'}`);
    console.log(`🌿 Base Branch: ${pull_request.base?.ref || 'unknown'}`);
    console.log(`🌿 Head Branch: ${pull_request.head?.ref || 'unknown'}`);
  }
  
  if (sender) {
    console.log(`👤 Triggered by: ${sender.login}`);
  }
  
  console.log('================================\n');
}

// Middleware to capture raw body for signature verification
webhookRouter.use('/', express.raw({ type: 'application/json' }));

// Webhook endpoint for GitHub PR events
webhookRouter.post('/', async (req: Request, res: Response) => {
  try {
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.warn('WEBHOOK_SECRET ayarlanmadı. Webhook doğrulama devre dışı.');
    }

    // Get raw payload and signature
    const payload = req.body.toString('utf8');
    const signature = req.headers['x-hub-signature-256'] as string;
    
    console.log(`📨 Received webhook payload (${payload.length} bytes)`);
    console.log(`🔐 Signature: ${signature || 'MISSING'}`);

    // Verify signature only if secret is configured
    if (webhookSecret) {
      if (!verifySignature(payload, signature, webhookSecret)) {
        console.log('❌ Webhook signature verification failed');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    // Parse JSON payload
    let parsedBody;
    try {
      parsedBody = JSON.parse(payload);
    } catch (error) {
      console.log('❌ Invalid JSON payload');
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }

    // Assign parsed body to req.body for logging
    req.body = parsedBody;
    
    // Log event details
    logWebhookEvent(req);

    const { action, pull_request, repository } = parsedBody;

    // Emit event to frontend (Recent Activity)
    const repoFullName = parsedBody?.repository?.full_name || `${parsedBody?.repository?.owner?.login}/${parsedBody?.repository?.name}`;
    emitWebhookEvent({
      id: `${Date.now()}`,
      type: 'webhook_received',
      timestamp: new Date().toISOString(),
      repository: repoFullName,
      message: `Webhook: ${req.headers['x-github-event']} / action: ${parsedBody?.action}`,
      data: {
        event: req.headers['x-github-event'],
        action: parsedBody?.action,
        pr: parsedBody?.pull_request?.number,
        sender: parsedBody?.sender?.login,
      },
    });

    const eventType = String(req.headers['x-github-event'] || '').toLowerCase();
    if (eventType === 'pull_request') {
      syncPullRequests({ force: true }).catch((error) => {
        console.warn('Failed to refresh PR cache after webhook:', error);
      });
    }

    // Only process when PR is opened or synchronized
    if (action === 'opened' || action === 'synchronize') {
      const { number: prNumber } = pull_request;
      const { name: repo, owner: { login: owner } } = repository;

      console.log(`🚀 Starting analysis for PR #${prNumber} in ${owner}/${repo}`);

      // Emit PR started event
      emitWebhookEvent({
        id: `${Date.now()}`,
        type: 'pr_review_started',
        timestamp: new Date().toISOString(),
        repository: `${owner}/${repo}`,
        message: `PR #${prNumber} için analiz başlatıldı`,
        data: { pr: prNumber },
      });

      // Process PR asynchronously via runAnalysisPipeline (do NOT await)
      runAnalysisPipeline(parsedBody).catch(error => {
        console.error('❌ Error in analysis pipeline:', error);
        emitWebhookEvent({
          id: `${Date.now()}`,
          type: 'pr_review_error',
          timestamp: new Date().toISOString(),
          repository: `${owner}/${repo}`,
          message: `PR #${prNumber} analiz hatası: ${error instanceof Error ? error.message : 'Unknown error'}`,
          data: { pr: prNumber },
        });
      });

      return res.status(202).json({ 
        message: 'PR review started', 
        pr: prNumber,
        repo: `${owner}/${repo}`,
        action: action
      });
    }

    console.log(`ℹ️  Event received but not processed (action: ${action})`);
    res.status(200).json({ 
      message: 'Event received, no action taken',
      action: action,
      event: req.headers['x-github-event']
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
