/*
    Synopsis:  This function provide complete handling of Flex In-Queue Callback capabilities to include:
        1. Immediate call-back request to originating ANI ( Press 1), and
        2. Request a callback to separate number
        
    Callback task are created and linked to the originating call (Flex Insights reporting). The flex plugin provides 
    a UI for management of the callback request including a re-queueing capability.capability
    
    name: util_InQueueCallBackMenu
    path: /inqueue-callback
    private: CHECKED
    
    Function Methods (mode)
     - main             => main entry point for callback flow
     - mainProcess      => process main menu DTMF selection
     - newNumber        => menu initiating new number capture
     - newNumberProcess => process new number DTMF selection
     - submitCallback   => initiate callback creation ( getTask, cancelTask, createCallback)
     
    Customization:
     - Set TTS voice option
     - Set initial priority of callback task (default: 50)
     - Set timezone configuration ( server_tz )

    Install/Config: See documentation

    Last Updated: 03/27/2020
*/

const helpersPath = Runtime.getFunctions()['helpers'].path;
const { getTask, handleError, getTime, cancelTask } = require(helpersPath);
const optionsPath = Runtime.getFunctions()['options'].path;
const options = require(optionsPath);

// Create the callback task
async function createCallbackTask(client, phoneNumber, taskInfo, ringback) {
  const time = getTime(options.TimeZone);
  const taskAttributes = JSON.parse(taskInfo.data.attributes);

  const newTaskAttributes = {
    taskType: 'callback',
    ringback: ringback,
    to: phoneNumber || taskAttributes.caller,
    direction: 'inbound',
    name: `Callback: ${phoneNumber || taskAttributes.caller}`,
    from: taskAttributes.called,
    callTime: time,
    queueTargetName: taskInfo.taskQueueName,
    queueTargetSid: taskInfo.taskQueueSid,
    workflowTargetSid: taskInfo.workflowSid,
    ui_plugin: { cbCallButtonAccessibility: false },
    placeCallRetry: 1,
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

exports.handler = async function (context, event, callback) {
  const client = context.getTwilioClient();
  let twiml = new Twilio.twiml.VoiceResponse();

  let domain = 'https://' + context.DOMAIN_NAME;

  // Load options
  const { sayOptions, CallbackAlertTone } = options;

  const mode = event.mode;
  const PhoneNumberFrom = event.From;
  const CallSid = event.CallSid;
  const CallbackNumber = event.cbphone;
  let taskSid = event.taskSid;
  let message = '';

  // main logic for callback methods
  switch (mode) {
    //  present main menu options
    case 'main':
      // main menu
      message =
        'You have requested a callback at ' +
        formatPhoneNumber(PhoneNumberFrom) +
        '...';
      message += 'If this is correct, press 1...';
      message += 'Press 2 to be called at different number';

      const gatherConfirmation = twiml.gather({
        input: 'dtmf',
        timeout: '2',
        action:
          domain +
          '/inqueue-callback?mode=mainProcess&Callsid=' +
          CallSid +
          '&cbphone=' +
          encodeURI(PhoneNumberFrom) +
          (taskSid ? '&taskSid=' + taskSid : ''),
      });
      gatherConfirmation.say(sayOptions, message);
      callback(null, twiml);
      break;

    //  process main menu selections
    case 'mainProcess':
      switch (event.Digits) {
        //  existing number
        case '1':
          // redirect to submitCalBack
          twiml.redirect(
            domain +
              '/inqueue-callback?mode=submitCallback&Callsid=' +
              CallSid +
              '&cbphone=' +
              encodeURI(CallbackNumber) +
              (taskSid ? '&taskSid=' + taskSid : '')
          );
          callback(null, twiml);
          break;
        //  new number
        case '2':
          message = 'Using your keypad, enter in your phone number...';
          message += 'Press the pound sign when you are done...';

          const GatherNewNumber = twiml.gather({
            input: 'dtmf',
            timeout: '10',
            finishOnKey: '#',
            action:
              domain +
              '/inqueue-callback?mode=newNumber&Callsid=' +
              CallSid +
              (taskSid ? '&taskSid=' + taskSid : ''),
          });
          GatherNewNumber.say(sayOptions, message);
          twiml.redirect(
            domain +
              `/inqueue-callback?mode=main${
                taskSid ? '&taskSid=' + taskSid : ''
              }`
          );
          callback(null, twiml);
          break;
        default:
          twiml.say(sayOptions, 'I did not understand your selection.');
          twiml.redirect(
            domain +
              `/inqueue-callback?mode=main${
                taskSid ? '&taskSid=' + taskSid : ''
              }`
          );
          callback(null, twiml);
          break;
      }
      break;

    //  present new number menu selections
    case 'newNumber':
      const NewPhoneNumber = event.Digits;
      // TODO: Handle country code in new number

      message = 'You entered ' + formatPhoneNumber(NewPhoneNumber) + ' ...';
      message += 'Press 1 if this is correct...';
      message += 'Press 2 to re-enter your number';
      message += 'Press the star key to return to the main menu';

      const GatherConfirmNewNumber = twiml.gather({
        input: 'dtmf',
        timeout: '5',
        finishOnKey: '#',
        action:
          domain +
          '/inqueue-callback?mode=newNumberProcess&Callsid=' +
          CallSid +
          '&cbphone=' +
          encodeURI(NewPhoneNumber) +
          (taskSid ? '&taskSid=' + taskSid : ''),
      });
      GatherConfirmNewNumber.say(sayOptions, message);
      twiml.redirect(
        domain +
          `/inqueue-callback?mode=main${taskSid ? '&taskSid=' + taskSid : ''}`
      );
      callback(null, twiml);
      break;

    //  process new number submission
    case 'newNumberProcess':
      //  process digits
      switch (event.Digits) {
        //  redirect to submitCallback
        case '1':
          twiml.redirect(
            domain +
              '/inqueue-callback?mode=submitCallback&CallSid=' +
              CallSid +
              '&cbphone=' +
              encodeURI(CallbackNumber) +
              (taskSid ? '&taskSid=' + taskSid : '')
          );
          callback(null, twiml);
          break;
        //  re-enter number
        case '2':
          twiml.redirect(
            domain +
              '/inqueue-callback?mode=mainProcess&CallSid=' +
              CallSid +
              '&Digits=2' +
              (taskSid ? '&taskSid=' + taskSid : '')
          );
          callback(null, twiml);
          break;
        //  redirect to main menu
        case '*':
          twiml.redirect(
            domain +
              `/queue-menu?mode=main&skipGreeting=true${
                taskSid ? '&taskSid=' + taskSid : ''
              }`
          );
          callback(null, twiml);
          break;
      }

      break;

    //  handler to submit the callback
    case 'submitCallback':
      //  Steps
      //  1. Fetch TaskSid ( read task w/ attribute of call_sid);
      //  2. Update existing task (assignmentStatus==>'canceled'; reason==>'callback requested' )
      //  3. Create new task ( callback );
      //  4. Hangup callback
      //
      //  main callback logic
      //  get taskSid based on callSid
      //  taskInfo = { "sid" : <taskSid>, "queueTargetName" : <taskQueueName>, "queueTargetSid" : <taskQueueSid> };
      let taskInfo = await getTask(context, CallSid);

      // Cancel current Task
      await cancelTask(client, context.TWILIO_WORKSPACE_SID, taskInfo.taskSid);
      // Create the callback task
      let ringBackUrl = CallbackAlertTone.startsWith('https://')
        ? CallbackAlertTone
        : domain + CallbackAlertTone;
      await createCallbackTask(client, CallbackNumber, taskInfo, ringBackUrl);

      //  hangup the call
      twiml.say(sayOptions, 'Your callback request has been delivered...');
      twiml.say(
        sayOptions,
        'An available care specialist will reach out to contact you...'
      );
      twiml.say(sayOptions, 'Thank you for your call.');
      twiml.hangup();
      callback(null, twiml);
      break;
  }
};
