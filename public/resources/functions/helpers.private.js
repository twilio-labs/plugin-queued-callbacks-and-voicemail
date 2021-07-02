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
    fetchTask = client.taskrouter
      .workspaces(context.TWILIO_WORKSPACE_SID)
      .tasks.list({
        evaluateTaskAttributes: `call_sid= '${sid}'`,
        limit: 20,
      });
  } else {
    fetchTask = client.taskrouter
      .workspaces(context.TWILIO_WORKSPACE_SID)
      .tasks(sid)
      .fetch();
  }

  return fetchTask
    .then((result) => {
      let task = Array.isArray(result) ? result[0] : result;
      res = {
        status: 'success',
        topic: 'getTask',
        action: 'getTask',
        taskSid: task.sid,
        taskQueueSid: task.taskQueueSid,
        taskQueueName: task.taskQueueFriendlyName,
        workflowSid: task.workflowSid,
        workspaceSid: task.workspaceSid,
        data: result,
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

module.exports = { getTask };
