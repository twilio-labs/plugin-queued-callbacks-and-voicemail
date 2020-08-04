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
exports.handler = async function(context, event, callback) {
  const client = context.getTwilioClient();
  const domain = 'https://' + context.DOMAIN_NAME;
  let twiml = new Twilio.twiml.VoiceResponse();

  //    CUSTOMIZATIONS
  const sayOptions = { voice: 'Polly.Joanna' };
  const holdMusicUrl = '/assets/guitar_music.mp3';

  const statPeriod = 5; //  time interval (minutes) to gather cummulative statistics

  const getEwt = true;
  const getQueuePosition = true;

  //    END CUSTOMIZATIONS

  //  variable initialization
  let mode = event.mode;
  let message = '';

  // vars for EWT/PostionInQueue
  let temp = {};
  let res = {};

  let callSid = '';
  let workflowSid = '';
  let waitTts = '';
  let waitMsg = '';
  let posQueueMsg = '';

  let avgWaitTime = 0;
  let maxWaitTime = 0;
  let minWaitTime = 0;

  let waitTime = [];
  let taskList = [];
  let attr = {};

  // BEGIN: Supporting functions for Estimated Wait Time and Position in Queue

  //  DEBUGGING ONLY - REMOVE FROM PROD CODE
  async function devTesting(desc, item) {
    try {
      await axios.post(
        'https://webhook.site/7c341c7f-08cf-4308-b006-e2cd30cdfffe',
        {
          desc: desc,
          item: item
        }
      );
    } catch (error) {
      console.log('devTesting error');
      handleError(error);
    }
  }

  //  retrieve workflow SID give CallSid using the TaskRouter API
  async function getWorkFlow(callSid) {
    return client.taskrouter
      .workspaces(context.TWILIO_WORKSPACE_SID)
      .tasks.list({
        evaluateTaskAttributes: `call_sid= '${callSid}'`,
        limit: 20
      })
      .then(tasks => {
        res = {
          status: 'success',
          topic: 'getWorkFlow',
          action: 'getWorkFlow',
          workflowSid: tasks[0].workflowSid,
          data: tasks
        };
        return res;
      })
      .catch(error => {
        res = {
          status: 'error',
          topic: 'getWorkFlow',
          action: 'getWorkFlow',
          data: error
        };
        return res;
      });
  }

  //  retrieve workflow cummulative statistics for Estimated wait time
  async function getWorkflowCummStats(workflowSid) {
    return client.taskrouter
      .workspaces(context.TWILIO_WORKSPACE_SID)
      .workflows(workflowSid)
      .cumulativeStatistics({
        Minutes: statPeriod
      })
      .fetch()
      .then(workflow_statistics => {
        res = {
          status: 'success',
          topic: 'getWorkflowCummStats',
          action: 'getWorkflowCummStats',
          data: workflow_statistics
        };
        return res;
      })
      .catch(error => {
        res = {
          status: 'error',
          topic: 'getWorkflowCummStats',
          action: 'getWorkflowCummStats',
          data: error
        };
      });
  }

  async function getTask(callSid) {
    return client.taskrouter
      .workspaces(context.TWILIO_WORKSPACE_SID)
      .tasks.list({
        evaluateTaskAttributes: `call_sid= '${callSid}'`,
        limit: 20
      })
      .then(async () => {
        res = {
          status: 'success',
          topic: 'getTask',
          action: 'getTask',
          taskSid: task[0].sid,
          taskQueueSid: task[0].taskQueueSid,
          taskQueueName: task[0].taskQueueFriendlyName,
          data: task[0]
        };
        return res;
      })
      .catch(error => {
        res = {
          status: 'error',
          topic: 'getTask',
          action: 'getTask',
          data: error
        };
        return res;
      });
  }

  async function getTaskList(callSid, taskQueueName) {
    return await client.taskrouter
      .workspaces(context.TWILIO_WORKSPACE_SID)
      .tasks.list({
        assignmentStatus: 'pending, reserved',
        taskQueueName: taskQueueName,
        ordering: 'DateCreated:asc,Priority:desc',
        limit: 20
      })
      .then(async tasks => {
        let totTasks = tasks.length;
        for (i = 0; i < tasks.length; i++) {
          attr = JSON.parse(tasks[i].attributes);
          temp = {
            taskSid: tasks[i].sid,
            callSid: attr.call_sid,
            priority: tasks[i].priority,
            age: tasks[i].age,
            taskQueueSid: tasks[i].taskQueueSid,
            taskQueueName: tasks[i].taskQueueFriendlyName,
            taskChannelName: tasks[i].taskChannelUniqueName,
            dateCreated: tasks[i].dateCreated,
            dateEnteredQueue: tasks[i].taskQueueEnteredDate
          };
          taskList.push(temp);
        }

        // find position in Queue
        var position = 0;
        position = taskList.findIndex(function(task) {
          return task.callSid == callSid;
        });

        // task not in task list ==> position > 20
        if (position == -1) {
          position = -1;
          let numAhead = 20;
          res = {
            status: 'success',
            topic: 'getTaskList',
            action: 'getTaskList',
            position: -1,
            totTasks: totTasks,
            numAhead: -1,
            data: taskList
          };
        } else {
          //  task found in list
          position = position + 1;
          let numAhead = position - 1;
          res = {
            status: 'success',
            topic: 'getTaskList',
            action: 'getTaskList',
            position: position,
            totTasks: totTasks,
            numAhead: numAhead,
            data: taskList
          };
        }
        return res;
      })
      .catch(error => {
        res = {
          status: 'error',
          topic: 'getTaskList',
          action: 'getTaskList',
          data: error
        };
        return res;
      });
  }

  //  moment function to derive hours, minutes and seconds from cummulative time in seconds
  function waitTimeCalc(type, seconds, waitTime) {
    var duration = moment.duration(seconds, 'seconds');
    res = {
      type: type,
      hours: duration._data.hours,
      minutes: duration._data.minutes,
      seconds: duration._data.seconds
    };
    waitTime.push(res);
    return waitTime;
  }

  function getWaitTimeResults(t, waitTime) {
    //  get formatted wait times
    waitTimeCalc('maxWaitTime', t.max, waitTime);
    waitTimeCalc('avgWaitTime', t.avg, waitTime);
    waitTimeCalc('minWaitTime', t.min, waitTime);

    // get average wait time
    temp = waitTime.filter(item => item.type == 'avgWaitTime');

    return temp;
  }
  //  END: Supporting functions

  //  ==========================
  //  BEGIN:  Main logic
  switch (mode) {
    case 'main':
      async function main() {
        //  logic for retrieval of Estimated Wait Time
        if (getEwt) {
          temp = await getWorkFlow(event.CallSid);
          temp = await getWorkflowCummStats(temp.workflowSid);
          //  get max, avg, min wait times for the workflow
          let t = temp.data.waitDurationUntilAccepted;
          let result = getWaitTimeResults(t, waitTime);
          //  develop TTS response based on computed wait times

          let ewt = result[0].minutes;

          if (ewt == 0) {
            waitTts = 'less than a minute...';
          }
          if (ewt == 1) {
            waitTts = 'less than two minutes...';
          }
          if (ewt == 2) {
            waitTts = 'less than three minutes...';
          }
          if (ewt == 3) {
            waitTts = 'less than four minutes...';
          }
          if (ewt >= 4) {
            waitTts = 'longer than four minutes...';
          }

          //waitTts = result[0].minutes + ' minute ' + result[0].seconds + 'seconds';

          waitMsg += 'The estimated wait time is ' + waitTts + ' ....';
        }

        //  Logic for Position in Queue
        if (getQueuePosition) {
          temp = await getTask(event.CallSid);
          temp = await getTaskList(event.CallSid, temp.taskQueueName);

          // formatting for the position in queue
          numAhead = temp.numAhead;

          switch (temp.numAhead) {
            case 0:
              posQueueMsg = 'Your call is next in queue.... ';
              break;
            case 1:
              posQueueMsg =
                'There is ' + temp.numAhead + 'caller ahead of you...';
              break;
            // case -1:
            //   posQueueMsg =
            //     'There are more than 20 callers ahead of you...';
            //   break;
            default:
              posQueueMsg =
                'There are ' + temp.numAhead + "caller's ahead of you...";
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
          action: domain + '/queue-menu?mode=mainProcess'
        });
        gather.say(sayOptions, message);
        gather.play(domain + '/assets/guitar_music.mp3');
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
          action: domain + '/queue-menu?mode=menuProcess'
        });
        gather.say(sayOptions, message);
        gather.play(domain + '/assets/guitar_music.mp3');

        callback(null, twiml);
      } else {
        twiml.say(sayOptions, 'I did not understand your selection.');
        twiml.redirect(domain + '/queue-menu?mode=main&skipGreeting=true');
        callback(null, twiml);
      }

      break;

    case 'menuProcess':
      switch (event.Digits) {
        //  stay in queue
        case '1':
          //  stay in queue
          //twiml.say(sayOptions, 'Please wait for the next available agent');
          twiml.redirect(domain + '/queue-menu?mode=main&skipGreeting=true');
          callback(null, twiml);
          break;
        //  request a callback
        case '2':
          twiml.redirect(domain + '/inqueue-callback?mode=main');
          callback(null, twiml);
          break;
        //  leave a voicemail
        case '3':
          twiml.redirect(domain + '/inqueue-voicemail?mode=pre-process');
          callback(null, twiml);
          break;

        // listen options menu again
        case '*':
          twiml.redirect(domain + '/queue-menu?mode=mainProcess&Digits=1');
          callback(null, twiml);
          break;

        //  listen to menu again
        default:
          twiml.say(sayOptions, 'I did not understand your selection.');
          twiml.redirect(domain + '/queue-menu?mode=mainProcess&Digits=1');
          callback(null, twiml);
          break;
      }

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
