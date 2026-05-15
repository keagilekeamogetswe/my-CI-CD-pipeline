import express from 'express';
const app = express();

app.use(express.json());

// In-memory storage
const users = [];

/**
 * GET all users
 */
app.get('/user', (req, res) => {
  res.json(users);
  console.log("Users retrieved");
});

/**
 * POST - create new user
 */
app.post('/user', (req, res) => {
  const { name, lastname, age } = req.body;

  const newUser = {
    id: users.length + 1,   // simple ID generator
    name,
    lastname,
    age
  };

  users.push(newUser);

  res.status(201).json({ success: true, user: newUser });
  console.log("User created:", newUser);
});

/**
 * PUT - update user
 */
app.put('/user/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const { name, lastname, age } = req.body;

  const user = users.find(u => u.id === userId);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // Update fields if provided
  user.name = name ?? user.name;
  user.lastname = lastname ?? user.lastname;
  user.age = age ?? user.age;

  res.json({ success: true, user });
  console.log("User updated:", user);
});

/**
 * DELETE - delete user
 */
app.delete('/user/:id', (req, res) => {
  const userId = parseInt(req.params.id);

  const index = users.findIndex(u => u.id === userId);

  if (index === -1) {
    return res.status(404).json({ error: "User not found" });
  }

  const deletedUser = users.splice(index, 1);

  res.json({ success: true, deletedUser });
  console.log("User deleted:", deletedUser);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});