import { execSync } from "child_process";
import { Client } from "@elastic/elasticsearch";

async function execShellCommand(command: string) {
  return execSync(command, { stdio: "inherit" });
}

async function execDockerCommand(command: string) {
  return execShellCommand(`docker compose -f ./jest/docker-compose.yml ${command}`);
}

async function waitForElasticsearch(url: string, maxRetries = 5, retryInterval = 2000) {
  const client = new Client({ node: url });
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`Waiting for Elasticsearch to be ready... (attempt ${i + 1}/${maxRetries})`);
      const response = await client.ping();
      if (response) {
        console.log("✅ Elasticsearch is ready!");
        return;
      }
    } catch (error) {
      if (i === maxRetries - 1) {
        throw new Error(`Elasticsearch failed to start after ${maxRetries} attempts: ${error}`);
      }
      await new Promise(resolve => setTimeout(resolve, retryInterval));
    }
  }
}

module.exports = async function () {
  console.log("🚀 Starting Elasticsearch container...");
  await execDockerCommand("up -d --quiet-pull");
  
  console.log("⏳ Waiting for Elasticsearch to be ready...");
  await waitForElasticsearch("http://localhost:9203");
  
  console.log("🎉 Test environment is ready!");
};
