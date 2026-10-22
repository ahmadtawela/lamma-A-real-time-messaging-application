// Event names. Laravel side: broadcastAs() returns the same string (listen with a leading dot: '.MessageSent').
export const EVENTS = {
  MessageSent: 'MessageSent', MessageDelivered: 'MessageDelivered', MessageRead: 'MessageRead',
  MessageEdited: 'MessageEdited', MessageDeleted: 'MessageDeleted', MessageReactionAdded: 'MessageReactionAdded',
  UserTyping: 'UserTyping', UserStoppedTyping: 'UserStoppedTyping',
  UserOnline: 'UserOnline', UserOffline: 'UserOffline',
  CallIncoming: 'CallIncoming', CallAnswered: 'CallAnswered', CallIce: 'CallIce', CallEnded: 'CallEnded',
  UserJoinedGroup: 'UserJoinedGroup', UserLeftGroup: 'UserLeftGroup',
};
export const EVENT_NAMES = Object.values(EVENTS);
