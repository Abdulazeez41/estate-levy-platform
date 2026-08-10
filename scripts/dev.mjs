import { spawn } from 'node:child_process';

const commands = [
  { cwd: 'frontend', args: ['run', 'dev'] },
  { cwd: 'backend', args: ['run', 'dev'] },
];

const children = commands.map(({ cwd, args }) => {
  const child = spawn('npm', args, {
    cwd,
    stdio: 'inherit',
    shell: true,
  });

  child.on('exit', (code) => {
    if (code && code !== 0) {
      for (const other of children) {
        if (other !== child && !other.killed) other.kill();
      }
      process.exitCode = code;
    }
  });

  return child;
});

const shutdown = () => {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
