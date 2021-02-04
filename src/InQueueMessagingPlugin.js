import { VERSION } from '@twilio/flex-ui';
import { FlexPlugin } from 'flex-plugin';
import PhoneCallbackIcon from '@material-ui/icons/PhoneCallback';
import React from 'react';
import VoicemailIcon from '@material-ui/icons/Voicemail';

import { logger } from './helpers';
import reducers, { namespace } from './states';
import { CallbackComponent, VoicemailComponent } from './components';

const PLUGIN_NAME = 'InQueueMessagingPlugin';

export default class InQueueMessagingPlugin extends FlexPlugin {
  constructor() {
    super(PLUGIN_NAME);
  }

  /**
   * This code is run when your plugin is being started
   * Use this to modify any UI components or attach to the actions framework
   *
   * @param flex { typeof import('@twilio/flex-ui') }
   * @param manager { import('@twilio/flex-ui').Manager }
   */
  async init(flex, manager) {
    this.registerReducers(manager);

    this.registerCallbackChannel(flex, manager);
    this.registerVoicemailChannel(flex, manager);
  }

  /**
   * Registers the {@link CallbackComponent}
   */
  registerCallbackChannel(flex, manager) {
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

    flex.TaskInfoPanel.Content.replace(<CallbackComponent key="demo-component" manager={manager} />, {
      sortOrder: -1,
      if: (props) => props.task.attributes.taskType === 'callback',
    });
  }

  /**
   * Registers the {@link VoicemailComponent}
   */
  registerVoicemailChannel(flex, manager) {
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

    flex.TaskInfoPanel.Content.replace(<VoicemailComponent key="demo-component" manager={manager} />, {
      sortOrder: -1,
      if: (props) => props.task.attributes.taskType === 'voicemail',
    });
  }

  /**
   * Registers the plugin reducers
   *
   * @param manager { Flex.Manager }
   */
  registerReducers(manager) {
    if (!manager.store.addReducer) {
      logger.error(`You need FlexUI > 1.9.0 to use built-in redux; you are currently on ${VERSION}`);
      return;
    }

    //  add the reducers to the manager store
    manager.store.addReducer(namespace, reducers);
  }
}
