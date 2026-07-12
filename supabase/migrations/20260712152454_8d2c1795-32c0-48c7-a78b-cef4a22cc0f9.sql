
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refunded_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'payment_status' AND e.enumlabel = 'partially_refunded'
  ) THEN
    ALTER TYPE public.payment_status ADD VALUE 'partially_refunded';
  END IF;
END $$;
