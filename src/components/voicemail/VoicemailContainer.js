import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import { Actions } from '../../states/ActionInQueueMessagingState';
import VoicemailComponent from './VoicemailComponent';

const mapStateToProps = (state) => ({
  vmCallButtonAccessibility: state['in-queue-redux'].InQueueMessaging.vmCallButtonAccessibility,
  vmRecordButtonAccessibility: state['in-queue-redux'].InQueueMessaging.vmRecordButtonAccessibility,
});

const mapDispatchToProps = (dispatch) => ({
  vmCallButtonDisable: bindActionCreators(Actions.vmToggleCallButtonDisable, dispatch),
  vmRecordButtonDisable: bindActionCreators(Actions.vmToggleRecordButtonDisable, dispatch),
});

export default connect(mapStateToProps, mapDispatchToProps)(VoicemailComponent);
