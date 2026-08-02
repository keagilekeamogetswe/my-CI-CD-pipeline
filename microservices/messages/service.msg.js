export const Messages = (() => {
  const messages = [];

  const _sendMessage = (userid, targetUserid, message) => {
    const newMessage = {
      messageId: String(messages.length + 1),
      recipientId: targetUserid,
      success: true,
      message,
      time: new Date().toISOString(),
      status: "DELIVERED"
    };
    messages.push(newMessage);
    return newMessage;
  };

  const _getMessages = (my_user_id) => {
    return messages.filter(
      m => m.recipientId === my_user_id || m.messageId === my_user_id
    );
  };

  return {
    sendMessage: (call, callback)=> {
    const { userid, targetUserid, message } = call.request;
    const newMessage = _sendMessage(userid, targetUserid, message);
    callback(null, newMessage);
  },
  getMessages: (call, callback)=> {
    const { my_user_id } = call.request;
    const userMessages = _getMessages(my_user_id);
    callback(null, { messages: userMessages });
  }
  };
})();
