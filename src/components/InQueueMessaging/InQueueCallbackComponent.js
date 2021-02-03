import React from 'react';
import * as Flex from '@twilio/flex-ui';

import moment from 'moment';
import 'moment-timezone';
// Import redux methods
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
// Import the Redux Actions
import { Actions } from '../../states/ActionInQueueMessagingState';
//Import joinUrl functionality
import { buildUrl } from '../../helpers/urlHelper.js';

import Button from '@material-ui/core/Button';
import Tooltip from '@material-ui/core/Tooltip';
import Icon from '@material-ui/core/Icon';

const styles = {
  itemWrapper: {
    width: '100%'
  },
  itemBold: { fontWeight: 'bold' },
  item: {
    width: 100
  },
  itemDetail: {
    textAlign: 'right',
    float: 'right',
    marginRight: '5px',
    marginTop: '3px'
  },
  cbButton: {
    width: '100%',
    marginBottom: '5px',
    fontSize: '10pt'
  },
  textCenter: {
    textAlign: 'center',
    color: 'blue'
  },
  info: { position: 'relative', top: '3px' }
};

class InQueueCallbackComponent extends React.Component {
  constructor(props) {
    super(props);
    this.init();
    this.state = {};
  }

  componentDidMount() {}

  init = () => {
    console.log('======= init =======');
  };

  // create outbound call from Flex using Actions API 'StartOutboundCall'
  //
  cbCallButtonAccessiblity(state) {
    //  enable calling on next retry
    //this.props.cbCallButtonDisable(false);
    // POST to transfer task:
    async function transferTask(url = '', data = {}) {
      // Default options are marked with *
      const response = await fetch(url, {
        method: 'POST', // *GET, POST, PUT, DELETE, etc.
        headers: {
          'Content-Type': 'application/json'
        },
        // redirect: "follow", // manual, *follow, error
        // referrerPolicy: "no-referrer", // no-referrer, *client
        body: JSON.stringify(data) // body data type must match "Content-Type" header
      });
      return await response.json(); // parses JSON response into native JavaScript objects
    }
    //  get instance of Flex manager
    let mgr = Flex.Manager.getInstance();

    console.log(buildUrl('/inqueue-utils'));
    transferTask(buildUrl('/inqueue-utils'), {
      mode: 'UiPlugin',
      type: 'callback',
      Token: mgr.user.token,
      taskSid: this.props.task.taskSid,
      attributes: this.props.task.attributes,
      state: state
    })
      .then(data => {
        console.log('==== cbUiPlugin web service success ====');
      })
      .catch(error => {
        console.log('cbUiPlugin web service error', error);
      });
  }

  startCall() {
    let mgr = Flex.Manager.getInstance();
    let activityName = mgr.workerClient.activity.name;
    if (activityName == 'Offline') {
      alert('Change activity state from "Offine" to place call to contact');
      return;
    }
    //  disable the call button
    this.cbCallButtonAccessiblity(true);

    //  disable the Place call button
    //this.props.cbCallButtonDisable(true);
    let phoneTo = this.props.task.attributes.to;
    let queueSid = this.props.task.queueSid;
    let callerFrom = this.props.task.attributes.from;
    let attr = {
      type: 'outbound',
      name: `Contact: ${this.props.task.attributes.to}`,
      phone: this.props.task.attributes.to
    };
    // place outbound call using Flex DialPad API
    Flex.Actions.invokeAction('StartOutboundCall', {
      destination: phoneTo,
      queueSid: queueSid,
      callerId: callerFrom,
      taskAttributes: attr
    });
  }

  startTransfer() {
    //  enable calling on next retry
    //this.props.cbCallButtonDisable(false);
    // POST to transfer task:
    async function transferTask(url = '', data = {}) {
      // Default options are marked with *
      const response = await fetch(url, {
        method: 'POST', // *GET, POST, PUT, DELETE, etc.
        headers: {
          'Content-Type': 'application/json'
        },
        // redirect: "follow", // manual, *follow, error
        // referrerPolicy: "no-referrer", // no-referrer, *client
        body: JSON.stringify(data) // body data type must match "Content-Type" header
      });
      return await response.json(); // parses JSON response into native JavaScript objects
    }
    // change disable state of call button
    this.cbCallButtonAccessiblity(false);

    //  get instance of Flex manager
    let mgr = Flex.Manager.getInstance();

    transferTask(buildUrl('/inqueue-utils'), {
      mode: 'requeueTasks',
      type: 'callback',
      Token: mgr.user.token,
      taskSid: this.props.task.taskSid,
      attributes: this.props.task.attributes,
      workflowSid: this.props.task.workflowSid,
      queueName: this.props.task.queueName,
      state: false
    })
      .then(data => {
        console.log('==== requeue web service success ====');
      })
      .catch(error => {
        console.log('requeue web service error', error);
      });
  }

  render() {
    console.log('====== task =======');
    console.log(Flex.Manager.getInstance());
    console.log(this.props.task);
    let layout = null;

    //  determine localized call reception time based on server (props) call time
    const time_recvd = moment(this.props.task.attributes.callTime.time_recvd);
    const local_tz = moment.tz.guess();
    let local_time_long = time_recvd
      .tz(local_tz)
      .format('MMM Do YYYY, h:mm:ss a z');
    let local_time_short = time_recvd
      .tz(local_tz)
      .format('MM-D-YYYY, h:mm:ss a z');

    // capture taskRetry count - disable button conditionally
    const count = this.props.task.attributes.placeCallRetry;

    layout = (
      <span class='Twilio'>
        <h1>Contact CallBack Request</h1>
        <p>A contact has requested an immediate callback.</p>
        <h4 style={styles.itemBold}>Callback Details</h4>
        <ul>
          <li>
            <div style={styles.itemWrapper}>
              <span style={styles.item}>Contact Phone:</span>
              <span style={styles.itemDetail}>
                {this.props.task.attributes.to}
              </span>
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
                <Tooltip
                  title='System call reception time'
                  placement='right'
                  arrow
                >
                  <Icon color='primary' fontSize='small' style={styles.info}>
                    info
                  </Icon>
                </Tooltip>
              </label>

              <label style={styles.itemDetail}>
                {this.props.task.attributes.callTime.server_time_short}
              </label>
            </div>
          </li>
          <li>
            <div style={styles.itemWrapper}>
              <div style={styles.itemWrapper}>
                <div>
                  <label style={styles.item}>Localized:&nbsp;</label>
                  <Tooltip
                    title='Call time localized to agent'
                    placement='right'
                    arrow
                  >
                    <Icon color='primary' fontSize='small' style={styles.info}>
                      info
                    </Icon>
                  </Tooltip>
                  <label style={styles.itemDetail}>{local_time_short}</label>
                </div>
              </div>
            </div>
          </li>
          <li>&nbsp;</li>
        </ul>
        <Button
          style={styles.cbButton}
          variant='contained'
          color='primary'
          onClick={e => this.startCall()}
          disabled={
            this.props.task.attributes.ui_plugin.cbCallButtonAccessibility
          }
        >
          Place Call Now ( {this.props.task.attributes.to} )
        </Button>
        <p style={styles.textCenter}>Not answering? Requeue to try later.</p>
        <Button
          style={styles.cbButton}
          variant='outlined'
          color='primary'
          onClick={e => this.startTransfer()}
          disabled={count < 3 ? false : true}
        >
          Requeue Callback ( {this.props.task.attributes.placeCallRetry} of 3 )
        </Button>
        <p>&nbsp;</p>
      </span>
    );
    return layout;
  }
}

// Define app property mapping to Redux store state elements
//
// This maps application properties to Store state element values
//  Syntax:
//  <app_prop_name> : state[<namespace>].<Store_Identifier>.<State_Element>
const mapStateToProps = state => ({
  cbCallButtonAccessiblity:
    state['in-queue-redux'].InQueueMessaging.cbCallButtonAccessiblity
});

//  Define mapping of local component methods to Redux Action methods for updating the store
//
//  Syntax:
//  <Comp_Method> : bindActionCreators( Actions.<action_method>, dispatch)
//
const mapDispatchToProps = dispatch => ({
  cbCallButtonDisable: bindActionCreators(
    Actions.cbToggleCallButtonDisable,
    dispatch
  )
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(InQueueCallbackComponent);
