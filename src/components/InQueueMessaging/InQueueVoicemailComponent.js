import React from 'react';
import * as Flex from '@twilio/flex-ui';
import moment from 'moment';
import 'moment-timezone';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
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
  h4Title: {
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

const inqueueUtilsUri = '/inqueue-utils';
// const [checked, setChecked] = React.useState(true);

class InQueueVoicemailComponent extends React.Component {
  static displayName = 'InQueueVoicemailComponent';

  constructor(props) {
    super(props);

    this.state = {};
  }

  /*
   * create outbound call from Flex using Actions API 'StartOutboundCall'
   *
   */
  vmCallButtonAccessibility = async (state) => {
    const mgr = Flex.Manager.getInstance();
    const { attributes, taskSid } = this.props.task;
    const data = {
      mode: 'UiPlugin',
      type: 'voicemail',
      Token: mgr.user.token,
      taskSid,
      attributes,
      state,
    };

    return http
      .post(buildUrl(inqueueUtilsUri), data, { noJson: true })
      .then(() => {
        logger.debug('==== cbUiPlugin web service success ====');
      })
      .catch((error) => {
        logger.error('cbUiPlugin web service error', error);
      });
  };

  startTransfer = async () => {
    const mgr = Flex.Manager.getInstance();
    const { attributes, taskSid, workflowSid, queueName } = this.props.task;

    const data = {
      mode: 'requeueTasks',
      type: 'voicemail',
      Token: mgr.user.token,
      taskSid,
      attributes,
      workflowSid,
      queueName,
      state: false,
    };

    return http
      .post(buildUrl(inqueueUtilsUri), data)
      .then(() => {
        logger.debug('==== requeue web service success ====');

        /*
         *   enable calling on next retry
         * this.props.vmCallButtonDisable(false);
         */
      })
      .catch((error) => {
        logger.error('requeue web service error', error);
      });
  };

  // web service call to delete the call recording/transcript
  deleteResources = async () => {
    //  get instance of Flex manager
    const mgr = Flex.Manager.getInstance();
    const { taskSid, workflowSid, queueName, attributes } = this.props.task;
    const { recordSid, transcriptSid } = attributes;
    const data = {
      mode: 'deleteRecordResources',
      taskSid,
      recordingSid: recordSid,
      transcriptSid,
      Token: mgr.user.token,
      attributes,
      workflowSid,
      queueName,
    };

    return http
      .postUrlEncoded(buildUrl(inqueueUtilsUri), data)
      .then(() => {
        logger.debug(data); // JSON data parsed by `response.json()` call
      })
      .catch((error) => {
        logger.error('Delete resource web service error', error);
      });
  };

  startCall = async () => {
    const mgr = Flex.Manager.getInstance();
    const activityName = mgr.workerClient.activity.name;
    if (activityName === 'Offline') {
      // eslint-disable-next-line no-alert
      alert('Change activity state from "Offline" to place call to contact');
      return;
    }

    await this.vmCallButtonAccessibility(true);

    const { queueSid, attributes } = this.props.task;
    const { to, from } = attributes;

    //  place outbound call using Flex DialPad API
    await Flex.Actions.invokeAction('StartOutboundCall', {
      destination: to,
      queueSid,
      callerId: from,
      taskAttributes: {
        type: 'outbound',
        name: `Contact: ${to}`,
        phone: to,
      },
    });
  };

  render() {
    const { attributes } = this.props.task;
    const timeReceived = moment(attributes.callTime.time_recvd);
    const localTz = moment.tz.guess();
    const localTimeShort = timeReceived.tz(localTz).format('MM-D-YYYY, h:mm:ss a z');

    // set recordingURL/transcriptionText for record deletion events
    const markedDeleted = attributes.hasOwnProperty('markDeleted');
    const transcriptText = markedDeleted ? 'No call transcription captured' : attributes.transcriptionText;
    const recordUrl = markedDeleted ? '' : attributes.recordingUrl;
    const count = attributes.placeCallRetry;

    return (
      <span className="Twilio">
        <h1>Contact Voicemail</h1>
        <p>This contact has left a voicemail that requires attention.</p>

        <div style={styles.audioWrapper}>
          <audio style={styles.audio} ref="audio_tag" src={recordUrl} controls />
        </div>
        <div style={styles.transcriptWrapper}>
          <h4 style={styles.h4Title}>Voicemail Transcript</h4>
          <TextField
            id="outlined-multiline-static"
            multiline
            rows="4"
            fullWidth
            InputProps={{
              style: {
                fontSize: '9pt',
              },
            }}
            value={transcriptText}
            variant="outlined"
          />
        </div>
        <h4 style={styles.itemBold}>Voicemail Details</h4>
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
          disabled={attributes.ui_plugin.vmCallButtonAccessibility}
        >
          Call Contact Now ( {attributes.to} )
        </Button>

        <p style={styles.textCenter}>Not answering? Requeue to retry later.</p>
        <Button
          style={styles.cbButton}
          variant="outlined"
          color="primary"
          onClick={async () => this.startTransfer()}
          disabled={count >= 3}
        >
          Requeue Voicemail ( {attributes.placeCallRetry} of 3 )
        </Button>
        <p style={styles.textAlert}>Upon successful contact, delete the recording resources.</p>
        <Button
          style={styles.cbButton}
          variant="contained"
          color="secondary"
          onClick={async () => this.deleteResources()}
          disabled={attributes.ui_plugin.vmRecordButtonAccessibility}
        >
          Delete Recordings
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
  vmCallButtonAccessibility: state['in-queue-redux'].InQueueMessaging.vmCallButtonAccessibility,
  vmRecordButtonAccessibility: state['in-queue-redux'].InQueueMessaging.vmRecordButtonAccessibility,
});

/*
 *  Define mapping of local component methods to Redux Action methods for updating the store
 *
 *  Syntax:
 *  <Comp_Method> : bindActionCreators( Actions.<action_method>, dispatch)
 *
 */
const mapDispatchToProps = (dispatch) => ({
  vmCallButtonDisable: bindActionCreators(Actions.vmToggleCallButtonDisable, dispatch),
  vmRecordButtonDisable: bindActionCreators(Actions.vmToggleRecordButtonDisable, dispatch),
});

export default connect(mapStateToProps, mapDispatchToProps)(InQueueVoicemailComponent);
