// Hidden-input prompt for secrets (no echo). Works only in an interactive terminal.
import readline from "node:readline";

export const isInteractive = () => Boolean(process.stdin.isTTY && process.stdout.isTTY);

export function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (s) => {
        if (s.includes(question)) rl.output.write(s);
        else if (s.includes("\n") || s.includes("\r")) rl.output.write("\n");
        else rl.output.write("*");
      };
    }
    rl.question(question, (a) => { rl.close(); resolve(a.trim()); });
  });
}
