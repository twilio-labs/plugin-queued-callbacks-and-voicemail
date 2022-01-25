const fs = require('fs');

const { TwilioServerlessApiClient } = require('@twilio-labs/serverless-api');

async function deployServerless(username, password, env) {
  const serverlessClient = new TwilioServerlessApiClient({
    username,
    password,
  });

  const pkgJson = JSON.parse(fs.readFileSync('./serverless/package.json'));
  return serverlessClient.deployLocalProject({
    username,
    password,
    cwd: `${process.cwd()}/serverless`,
    env,
    serviceName: pkgJson.name,
    pkgJson,
    functionsEnv: 'dev',
    functionsFolderName: 'functions',
    assetsFolderName: 'assets',
    overrideExistingService: true,
    overrideExistingProject: true,
  });
}

module.exports = { deployServerless };
