-- Staff user email/mobile + multi-branch assignment.

ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(200);
ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile VARCHAR(40);

CREATE TABLE IF NOT EXISTS user_branches (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  PRIMARY KEY (user_id, branch_id)
);

CREATE INDEX IF NOT EXISTS ix_user_branches_company ON user_branches(company_id);
CREATE INDEX IF NOT EXISTS ix_user_branches_branch ON user_branches(branch_id);

-- Backfill: existing users with a primary branch get that branch as authorized.
INSERT INTO user_branches (user_id, branch_id, company_id)
SELECT u.id, u.branch_id, u.company_id
FROM users u
WHERE u.branch_id IS NOT NULL
  AND u.company_id IS NOT NULL
ON CONFLICT DO NOTHING;
