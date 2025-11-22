DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS used_nonces;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id TEXT PRIMARY KEY,
    balance INTEGER DEFAULT 0 CHECK (balance >= 0)
);

CREATE TABLE transactions (
    session_id TEXT PRIMARY KEY,
    user_id TEXT,
    agent_id TEXT,
    cost INTEGER,
    timestamp INTEGER
);

CREATE TABLE used_nonces (
    nonce TEXT PRIMARY KEY,
    expires_at INTEGER
);

-- 初始化测试数据
INSERT INTO users (id, balance) VALUES ('test_user', 1000);

#操作指令
#wrangler d1 execute mulerun-metering --remote --file=./schema.sql
#wrangler d1 execute mulerun-metering --remote --command="INSERT OR IGNORE INTO users (id, balance) VALUES ('c39013fc1e96154e58c190056352f929027c64d9badca5777d7857463935642e', 10000);"
#wrangler d1 execute mulerun-metering --remote --command="SELECT * FROM users;"
