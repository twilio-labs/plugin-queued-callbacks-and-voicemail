/*
 *Synopsis:  This function provides supporting UTILITY functions for handling of Flex In-Queue Callback/Voicemail capabilities to include:
 *    1. Re-queuing of callback and voicemail tasks;
 *    2. Deletion of voicemail call recording media and transcripts
 *
 *These UTILITY methods directly support FLEX plugin functionality initiated by the Flex agent (worker)
 *
 *name: util_InQueueFlexUtils
 *path: /inqueue-utils
 *private: UNCHECKED
 *
 *Function Methods (mode)
 * - deleteRecordResources    => logic for deletion of recording media and transcript text (recordingSid, transcriptionSid)
 * - requeueTasks             => logic for re-queuing of callback/voicemail task (create new task from existing task attributes)
 *
 *Customization:
 * - None
 *
 *Install/Config: See documentation
 */

const axios = require('axios');
const JWEValidator = require('twilio-flex-token-validator').functionValidator;

const helpersPath = Runtime.getFunctions().helpers.path;
const { handleError } = require(helpersPath);

// eslint-disable-next-line sonarjs/cognitive-complexity
exports.handler = JWEValidator(async function (context, event, callback) {
  // setup twilio client
  const client = context.getTwilioClient();

  const resp = new Twilio.Response();
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
  resp.setHeaders(headers);

  // get method
  const { mode } = event;

  //    global function to update callback Task attributes
  //    controlling the UI call button view
  async function PluginTaskUpdate(type, taskSid, attr, state) {
    if (type === 'callback') {
      attr.ui_plugin.cbCallButtonAccessibility = event.state;
    }
    if (type === 'voicemail') {
      attr.ui_plugin.vmCallButtonAccessibility = event.state;
      attr.ui_plugin.vmRecordButtonAccessibility = !event.state;
    }

    // update task attributes
    await client.taskrouter
      .workspaces(context.TWILIO_WORKSPACE_SID)
      .tasks(taskSid)
      .update({
        attributes: JSON.stringify(attr),
      })
      .then((result) => {
        return { status: 'success', type: 'cbUpdateAttr', data: result };
      })
      .catch((error) => {
        return { status: 'error', type: 'cbUpdateAttr', data: error };
      });
    // error - updateTask
  }

  switch (mode) {
    case 'deleteRecordResources':
      /*
       *  method to delete existing recording/transcription resources
       *  1. get existing task attributes
       *  2. update existing task attributes to indicate resource deletion
       *  3. delete transcription resouce; delete recording resource
       */

      function getTask(taskSid) {
        return client.taskrouter
          .workspaces(context.TWILIO_WORKSPACE_SID)
          .tasks(taskSid)
          .fetch()
          .then((task) => {
            return {
              status: 'success',
              type: 'getTask',
              attr: JSON.parse(task.attributes),
              data: task,
            };
          })
          .catch(async (error) => {
            return { status: 'error', type: 'getTask', data: error };
          });
      }

      function updateTask(taskSid, attr) {
        if (!attr.hasOwnProperty('markDeleted')) {
          attr = Object.assign(attr, { markDeleted: true });
        }

        //    update task attributes
        return client.taskrouter
          .workspaces(context.TWILIO_WORKSPACE_SID)
          .tasks(taskSid)
          .update({
            attributes: JSON.stringify(attr),
          })
          .then((result) => {
            return { status: 'success', type: 'updateAttr', data: result };
          })
          .catch((error) => {
            return { status: 'error', type: 'updateAttr', data: error };
          });
      }

      //  delete the transcription resource
      function deleteTranscription(transSid) {
        return client
          .transcriptions(transSid)
          .remove()
          .then(() => {
            return { delTransStatus: 'success', msg: '' };
          })
          .catch((error) => {
            return { delTransStatus: 'success', msg: error };
          });
      }

      //  delete the call recording resource
      function deleteRecord(recSid) {
        return client
          .recordings(recSid)
          .remove()
          .then(() => {
            return { delRecStatus: 'success', msg: error };
          })
          .catch((error) => {
            return { delRecStatus: 'error', msg: error };
          });
      }

      //  main logic

      const taskInfo = await getTask(event.taskSid);
      const cancelTaskResult = await updateTask(event.taskSid, taskInfo.attr);
      await deleteTranscription(event.transcriptionSid);
      await deleteRecord(event.recordingSid);

      return callback(null, resp.setBody(cancelTaskResult));

      break;

    case 'requeueTasks':
      //  handler to create new task
      function newTask(workflowSid, attr) {
        return client.taskrouter
          .workspaces(context.TWILIO_WORKSPACE_SID)
          .tasks.create({
            taskChannel: attr.taskType,
            priority: 50,
            workflowSid,
            attributes: JSON.stringify(attr),
          })
          .catch((error) => {
            console.log('newTask error');
            handleError(error);
            return Promise.reject(error);
          });
      }

      //  handler to update the existing task
      function completeTask(taskSid) {
        return client.taskrouter
          .workspaces(context.TWILIO_WORKSPACE_SID)
          .tasks(taskSid)
          .update({
            assignmentStatus: 'completed',
            reason: 'task transferred',
          })
          .catch((error) => {
            console.log('completeTask error');
            handleError(error);
            return Promise.reject(error);
          });
      }

      //  main logic for requeue execution
      let newAttributes = event.attributes;
      //  increment the callCountRetry counter
      if (newAttributes.hasOwnProperty('placeCallRetry')) {
        newAttributes = Object.assign(newAttributes, {
          placeCallRetry: parseInt(event.attributes.placeCallRetry, 10) + 1,
        });
      }

      /*
       * setup new task's attributes such that its linked to the
       * original task in Twilio WFO
       */
      if (!newAttributes.hasOwnProperty('conversations')) {
        // eslint-disable-next-line camelcase
        newAttributes = { ...newAttributes, conversations: { conversation_id: event.taskSid } };
      }
      //  create new task
      await PluginTaskUpdate(event.type, event.taskSid, event.attributes, event.state);
      await newTask(event.workflowSid, newAttributes);
      //  update existing task
      const completedTask = await completeTask(event.taskSid);

      return callback(null, resp.setBody(completedTask));
      break;

    case 'UiPlugin':
      const tsk = await PluginTaskUpdate(event.type, event.taskSid, event.attributes, event.state);
      return callback(null, resp.setBody(tsk));

      break;
    default:
      return callback(500, 'Mode not specified');
      break;
  }
});
