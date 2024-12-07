import { execSync } from "child_process";
async function execShellCommand(command: string) {
  return execSync(command, { stdio: "inherit" });
}

async function execDockerCommand(command: string) {
  return execShellCommand(`docker compose -f ./jest/docker-compose.yml ${command}`);
}
module.exports = async function () {
  await execDockerCommand("up -d --quiet-pull");
};
