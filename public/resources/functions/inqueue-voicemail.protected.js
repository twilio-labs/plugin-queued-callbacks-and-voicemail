/*
    Synopsis:  This function provides complete handling of Flex In-Queue Voicemail capabilities to include:
        1. request to leave a voicemail with callback to originating ANI
        
    Voicemail tasks are created and linked to the originating call (Flex Insights reporting). The flex plugin provides 
    a UI for management of the voicemail request including a re-queueing capability.
    
    name: util_InQueueVoicemailMenu
    path: /inqueue-voicemail
    private: CHECKED
    
    Function Methods (mode)
     - pre-process          => main entry point for queue-back voicemail flow (redirect call, getTask, cancel Task)
     - main                 => process main menu DTMF selection
     - success              => menu initiating new number capture
     - submitVoicemail      => create voicemail task

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
  const moment = require('moment-timezone');
  let twiml = new Twilio.twiml.VoiceResponse();
  let domain = 'https://' + context.DOMAIN_NAME;

  //  CUSTOMIZATIONS
  const sayOptions = { voice: 'Polly.Joanna' };
  const priority = 50;
  //    agent audible alert sound file - task attribute value
  const alertTone = domain + '/assets/alertTone.mp3';
  const server_tz = 'America/Los_Angeles';
  //  END CUSTOMIZATIONS

  let mode = event.mode;
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

  //  find the task given the callSid or the task Sid - get TaskSid
  async function getTask(sid) {
    try {
      let result = await (sid.startsWith('CA') 
      ? client.taskrouter
      .workspaces(context.TWILIO_WORKSPACE_SID)
      .tasks.list({
        evaluateTaskAttributes: `call_sid= '${sid}'`,
        limit: 20
      }) 
      : fetchTask = client.taskrouter
      .workspaces(context.TWILIO_WORKSPACE_SID)
      .tasks(sid).fetch())

      let taskInfo = {
        originalTaskData: Array.isArray(result) ? result[0] : result,
      };
      return taskInfo;
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
          reason: 'Voicemail Request',
        });
    } catch (error) {
      console.log('cancelTask Error');
      handleError(error);
    }
  }

  // create the voicemail task
  async function createVoicemail(result, taskInfo) {
    let time = getTime(server_tz);

    const taskAttributes = {
      taskType: 'voicemail',
      ringback: alertTone,
      to: getOrigTaskData(taskInfo.originalTaskData, 'caller', 'getAttribute'), //  incound caller
      direction: 'inbound',
      name:
        'Voicemail: ' +
        getOrigTaskData(taskInfo.originalTaskData, 'caller', 'getAttribute'),
      from: getOrigTaskData(
        taskInfo.originalTaskData,
        'called',
        'getAttribute'
      ), // Twilio Number
      recordingUrl: result.recordingUrl,
      recordingSid: result.recordingSid,
      transcriptionSid: result.transcriptionSid,
      transcriptionText: result.transcriptionText,
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
      ui_plugin: {
        vmCallButtonAccessibility: false,
        vmRecordButtonAccessibility: true,
      },

      placeCallRetry: 1,
    };

    try {
      await client.taskrouter
        .workspaces(context.TWILIO_WORKSPACE_SID)
        .tasks.create({
          attributes: JSON.stringify(taskAttributes),
          type: 'voicemail',
          taskChannel: 'voicemail',
          priority: priority,
          workflowSid: getOrigTaskData(
            taskInfo.originalTaskData,
            'workflowSid',
            ''
          ),
        });
    } catch (error) {
      console.log('createVM Error');
      handleError(error);
    }
  }

  async function callModify(sid) {
    let redirect = domain + `/inqueue-voicemail?mode=main${event.taskSid ? '&taskSid=' + event.taskSid : ''}`;

    try {
      await client
        .calls(sid)
        .update({ method: 'POST', url: redirect });
    } catch (error) {
      console.log('callModify Error');
      handleError(error);
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

  //  handler to retrieve Task JSON key evaluateTaskAttributes
  //  lookup ==> 'getAttribute' == get attributes value
  function getOrigTaskData(object, keyname, lookup) {
    //let attr = JSON.parse(t[0].attributes);
    if (lookup == 'getAttribute') {
      let attr = JSON.parse(object.attributes);
      val = attr[keyname];
    } else {
      val = object[keyname];
    }
    return val;
  }

  // main logic for callback methods
  switch (mode) {
    //  initial logic to cancel the task and prepare the call for Recording
    case 'pre-process':
      async function main_1() {
        //  get callSid of existing call
        callSid = event.CallSid;

        //  modify the call - redirect it to the Main Voicemail method (mode=main)
        let modCall = await callModify(callSid);

        let taskSid = event.taskSid; 
        //  get taskSid based on callSid
        if (!taskSid) {
          let taskInfo = await getTask(callSid);
          taskSid = getOrigTaskData(taskInfo.originalTaskData, 'sid', '');
        }

        //  cancel (update) the task given taskSid
        let taskUpdate = await cancelTask(taskSid);

        callback(null, '');
      }
      main_1();

      break;
    //   main logic for Recording the voicemail
    case 'main':
      callSid = event.CallSid;

      console.log('main: ' + callSid);

      twiml.say(
        sayOptions,
        'Please leave a message at the tone.  Press the star key when finished.'
      );
      twiml.record({
        action: domain + '/inqueue-voicemail?mode=success&callsid=' + callSid,
        transcribeCallback:
          domain + '/inqueue-voicemail?mode=submitVoicemail&callsid=' + callSid,
        method: 'GET',
        // maxLength: 20,
        playBeep: 'true',
        transcribe: true,
        timeout: 10,
        finishOnKey: '*',
      });
      twiml.say(sayOptions, 'I did not capture your recording');
      callback(null, twiml);

      break;

    //  end the voicemail interaction - hang up call
    case 'success':
      twiml.say(
        sayOptions,
        'Your voicemail has been successfully received... goodbye'
      );
      twiml.hangup();
      callback(null, twiml);
      break;

    //  handler to submit the callback
    //  create the task here
    case 'submitVoicemail':
      //  Steps
      //  1. Fetch TaskSid ( read task w/ attribute of call_sid);
      //  2. Update existing task (assignmentStatus==>'canceled'; reason==>'callback requested' )
      //  3. Create new task ( callback );
      //  4. Hangup callback
      //
      //  main callback logic
      async function main() {
        // capture recording/transcription details of the call (voicemail)
        let recordingSid = event.RecordingSid;
        let transcriptionSid = event.TranscriptionSid;
        let recordingUrl = event.RecordingUrl;
        let transcriptionText = event.TranscriptionText;
        let callFrom = event.From;
        let callTo = event.To;

        let result = {
          type: 'voicemail',
          callFrom: callFrom,
          callTo: callTo,
          recordingSid: recordingSid,
          transcriptionSid: transcriptionSid,
          recordingUrl: recordingUrl,
          transcriptionText: transcriptionText,
        };

        callSid = event.callsid;
        console.log(callSid);
        let taskInfo = await getTask(event.taskSid || callSid);

        //  create the Voicemail task
        let vmTask = await createVoicemail(result, taskInfo);

        callback(null, '');
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
