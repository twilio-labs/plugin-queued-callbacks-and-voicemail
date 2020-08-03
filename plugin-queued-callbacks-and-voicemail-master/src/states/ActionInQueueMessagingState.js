/*
  This file declares the redux store:
  1. Action method constants
  2. Initial state of the store
  3. ACTIONS (methods)
  4. Defines the reducer logic

  Synopsis:  This file creates the application "store" (i.e. State) that
  is shared across components, or "state" data that is used by components as they
  are loaded or unloaded.

  The redux stored allows components to "resume" their state
*/

//  define the action methods identifiers (constants)
const ACTION_CB_CALL_BTN_ACCESSIBILITY = 'CB_CALL_BTN_ACCESSIBILITY';
const ACTION_VM_CALL_BTN_ACCESSIBILITY = 'VM_CALL_BTN_ACCESSIBILITY';
const ACTION_VM_RECORD_BTN_ACCESSIBILITY = 'VM_RECORD_BTN_ACCESSIBILITY';

//  define the initial state values of the REDUX store
const initialState = {
  cbCallButtonAccessiblity: false,
  vmCallButtonAccessiblity: false,
  vmRecordButtonAccessiblity: true
};

//  declare the actions (methods) for acting on the reducer
export class Actions {
  //static dismissBar = () => ({ type: ACTION_DISMISS_BAR });
  static cbToggleCallButtonDisable = value => ({
    type: ACTION_CB_CALL_BTN_ACCESSIBILITY,
    value
  });
  static vmToggleCallButtonDisable = value => ({
    type: ACTION_VM_CALL_BTN_ACCESSIBILITY,
    value
  });
  static vmToggleRecordButtonDisable = value => ({
    type: ACTION_VM_RECORD_BTN_ACCESSIBILITY,
    value
  });
}

//  define the reducer logic (updates to the application state)
export function reduce(state = initialState, action) {
  //console.log("===== in my reducer =====");
  //console.log(action, state);

  switch (action.type) {
    case ACTION_CB_CALL_BTN_ACCESSIBILITY: {
      //  amend the updated store property based in updated value received
      return {
        ...state,
        cbCallButtonAccessiblity: action.value
      };
    }
    case ACTION_VM_CALL_BTN_ACCESSIBILITY: {
      //  amend the updated store property based in updated value received
      return {
        ...state,
        vmCallButtonAccessiblity: action.value
      };
    }
    case ACTION_VM_RECORD_BTN_ACCESSIBILITY: {
      //  amend the updated store property based in updated value received
      return {
        ...state,
        vmRecordButtonAccessiblity: action.value
      };
    }
    default:
      return state;
  }
}
