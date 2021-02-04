import React from 'react';
import * as Flex from '@twilio/flex-ui';
import moment from 'moment';
import 'moment-timezone';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import Button from '@material-ui/core/Button';
import Tooltip from '@material-ui/core/Tooltip';
import Icon from '@material-ui/core/Icon';

import { buildUrl, logger, http } from '../../helpers';
import { Actions } from '../../states/ActionInQueueMessagingState';

const styles = {
  itemWrapper: {
    width: '100%',
  },
  itemBold: { fontWeight: 'bold' },
  item: {
    width: 100,
  },
  itemDetail: {
    textAlign: 'right',
    float: 'right',
    marginRight: '5px',
    marginTop: '3px',
  },
  cbButton: {
    width: '100%',
    marginBottom: '5px',
    fontSize: '10pt',
  },
  textCenter: {
    textAlign: 'center',
    color: 'blue',
  },
  info: { position: 'relative', top: '3px' },
};

class InQueueCallbackComponent extends React.Component {
  static displayName = 'InQueueCallbackComponent';

  constructor(props) {
    super(props);

    this.state = {};
  }

  /*
   * create outbound call from Flex using Actions API 'StartOutboundCall'
   *
   */
  cbCallButtonAccessibility = async (state) => {
    const mgr = Flex.Manager.getInstance();
    const { taskSid, attributes } = this.props.task;
    const data = {
      mode: 'UiPlugin',
      type: 'callback',
      Token: mgr.user.token,
      taskSid,
      attributes,
      state,
    };

    return http
      .post(buildUrl('/inqueue-utils'), data, { noJson: true })
      .then((resp) => {
        logger.debug('==== cbUiPlugin web service success ====');
      })
      .catch((error) => {
        logger.error('cbUiPlugin web service error', error);
      });
  };

  startCall = async () => {
    const manager = Flex.Manager.getInstance();
    const activityName = manager.workerClient.activity.name;
    if (activityName === 'Offline') {
      // eslint-disable-next-line no-alert
      alert('Change activity state from "Offline" to place call to contact');
      return;
    }
    await this.cbCallButtonAccessibility(true);

    const { queueSid, attributes } = this.props.task;
    const { to, from } = attributes;
    const attr = {
      type: 'outbound',
      name: `Contact: ${to}`,
      phone: to,
    };
    await Flex.Actions.invokeAction('StartOutboundCall', {
      destination: to,
      queueSid,
      callerId: from,
      taskAttributes: attr,
    });
  };

  startTransfer = async () => {
    // change disable state of call button
    await this.cbCallButtonAccessibility(false);

    const mgr = Flex.Manager.getInstance();
    const { taskSid, attributes, workflowSid, queueName } = this.props.task;
    const data = {
      mode: 'requeueTasks',
      type: 'callback',
      Token: mgr.user.token,
      taskSid,
      attributes,
      workflowSid,
      queueName,
      state: false,
    };

    return http
      .post(buildUrl('/inqueue-utils'), data)
      .then(() => {
        logger.debug('==== requeue web service success ====');
      })
      .catch((error) => {
        logger.error('requeue web service error', error);
      });
  };

  render() {
    const { attributes } = this.props.task;
    const timeReceived = moment(attributes.callTime.time_recvd);
    const localTz = moment.tz.guess();
    const localTimeShort = timeReceived.tz(localTz).format('MM-D-YYYY, h:mm:ss a z');

    // capture taskRetry count - disable button conditionally
    const count = attributes.placeCallRetry;

    return (
      <span className="Twilio">
        <h1>Contact CallBack Request</h1>
        <p>A contact has requested an immediate callback.</p>
        <h4 style={styles.itemBold}>Callback Details</h4>
        <ul>
          <li>
            <div style={styles.itemWrapper}>
              <span style={styles.item}>Contact Phone:</span>
              <span style={styles.itemDetail}>{attributes.to}</span>
            </div>
          </li>
          <li>&nbsp;</li>
          <li>
            <div style={styles.itemWrapper}>
              <span style={styles.itemBold}>Call Reception Information</span>
            </div>
          </li>
          <li>
            <div style={styles.itemWrapper}>
              <label style={styles.item}>
                Received: &nbsp;
                <Tooltip title="System call reception time" placement="right" arrow="true">
                  <Icon color="primary" fontSize="small" style={styles.info}>
                    info
                  </Icon>
                </Tooltip>
              </label>

              <label style={styles.itemDetail}>{attributes.callTime.server_time_short}</label>
            </div>
          </li>
          <li>
            <div style={styles.itemWrapper}>
              <div style={styles.itemWrapper}>
                <div>
                  <label style={styles.item}>Localized:&nbsp;</label>
                  <Tooltip title="Call time localized to agent" placement="right" arrow="true">
                    <Icon color="primary" fontSize="small" style={styles.info}>
                      info
                    </Icon>
                  </Tooltip>
                  <label style={styles.itemDetail}>{localTimeShort}</label>
                </div>
              </div>
            </div>
          </li>
          <li>&nbsp;</li>
        </ul>
        <Button
          style={styles.cbButton}
          variant="contained"
          color="primary"
          onClick={async () => this.startCall()}
          disabled={attributes.ui_plugin.cbCallButtonAccessibility}
        >
          Place Call Now ( {attributes.to} )
        </Button>
        <p style={styles.textCenter}>Not answering? Requeue to try later.</p>
        <Button
          style={styles.cbButton}
          variant="outlined"
          color="primary"
          onClick={async () => this.startTransfer()}
          disabled={count >= 50}
        >
          Requeue Callback ( {attributes.placeCallRetry} of 3 )
        </Button>
        <p>&nbsp;</p>
      </span>
    );
  }
}

/*
 * Define app property mapping to Redux store state elements
 *
 * This maps application properties to Store state element values
 *  Syntax:
 *  <app_prop_name> : state[<namespace>].<Store_Identifier>.<State_Element>
 */
const mapStateToProps = (state) => ({
  cbCallButtonAccessibility: state['in-queue-redux'].InQueueMessaging.cbCallButtonAccessibility,
});

/*
 *  Define mapping of local component methods to Redux Action methods for updating the store
 *
 *  Syntax:
 *  <Comp_Method> : bindActionCreators( Actions.<action_method>, dispatch)
 *
 */
const mapDispatchToProps = (dispatch) => ({
  cbCallButtonDisable: bindActionCreators(Actions.cbToggleCallButtonDisable, dispatch),
});

export default connect(mapStateToProps, mapDispatchToProps)(InQueueCallbackComponent);
