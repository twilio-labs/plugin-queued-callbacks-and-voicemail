module.exports = {
  sayOptions: { voice: 'Polly.Joanna' },
  holdMusicUrl: '/assets/guitar_music.mp3',
  // Enable Estimated Waiting Time in voice prompt
  getEwt: true,
  //  Time interval (minutes) for Estimated Waiting Time stats
  statPeriod: 5,
  // Enable Queue Position in voice prompt
  getQueuePosition: true,
  // Priority for the Task generatared by the VoiceMail
  VoiceMailTaskPriority: 50,
  // Agent audible alert sound file for voice mail
  VoiceMailAlertTone: '/assets/alertTone.mp3',
  // Priority for the Task generatared by the VoiceMail
  CallbackTaskPriority: 50,
  // Agent audible alert sound file for callback call
  CallbackAlertTone: '/assets/alertTone.mp3',
  // Timezone configuration
  TimeZone: 'America/Los_Angeles',
};
