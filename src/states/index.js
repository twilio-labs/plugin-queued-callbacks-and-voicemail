import { combineReducers } from 'redux';

//  define the Redux reducers
import { reduce as InQueueMessagingReducer } from './ActionInQueueMessagingState';

// Register your redux store under a unique namespace
export const namespace = 'in-queue-redux';

/*
 * Combine the reducers
 * define redux store identifier (InQueueMessaging)
 *  Store:  state[<namespace>].<identifier>.{state object}
 */
export default combineReducers({
  InQueueMessaging: InQueueMessagingReducer,
});
