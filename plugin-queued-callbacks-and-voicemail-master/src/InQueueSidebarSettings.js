import React from 'react';

import { SideLink, SideLinkProps, Actions } from '@twilio/flex-ui';

export default class InQueueSidebarSettings extends React.Component<
  Partial<SideLinkProps>,
  undefined
> {
  render() {
    return (
      <SideLink
        {...this.props}
        icon='Settings'
        iconActive='SettingsBold'
        isActive={this.props.activeView === 'flex-settings'}
        onClick={() =>
          Actions.invokeAction('NavigateToView', { viewName: 'flex-settings' })
        }
      >
        Settings
      </SideLink>
    );
  }
}
