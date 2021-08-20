const fs = require('fs');

const inquirer = require('inquirer');
const fetch = require('node-fetch');
const { TwilioServerlessApiClient } = require('@twilio-labs/serverless-api');
const ora = require('ora');

let twilioClient;

function getFlowDefinition(serverlessDomain, worflowSid, voiceChannelSid) {
  return {
    description: 'Callback and Voicemail flow',
    states: [
      {
        name: 'Trigger',
        type: 'trigger',
        transitions: [
          {
            event: 'incomingMessage',
          },
          {
            next: 'send_to_flex_1',
            event: 'incomingCall',
          },
          {
            event: 'incomingRequest',
          },
        ],
        properties: {
          offset: {
            x: 0,
            y: 0,
          },
        },
      },
      {
        name: 'send_to_flex_1',
        type: 'send-to-flex',
        transitions: [
          {
            event: 'callComplete',
          },
          {
            event: 'failedToEnqueue',
          },
          {
            event: 'callFailure',
          },
        ],
        properties: {
          waitUrl: `https://${serverlessDomain}/queue-menu?mode=main`,
          offset: {
            x: 20,
            y: 370,
          },
          workflow: worflowSid,
          channel: voiceChannelSid,
          attributes: '{ "type": "inbound", "name": "{{trigger.call.From}}", "direction": "inbound" }',
          waitUrlMethod: 'POST',
        },
      },
    ],
    // eslint-disable-next-line camelcase
    initial_state: 'Trigger',
    flags: {
      // eslint-disable-next-line camelcase
      allow_concurrent_calls: true,
    },
  };
}

function createWorkflowConfiguration(callbackandVoicemailQueueSid, everyoneTaskQueue) {
  return `{
    "task_routing": {
      "filters": [
        {
          "filter_friendly_name": "Attempt 1",
          "expression": "(taskType=='callback' OR taskType=='voicemail') AND placeCallRetry==1",
          "targets": [
            {
              "queue": "${callbackandVoicemailQueueSid}",
              "timeout": 10
            },
            {
              "queue": "${everyoneTaskQueue}"
            }
          ]
        },
        {
          "filter_friendly_name": "Attempt 2",
          "expression": "(taskType=='callback' OR taskType=='voicemail') AND placeCallRetry==2",
          "targets": [
            {
              "queue": "${callbackandVoicemailQueueSid}",
              "timeout": 20
            },
            {
              "queue": "${everyoneTaskQueue}"
            }
          ]
        },
        {
          "filter_friendly_name": "Attempt 3",
          "expression": "(taskType=='callback' OR taskType=='voicemail') AND placeCallRetry==3",
          "targets": [
            {
              "queue": "${callbackandVoicemailQueueSid}",
              "timeout": 30
            },
            {
              "queue": "${everyoneTaskQueue}"
            }
          ]
        }
      ],
      "default_filter": {
        "queue": "${everyoneTaskQueue}"
      }
    }
  }`;
}

async function promptForNumber() {
  const incomingNumbers = await twilioClient.incomingPhoneNumbers.list({ limit: 20 });
  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'numbers',
      message: 'Choose a phone number',
      choices: incomingNumbers.map((number) => ({ name: number.phoneNumber, value: number.sid })),
    },
  ]);
  return answer.numbers;
}

async function createStudioFlow(workspaceSid, workflowSid, serverlessDomain) {
  const channelsList = await twilioClient.taskrouter.workspaces(workspaceSid).taskChannels.list();
  const voiceChannel = channelsList.find((channel) => channel.friendlyName === 'Voice');
  if (!voiceChannel) {
    throw new Error('No voice channel found in this workspace');
  }

  const studioDefinition = getFlowDefinition(serverlessDomain, workflowSid, voiceChannel.sid);
  return twilioClient.studio.flows.create({
    friendlyName: 'CallbackVoiceMailFlow',
    status: 'published',
    definition: studioDefinition,
  });
}

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

async function getFlexConfig() {
  try {
    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${twilioClient.username}:${twilioClient.password}`).toString('base64')}`,
      },
    };
    const response = await fetch('https://flex-api.twilio.com/v1/Configuration', options);
    const responseJSON = await response.json();
    if (responseJSON.status >= 400) {
      return Promise.reject(new Error(`${responseJSON.message}. Are you sure this is a Flex Project?`));
    }
    return responseJSON;
  } catch (error) {
    throw Promise.reject(new Error(`Error fetching Flex Configuration.\n${error}`));
  }
}

async function createTaskChannel(workspaceSid, attributes) {
  if (!attributes.uniqueName) {
    throw new Error('Provide an uniqueName for the new channel');
  }
  try {
    callbackTaskChannels = await twilioClient.taskrouter.workspaces(workspaceSid).taskChannels.list();

    const taskChannel = callbackTaskChannels.find((channel) => channel.uniqueName === attributes.uniqueName);
    if (taskChannel) {
      return taskChannel;
    }
    return twilioClient.taskrouter.workspaces(workspaceSid).taskChannels.create(attributes);
  } catch (error) {
    console.log(error);
    throw new Error('Error creating Task Channels');
  }
}

async function createTaskQueue(workspaceSid, attributes) {
  if (!attributes.friendlyName) {
    throw new Error('Please provide friendlyName for the new TaskQueue');
  }
  try {
    const taskQueuesList = await twilioClient.taskrouter
      .workspaces(workspaceSid)
      .taskQueues.list({ friendlyName: attributes.friendlyName });
    if (taskQueuesList.length) {
      return taskQueuesList[0];
    }
    return twilioClient.taskrouter.workspaces(workspaceSid).taskQueues.create(attributes);
  } catch (error) {
    console.log(error);
    throw new Error('Error creating TaskQueue');
  }
}

async function fetchTaskQueue(workspaceSid, friendlyName) {
  const taskQueuesList = await twilioClient.taskrouter.workspaces(workspaceSid).taskQueues.list({ friendlyName });
  if (!taskQueuesList || taskQueuesList.length === 0) {
    throw new Error(`TaskQueue ${friendlyName} not found`);
  }
  return taskQueuesList[0];
}

async function updateWorkflow(workspaceSid, friendlyName, newAttributes) {
  const workflowsList = await twilioClient.taskrouter.workspaces(workspaceSid).workflows.list({ friendlyName });
  if (!workflowsList || workflowsList.length === 0) {
    throw new Error(`Workflow ${friendlyName} not found`);
  }
  return twilioClient.taskrouter.workspaces(workspaceSid).workflows(workflowsList[0].sid).update(newAttributes);
}

inquirer
  .prompt([
    {
      type: 'input',
      name: 'username',
      message: 'Provide your Twilio Account SID',
      validate: this._validateAccountSid,
    },
    {
      type: 'password',
      name: 'password',
      message: 'Provide your Twilio Auth Token',
      validate: (input) => (input.length === 32 ? true : 'Twilio Auth token has to be 32 characters long'),
    },
  ])
  .then(async (answers) => {
    // eslint-disable-next-line global-require
    twilioClient = require('twilio')(answers.username, answers.password);

    // Step 2 - Fetch Flex Config
    const spinner = ora('Fetching Flex configuration').start();
    const flexConfig = await getFlexConfig();
    if (flexConfig) {
      flexTaskAssignmentWorkspaceSid = flexConfig.taskrouter_workspace_sid;
    } else {
      throw new Error('Error fetching Flex Config');
    }

    // Step 3 - Create Task Channels
    spinner.start('Creating Task Channels');
    const callbackTaskChannel = await createTaskChannel(flexTaskAssignmentWorkspaceSid, {
      friendlyName: 'callback',
      uniqueName: 'callback',
    });
    const voicemailTaskChannel = await createTaskChannel(flexTaskAssignmentWorkspaceSid, {
      friendlyName: 'voicemail',
      uniqueName: 'voicemail',
    });
    spinner.succeed(`Task Channels created`);

    // Step 4 - Create CallbackandVoicemailQueue
    spinner.start('Creating "CallbackandVoicemailQueue" Task Queue');
    const callbackandVoicemailQueue = await createTaskQueue(flexTaskAssignmentWorkspaceSid, {
      friendlyName: 'CallbackandVoicemailQueue',
      targetWorker: '1==0',
    });
    spinner.succeed('"CallbackandVoicemailQueue" Task Queue created');

    // Step 5 - Update Workflow
    spinner.start('Updating "Assign To Anyone" workflow');
    const everyoneTaskQueue = await fetchTaskQueue(flexTaskAssignmentWorkspaceSid, 'Everyone');
    const assignToAnyoneWorkflow = await updateWorkflow(flexTaskAssignmentWorkspaceSid, 'Assign To Anyone', {
      configuration: createWorkflowConfiguration(callbackandVoicemailQueue.sid, everyoneTaskQueue.sid),
    });
    spinner.succeed('"Assign To Anyone" workflow updated');

    // Creating Serverless .env
    fs.writeFileSync('./serverless/.env', `TWILIO_WORKSPACE_SID=${flexTaskAssignmentWorkspaceSid}`);

    // Deploy serverless
    spinner.start('Deploying serverless');
    const serverlessInfo = await deployServerless(answers.username, answers.password, {
      TWILIO_WORKSPACE_SID: flexTaskAssignmentWorkspaceSid,
    });
    spinner.succeed(`Serverless deployed to ${serverlessInfo.domain}`);

    // Create Studio flow
    spinner.start('Creating Studio Flow');
    const studioFlow = await createStudioFlow(
      flexTaskAssignmentWorkspaceSid,
      assignToAnyoneWorkflow.sid,
      serverlessInfo.domain,
    );
    const studioFlowWebhook = `https://webhooks.twilio.com/v1/Accounts/${answers.username}/Flows/${studioFlow.sid}`;
    spinner.succeed('Studio Flow created');

    // Associate a number to Studio flow
    spinner.stop();
    const inboundNumberSid = await promptForNumber();
    await twilioClient.incomingPhoneNumbers(inboundNumberSid).update({
      voiceUrl: studioFlowWebhook,
      statusCallback: studioFlowWebhook,
      statusCallbackMethod: 'POST',
      voiceMethod: 'POST',
    });

    // Update plugin .env file
    fs.writeFileSync('.env', `REACT_APP_SERVICE_BASE_URL="https://${serverlessInfo.domain}"`);
    spinner.succeed('All done!\n\nYou can now deploy the plugin using:\n $ twilio flex:plugins:deploy\n');
  })
  .catch((err) => {
    console.log(err);
  });
