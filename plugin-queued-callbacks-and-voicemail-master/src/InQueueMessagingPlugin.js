import { VERSION } from '@twilio/flex-ui';
import { FlexPlugin } from 'flex-plugin';
import { InQueueMessagingHelper } from './helpers/InQueueMessagingHelper';
import reducers, { namespace } from './states';


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

    //  merge in callback/voice mail JSX
    InQueueMessagingHelper(flex, manager);
  }

  /**
   * Registers the plugin reducers
   *
   * @param manager { Flex.Manager }
   */
  registerReducers(manager) {
    if (!manager.store.addReducer) {
      // eslint: disable-next-line
      console.error(
        `You need FlexUI > 1.9.0 to use built-in redux; you are currently on ${VERSION}`
      );
      return;
    }
    //  add the reducers to the manager store
    manager.store.addReducer(namespace, reducers);
  }
}
