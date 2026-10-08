import express from "express";
import bcrypt from "bcrypt";
import pool from "./db.js";
const app = express();

app.use(express.json());

pool.query("SELECT NOW()", (error, result) => {
  if (error) {
    console.log("Database Failed", error);
  } else {
    console.log("Database is connected", result.rows);
  }
});
app.get("/tasks/overdue", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM tasks
       WHERE due_date < CURRENT_DATE
       AND status != 'completed'`
    );

    res.json(result.rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error"
    });
  }
});
app.get("/tasks", async (req, res) => {
  const { status, page = 1, limit = 5, sort = "created_at" } = req.query;

  const allowedSort = ["created_at", "due_date", "title"];

  if (!allowedSort.includes(sort)) {
    return res.status(400).json({
      message: "Invalid sort field"
    });
  }

  const offset = (page - 1) * limit;

  let result;

  if (status) {
    result = await pool.query(
      `SELECT * FROM tasks 
       WHERE status = $1 
       ORDER BY ${sort} 
       LIMIT $2 OFFSET $3`,
      [status, limit, offset]
    );
  } else {
    result = await pool.query(
      `SELECT * FROM tasks 
       ORDER BY ${sort} 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
  }

  res.json(result.rows);
});
app.get("/users", async (req, res) => {
  const result = await pool.query("SELECT * FROM users");
  res.json(result.rows);
});

app.post("/users", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email",
      [name, email, hashedPassword]
    );

    res.json(result.rows[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error"
    });
  }
});
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    console.log(password, user.password, isMatch);
    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error"
    });
  }
});
app.put("/users/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await pool.query(
    'UPDATE users SET name = $1, email = $2, password = $3 WHERE id = $4 RETURNING *',
    [name, email, hashedPassword, id]
  );
  res.json(result.rows[0]);
});
app.patch("/users/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await pool.query(
    'UPDATE users SET name = $1, email = $2, password = $3 WHERE id = $4 RETURNING *',
    [name, email, hashedPassword, id]
  );
  res.json(result.rows[0]);
});

app.delete("/users/:id", async (req, res) => {
  const { id } = req.params;
  const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
  res.json(result.rows[0]);
});
app.get("/projects", async (req, res) => {
   const result = await pool.query('SELECT * FROM projects');
   res.json(result.rows);
});
app.post("/projects", async (req, res) => {
  try {
    const { name, user_id, description } = req.body;

    if (!name || !user_id) {
      return res.status(400).json({
        message: "Name and user_id are required"
      });
    }

    const result = await pool.query(
      'INSERT INTO projects (name, user_id, description) VALUES ($1, $2, $3) RETURNING *',
      [name, user_id, description]
    );

    res.json(result.rows[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error"
    });
  }
});

app.post("/tasks", async (req, res) => {
  try {
    const { title, description, status, project_id, user_id, due_date } = req.body;

    if (!title || !status || !project_id || !user_id) {
      return res.status(400).json({
        message: "Title, status, project_id, and user_id are required"
      });
    }

    const result = await pool.query(
      'INSERT INTO tasks (title, description, status, project_id, user_id, created_at, due_date) VALUES ($1, $2, $3, $4, $5, NOW(), $6) RETURNING *',
      [title, description, status, project_id, user_id, due_date]
    );

    res.json(result.rows[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error"
    });
  }
});

app.put("/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, project_id, user_id, due_date } = req.body;

    if (!title || !status || !project_id || !user_id) {
      return res.status(400).json({
        message: "Title, status, project_id, and user_id are required"
      });
    }

    const result = await pool.query(
      `UPDATE tasks
       SET title = $1,
           description = $2,
           status = $3,
           project_id = $4,
           user_id = $5,
           due_date = $6
       WHERE id = $7
       RETURNING *`,
      [title, description, status, project_id, user_id, due_date, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Task not found"
      });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error"
    });
  }
});

app.patch("/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, project_id, user_id, due_date } = req.body;

    if (!title || !status || !project_id || !user_id) {
      return res.status(400).json({
        message: "Title, status, project_id, and user_id are required"
      });
    }

    const result = await pool.query(
      'UPDATE tasks SET title = $1, description = $2, status = $3, project_id = $4, user_id = $5, due_date = $6 WHERE id = $7 RETURNING *',
      [title, description, status, project_id, user_id, due_date, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Task not found"
      });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error"
    });
  }
});
    
app.delete("/tasks/:id", async (req, res) => {
  const { id } = req.params;
  const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [id]);
  res.json(result.rows[0]);
}); 

app.get("/projects/:id/tasks", async (req, res) => {
  const { id } = req.params;
  const result = await pool.query('SELECT * FROM tasks WHERE project_id = $1', [id]);
  res.json(result.rows);
}); 

app.put("/projects/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, user_id, description } = req.body;

    if (!name || !user_id) {
      return res.status(400).json({
        message: "Name and user_id are required"
      });
    }

    const result = await pool.query(
      `UPDATE projects
       SET name = $1, user_id = $2, description = $3
       WHERE id = $4
       RETURNING *`,
      [name, user_id, description, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Project not found"
      });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error"
    });
  }
});

app.patch("/projects/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, user_id, description } = req.body;

    if (!name || !user_id) {
      return res.status(400).json({
        message: "Name and user_id are required"
      });
    }

    const result = await pool.query(
      `UPDATE projects
       SET name = $1, user_id = $2, description = $3
       WHERE id = $4
       RETURNING *`,
      [name, user_id, description, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Project not found"
      });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error"
    });
  }
});

    

app.delete("/projects/:id", async (req, res) => {
  const { id } = req.params;
  const result = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING *', [id]);
  res.json(result.rows[0]);
}); 

app.get("/tasks/details", async (req, res) => {
  const result = await pool.query(
    'SELECT tasks.*, projects.name as project_name FROM tasks JOIN projects ON tasks.project_id = projects.id'
  );
  res.json(result.rows);
});

app.get("/users/:id/projects", async (req, res) => {
  const { id } = req.params;
  const result = await pool.query('SELECT * FROM projects WHERE user_id = $1', [id]);
  res.json(result.rows);
});
app.get("/users/:id/tasks", async (req, res) => {
  const { id } = req.params;
  const result = await pool.query('SELECT * FROM tasks WHERE user_id = $1', [id]);
  res.json(result.rows);
}); 

app.get("/projects/:id/users", async (req, res) => {
  const { id } = req.params;

  const result = await pool.query(
    `SELECT users.id, users.name, users.email
     FROM users
     JOIN projects ON projects.user_id = users.id
     WHERE projects.id = $1`,
    [id]
  );

  res.json(result.rows);
});

app.get("/tasks", async (req, res) => {
  const { status, page = 1, limit = 5 } = req.query;

  const offset = (page - 1) * limit;

  let result;

  if (status) {
    result = await pool.query(
      'SELECT * FROM tasks WHERE status = $1 LIMIT $2 OFFSET $3',
      [status, limit, offset]
    );
  } else {
    result = await pool.query(
      'SELECT * FROM tasks LIMIT $1 OFFSET $2',
      [limit, offset]
    );
  }

  res.json(result.rows);
});

app.get("/tasks/search", async (req, res) => {
  try {
    const { search } = req.query;

    if (!search) {
      return res.status(400).json({
        message: "Search term is required"
      });
    }

    const result = await pool.query(
      'SELECT * FROM tasks WHERE title ILIKE $1',
      [`%${search}%`]
    );

    res.json(result.rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error"
    });
  }
});

app.get("/dashboard", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed,
        COUNT(*) FILTER (WHERE status = 'pending') AS pending
      FROM tasks
    `);

    res.json(result.rows[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error"
    });
  }
});










app.listen(5000, () => {
    console.log("Server running on port 5000");
});







