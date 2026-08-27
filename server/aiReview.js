// Handles the free "Code Check" feature.
//
// This deliberately avoids paid APIs. The checker is dependency-free and runs
// on the Render backend, so the deployed app works without secrets or accounts.

export async function getReview(code, language) {
  return heuristicReview(code, language);
}

function heuristicReview(code, language) {
  const issues = [];
  const lines = code.split('\n');
  const normalizedLanguage = String(language || 'javascript').toLowerCase();
  const openers = (code.match(/[({[]/g) || []).length;
  const closers = (code.match(/[)}\]]/g) || []).length;
  const doubleQuotes = (code.match(/"/g) || []).length;
  const singleQuotes = (code.match(/'/g) || []).length;

  if (openers !== closers) {
    issues.push({ line: null, severity: 'error', message: 'Brackets or braces look unbalanced.' });
  }

  if (doubleQuotes % 2 !== 0 || singleQuotes % 2 !== 0) {
    issues.push({ line: null, severity: 'error', message: 'String quotes look unbalanced.' });
  }

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    const lineNo = idx + 1;

    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('# ')) return;

    if (trimmed.length > 100) {
      issues.push({ line: lineNo, severity: 'info', message: 'Line exceeds 100 characters; consider wrapping it.' });
    }

    if (/console\.log/.test(trimmed) && normalizedLanguage === 'javascript') {
      issues.push({ line: lineNo, severity: 'info', message: 'console.log is fine for testing, but remove debug logs before final code.' });
    }

    if (/print\(/.test(trimmed) && normalizedLanguage === 'python') {
      issues.push({ line: lineNo, severity: 'info', message: 'print is okay for output; use logging for larger programs.' });
    }

    if (/\b(TODO|FIXME)\b/i.test(trimmed)) {
      issues.push({ line: lineNo, severity: 'info', message: 'Unresolved TODO/FIXME.' });
    }

    if (normalizedLanguage === 'javascript' && /\bvar\s+/.test(trimmed)) {
      issues.push({ line: lineNo, severity: 'info', message: 'Use let/const instead of var.' });
    }

    if (normalizedLanguage === 'javascript' && /(^|[^=!])==([^=]|$)/.test(trimmed)) {
      issues.push({ line: lineNo, severity: 'warning', message: 'Loose equality detected; prefer === in JavaScript.' });
    }

    if (normalizedLanguage === 'cpp') {
      if (/\bgets\s*\(/.test(trimmed)) {
        issues.push({ line: lineNo, severity: 'error', message: 'gets is unsafe; use fgets or std::getline instead.' });
      }
      if (/\bstrcpy\s*\(/.test(trimmed)) {
        issues.push({ line: lineNo, severity: 'warning', message: 'strcpy can overflow buffers; prefer a bounded copy.' });
      }
      if (/^\s*main\s*\(/.test(line)) {
        issues.push({ line: lineNo, severity: 'error', message: 'main should declare a return type, usually int main().' });
      }
      if (looksLikeCppStatement(trimmed) && !/[;{}:]$/.test(trimmed)) {
        issues.push({ line: lineNo, severity: 'warning', message: 'This statement may be missing a semicolon.' });
      }
    }

    if (normalizedLanguage === 'python') {
      if (/^\s*(if|for|while|def|class|try|except|else|elif|finally)\b/.test(line) && !trimmed.endsWith(':')) {
        issues.push({ line: lineNo, severity: 'error', message: 'Python block statements need a trailing colon.' });
      }
      if (/\beval\s*\(|\bexec\s*\(/.test(trimmed)) {
        issues.push({ line: lineNo, severity: 'warning', message: 'Avoid eval/exec unless you fully control the input.' });
      }
    }
  });

  if (normalizedLanguage === 'cpp' && /\bprintf\s*\(/.test(code) && !/#\s*include\s*<stdio\.h>|#\s*include\s*<cstdio>/.test(code)) {
    issues.push({ line: null, severity: 'warning', message: 'printf needs #include <stdio.h> or #include <cstdio>.' });
  }

  if (normalizedLanguage === 'cpp' && !/\bint\s+main\s*\(/.test(code)) {
    issues.push({ line: null, severity: 'info', message: 'Most C++ programs should include int main().' });
  }

  const visibleIssues = issues.slice(0, 5);

  return {
    summary: `Built-in code check found ${issues.length} potential issue(s). No API key needed.`,
    issues: visibleIssues,
    suggestions: suggestionsFor(normalizedLanguage, visibleIssues.length),
  };
}

function looksLikeCppStatement(trimmed) {
  if (/^(#|if|for|while|switch|else|do|class|struct|namespace)\b/.test(trimmed)) return false;
  return /^(return\b|std::|cout\b|cin\b|printf\b|scanf\b|[A-Za-z_][\w:<>,\s*&]*\s+[A-Za-z_]\w*\s*=)/.test(trimmed);
}

function suggestionsFor(language, issueCount) {
  const shared = issueCount > 0
    ? 'Fix the flagged lines first, then run the check again.'
    : 'Looks good for a small snippet; try a second test case before sharing.';

  const suggestions = {
    javascript: [
      shared,
      'Prefer const for values that do not change.',
      'Keep DOM/network code separate from pure logic where possible.',
    ],
    python: [
      shared,
      'Use clear function names and small functions as the program grows.',
      'Add a few sample inputs to confirm edge cases.',
    ],
    cpp: [
      shared,
      'Compile with warnings enabled, for example g++ -Wall -Wextra.',
      'Prefer std::string and std::vector over manual buffers for safer code.',
    ],
  };

  return suggestions[language] || suggestions.javascript;
}
