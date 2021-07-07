import * as Flex from '@twilio/flex-ui';

import { buildUrl, http } from '../../helpers';

const url = buildUrl('/inqueue-utils');

export const callButtonAccessibility = async (task, type, state) => {
  const { taskSid, attributes } = task;
  const data = {
    mode: 'UiPlugin',
    type,
    Token: Flex.Manager.getInstance().user.token,
    taskSid,
    attributes,
    state,
  };

  return http.post(url, data, {
    noJson: true,
    verbose: true,
    title: 'cbUiPlugin web service',
  });
};

export const startTransfer = async (task) => {
  const { taskSid, attributes, workflowSid, queueName } = task;
  const data = {
    mode: 'requeueTasks',
    type: 'callback',
    Token: Flex.Manager.getInstance().user.token,
    taskSid,
    attributes,
    workflowSid,
    queueName,
    state: false,
  };

  return http.post(url, data, { verbose: true, title: 'Requeue web service' });
};

export const deleteResource = async (task) => {
  const { taskSid, workflowSid, queueName, attributes } = task;
  const { recordSid, transcriptSid } = attributes;
  const data = {
    mode: 'deleteRecordResources',
    taskSid,
    recordingSid: recordSid,
    transcriptSid,
    Token: Flex.Manager.getInstance().user.token,
    attributes,
    workflowSid,
    queueName,
  };

  return http.postUrlEncoded(url, data, {
    verbose: true,
    title: 'Delete resource web service',
  });
};
