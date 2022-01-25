function createWorkflowConfiguration(callbackandVoicemailQueueSid, everyoneTaskQueue) {
  return `{
      "task_routing": {
        "filters": [
          {
            "filter_friendly_name": "Attempt 1",
            "expression": "(taskType=='callback' OR taskType=='voicemail') AND placeCallRetry==1",
            "targets": [
              {
                "queue": "${callbackandVoicemailQueueSid}",
                "timeout": 10
              },
              {
                "queue": "${everyoneTaskQueue}"
              }
            ]
          },
          {
            "filter_friendly_name": "Attempt 2",
            "expression": "(taskType=='callback' OR taskType=='voicemail') AND placeCallRetry==2",
            "targets": [
              {
                "queue": "${callbackandVoicemailQueueSid}",
                "timeout": 20
              },
              {
                "queue": "${everyoneTaskQueue}"
              }
            ]
          },
          {
            "filter_friendly_name": "Attempt 3",
            "expression": "(taskType=='callback' OR taskType=='voicemail') AND placeCallRetry==3",
            "targets": [
              {
                "queue": "${callbackandVoicemailQueueSid}",
                "timeout": 30
              },
              {
                "queue": "${everyoneTaskQueue}"
              }
            ]
          }
        ],
        "default_filter": {
          "queue": "${everyoneTaskQueue}"
        }
      }
    }`;
}

async function createTaskChannel(twilioClient, workspaceSid, attributes) {
  if (!attributes.uniqueName) {
    throw new Error('Provide an uniqueName for the new channel');
  }
  try {
    callbackTaskChannels = await twilioClient.taskrouter.workspaces(workspaceSid).taskChannels.list();

    const taskChannel = callbackTaskChannels.find((channel) => channel.uniqueName === attributes.uniqueName);
    if (taskChannel) {
      return taskChannel;
    }
    return twilioClient.taskrouter.workspaces(workspaceSid).taskChannels.create(attributes);
  } catch (error) {
    console.log(error);
    throw new Error('Error creating Task Channels');
  }
}

async function createTaskQueue(twilioClient, workspaceSid, attributes) {
  if (!attributes.friendlyName) {
    throw new Error('Please provide friendlyName for the new TaskQueue');
  }
  try {
    const taskQueuesList = await twilioClient.taskrouter
      .workspaces(workspaceSid)
      .taskQueues.list({ friendlyName: attributes.friendlyName });
    if (taskQueuesList.length) {
      return taskQueuesList[0];
    }
    return twilioClient.taskrouter.workspaces(workspaceSid).taskQueues.create(attributes);
  } catch (error) {
    console.log(error);
    throw new Error('Error creating TaskQueue');
  }
}

async function fetchTaskQueue(twilioClient, workspaceSid, friendlyName) {
  const taskQueuesList = await twilioClient.taskrouter.workspaces(workspaceSid).taskQueues.list({ friendlyName });
  if (!taskQueuesList || taskQueuesList.length === 0) {
    throw new Error(`TaskQueue ${friendlyName} not found`);
  }
  return taskQueuesList[0];
}

async function updateWorkflow(twilioClient, workspaceSid, friendlyName, newAttributes) {
  const workflowsList = await twilioClient.taskrouter.workspaces(workspaceSid).workflows.list({ friendlyName });
  if (!workflowsList || workflowsList.length === 0) {
    throw new Error(`Workflow ${friendlyName} not found`);
  }
  return twilioClient.taskrouter.workspaces(workspaceSid).workflows(workflowsList[0].sid).update(newAttributes);
}

module.exports = {
  createWorkflowConfiguration,
  updateWorkflow,
  fetchTaskQueue,
  createTaskQueue,
  createTaskChannel,
};
