import React from 'react';
import * as Flex from '@twilio/flex-ui';
//import { withTaskContext } from "@twilio/flex-ui";

import moment from 'moment';
import 'moment-timezone';

// Import redux methods
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
// Import the Redux Actions
import { Actions } from '../../states/ActionInQueueMessagingState';

import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Tooltip from '@material-ui/core/Tooltip';
import Icon from '@material-ui/core/Icon';

const styles = {
  itemWrapper: {
    width: '100%',
  },
  itemBold: { fontWeight: 'bold' },
  item: {
    width: 150,
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
    fontSize: '9pt',
  },
  audioWrapper: {
    width: '100%',
  },
  transcriptWrapper: {
    width: '100%',
    marginBottom: 10,
  },
  h4_title: {
    fontWeight: 'bold',
  },
  transcript: {
    width: '90%',
    marginRight: 10,
    height: 50,
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 10,
    paddingBottom: 10,
    border: 'solid 1px #999999',
  },
  audio: {
    width: '100%',
    marginTop: 10,
    marginBottom: 10,
  },
  textCenter: {
    textAlign: 'center',
    color: 'blue',
  },
  textAlert: {
    color: 'red',
    textAlign: 'center',
  },
  test: {
    fontSize: '9pt',
  },
  info: { position: 'relative', top: '3px' },
};

// const [checked, setChecked] = React.useState(true);

class InQueueVoicemailComponent extends React.Component {
  constructor(props) {
    super(props);
    this.init();

    this.state = {};
  }

  init = () => {
    console.log('-----InQueueVoicemailComponent-------');
  };

  // create outbound call from Flex using Actions API 'StartOutboundCall'
  //
  vmCallButtonAccessiblity(state) {
    //  enable calling on next retry
    //this.props.cbCallButtonDisable(false);
    // POST to transfer task:
    async function transferTask(url = '', data = {}) {
      // Default options are marked with *
      const response = await fetch(url, {
        method: 'POST', // *GET, POST, PUT, DELETE, etc.
        headers: {
          'Content-Type': 'application/json',
        },
        // redirect: "follow", // manual, *follow, error
        // referrerPolicy: "no-referrer", // no-referrer, *client
        body: JSON.stringify(data), // body data type must match "Content-Type" header
      });
      return await response.json(); // parses JSON response into native JavaScript objects
    }
    //  get instance of Flex manager
    let mgr = Flex.Manager.getInstance();

    const baseUrl = process.env.REACT_APP_SERVICE_BASE_URL;
    console.log(baseUrl);
    return transferTask(baseUrl + '/inqueue-utils', {
      mode: 'UiPlugin',
      type: 'voicemail',
      Token: mgr.user.token,
      taskSid: this.props.task.taskSid,
      attributes: this.props.task.attributes,
      state: state,
    })
      .then((data) => {
        console.log('==== cbUiPlugin web service success ====');
      })
      .catch((error) => {
        console.log('cbUiPlugin web service error');
      });
  }

  startTransfer() {
    // POST to transfer task:
    async function transferTask(url = '', data = {}) {
      // Default options are marked with *
      const response = await fetch(url, {
        method: 'POST', // *GET, POST, PUT, DELETE, etc.
        headers: {
          'Content-Type': 'application/json',
        },
        // redirect: "follow", // manual, *follow, error
        // referrerPolicy: "no-referrer", // no-referrer, *client
        body: JSON.stringify(data), // body data type must match "Content-Type" header
      });
      return await response.json(); // parses JSON response into native JavaScript objects
    }

    //  get instance of Flex manager
    let mgr = Flex.Manager.getInstance();

    const baseUrl = process.env.REACT_APP_SERVICE_BASE_URL;
    return transferTask(baseUrl + '/inqueue-utils', {
      mode: 'requeueTasks',
      type: 'voicemail',
      Token: mgr.user.token,
      taskSid: this.props.task.taskSid,
      attributes: this.props.task.attributes,
      workflowSid: this.props.task.workflowSid,
      queueName: this.props.task.queueName,
      state: false,
    })
      .then((data) => {
    	console.log(baseUrl);
        console.log('==== requeue web service success ====');

        //  enable calling on next retry
        //this.props.vmCallButtonDisable(false);
      })
      .catch((error) => {
    	console.log(baseUrl);
        console.log('requeue web service error');
      });
  }

  // web service call to delete the call recording/transcript
  deleteResources() {
    // Example POST method implementation:
    async function deleteRecording(url = '', data = {}) {
      // Default options are marked with *
      const response = await fetch(url, {
        method: 'POST', // *GET, POST, PUT, DELETE, etc.
        headers: {
          //"Content-Type": "application/json"
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        //redirect: "follow", // manual, *follow, error
        //referrerPolicy: "no-referrer", // no-referrer, *client
        // body: JSON.stringify(data) // body data type must match "Content-Type" header
        body: new URLSearchParams(data),
      });
      return await response.json(); // parses JSON response into native JavaScript objects
    }
    //  get instance of Flex manager
    let mgr = Flex.Manager.getInstance();

    //  get resource Sids
    let taskSid = this.props.task.taskSid;
    let recordSid = this.props.task.attributes.recordingSid;
    let transcriptSid = this.props.task.attributes.transcriptionSid;

    const baseUrl =
      'https://' + this.props.manager.configuration.serviceBaseUrl;
    return deleteRecording(baseUrl + '/inqueue-utils', {
      mode: 'deleteRecordResources',
      taskSid: taskSid,
      recordingSid: recordSid,
      transcriptSid: transcriptSid,
      Token: mgr.user.token,
      attributes: this.props.task.attributes,
      workflowSid: this.props.task.workflowSid,
      queueName: this.props.task.queueName,
    })
      .then((data) => {
        console.log(data); // JSON data parsed by `response.json()` call
      })
      .catch((error) => {
        console.log('Delete resource web service error');
        console.log(error);
      });
  }

  // create outbound call from Flex using Actions API 'StartOutboundCall'
  //
  startCall() {
    let mgr = Flex.Manager.getInstance();
    let activityName = mgr.workerClient.activity.name;
    if (activityName === 'Offline') {
      alert('Change activity state from "Offine" to place call to contact');
      return;
    }
    //
    //  disable the call button
    this.vmCallButtonAccessiblity(true);
    //this.props.vmRecordButtonDisable(false); //  enable the Record button
    let phoneTo = this.props.task.attributes.to;
    let queueSid = this.props.task.queueSid;
    let calledFrom = this.props.task.attributes.from;
    let attr = {
      type: 'outbound',
      name: `Contact: ${this.props.task.attributes.to}`,
      phone: this.props.task.attributes.to,
    };

    //  place outbound call using Flex DialPad API
    Flex.Actions.invokeAction('StartOutboundCall', {
      destination: phoneTo,
      queueSid: queueSid,
      callerId: calledFrom,
      taskAttributes: attr,
    });
  }

  render() {
    console.log('====== render ========');
    //  determine localized call reception time based on server (props) call time
    const time_recvd = moment(this.props.task.attributes.callTime.time_recvd);
    const local_tz = moment.tz.guess();
    // let local_time_long = time_recvd
    //   .tz(local_tz)
    //   .format('MMM Do YYYY, h:mm:ss a z');
    let local_time_short = time_recvd
      .tz(local_tz)
      .format('MM-D-YYYY, h:mm:ss a z');

    // set recordingURL/transcriptionText for record deletion events
    let transcriptText = '';
    let recordUrl = '';
    if (this.props.task.attributes.hasOwnProperty('markDeleted')) {
      transcriptText = 'No call transcription captured';
      recordUrl = '';
    } else {
      transcriptText = this.props.task.attributes.transcriptionText;
      recordUrl = this.props.task.attributes.recordingUrl;
    }

    // capture taskRetry count - disable button conditionally
    const count = this.props.task.attributes.placeCallRetry;
    let layout = null;

    layout = (
      <span class='Twilio'>
        <h1>Contact Voicemail</h1>
        <p>This contact has left a voicemail that requires attention.</p>

        <div style={styles.audioWrapper}>
          <audio
            style={styles.audio}
            ref='audio_tag'
            src={recordUrl}
            controls
          />
        </div>
        <div style={styles.transcriptWrapper}>
          <h4 style={styles.h4_title}>Voicemail Transcript</h4>
          <TextField
            id='outlined-multiline-static'
            multiline
            rows='4'
            fullWidth
            value={transcriptText}
            variant='outlined'
          />
        </div>
        <h4 style={styles.itemBold}>Voicemail Details</h4>
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
          onClick={(e) => this.startCall()}
          disabled={
            this.props.task.attributes.ui_plugin.vmCallButtonAccessibility
          }
        >
          Call Contact Now ( {this.props.task.attributes.to} )
        </Button>

        <p style={styles.textCenter}>Not answering? Requeue to retry later.</p>
        <Button
          style={styles.cbButton}
          variant='outlined'
          color='primary'
          onClick={(e) => this.startTransfer()}
          disabled={count < 3 ? false : true}
        >
          Requeue Voicemail ( {this.props.task.attributes.placeCallRetry} of 3 )
        </Button>
        <p style={styles.textAlert}>
          Upon successful contact, delete the recording resources.
        </p>
        <Button
          style={styles.cbButton}
          variant='contained'
          color='secondary'
          onClick={(e) => this.deleteResources()}
          disabled={
            this.props.task.attributes.ui_plugin.vmRecordButtonAccessibility
          }
        >
          Delete Recordings
        </Button>

        <p>&nbsp;</p>
      </span>
    );

    // }

    return layout;
  }
}

// Define app property mapping to Redux store state elements
//
// This maps application properties to Store state element values
//  Syntax:
//  <app_prop_name> : state[<namespace>].<Store_Identifier>.<State_Element>
const mapStateToProps = (state) => ({
  vmCallButtonAccessiblity:
    state['in-queue-redux'].InQueueMessaging.vmCallButtonAccessiblity,
  vmRecordButtonAccessiblity:
    state['in-queue-redux'].InQueueMessaging.vmRecordButtonAccessiblity,
});

//  Define mapping of local component methods to Redux Action methods for updating the store
//
//  Syntax:
//  <Comp_Method> : bindActionCreators( Actions.<action_method>, dispatch)
//
const mapDispatchToProps = (dispatch) => ({
  vmCallButtonDisable: bindActionCreators(
    Actions.vmToggleCallButtonDisable,
    dispatch
  ),
  vmRecordButtonDisable: bindActionCreators(
    Actions.vmToggleRecordButtonDisable,
    dispatch
  ),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(InQueueVoicemailComponent);
