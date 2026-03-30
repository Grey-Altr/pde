import { execSync } from 'child_process';
const cwd = '/Users/greyaltaer/code/projects/Platform Development Engine';
try {
  execSync('git add .gitignore', { cwd, stdio: 'inherit' });
  execSync('git commit -m "chore(186-01): verify coverage baseline and add coverage/ to gitignore\n\n- Confirmed npx vitest run produces zero No test suite found entries (TST-01)\n- Coverage baseline generated in coverage/ with per-module HTML reports (TST-02)\n- node:test files confirmed on disk and runnable via node --test\n- Add coverage/ to .gitignore (generated output, should not be committed)"', { cwd, stdio: 'inherit' });
  console.log('COMMIT_OK');
} catch (e) {
  console.error('COMMIT_FAIL:', e.message);
}
