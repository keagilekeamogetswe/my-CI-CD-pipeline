import express from 'express';
const app = express();

app.use(express.json());

const messages = [];

/**
 * GET messages
 */
app.get('/messages', (req, res) => {
  res.json(messages);
  console.log("Messages retrieved:", messages.length);
});

/**
 * POST message
 */
app.post('/messages', (req, res) => {
  const { userid, targetUserid, message } = req.body;

  const newMessage = {
    id: messages.length + 1,
    userid,
    targetUserid,
    message
  };

  messages.push(newMessage);

  res.status(201).json({ success: true, message: newMessage });
  console.log("Message sent:", newMessage);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
