import Anthropic from '@anthropic-ai/sdk';

// ─────────────────────────────────────────────────────────
// AI Failure Analyzer
//
// When a test fails, this utility sends failure context
// to Claude and gets back a structured analysis:
//   - Category: what type of failure occurred
//   - Severity: how bad is it
//   - Likely cause: why it probably happened
//   - Suggested action: where to look first
//
// This is the "rules engine / failure categorization" that
// Stuart described — implemented with AI rather than
// hardcoded rules, so it handles failure patterns that
// weren't anticipated when the framework was written.
//
// A rule-based fallback runs automatically when the
// ANTHROPIC_API_KEY is not configured.
// ─────────────────────────────────────────────────────────

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function analyzeFailure(error, context = {}) {
  if (!process.env.ANTHROPIC_API_KEY ||
      process.env.ANTHROPIC_API_KEY === 'your_key_here') {
    return buildFallbackAnalysis(error, context.testName);
  }

  const {
    testName    = 'Unknown test',
    pageUrl     = 'Unknown URL',
    pageContent = '',
  } = context;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [
        {
          role: 'user',
          content: `You are a QA automation expert analyzing a Playwright test failure.

Test name: ${testName}
Page URL at failure: ${pageUrl}
Error message: ${error.message || String(error)}
Error type: ${error.constructor?.name || 'Error'}
Page content snippet (first 2000 chars): ${pageContent.substring(0, 2000)}

Classify this failure into one of these categories:
Auth Failure, Navigation Failure, Element Not Found, Timeout, Data Assertion, Network Error, Application Error, Test Data Issue, Unknown

Respond ONLY with a JSON object in this exact format, no other text:
{
  "category": "one of the categories above",
  "severity": "Blocker | High | Medium | Low",
  "likelyCause": "one sentence — what probably caused this",
  "suggestedAction": "one sentence — the first thing to check or do",
  "confidence": "High | Medium | Low"
}

Be specific and actionable. If the error mentions a timeout, say what element timed out.
If it is a selector issue, say what the selector was trying to find.`,
        },
      ],
    });

    const text   = message.content[0].text;
    const clean  = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);

    return formatAnalysis(result, testName);

  } catch (apiError) {
    return buildFallbackAnalysis(error, testName);
  }
}

function formatAnalysis(result, testName) {
  const line = '─'.repeat(60);
  return [
    `\n${line}`,
    `  AI FAILURE ANALYSIS`,
    `${line}`,
    `  Test:      ${testName}`,
    `  Category:  ${result.category}`,
    `  Severity:  ${result.severity}`,
    `  Confidence:${result.confidence}`,
    `${line}`,
    `  Cause:     ${result.likelyCause}`,
    `  Action:    ${result.suggestedAction}`,
    `${line}\n`,
  ].join('\n');
}

// Rule-based fallback — runs when AI is unavailable
// Covers the most common Playwright failure patterns
function buildFallbackAnalysis(error, testName = 'Unknown') {
  const msg = (error?.message || '').toLowerCase();

  let category = 'Unknown';
  let severity  = 'Medium';
  let cause     = 'Could not determine cause automatically';
  let action    = 'Review the full error message and screenshot';

  if (msg.includes('timeout')) {
    category = 'Timeout';
    severity  = 'High';
    cause     = 'Element or page did not become ready within the allowed time';
    action    = 'Check for slow API responses, loading spinners, or incorrect selectors';
  } else if (msg.includes('navigation') || msg.includes('net::')) {
    category = 'Navigation Failure';
    severity  = 'Blocker';
    cause     = 'Page failed to load or URL was unreachable';
    action    = 'Verify BASE_URL in .env and check network connectivity';
  } else if (msg.includes('strict mode') || msg.includes('not found') || msg.includes('no element')) {
    category = 'Element Not Found';
    severity  = 'High';
    cause     = 'Selector did not match any element — or matched too many';
    action    = 'Inspect the DOM — element may have moved, changed, or not loaded yet';
  } else if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('login')) {
    category = 'Auth Failure';
    severity  = 'Blocker';
    cause     = 'Authentication failed or session expired';
    action    = 'Check OHR_USERNAME and OHR_PASSWORD in .env';
  } else if (msg.includes('expect') || msg.includes('received')) {
    category = 'Data Assertion';
    severity  = 'Medium';
    cause     = 'A value did not match the expected result';
    action    = 'Compare expected vs received values in the error output';
  }

  const line = '─'.repeat(60);
  return [
    `\n${line}`,
    `  FAILURE ANALYSIS (rule-based fallback)`,
    `${line}`,
    `  Test:      ${testName}`,
    `  Category:  ${category}`,
    `  Severity:  ${severity}`,
    `${line}`,
    `  Cause:     ${cause}`,
    `  Action:    ${action}`,
    `${line}\n`,
  ].join('\n');
}