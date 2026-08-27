import { exec } from 'child_process';
import { writeFile, rm } from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import util from 'util';

const execPromise = util.promisify(exec);

export async function runCode(code, language) {
  const langMap = {
    javascript: 'javascript',
    python: 'python',
    cpp: 'cpp'
  };

  const execLang = langMap[language] || 'javascript';
  const id = crypto.randomUUID();
  const tmpDir = os.tmpdir();
  
  let result = { output: '', stderr: '' };

  try {
    if (execLang === 'javascript') {
      const filePath = path.join(tmpDir, `${id}.js`);
      await writeFile(filePath, code);
      try {
        const { stdout, stderr } = await execPromise(`node ${filePath}`, { timeout: 5000 });
        result.output = stdout;
        result.stderr = stderr;
      } catch (e) {
        result.output = e.stdout || '';
        result.stderr = e.stderr || e.message;
      }
      await rm(filePath).catch(() => {});
    } 
    else if (execLang === 'python') {
      const filePath = path.join(tmpDir, `${id}.py`);
      await writeFile(filePath, code);
      try {
        const { stdout, stderr } = await execPromise(`python3 ${filePath}`, { timeout: 5000 });
        result.output = stdout;
        result.stderr = stderr;
      } catch (e) {
        result.output = e.stdout || '';
        result.stderr = e.stderr || e.message;
      }
      await rm(filePath).catch(() => {});
    }
    else if (execLang === 'cpp') {
      const srcPath = path.join(tmpDir, `${id}.cpp`);
      const outPath = path.join(tmpDir, `${id}.out`);
      await writeFile(srcPath, code);
      try {
        // Compile
        await execPromise(`g++ ${srcPath} -o ${outPath}`, { timeout: 5000 });
        // Run
        const { stdout, stderr } = await execPromise(`${outPath}`, { timeout: 5000 });
        result.output = stdout;
        result.stderr = stderr;
      } catch (e) {
        result.output = e.stdout || '';
        result.stderr = e.stderr || e.message;
      }
      await rm(srcPath).catch(() => {});
      await rm(outPath).catch(() => {});
    }

    // Format like piston to match UI expectations
    return {
      run: {
        output: result.stderr ? `${result.output}\n${result.stderr}`.trim() : result.output.trim(),
        stderr: result.stderr
      }
    };
  } catch (err) {
    console.error(err);
    throw new Error('Failed to run code');
  }
}
