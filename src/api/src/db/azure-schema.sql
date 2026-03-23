-- Azure SQL schema for SkafoldAI
-- Run this once to create tables when using DATABASE_URL

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users')
CREATE TABLE users (
  id NVARCHAR(36) PRIMARY KEY,
  email NVARCHAR(255) UNIQUE NOT NULL,
  display_name NVARCHAR(255),
  created_at DATETIME2 DEFAULT GETUTCDATE()
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'goals')
CREATE TABLE goals (
  id NVARCHAR(36) PRIMARY KEY,
  user_id NVARCHAR(36) NOT NULL,
  title NVARCHAR(500) NOT NULL,
  color_hex NVARCHAR(20),
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'playbooks')
CREATE TABLE playbooks (
  id NVARCHAR(36) PRIMARY KEY,
  user_id NVARCHAR(36) NOT NULL,
  title NVARCHAR(500) NOT NULL,
  type NVARCHAR(50) NOT NULL CHECK (type IN ('repeat', 'playbook')),
  steps NVARCHAR(MAX) NOT NULL,
  last_used_at DATETIME2,
  suggested_by_ai INT DEFAULT 0,
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tasks')
CREATE TABLE tasks (
  id NVARCHAR(36) PRIMARY KEY,
  user_id NVARCHAR(36) NOT NULL,
  goal_id NVARCHAR(36),
  playbook_id NVARCHAR(36),
  title NVARCHAR(500) NOT NULL,
  status NVARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'paused', 'done')),
  type NVARCHAR(50) NOT NULL CHECK (type IN ('one_off', 'repeat', 'playbook')),
  dependency_task_id NVARCHAR(36),
  recurrence_rule NVARCHAR(20) CHECK (recurrence_rule IN ('daily', 'weekly', 'monthly')),
  planned_for DATE,
  timebox_minutes INT,
  next_step NVARCHAR(500),
  top3_candidate INT DEFAULT 0,
  top3_rank INT,
  color_hex NVARCHAR(20),
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  completed_at DATETIME2,
  paused_until DATETIME2,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (goal_id) REFERENCES goals(id),
  FOREIGN KEY (playbook_id) REFERENCES playbooks(id),
  FOREIGN KEY (dependency_task_id) REFERENCES tasks(id)
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'decisions')
CREATE TABLE decisions (
  id NVARCHAR(36) PRIMARY KEY,
  user_id NVARCHAR(36) NOT NULL,
  task_id NVARCHAR(36) NOT NULL,
  question NVARCHAR(MAX) NOT NULL,
  options NVARCHAR(MAX) NOT NULL,
  chosen_option INT NOT NULL,
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'brain_dumps')
CREATE TABLE brain_dumps (
  id NVARCHAR(36) PRIMARY KEY,
  user_id NVARCHAR(36) NOT NULL,
  raw_text NVARCHAR(MAX) NOT NULL,
  week_start NVARCHAR(10) NOT NULL,
  converted_at DATETIME2,
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'focus_sentences')
CREATE TABLE focus_sentences (
  id NVARCHAR(36) PRIMARY KEY,
  user_id NVARCHAR(36) NOT NULL,
  sentence NVARCHAR(500) NOT NULL,
  date NVARCHAR(10) NOT NULL,
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  UNIQUE (user_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'user_settings')
CREATE TABLE user_settings (
  user_id NVARCHAR(36) PRIMARY KEY,
  high_contrast INT DEFAULT 0,
  font_size_percent INT DEFAULT 100,
  dyslexia_font INT DEFAULT 0,
  reduce_motion INT DEFAULT 0,
  focus_mode INT DEFAULT 0,
  dark_mode INT DEFAULT 0,
  sensory_theme NVARCHAR(20) DEFAULT 'calm',
  celebrations_enabled INT DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('user_settings') AND name = 'reduce_motion') ALTER TABLE user_settings ADD reduce_motion INT DEFAULT 0;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('user_settings') AND name = 'focus_mode') ALTER TABLE user_settings ADD focus_mode INT DEFAULT 0;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('user_settings') AND name = 'dark_mode') ALTER TABLE user_settings ADD dark_mode INT DEFAULT 0;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('user_settings') AND name = 'sensory_theme') ALTER TABLE user_settings ADD sensory_theme NVARCHAR(20) DEFAULT 'calm';
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('user_settings') AND name = 'celebrations_enabled') ALTER TABLE user_settings ADD celebrations_enabled INT DEFAULT 1;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('goals') AND name = 'color_hex') ALTER TABLE goals ADD color_hex NVARCHAR(20);
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('tasks') AND name = 'dependency_task_id') ALTER TABLE tasks ADD dependency_task_id NVARCHAR(36);
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('tasks') AND name = 'recurrence_rule') ALTER TABLE tasks ADD recurrence_rule NVARCHAR(20);
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('tasks') AND name = 'planned_for') ALTER TABLE tasks ADD planned_for DATE;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('tasks') AND name = 'top3_rank') ALTER TABLE tasks ADD top3_rank INT;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('tasks') AND name = 'color_hex') ALTER TABLE tasks ADD color_hex NVARCHAR(20);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_goals_user') CREATE INDEX idx_goals_user ON goals(user_id);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_playbooks_user') CREATE INDEX idx_playbooks_user ON playbooks(user_id);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_tasks_user') CREATE INDEX idx_tasks_user ON tasks(user_id);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_tasks_status') CREATE INDEX idx_tasks_status ON tasks(status);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_decisions_task') CREATE INDEX idx_decisions_task ON decisions(task_id);
