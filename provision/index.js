const fs = require('fs');

const inquirer = require('inquirer');
const ora = require('ora');

const {
  createWorkflowConfiguration,
  updateWorkflow,
  fetchTaskQueue,
  createTaskQueue,
  createTaskChannel,
} = require('./helpers/taskrouter');
const { createStudioFlow } = require('./helpers/studio');
const { fetchIncomingPhoneNumbers, updatePhoneNumber } = require('./helpers/numbers');
const { getFlexConfig } = require('./helpers/flex');
const { deployServerless } = require('./helpers/serverless');

let twilioClient;
let spinner;

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
    spinner = ora('Fetching Flex configuration').start();
    const flexConfig = await getFlexConfig(answers.username, answers.password);
    if (flexConfig) {
      flexTaskAssignmentWorkspaceSid = flexConfig.taskrouter_workspace_sid;
    } else {
      throw new Error('Error fetching Flex Config');
    }

    // Step 3 - Create Task Channels
    spinner.start('Creating Task Channels');
    const callbackTaskChannel = await createTaskChannel(twilioClient, flexTaskAssignmentWorkspaceSid, {
      friendlyName: 'callback',
      uniqueName: 'callback',
    });
    const voicemailTaskChannel = await createTaskChannel(twilioClient, flexTaskAssignmentWorkspaceSid, {
      friendlyName: 'voicemail',
      uniqueName: 'voicemail',
    });
    spinner.succeed(`Task Channels created`);

    // Step 4 - Create CallbackandVoicemailQueue
    spinner.start('Creating "CallbackandVoicemailQueue" Task Queue');
    const callbackandVoicemailQueue = await createTaskQueue(twilioClient, flexTaskAssignmentWorkspaceSid, {
      friendlyName: 'CallbackandVoicemailQueue',
      targetWorker: '1==0',
    });
    spinner.succeed('"CallbackandVoicemailQueue" Task Queue created');

    // Step 5 - Update Workflow
    spinner.start('Updating "Assign To Anyone" workflow');
    const everyoneTaskQueue = await fetchTaskQueue(twilioClient, flexTaskAssignmentWorkspaceSid, 'Everyone');
    const assignToAnyoneWorkflow = await updateWorkflow(
      twilioClient,
      flexTaskAssignmentWorkspaceSid,
      'Assign To Anyone',
      {
        configuration: createWorkflowConfiguration(callbackandVoicemailQueue.sid, everyoneTaskQueue.sid),
      },
    );
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
      twilioClient,
      flexTaskAssignmentWorkspaceSid,
      assignToAnyoneWorkflow.sid,
      serverlessInfo.domain,
    );
    const studioFlowWebhook = `https://webhooks.twilio.com/v1/Accounts/${answers.username}/Flows/${studioFlow.sid}`;
    spinner.succeed('Studio Flow created');

    // Associate a number to Studio flow
    spinner.stop();
    const phoneNumbers = await fetchIncomingPhoneNumbers(twilioClient);
    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'phoneNumberSid',
        message: 'Choose a phone number',
        choices: phoneNumbers,
      },
    ]);
    await updatePhoneNumber(twilioClient, answer.phoneNumberSid, {
      voiceUrl: studioFlowWebhook,
      statusCallback: studioFlowWebhook,
      statusCallbackMethod: 'POST',
      voiceMethod: 'POST',
    });

    // Update plugin .env file
    fs.writeFileSync('.env', `REACT_APP_SERVICE_BASE_URL="https://${serverlessInfo.domain}"`);
    spinner.succeed(
      'All done!\n\nYou can now deploy the plugin using:\n $ twilio flex:plugins:deploy --changelog="First version"\n',
    );
  })
  .catch((err) => {
    console.log(err);
    if (spinner) {
      spinner.fail();
    }
  });
