CREATE OR REPLACE FUNCTION public.generate_account_number()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  n text;
  exists_count int;
BEGIN
  LOOP
    n := 'SBN-' || lpad((floor(random()*100000000))::text, 8, '0');
    SELECT count(*) INTO exists_count FROM public.profiles WHERE account_number = n;
    EXIT WHEN exists_count = 0;
  END LOOP;
  RETURN n;
END;
$$;

UPDATE public.profiles SET account_number = 'SBN-' || substring(account_number from 5)
WHERE account_number LIKE 'ETS-%';