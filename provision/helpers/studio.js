function getFlowDefinition(serverlessDomain, worflowSid, voiceChannelSid) {
  return {
    description: 'Callback and Voicemail flow',
    states: [
      {
        name: 'Trigger',
        type: 'trigger',
        transitions: [
          {
            event: 'incomingMessage',
          },
          {
            next: 'send_to_flex_1',
            event: 'incomingCall',
          },
          {
            event: 'incomingRequest',
          },
        ],
        properties: {
          offset: {
            x: 0,
            y: 0,
          },
        },
      },
      {
        name: 'send_to_flex_1',
        type: 'send-to-flex',
        transitions: [
          {
            event: 'callComplete',
          },
          {
            event: 'failedToEnqueue',
          },
          {
            event: 'callFailure',
          },
        ],
        properties: {
          waitUrl: `https://${serverlessDomain}/queue-menu?mode=main`,
          offset: {
            x: 20,
            y: 370,
          },
          workflow: worflowSid,
          channel: voiceChannelSid,
          attributes: '{ "type": "inbound", "name": "{{trigger.call.From}}", "direction": "inbound" }',
          waitUrlMethod: 'POST',
        },
      },
    ],
    // eslint-disable-next-line camelcase
    initial_state: 'Trigger',
    flags: {
      // eslint-disable-next-line camelcase
      allow_concurrent_calls: true,
    },
  };
}

async function createStudioFlow(twilioClient, workspaceSid, workflowSid, serverlessDomain) {
  const channelsList = await twilioClient.taskrouter.workspaces(workspaceSid).taskChannels.list();
  const voiceChannel = channelsList.find((channel) => channel.friendlyName === 'Voice');
  if (!voiceChannel) {
    throw new Error('No voice channel found in this workspace');
  }

  const studioDefinition = getFlowDefinition(serverlessDomain, workflowSid, voiceChannel.sid);
  const studioFlows = await twilioClient.studio.flows.list({ limit: 100 });
  const callbackVoiceMailFlow = studioFlows.find((flow) => (flow.friendlyName = 'CallbackVoiceMailFlow'));
  if (callbackVoiceMailFlow) {
    return twilioClient.studio.flows(callbackVoiceMailFlow.sid).update({
      status: 'published',
      definition: studioDefinition,
    });
  }
  return twilioClient.studio.flows.create({
    friendlyName: 'CallbackVoiceMailFlow',
    status: 'published',
    definition: studioDefinition,
  });
}

module.exports = { createStudioFlow };
