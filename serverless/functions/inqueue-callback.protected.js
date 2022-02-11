/*
 *Synopsis:  This function provide complete handling of Flex In-Queue Callback capabilities to include:
 *    1. Immediate call-back request to originating ANI ( Press 1), and
 *    2. Request a callback to separate number
 *
 *Callback task are created and linked to the originating call (Flex Insights reporting). The flex plugin provides
 *a UI for management of the callback request including a re-queueing capability.capability
 *
 *name: util_InQueueCallBackMenu
 *path: /inqueue-callback
 *private: CHECKED
 *
 *Function Methods (mode)
 * - main             => main entry point for callback flow
 * - mainProcess      => process main menu DTMF selection
 * - newNumber        => menu initiating new number capture
 * - submitCallback   => initiate callback creation ( getTask, cancelTask, createCallback)
 *
 *Customization:
 * - Set TTS voice option
 * - Set initial priority of callback task (default: 50)
 * - Set timezone configuration ( server_tz )
 *
 *Install/Config: See documentation
 *
 *Last Updated: 07/05/2021
 */

const helpersPath = Runtime.getFunctions().helpers.path;
const { getTask, handleError, getTime, cancelTask, urlBuilder } = require(helpersPath);
const optionsPath = Runtime.getFunctions().options.path;
const options = require(optionsPath);

// Create the callback task
async function createCallbackTask(client, phoneNumber, taskInfo, ringback) {
  const time = getTime(options.TimeZone);
  const taskAttributes = JSON.parse(taskInfo.data.attributes);

  const newTaskAttributes = {
    taskType: 'callback',
    ringback,
    to: phoneNumber || taskAttributes.caller,
    direction: 'inbound',
    name: `Callback: ${phoneNumber || taskAttributes.caller}`,
    from: taskAttributes.called,
    callTime: time,
    queueTargetName: taskInfo.taskQueueName,
    queueTargetSid: taskInfo.taskQueueSid,
    workflowTargetSid: taskInfo.workflowSid,
    // eslint-disable-next-line camelcase
    ui_plugin: { cbCallButtonAccessibility: false },
    placeCallRetry: 1,
        conversations: {
      conversation_id: taskInfo.taskSid
  },
  };
  try {
    await client.taskrouter.workspaces(taskInfo.workspaceSid).tasks.create({
      attributes: JSON.stringify(newTaskAttributes),
      type: 'callback',
      taskChannel: 'callback',
      priority: options.CallbackTaskPriority,
      workflowSid: taskInfo.workflowSid,
    });
  } catch (error) {
    console.log('createCallBackTask error');
    handleError(error);
  }
}

function formatPhoneNumber(phoneNumber) {
  if (phoneNumber.startsWith('+')) {
    phoneNumber = phoneNumber.slice(1);
  }
  return phoneNumber.split('').join('...');
}

// eslint-disable-next-line sonarjs/cognitive-complexity
exports.handler = async function (context, event, callback) {
  const client = context.getTwilioClient();
  const twiml = new Twilio.twiml.VoiceResponse();

  const domain = `https://${context.DOMAIN_NAME}`;

  // Load options
  const { sayOptions, CallbackAlertTone } = options;

  const { mode } = event;
  const PhoneNumberFrom = event.From;
  const { CallSid } = event;
  const CallbackNumber = event.cbphone;
  const { taskSid } = event;
  let message = '';
  let queries;

  // main logic for callback methods
  switch (mode) {
    //  present main menu options
    case 'main':
      // main menu
      message = `You have requested a callback at ${formatPhoneNumber(PhoneNumberFrom)}...`;
      message += 'If this is correct, press 1...';
      message += 'Press 2 to be called at different number';

      queries = {
        mode: 'mainProcess',
        CallSid,
        cbphone: encodeURI(PhoneNumberFrom),
      };
      if (taskSid) {
        queries.taskSid = taskSid;
      }
      const gatherConfirmation = twiml.gather({
        input: 'dtmf',
        timeout: '2',
        action: urlBuilder(`${domain}/inqueue-callback`, queries),
      });
      gatherConfirmation.say(sayOptions, message);
      twiml.redirect(`${domain}/queue-menu?mode=main${taskSid ? `&taskSid=${taskSid}` : ''}`);
      return callback(null, twiml);
      break;

    //  process main menu selections
    case 'mainProcess':
      switch (event.Digits) {
        //  existing number
        case '1':
          // redirect to submitCalBack
          queries = {
            mode: 'submitCallback',
            CallSid,
            cbphone: encodeURI(CallbackNumber),
          };
          if (taskSid) {
            queries.taskSid = taskSid;
          }
          twiml.redirect(urlBuilder(`${domain}/inqueue-callback`, queries));
          return callback(null, twiml);
          break;
        //  new number
        case '2':
          message = 'Using your keypad, enter in your phone number...';
          message += 'Press the pound sign when you are done...';

          queries = {
            mode: 'newNumber',
            CallSid,
            cbphone: encodeURI(CallbackNumber),
          };
          if (taskSid) {
            queries.taskSid = taskSid;
          }
          const GatherNewNumber = twiml.gather({
            input: 'dtmf',
            timeout: '10',
            finishOnKey: '#',
            action: urlBuilder(`${domain}/inqueue-callback`, queries),
          });
          GatherNewNumber.say(sayOptions, message);

          queries.mode = 'main';
          twiml.redirect(urlBuilder(`${domain}/inqueue-callback`, queries));
          return callback(null, twiml);
          break;
        case '*':
          queries = {
            mode: 'main',
            skipGreeting: true,
            CallSid,
          };
          if (taskSid) {
            queries.taskSid = taskSid;
          }
          twiml.redirect(urlBuilder(`${domain}/inqueue-callback`, queries));
          return callback(null, twiml);
          break;
        default:
          queries = {
            mode: 'main',
          };
          if (taskSid) {
            queries.taskSid = taskSid;
          }
          twiml.say(sayOptions, 'I did not understand your selection.');
          twiml.redirect(urlBuilder(`${domain}/inqueue-callback`, queries));
          return callback(null, twiml);
          break;
      }
      break;

    //  present new number menu selections
    case 'newNumber':
      const NewPhoneNumber = event.Digits;
      // TODO: Handle country code in new number

      message = `You entered ${formatPhoneNumber(NewPhoneNumber)} ...`;
      message += 'Press 1 if this is correct...';
      message += 'Press 2 to re-enter your number';
      message += 'Press the star key to return to the main menu';

      queries = {
        mode: 'mainProcess',
        CallSid,
        cbphone: encodeURI(NewPhoneNumber),
      };
      if (taskSid) {
        queries.taskSid = taskSid;
      }
      const GatherConfirmNewNumber = twiml.gather({
        input: 'dtmf',
        timeout: '5',
        finishOnKey: '#',
        action: urlBuilder(`${domain}/inqueue-callback`, queries),
      });
      GatherConfirmNewNumber.say(sayOptions, message);

      queries.mode = 'main';
      twiml.redirect(urlBuilder(`${domain}/inqueue-callback`, queries));
      return callback(null, twiml);
      break;

    //  handler to submit the callback
    case 'submitCallback':
      /*
       *  Steps
       *  1. Fetch TaskSid ( read task w/ attribute of call_sid);
       *  2. Update existing task (assignmentStatus==>'canceled'; reason==>'callback requested' )
       *  3. Create new task ( callback );
       *  4. Hangup callback
       *
       *  main callback logic
       *  get taskSid based on callSid
       *  taskInfo = { "sid" : <taskSid>, "queueTargetName" : <taskQueueName>, "queueTargetSid" : <taskQueueSid> };
       */
      const taskInfo = await getTask(context, taskSid || CallSid);

      // Cancel current Task
      await cancelTask(client, context.TWILIO_WORKSPACE_SID, taskInfo.taskSid);
      // Create the callback task
      const ringBackUrl = CallbackAlertTone.startsWith('https://') ? CallbackAlertTone : domain + CallbackAlertTone;
      await createCallbackTask(client, CallbackNumber, taskInfo, ringBackUrl);

      //  hangup the call
      twiml.say(sayOptions, 'Your callback request has been delivered...');
      twiml.say(sayOptions, 'An available care specialist will reach out to contact you...');
      twiml.say(sayOptions, 'Thank you for your call.');
      twiml.hangup();
      return callback(null, twiml);
      break;
    default:
      return callback(500, 'Mode not specified');
      break;
  }
};
