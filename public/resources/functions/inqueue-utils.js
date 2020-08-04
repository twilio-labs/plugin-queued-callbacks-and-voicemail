/*
    Synopsis:  This function provides supporting UTILITY functions for handling of Flex In-Queue Callback/Voicemail capabilities to include:
        1. Re-queuing of callback and voicemail tasks;
        2. Deletion of voicemail call recording media and transcripts
        
    These UTILITY methods directly support FLEX plugin functionality initiated by the Flex agent (worker)
    
    name: util_InQueueFlexUtils
    path: /inqueue-utils
    private: UNCHECKED
    
    Function Methods (mode)
     - deleteRecordResources    => logic for deletion of recording media and transcript text (recordingSid, transcriptionSid)
     - requeueTasks             => logic for re-queuing of callback/voicemail task (create new task from existing task attributes)

    Customization:
     - None

    Install/Config: See documentation
*/
const JWEValidator = require('twilio-flex-token-validator').functionValidator;
exports.handler = JWEValidator(async function (context, event, callback) {
  const axios = require('axios');

  let res = {};

  // setup twilio client
  const client = context.getTwilioClient();

  let resp = new Twilio.Response();
  let headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
  resp.setHeaders(headers);

  // get method
  let mode = event.mode;

  //  testing async function to push results to webhook request site for debugging -  DEV ONLY
  async function devTesting(item) {
    try {
      await axios.post(
        'https://webhook.site/7c341c7f-08cf-4308-b006-e2cd30cdfffe',
        { item: item }
      );
    } catch (error) {
      console.log('devTesting error');
      handleError(error)
    }
  }

  //    global function to update callback Task attributes
  //    controlling the UI call button view
  async function PluginTaskUpdate(type, taskSid, attr, state) {

    if (type == 'callback') {
      attr.ui_plugin.cbCallButtonAccessibility = event.state;
    }
    if (type == 'voicemail') {
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
      .then((res) => {
        res = { status: 'success', type: 'cbUpdateAttr', data: res };
        return res;
      })
      .catch((error) => {
        res = { status: 'error', type: 'cbUpdateAttr', data: error };
      });
    // error - updateTask
  }

  switch (mode) {
    case 'deleteRecordResources':
      //  method to delete existing recording/transcription resources
      //  1. get existing task attributes
      //  2. update existing task attributes to indicate resource deletion
      //  3. delete transcription resouce; delete recording resource

      async function getTask(taskSid) {
        return await client.taskrouter
          .workspaces(context.TWILIO_WORKSPACE_SID)
          .tasks(taskSid)
          .fetch()
          .then(async (task) => {
            res = {
              status: 'success',
              type: 'getTask',
              attr: JSON.parse(task.attributes),
              data: task,
            };
            return res;
          })
          .catch(async (error) => {
            res = { status: 'error', type: 'getTask', data: error };
            return res;
          });
      }

      async function updateTask(taskSid, attr) {
        if (!attr.hasOwnProperty('markDeleted')) {
          attr = Object.assign(attr, { markDeleted: true });
        }

        //    update task attributes
        return await client.taskrouter
          .workspaces(context.TWILIO_WORKSPACE_SID)
          .tasks(taskSid)
          .update({
            attributes: JSON.stringify(attr),
          })
          .then(async (res) => {
            res = { status: 'success', type: 'updateAttr', data: res };
            return res;
          })
          .catch(async (error) => {
            res = { status: 'error', type: 'updateAttr', data: error };
            return res;
          });
      }

      //  delete the transcription resource
      async function deleteTranscription(transSid) {
        return await client
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
      async function deleteRecord(recSid) {
        return await client
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
      async function deleteMain() {
        res = await getTask(event.taskSid);
        res = await updateTask(event.taskSid, res.attr);
        let del = await deleteTranscription(event.transcriptSid);
        let cal = await deleteRecord(event.recordingSid);

        callback(null, resp.setBody(res));
      }
      deleteMain();
      break;

    case 'requeueTasks':
      //  handler to create new task
      async function newTask(workflowSid, attr) {
        try {
          return await client.taskrouter
            .workspaces(context.TWILIO_WORKSPACE_SID)
            .tasks.create({
              taskChannel: attr.taskType,
              priority: 50,
              workflowSid: workflowSid,
              attributes: JSON.stringify(attr),
            });
        } catch (error) {
          console.log('newTask error');
          handleError(error);
        }
      }

      //  handler to update the existing task
      async function completeTask(taskSid) {
        try {
          return await client.taskrouter
            .workspaces(context.TWILIO_WORKSPACE_SID)
            .tasks(taskSid)
            .update({
              assignmentStatus: 'completed',
              reason: 'task transferred',
            });
        } catch (error) {
          console.log('completeTask error');
          handleError(error);
        }
      }

      //  main logic for requeue execution
      async function requeueMain() {
        let newAttributes = event.attributes;
        //  increment the callCountRetry counter
        if (newAttributes.hasOwnProperty('placeCallRetry')) {
          newAttributes = Object.assign(newAttributes, {
            placeCallRetry: parseInt(event.attributes.placeCallRetry) + 1,
          });
        }

        // setup new task's attributes such that its linked to the
        // original task in Twilio WFO
        if (!newAttributes.hasOwnProperty('conversations')) {
          newAttributes = Object.assign(newAttributes, {
            conversations: { conversation_id: event.taskSid },
          });
        }
        //  create new task
        await PluginTaskUpdate(
          event.type,
          event.taskSid,
          event.attributes,
          event.state
        );
        await newTask(event.workflowSid, newAttributes);
        //  update existing task
        let temp_2 = await completeTask(event.taskSid);

        callback(null, resp.setBody(temp_2));
      }
      requeueMain();
      break;

    case 'UiPlugin':
      let tsk = await PluginTaskUpdate(
        event.type,
        event.taskSid,
        event.attributes,
        event.state
      );
      callback(null, resp.setBody(tsk));

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
});
