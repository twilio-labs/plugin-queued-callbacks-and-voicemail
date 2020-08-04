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
exports.handler = function (context, event, callback) {
  const client = context.getTwilioClient();
  const axios = require('axios');
  //const momentTz = require("moment-timezone");
  const moment = require('moment-timezone');
  let twiml = new Twilio.twiml.VoiceResponse();

  let domain = 'https://' + context.DOMAIN_NAME;

  //   CUSTOMIZATIONS
  const sayOptions = { voice: 'Polly.Joanna' };
  const priority = 50;
  //    agent audible alert sound file - task attribute value
  const alertTone = domain + '/assets/alertTone.mp3';
  const server_tz = 'America/Los_Angeles';
  //    END CUSTOMIZATIONS

  let mode = event.mode;
  let phone = event.From;
  let callSid = '';

  //  testing async function to push results to webhook request site for debugging -  DEV ONLY
  // visit webhook.site to register a URI to aid in local development/testing
  // async function devTesting(item) {
  //   try {
  //     await axios.post(
  //       "https://webhook.site/6bef991b-dfed-4bf9-89c2-c0fe94acbd92",
  //       { item: item }
  //     );
  //     return;
  //   } catch (error) {
  //     console.log("devTesting error");
  //   }
  // }

  //  find the task given the callSid - get TaskSid
  async function getTask(callSid) {
    attrFilter = `call_sid=  '${callSid}'`;

    try {
      let task = await client.taskrouter
        .workspaces(context.TWILIO_WORKSPACE_SID)
        .tasks.list({
          evaluateTaskAttributes: attrFilter,
          limit: 20,
        });

      let taskInfo = {
        originalTaskData: task[0],
      };
      return await taskInfo;
    } catch (error) {
      console.log('getTask error');
      handleError(error);
    }
  }

  //  cancel the existing task
  //  update ==> assignmentStatus and reason
  async function cancelTask(taskSid) {
    try {
      await client.taskrouter
        .workspaces(context.TWILIO_WORKSPACE_SID)
        .tasks(taskSid)
        .update({
          assignmentStatus: 'canceled',
          reason: 'Callback Requested',
        });
    } catch (error) {
      console.log('cancelTask error');
      handleError(error);
    }
  }

  // create the callback task
  async function createCallback(phone, taskInfo) {
    let time = getTime(server_tz);

    const taskAttributes = {
      taskType: 'callback',
      ringback: alertTone,
      to: phone,
      direction: 'inbound',
      name: 'Callback: ' + phone,
      from: getOrigTaskData(
        taskInfo.originalTaskData,
        'called',
        'getAttribute'
      ),
      callTime: time,
      queueTargetName: getOrigTaskData(
        taskInfo.originalTaskData,
        'taskQueueFriendlyName',
        ''
      ),
      queueTargetSid: getOrigTaskData(
        taskInfo.originalTaskData,
        'taskQueueSid',
        ''
      ),
      workflowTargetSid: getOrigTaskData(
        taskInfo.originalTaskData,
        'workflowSid',
        ''
      ),
      ui_plugin: { cbCallButtonAccessibility: false },
      placeCallRetry: 1,
    };
    try {
      let cbTask = await client.taskrouter
        .workspaces(context.TWILIO_WORKSPACE_SID)
        .tasks.create({
          attributes: JSON.stringify(taskAttributes),
          type: 'callback',
          taskChannel: 'callback',
          priority: priority,
          workflowSid: getOrigTaskData(
            taskInfo.originalTaskData,
            'workflowSid',
            ''
          ),
        });
      return cbTask;
    } catch (error) {
      console.log('createCallBack error');
      handleError(error);
    }
  }

  //  handler to retrieve Task JSON key evaluateTaskAttributes
  //  lookup ==> 'getAttribute' == get attributes value
  function getOrigTaskData(object, keyname, lookup) {
    if (lookup == 'getAttribute') {
      let attr = JSON.parse(object.attributes);
      val = attr[keyname];
    } else {
      val = object[keyname];
    }
    return val;
  }

  //  method to split the phone string - prepare phone string for TTS read-ability
  //  format ==> reture '13035551212'
  //  explode ==> return '1...3...0...3...5...5...5...1...2...1...2'
  //
  function explodePhone(mode, phone) {
    if (mode == 'format') {
      phone = phone.replace('+', '');
      return phone;
    }
    if (mode == 'explode') {
      let temp = '';
      phone = phone.replace('+', '');
      var res = phone.split('');
      for (i = 0; i < res.length; i++) {
        temp += res[i] + '...';
      }
      return temp;
    }
  }

  //  get current time adjusted to PST timezone
  function getTime(server_tz) {
    const now = new Date();
    var time_recvd = moment(now);
    let time_json = {
      time_recvd: time_recvd,
      server_tz: server_tz,
      server_time_long: time_recvd
        .tz(server_tz)
        .format('MMM Do YYYY, h:mm:ss a z'),
      server_time_short: time_recvd
        .tz(server_tz)
        .format('MM-D-YYYY, h:mm:ss a z'),
    };
    return time_json;
  }

  // main logic for callback methods
  switch (mode) {
    //  present main menu options
    case 'main':
      //  get callsid
      callSid = event.CallSid;
      // main menu
      message =
        'You have requested a callback at ' +
        explodePhone('explode', phone) +
        '...';
      message += 'If this is correct, press 1...';
      message += 'Press 2 to be called at different number';

      const gather = twiml.gather({
        input: 'dtmf',
        timeout: '2',
        action:
          domain +
          '/inqueue-callback?mode=mainProcess&callsid=' +
          callSid +
          '&cbphone=' +
          explodePhone('format', phone),
      });
      gather.say(sayOptions, message);
      callback(null, twiml);
      break;

    //  process main menu selections
    case 'mainProcess':
      callSid = event.callsid;
      switch (event.Digits) {
        //  existing number
        case '1':
          // redirect to submitCalBack
          temp = event.cbphone;
          twiml.redirect(
            domain +
              '/inqueue-callback?mode=submitCallback&callsid=' +
              callSid +
              '&cbphone=' +
              temp
          );
          callback(null, twiml);
          break;
        //  new number
        case '2':
          message = 'Using your keypad, enter in your phone number...';
          message += 'Press the pound sign when you are done...';

          const gather_2 = twiml.gather({
            input: 'dtmf',
            timeout: '5',
            finishOnKey: '#',
            action:
              domain + '/inqueue-callback?mode=newNumber&callsid=' + callSid,
          });
          gather_2.say(sayOptions, message);
          callback(null, twiml);
          break;
        default:
          twiml.say(sayOptions, 'I did not understand your selection.');
          twiml.redirect(domain + '/inqueue-callback?mode=main');
          callback(null, twiml);
          break;
      }
      break;

    //  present new number menu selections
    case 'newNumber':
      callSid = event.callsid;
      temp = event.Digits;

      message = 'You entered ' + explodePhone('explode', event.Digits) + ' ...';
      message += 'Press 1 if this is correct...';
      message += 'Press 2 to re-enter your number';
      message += 'Press the star key to return to the main menu';

      const gather_3 = twiml.gather({
        input: 'dtmf',
        timeout: '2',
        finishOnKey: '#',
        action:
          domain +
          '/inqueue-callback?mode=newNumberProcess&callsid=' +
          callSid +
          '&cbphone=' +
          explodePhone('format', temp),
      });
      gather_3.say(sayOptions, message);
      callback(null, twiml);
      break;

    //  process new number submission
    case 'newNumberProcess':
      // get the callSid
      callSid = event.callsid;
      //  process digits
      switch (event.Digits) {
        //  redirect to submitCallback
        case '1':
          temp = event.cbphone;
          twiml.redirect(
            domain +
              '/inqueue-callback?mode=submitCallback&callsid=' +
              callSid +
              '&cbphone=' +
              temp
          );
          callback(null, twiml);
          break;
        //  re-enter number
        case '2':
          twiml.redirect(
            domain +
              '/inqueue-callback?mode=mainProcess&callsid=' +
              callSid +
              '&Digits=2'
          );
          callback(null, twiml);
          break;
        //  redirect to main menu
        case '*':
          twiml.redirect(domain + '/queue-menu?mode=main&skipGreeting=true');
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
      async function main() {
        //  get taskSid based on callSid
        //  taskInfo = { "sid" : <taskSid>, "queueTargetName" : <taskQueueName>, "queueTargetSid" : <taskQueueSid> };
        let taskInfo = await getTask(event.callsid);

        //  cancel (update) the task given taskSid
        let taskSid = getOrigTaskData(taskInfo.originalTaskData, 'sid', '');
        let taskUpdate = await cancelTask(taskSid);

        //  create the callback task
        let cbTask = await createCallback('+' + event.cbphone, taskInfo);

        //  hangup the call
        twiml.say(sayOptions, 'Your callback has been delivered...');
        twiml.say(
          sayOptions,
          'An available care specialist will reach out to contact you...'
        );
        twiml.say(sayOptions, 'Thank you for your call.');
        twiml.hangup();
        callback(null, twiml);
      }
      //  call main async function for callback initiation
      main();

      break;
  }

  function handleError(error) {
    let message = '';
    if (error.message) {
      message += error.message;
    }
    if (error.stack) {
      message += ' | stack: ' + error.stack;
    }
    (console.error || console.log).call(console, message || error);
  }
};
