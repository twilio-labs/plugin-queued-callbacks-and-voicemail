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
    this.init();
    this.state = {};
  }

  init = () => {
    logger.debug('======= init =======');
  };

  /*
   * create outbound call from Flex using Actions API 'StartOutboundCall'
   *
   */
  cbCallButtonAccessibility(state) {
    const mgr = Flex.Manager.getInstance();
    const data = {
      mode: 'UiPlugin',
      type: 'callback',
      Token: mgr.user.token,
      taskSid: this.props.task.taskSid,
      attributes: this.props.task.attributes,
      state,
    };

    http
      .post(buildUrl('/inqueue-utils'), data)
      .then(() => {
        logger.debug('==== cbUiPlugin web service success ====');
      })
      .catch((error) => {
        logger.error('cbUiPlugin web service error', error);
      });
  }

  startCall() {
    const mgr = Flex.Manager.getInstance();
    const activityName = mgr.workerClient.activity.name;
    if (activityName === 'Offline') {
      // eslint-disable-next-line no-alert
      alert('Change activity state from "Offline" to place call to contact');
      return;
    }
    //  disable the call button
    this.cbCallButtonAccessibility(true);

    /*
     *   disable the Place call button
     * this.props.cbCallButtonDisable(true);
     */
    const { queueSid, attributes } = this.props.task;
    const { phoneTo, callerFrom } = attributes;
    const attr = {
      type: 'outbound',
      name: `Contact: ${phoneTo}`,
      phone: phoneTo,
    };
    // place outbound call using Flex DialPad API
    Flex.Actions.invokeAction('StartOutboundCall', {
      destination: phoneTo,
      queueSid,
      callerId: callerFrom,
      taskAttributes: attr,
    });
  }

  startTransfer() {
    // change disable state of call button
    this.cbCallButtonAccessibility(false);

    const mgr = Flex.Manager.getInstance();
    const data = {
      mode: 'requeueTasks',
      type: 'callback',
      Token: mgr.user.token,
      taskSid: this.props.task.taskSid,
      attributes: this.props.task.attributes,
      workflowSid: this.props.task.workflowSid,
      queueName: this.props.task.queueName,
      state: false,
    };

    http
      .post(buildUrl('/inqueue-utils'), data)
      .then(() => {
        logger.debug('==== requeue web service success ====');
      })
      .catch((error) => {
        logger.error('requeue web service error', error);
      });
  }

  render() {
    //  determine localized call reception time based on server (props) call time
    const timeReceived = moment(this.props.task.attributes.callTime.time_recvd);
    const localTz = moment.tz.guess();
    const localTimeShort = timeReceived.tz(localTz).format('MM-D-YYYY, h:mm:ss a z');

    // capture taskRetry count - disable button conditionally
    const count = this.props.task.attributes.placeCallRetry;

    return (
      <span className="Twilio">
        <h1>Contact CallBack Request</h1>
        <p>A contact has requested an immediate callback.</p>
        <h4 style={styles.itemBold}>Callback Details</h4>
        <ul>
          <li>
            <div style={styles.itemWrapper}>
              <span style={styles.item}>Contact Phone:</span>
              <span style={styles.itemDetail}>{this.props.task.attributes.to}</span>
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
                <Tooltip title="System call reception time" placement="right" arrow>
                  <Icon color="primary" fontSize="small" style={styles.info}>
                    info
                  </Icon>
                </Tooltip>
              </label>

              <label style={styles.itemDetail}>{this.props.task.attributes.callTime.server_time_short}</label>
            </div>
          </li>
          <li>
            <div style={styles.itemWrapper}>
              <div style={styles.itemWrapper}>
                <div>
                  <label style={styles.item}>Localized:&nbsp;</label>
                  <Tooltip title="Call time localized to agent" placement="right" arrow>
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
          onClick={(e) => this.startCall()}
          disabled={this.props.task.attributes.ui_plugin.cbCallButtonAccessibility}
        >
          Place Call Now ( {this.props.task.attributes.to} )
        </Button>
        <p style={styles.textCenter}>Not answering? Requeue to try later.</p>
        <Button
          style={styles.cbButton}
          variant="outlined"
          color="primary"
          onClick={(e) => this.startTransfer()}
          disabled={count >= 3}
        >
          Requeue Callback ( {this.props.task.attributes.placeCallRetry} of 3 )
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
