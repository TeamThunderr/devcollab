DO $$ BEGIN
  CREATE TYPE platform_role_enum AS ENUM ('USER', 'SUPER_ADMIN');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS platform_role platform_role_enum DEFAULT 'USER';
