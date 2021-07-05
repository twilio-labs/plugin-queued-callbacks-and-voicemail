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
  // Agent audible alert sound file - task attribute value
  VoiceMailAlertTone: '/assets/alertTone.mp3',
  // Timezone configuration
  TimeZone: 'America/Los_Angeles',
  CallbackAlertTone: '/assets/alertTone.mp3',
  CallbackTaskPriority: 50,
};
