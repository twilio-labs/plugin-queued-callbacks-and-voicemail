/* eslint-disable camelcase */
// Temporary disabling camelcase rule. This require a change in the plugin code

const moment = require('moment-timezone');

function handleError(error) {
  let message = '';
  if (error.message) {
    message += error.message;
  }
  if (error.stack) {
    message += ` | stack: ${error.stack}`;
  }
  (console.error || console.log).call(console, message || error);
}

/**
 * Get a Task Resource
 *
 * @param {object} context Twilio function context object
 * @param {string} sid Call Sid or Task Sid
 * @returns {Promise} Promise Object with Task Resource
 */
function getTask(context, sid) {
  const client = context.getTwilioClient();
  let fetchTask;

  if (sid.startsWith('CA')) {
    fetchTask = client.taskrouter.workspaces(context.TWILIO_WORKSPACE_SID).tasks.list({
      evaluateTaskAttributes: `call_sid= '${sid}'`,
      limit: 20,
    });
  } else {
    fetchTask = client.taskrouter.workspaces(context.TWILIO_WORKSPACE_SID).tasks(sid).fetch();
  }

  return fetchTask
    .then((result) => {
      const task = Array.isArray(result) ? result[0] : result;
      res = {
        status: 'success',
        topic: 'getTask',
        action: 'getTask',
        taskSid: task.sid,
        taskQueueSid: task.taskQueueSid,
        taskQueueName: task.taskQueueFriendlyName,
        workflowSid: task.workflowSid,
        workspaceSid: task.workspaceSid,
        data: task,
      };
      return res;
    })
    .catch((error) => {
      res = {
        status: 'error',
        topic: 'getTask',
        action: 'getTask',
        data: error,
      };
      return res;
    });
}

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

//  Get current time adjusted to timezone
function getTime(timeZone) {
  const now = new Date();
  const timeRecvd = moment(now);
  return {
    time_recvd: timeRecvd,
    server_tz: timeZone,
    server_time_long: timeRecvd.tz(timeZone).format('MMM Do YYYY, h:mm:ss a z'),
    server_time_short: timeRecvd.tz(timeZone).format('MM-D-YYYY, h:mm:ss a z'),
  };
}

const urlBuilder = (url, queries) => {
  const params = new URLSearchParams();
  Object.entries(queries).forEach(([key, value]) => params.append(key, value));
  return `${url}?${params}`;
};

module.exports = { getTask, handleError, getTime, cancelTask, urlBuilder };
