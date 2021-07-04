/*
    Synopsis:  This function provides complete handling of Flex In-Queue Voicemail capabilities to include:
        1. request to leave a voicemail with callback to originating ANI
        
    Voicemail tasks are created and linked to the originating call (Flex Insights reporting). The flex plugin provides 
    a UI for management of the voicemail request including a re-queueing capability.
    
    name: util_inQueueMenuMain
    path: /queue-menu
    private: CHECKED
    
    Function Methods (mode)
     - main                 => present menu for in-queue main menu options
     - mainProcess          => present menu for main menu options (1=>Stay Queue; 2=>Callback; 3=>Voicemail)
     - menuProcess          => process DTMF for redirect to supporting functions (Callback, voicemail)

    Customization:
     - Set TTS voice option
     - Set hold music path to ASSET resource (trimmed 30 seconds source)

    Install/Config: See documentation

    Last Updated: 03/27/2020
*/
const axios = require('axios');
const moment = require('moment');
const helpersPath = Runtime.getFunctions()['helpers'].path;
const { getTask, handleError } = require(helpersPath);
const optionsPath = Runtime.getFunctions()['options'].path;
const options = require(optionsPath);

//  retrieve workflow cummulative statistics for Estimated wait time
async function getWorkflowCummStats(
  client,
  workspaceSid,
  workflowSid,
  statPeriod
) {
  return client.taskrouter
    .workspaces(workspaceSid)
    .workflows(workflowSid)
    .cumulativeStatistics({
      Minutes: statPeriod,
    })
    .fetch()
    .then((workflow_statistics) => {
      return {
        status: 'success',
        topic: 'getWorkflowCummStats',
        action: 'getWorkflowCummStats',
        data: workflow_statistics,
      };
    })
    .catch((error) => {
      handleError(error);
      return {
        status: 'error',
        topic: 'getWorkflowCummStats',
        action: 'getWorkflowCummStats',
        data: error,
      };
    });
}

async function getTaskPositionInQueue(client, taskInfo) {
  return await client.taskrouter
    .workspaces(taskInfo.workspaceSid)
    .tasks.list({
      assignmentStatus: 'pending, reserved',
      taskQueueName: taskInfo.taskQueueName,
      ordering: 'DateCreated:asc,Priority:desc',
      limit: 20,
    })
    .then((taskList) => {
      let taskPosition = taskList.findIndex(
        (task) => task.sid === taskInfo.taskSid
      );
      return {
        status: 'success',
        topic: 'getTaskList',
        action: 'getTaskList',
        position: taskPosition,
        data: taskList,
      };
    })
    .catch((error) => {
      handleError(error);
      return {
        status: 'error',
        topic: 'getTaskList',
        action: 'getTaskList',
        data: error,
      };
    });
}

function getAverageWaitTime(t) {
  let durationInSeconds = moment.duration(t.avg, 'seconds');
  return {
    type: 'avgWaitTime',
    hours: durationInSeconds._data.hours,
    minutes: durationInSeconds._data.minutes,
    seconds: durationInSeconds._data.seconds,
  };
}

exports.handler = async function (context, event, callback) {
  const client = context.getTwilioClient();
  const domain = 'https://' + context.DOMAIN_NAME;
  let twiml = new Twilio.twiml.VoiceResponse();

  // Retrieve options
  const { sayOptions, holdMusicUrl, statPeriod, getEwt, getQueuePosition } =
    options;

  // Retrieve event arguments
  const CallSid = event.CallSid || '';
  let taskSid = event.taskSid;

  // Variables initialization
  let mode = event.mode;
  let message = '';

  // Variables for EWT/PostionInQueue
  let waitMsg = '';
  let posQueueMsg = '';

  //  ==========================
  //  BEGIN:  Main logic
  switch (mode) {
    case 'main':
      async function main() {
        //  logic for retrieval of Estimated Wait Time
        let taskInfo;
        if (getEwt || getQueuePosition) {
          taskInfo = await getTask(context, taskSid || CallSid);
          if (!taskSid) {
            taskSid = taskInfo.taskSid;
          }
        }

        if (taskInfo.status === 'success' && getEwt) {
          let workflowStats = await getWorkflowCummStats(
            client,
            context.TWILIO_WORKSPACE_SID,
            taskInfo.workflowSid,
            statPeriod
          );
          //  Get max, avg, min wait times for the workflow
          let t = workflowStats.data.waitDurationUntilAccepted;
          let ewt = getAverageWaitTime(t).minutes;

          let waitTts = '';
          switch (ewt) {
            case 0:
              waitTts = 'less than a minute...';
              break;
            case 4:
              waitTts = 'more than 4 minutes...';
              break;
            default:
              waitTts = `less than ${ewt + 1}  minutes...`;
          }

          waitMsg += `The estimated wait time is ${waitTts} ....`;
        }

        //  Logic for Position in Queue
        if (taskInfo.status === 'success' && getQueuePosition) {
          let taskPositionInfo = await getTaskPositionInQueue(client, taskInfo);
          switch (taskPositionInfo.position) {
            case 0:
              posQueueMsg = 'Your call is next in queue.... ';
              break;
            case 1:
              posQueueMsg = 'There is one caller ahead of you...';
              break;
            case -1:
              posQueueMsg = 'There are more than 20 callers ahead of you...';
              break;
            default:
              posQueueMsg = `There are ${taskPositionInfo.position} callers ahead of you...`;
              break;
          }
        }

        if (event.skipGreeting !== 'true') {
          let initGreeting = waitMsg + posQueueMsg;
          initGreeting +=
            '...Please wait while we direct your call to the next available specialist...';
          twiml.say(sayOptions, initGreeting);
        }
        message =
          'To listen to a menu of options while on hold, press 1 at anytime.';
        const gather = twiml.gather({
          input: 'dtmf',
          timeout: '2',
          action:
            domain +
            `/queue-menu?mode=mainProcess${
              taskSid ? '&taskSid=' + taskSid : ''
            }`,
        });
        gather.say(sayOptions, message);
        gather.play(domain + holdMusicUrl);
        twiml.redirect(
          domain +
            `/queue-menu?mode=main${taskSid ? '&taskSid=' + taskSid : ''}`
        );
        callback(null, twiml);
      }
      main();
      break;

    case 'mainProcess':
      if (event.Digits === '1') {
        message = 'The following options are available...';
        message += 'Press 1 to remain on hold...';
        message += 'Press 2 to request a callback...';
        message += 'Press 3 to leave a voicemail message for the care team...';
        message += 'Press the star key to listen to these options again...';

        const gather = twiml.gather({
          input: 'dtmf',
          timeout: '1',
          action:
            domain +
            `/queue-menu?mode=menuProcess${
              event.taskSid ? '&taskSid=' + event.taskSid : ''
            }`,
        });
        gather.say(sayOptions, message);
        gather.play(domain + holdMusicUrl);
        twiml.redirect(
          domain +
            `/queue-menu?mode=main${
              event.taskSid ? '&taskSid=' + event.taskSid : ''
            }`
        );
        callback(null, twiml);
      } else {
        twiml.say(sayOptions, 'I did not understand your selection.');
        twiml.redirect(
          domain +
            `/queue-menu?mode=main&skipGreeting=true${
              event.taskSid ? '&taskSid=' + event.taskSid : ''
            }`
        );
        callback(null, twiml);
      }

      break;

    case 'menuProcess':
      switch (event.Digits) {
        //  stay in queue
        case '1':
          //  stay in queue
          //twiml.say(sayOptions, 'Please wait for the next available agent');
          twiml.redirect(
            domain +
              `/queue-menu?mode=main&skipGreeting=true${
                event.taskSid ? '&taskSid=' + event.taskSid : ''
              }`
          );
          callback(null, twiml);
          break;
        //  request a callback
        case '2':
          twiml.redirect(
            domain +
              `/inqueue-callback?mode=main${
                event.taskSid ? '&taskSid=' + event.taskSid : ''
              }`
          );
          callback(null, twiml);
          break;
        //  leave a voicemail
        case '3':
          twiml.redirect(
            domain +
              `/inqueue-voicemail?mode=pre-process${
                event.taskSid ? '&taskSid=' + event.taskSid : ''
              }`
          );
          callback(null, twiml);
          break;

        // listen options menu again
        case '*':
          twiml.redirect(
            domain +
              `/queue-menu?mode=mainProcess&Digits=1${
                event.taskSid ? '&taskSid=' + event.taskSid : ''
              }`
          );
          callback(null, twiml);
          break;

        //  listen to menu again
        default:
          twiml.say(sayOptions, 'I did not understand your selection.');
          twiml.redirect(
            domain +
              `/queue-menu?mode=mainProcess&Digits=1${
                event.taskSid ? '&taskSid=' + event.taskSid : ''
              }`
          );
          callback(null, twiml);
          break;
      }
      break;
  }
};
