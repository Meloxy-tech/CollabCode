export async function runCode(code, language) {
  const langMap = {
    javascript: 'javascript',
    python: 'python',
    cpp: 'cpp'
  };

  const pistonLang = langMap[language] || 'javascript';

  try {
    const res = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        language: pistonLang,
        version: '*',
        files: [
          {
            content: code
          }
        ]
      })
    });
    
    const data = await res.json();
    return data;
  } catch (err) {
    console.error(err);
    throw new Error('Failed to run code');
  }
}
