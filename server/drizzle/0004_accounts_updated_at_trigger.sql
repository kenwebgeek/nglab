-- Custom SQL migration file, put your code below! --
-- Reuses set_updated_at() from 0002 to keep accounts.updated_at current on every UPDATE.
CREATE TRIGGER accounts_set_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
