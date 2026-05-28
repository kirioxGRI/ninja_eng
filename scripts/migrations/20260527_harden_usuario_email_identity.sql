BEGIN;

UPDATE usuario
SET email = lower(btrim(email))
WHERE email IS NOT NULL
  AND email <> lower(btrim(email));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM usuario
    WHERE email IS NULL OR btrim(email) = ''
  ) THEN
    RAISE EXCEPTION 'Migration aborted: usuario.email contains null or blank values.';
  END IF;

  IF EXISTS (
    SELECT lower(btrim(email))
    FROM usuario
    GROUP BY lower(btrim(email))
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Migration aborted: usuario.email contains duplicates after normalization.';
  END IF;
END $$;

ALTER TABLE usuario
ALTER COLUMN email SET NOT NULL;

COMMIT;
