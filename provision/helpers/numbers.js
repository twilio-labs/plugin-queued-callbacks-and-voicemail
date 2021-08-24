async function fetchIncomingPhoneNumbers(twilioClient) {
  const incomingNumbers = await twilioClient.incomingPhoneNumbers.list({ limit: 20 });
  return incomingNumbers.map((number) => ({ name: number.phoneNumber, value: number.sid }));
}

async function updatePhoneNumber(twilioClient, inboundPhoneNumberSid, attributes) {
  return twilioClient.incomingPhoneNumbers(inboundPhoneNumberSid).update(attributes);
}

module.exports = { fetchIncomingPhoneNumbers, updatePhoneNumber };
