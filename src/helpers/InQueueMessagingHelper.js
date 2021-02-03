// import * as Flex from '@twilio/flex-ui';
import React from 'react';
import VoicemailIcon from '@material-ui/icons/Voicemail';
import PhoneCallbackIcon from '@material-ui/icons/PhoneCallback';

import InQueueCallbackComponent from '../components/InQueueMessaging/InQueueCallbackComponent';
import InQueueVoicemailComponent from '../components/InQueueMessaging/InQueueVoicemailComponent';

export function InQueueMessagingHelper(flex, manager) {
  // Create Voicemail Channel
  const CallbackChannel = flex.DefaultTaskChannels.createDefaultTaskChannel(
    'callback',
    (task) => task.taskChannelUniqueName === 'callback',
    'CallbackIcon',
    'CallbackIcon',
    'palegreen',
  );
  // Basic Voicemail Channel Settings
  CallbackChannel.templates.TaskListItem.firstLine = (task) => `${task.queueName}: ${task.attributes.name}`;
  CallbackChannel.templates.TaskCanvasHeader.title = (task) => `${task.queueName}: ${task.attributes.name}`;
  CallbackChannel.templates.IncomingTaskCanvas.firstLine = (task) => task.queueName;
  // Lead Channel Icon
  CallbackChannel.icons.active = <PhoneCallbackIcon key="active-callback-icon" />;
  CallbackChannel.icons.list = <PhoneCallbackIcon key="list-callback-icon" />;
  CallbackChannel.icons.main = <PhoneCallbackIcon key="main-callback-icon" />;
  // Register Lead Channel
  flex.TaskChannels.register(CallbackChannel);

  flex.TaskInfoPanel.Content.replace(<InQueueCallbackComponent key="demo-component" manager={manager} />, {
    sortOrder: -1,
    if: (props) => props.task.attributes.taskType === 'callback',
  });

  // Create Voicemail Channel
  const VoiceMailChannel = flex.DefaultTaskChannels.createDefaultTaskChannel(
    'voicemail',
    (task) => task.taskChannelUniqueName === 'voicemail',
    'VoicemailIcon',
    'VoicemailIcon',
    'deepskyblue',
  );
  // Basic Voicemail Channel Settings
  VoiceMailChannel.templates.TaskListItem.firstLine = (task) => `${task.queueName}: ${task.attributes.name}`;
  VoiceMailChannel.templates.TaskCanvasHeader.title = (task) => `${task.queueName}: ${task.attributes.name}`;
  VoiceMailChannel.templates.IncomingTaskCanvas.firstLine = (task) => task.queueName;
  // Lead Channel Icon
  VoiceMailChannel.icons.active = <VoicemailIcon key="active-voicemail-icon" />;
  VoiceMailChannel.icons.list = <VoicemailIcon key="list-voicemail-icon" />;
  VoiceMailChannel.icons.main = <VoicemailIcon key="main-voicemail-icon" />;
  // Register Lead Channel
  flex.TaskChannels.register(VoiceMailChannel);

  flex.TaskInfoPanel.Content.replace(<InQueueVoicemailComponent key="demo-component" manager={manager} />, {
    sortOrder: -1,
    if: (props) => props.task.attributes.taskType === 'voicemail',
  });
}
