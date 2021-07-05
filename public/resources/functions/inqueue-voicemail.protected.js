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

const helpersPath = Runtime.getFunctions()['helpers'].path;
const { getTask, handleError } = require(helpersPath);
const optionsPath = Runtime.getFunctions()['options'].path;
const options = require(optionsPath);

//  Get current time adjusted to timezone
function getTime(timeZone) {
  const moment = require('moment-timezone');
  const now = new Date();
  var time_recvd = moment(now);
  let time_json = {
    time_recvd: time_recvd,
    server_tz: timeZone,
    server_time_long: time_recvd
      .tz(timeZone)
      .format('MMM Do YYYY, h:mm:ss a z'),
    server_time_short: time_recvd.tz(timeZone).format('MM-D-YYYY, h:mm:ss a z'),
  };
  return time_json;
}

//  Cancel the existing task
//  update ==> assignmentStatus and reason
async function cancelTask(client, workspaceSid, taskSid) {
  try {
    await client.taskrouter.workspaces(workspaceSid).tasks(taskSid).update({
      assignmentStatus: 'canceled',
      reason: 'Voicemail Request',
    });
  } catch (error) {
    console.log('cancelTask Error');
    handleError(error);
  }
}

// create the voicemail task
async function createVoicemailTask(event, client, taskInfo, ringback) {
  const time = getTime(options.TimeZone);

  const taskAttributes = {
    taskType: 'voicemail',
    ringback,
    to: event.Caller, // Inbound caller
    direction: 'inbound',
    name: 'Voicemail: ' + event.Caller,
    from: event.Called, // Twilio Number
    recordingUrl: event.RecordingUrl,
    recordingSid: event.RecordingSid,
    transcriptionSid: event.TranscriptionSid,
    transcriptionText:
      event.TranscriptionStatus === 'completed'
        ? event.TranscriptionText
        : 'Transcription failed',
    callTime: time,
    queueTargetName: taskInfo.taskQueueName,
    queueTargetSid: taskInfo.taskQueueSid,
    workflowTargetSid: taskInfo.workflowSid,
    ui_plugin: {
      vmCallButtonAccessibility: false,
      vmRecordButtonAccessibility: true,
    },
    placeCallRetry: 1,
  };

  try {
    await client.taskrouter.workspaces(taskInfo.workspaceSid).tasks.create({
      attributes: JSON.stringify(taskAttributes),
      type: 'voicemail',
      taskChannel: 'voicemail',
      priority: options.VoiceMailTaskPriority,
      workflowSid: taskInfo.workflowSid,
    });
  } catch (error) {
    console.log('createVoicemailTask Error');
    handleError(error);
  }
}

exports.handler = async function (context, event, callback) {
  const client = context.getTwilioClient();
  let twiml = new Twilio.twiml.VoiceResponse();
  let domain = 'https://' + context.DOMAIN_NAME;

  const CallSid = event.CallSid;
  const mode = event.mode;
  let taskSid = event.taskSid;

  // Load options
  const { sayOptions, VoiceMailAlertTone } = options;

  // main logic for callback methods
  switch (mode) {
    //  initial logic to cancel the task and prepare the call for Recording
    case 'pre-process':
      //  Get taskSid based on taskSid or CallSid
      if (!taskSid) {
        let taskInfo = await getTask(context, CallSid);
        taskSid = taskInfo.taskSid;
      }

      // Redirect Call to Voicemail main menu
      let redirectUrl =
        domain +
        `/inqueue-voicemail?mode=main${taskSid ? '&taskSid=' + taskSid : ''}`;
      try {
        await client
          .calls(CallSid)
          .update({ method: 'POST', url: redirectUrl });
      } catch (error) {
        console.log('updateCall Error');
        handleError(error);
      }

      //  Cancel (update) the task given taskSid
      await cancelTask(client, context.TWILIO_WORKSPACE_SID, taskSid);

      callback(null, '');
      break;

    case 'main':
      //  Main logic for Recording the voicemail
      twiml.say(
        sayOptions,
        'Please leave a message at the tone.  Press the star key when finished.'
      );
      twiml.record({
        action: domain + '/inqueue-voicemail?mode=success&CallSid=' + CallSid,
        transcribeCallback:
          domain + '/inqueue-voicemail?mode=submitVoicemail&CallSid=' + CallSid,
        method: 'GET',
        playBeep: 'true',
        transcribe: true,
        timeout: 10,
        finishOnKey: '*',
      });
      twiml.say(sayOptions, 'I did not capture your recording');
      callback(null, twiml);
      break;

    //  End the voicemail interaction - hang up call
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
      let taskInfo = await getTask(context, taskSid || CallSid);
      //TODO: handle error in getTask

      //  create the Voicemail task
      let ringBackUrl = VoiceMailAlertTone.startsWith('https://')
        ? VoiceMailAlertTone
        : domain + VoiceMailAlertTone;
      createVoicemailTask(event, client, taskInfo, ringBackUrl);
      callback(null, '');
      break;
  }
};
