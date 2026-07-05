import { spawn } from 'node:child_process';

const commands = [
  ['npm', ['run', 'server']],
  ['npm', ['run', 'dev']],
];

const children = commands.map(([cmd, args]) => {
  const child = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  child.on('exit', (code) => {
    if (code && code !== 0) process.exitCode = code;
    for (const other of children) if (other !== child && !other.killed) other.kill('SIGTERM');
  });
  return child;
});

process.on('SIGINT', () => {
  for (const child of children) child.kill('SIGINT');
});
