import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import { Actions } from '../../states/ActionInQueueMessagingState';
import CallbackComponent from './CallbackComponent';

const mapStateToProps = (state) => ({
  cbCallButtonAccessibility: state['in-queue-redux'].InQueueMessaging.cbCallButtonAccessibility,
});

const mapDispatchToProps = (dispatch) => ({
  cbCallButtonDisable: bindActionCreators(Actions.cbToggleCallButtonDisable, dispatch),
});

export default connect(mapStateToProps, mapDispatchToProps)(CallbackComponent);
