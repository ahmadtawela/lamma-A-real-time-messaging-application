// Channel names as authorised in routes/channels.php.
// Echo adds the "private-" / "presence-" prefix itself, so these are the bare names.
export const channels = {
  user: (userId) => `user.${userId}`,                       // private-user.{userId}
  conversation: (id) => `conversation.${id}`,               // private-conversation.{conversationId}
  conversationPresence: (id) => `conversation.${id}`,       // presence-conversation.{conversationId}
};
