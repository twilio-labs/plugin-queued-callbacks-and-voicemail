import React from 'react';
import * as Flex from '@twilio/flex-ui';
import moment from 'moment';
import 'moment-timezone';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Tooltip from '@material-ui/core/Tooltip';
import Icon from '@material-ui/core/Icon';

import styles from './VoicemailStyles';
import { inqueueUtils } from '../common';

export default class VoicemailComponent extends React.Component {
  static displayName = 'VoicemailComponent';

  constructor(props) {
    super(props);

    this.state = {};
  }

  /*
   * create outbound call from Flex using Actions API 'StartOutboundCall'
   *
   */
  vmCallButtonAccessibility = async (state) => inqueueUtils(this.props.task, 'voicemail', state);

  startTransfer = async () => inqueueUtils(this.props.task);

  // web service call to delete the call recording/transcript
  deleteResources = async () => inqueueUtils.deleteResource(this.props.task);

  startCall = async () => {
    const manager = Flex.Manager.getInstance();
    const activityName = manager.workerClient.activity.name;
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
