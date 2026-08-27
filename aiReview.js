// Handles the "AI Review" feature.
//
// If ANTHROPIC_API_KEY is set in server/.env, code is sent to Claude for a
// real review. Otherwise we fall back to a fast, dependency-free heuristic
// reviewer so the whole app still works out of the box with zero setup.

const SYSTEM_PROMPT = `You are a concise senior code reviewer embedded in a collaborative code editor.
Given a code snippet, respond with ONLY a valid JSON object (no markdown fences, no extra prose) shaped like:
{
  "summary": "<one sentence overview of code quality>",
  "issues": [{"line": <number or null>, "severity": "info" | "warning" | "error", "message": "<short issue description>"}],
  "suggestions": ["<short, actionable improvement>", "..."]
}
Return at most 5 issues and 3 suggestions. Be specific and reference line numbers where possible.`;

export async function getReview(code, language) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return heuristicReview(code, language);
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 700,
        system: SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: `Language: ${language}\n\nCode:\n${code}` },
        ],
      }),
    });

    if (!response.ok) {
      console.warn(`AI review API responded with ${response.status}, falling back to heuristic review`);
      return heuristicReview(code, language);
    }

    const data = await response.json();
    const text = (data.content || []).map((block) => block.text || '').join('');
    return JSON.parse(text);
  } catch (err) {
    console.warn('AI review call failed, falling back to heuristic review:', err.message);
    return heuristicReview(code, language);
  }
}

function heuristicReview(code, language) {
  const issues = [];
  const lines = code.split('\n');

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    const lineNo = idx + 1;

    if (trimmed.length > 100) {
      issues.push({ line: lineNo, severity: 'info', message: 'Line exceeds 100 characters — consider wrapping.' });
    }
    if (/console\.log/.test(trimmed) && language !== 'python') {
      issues.push({ line: lineNo, severity: 'warning', message: 'Leftover console.log — remove before committing.' });
    }
    if (/print\(/.test(trimmed) && language === 'python') {
      issues.push({ line: lineNo, severity: 'warning', message: 'Leftover print statement — remove before committing.' });
    }
    if (/\b(TODO|FIXME)\b/i.test(trimmed)) {
      issues.push({ line: lineNo, severity: 'info', message: 'Unresolved TODO/FIXME.' });
    }
    if (/\bvar\s+/.test(trimmed)) {
      issues.push({ line: lineNo, severity: 'info', message: 'Use let/const instead of var.' });
    }
    if (/==[^=]/.test(trimmed) && language !== 'python') {
      issues.push({ line: lineNo, severity: 'warning', message: 'Loose equality (==) — prefer strict equality (===).' });
    }
  });

  return {
    summary: `Static heuristic review (no ANTHROPIC_API_KEY configured) — found ${issues.length} potential issue(s).`,
    issues: issues.slice(0, 5),
    suggestions: [
      'Add ANTHROPIC_API_KEY to server/.env to enable full AI-powered reviews.',
      'Consider adding unit tests around the core logic.',
      'Break long functions into smaller, single-purpose units.',
    ],
  };
}
