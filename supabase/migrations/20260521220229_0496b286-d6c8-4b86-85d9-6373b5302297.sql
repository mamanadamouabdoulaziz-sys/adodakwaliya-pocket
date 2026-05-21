
-- 1. Roles enum + table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role helper (SECURITY DEFINER avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text NOT NULL UNIQUE,
  account_number text NOT NULL UNIQUE,
  balance numeric(14,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  suspended boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles: user reads own" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Profiles: user updates own (limited)" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Profiles: admin updates any" ON public.profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Prevent users from changing their own balance / suspended / account_number
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  NEW.balance := OLD.balance;
  NEW.suspended := OLD.suspended;
  NEW.account_number := OLD.account_number;
  NEW.id := OLD.id;
  NEW.phone := OLD.phone; -- phone change requires admin
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_protect_profile BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();

-- 3. Account number generator + signup trigger
CREATE OR REPLACE FUNCTION public.generate_account_number()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  n text;
  exists_count int;
BEGIN
  LOOP
    n := 'ETS-' || lpad((floor(random()*100000000))::text, 8, '0');
    SELECT count(*) INTO exists_count FROM public.profiles WHERE account_number = n;
    EXIT WHEN exists_count = 0;
  END LOOP;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  admin_count int;
  new_role app_role;
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, phone, account_number)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.email),
    public.generate_account_number()
  );

  SELECT count(*) INTO admin_count FROM public.user_roles WHERE role = 'admin';
  IF admin_count < 2 THEN
    new_role := 'admin';
  ELSE
    new_role := 'user';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, new_role);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Transactions
CREATE TYPE public.tx_type AS ENUM ('user_to_admin', 'admin_to_user');
CREATE TYPE public.tx_status AS ENUM ('completed', 'failed');

CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  type tx_type NOT NULL,
  from_user uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  to_user uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  status tx_status NOT NULL DEFAULT 'completed',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tx: participants or admin can view" ON public.transactions
  FOR SELECT TO authenticated
  USING (auth.uid() = from_user OR auth.uid() = to_user OR public.has_role(auth.uid(), 'admin'));

-- No direct insert/update/delete from clients; only via server functions (service role).

-- 5. Products
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric(14,2) NOT NULL DEFAULT 0,
  image_url text,
  category text,
  in_stock boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products public read" ON public.products FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Products admin write" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  body text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Notif: owner read" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Notif: owner mark read" ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 7. RPC: atomic transfer (user -> admin)
CREATE OR REPLACE FUNCTION public.transfer_to_admin(_amount numeric, _admin_id uuid, _note text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  sender_id uuid := auth.uid();
  sender_balance numeric;
  sender_suspended boolean;
  is_admin boolean;
  tx_id uuid;
  ref text;
BEGIN
  IF sender_id IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Montant invalide'; END IF;

  SELECT public.has_role(_admin_id, 'admin') INTO is_admin;
  IF NOT is_admin THEN RAISE EXCEPTION 'Destinataire non administrateur'; END IF;

  SELECT balance, suspended INTO sender_balance, sender_suspended
  FROM public.profiles WHERE id = sender_id FOR UPDATE;
  IF sender_suspended THEN RAISE EXCEPTION 'Compte suspendu'; END IF;
  IF sender_balance < _amount THEN RAISE EXCEPTION 'Solde insuffisant'; END IF;

  UPDATE public.profiles SET balance = balance - _amount, updated_at = now() WHERE id = sender_id;
  UPDATE public.profiles SET balance = balance + _amount, updated_at = now() WHERE id = _admin_id;

  ref := 'TX-' || to_char(now(),'YYYYMMDDHH24MISS') || '-' || substr(md5(random()::text),1,6);
  INSERT INTO public.transactions(reference, type, from_user, to_user, amount, note)
  VALUES (ref, 'user_to_admin', sender_id, _admin_id, _amount, _note)
  RETURNING id INTO tx_id;

  INSERT INTO public.notifications(user_id, title, body)
  VALUES (sender_id, 'Envoi effectué', 'Vous avez envoyé ' || _amount || ' XOF à l''administration. Réf: ' || ref);
  INSERT INTO public.notifications(user_id, title, body)
  VALUES (_admin_id, 'Paiement reçu', 'Réception de ' || _amount || ' XOF d''un utilisateur. Réf: ' || ref);

  RETURN tx_id;
END;
$$;

-- 8. RPC: admin -> user
CREATE OR REPLACE FUNCTION public.admin_send_to_user(_amount numeric, _user_id uuid, _note text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  admin_id uuid := auth.uid();
  admin_balance numeric;
  tx_id uuid;
  ref text;
BEGIN
  IF NOT public.has_role(admin_id, 'admin') THEN RAISE EXCEPTION 'Réservé aux administrateurs'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Montant invalide'; END IF;

  SELECT balance INTO admin_balance FROM public.profiles WHERE id = admin_id FOR UPDATE;
  IF admin_balance < _amount THEN RAISE EXCEPTION 'Solde administrateur insuffisant'; END IF;

  UPDATE public.profiles SET balance = balance - _amount, updated_at = now() WHERE id = admin_id;
  UPDATE public.profiles SET balance = balance + _amount, updated_at = now() WHERE id = _user_id;

  ref := 'TX-' || to_char(now(),'YYYYMMDDHH24MISS') || '-' || substr(md5(random()::text),1,6);
  INSERT INTO public.transactions(reference, type, from_user, to_user, amount, note)
  VALUES (ref, 'admin_to_user', admin_id, _user_id, _amount, _note)
  RETURNING id INTO tx_id;

  INSERT INTO public.notifications(user_id, title, body)
  VALUES (_user_id, 'Recharge reçue', 'Vous avez reçu ' || _amount || ' XOF de l''administration. Réf: ' || ref);

  RETURN tx_id;
END;
$$;

-- 9. RPC: admin suspend / reactivate
CREATE OR REPLACE FUNCTION public.admin_set_suspended(_user_id uuid, _suspended boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Réservé aux administrateurs'; END IF;
  UPDATE public.profiles SET suspended = _suspended, updated_at = now() WHERE id = _user_id;
  INSERT INTO public.notifications(user_id, title, body)
  VALUES (_user_id, CASE WHEN _suspended THEN 'Compte suspendu' ELSE 'Compte réactivé' END,
          CASE WHEN _suspended THEN 'Votre compte a été temporairement suspendu.' ELSE 'Votre compte est de nouveau actif.' END);
END;
$$;

-- Seed a few demo products
INSERT INTO public.products (name, description, price, category, image_url) VALUES
('Pack Mil 50kg', 'Sac de mil de qualité supérieure - 50 kg', 25000, 'Céréales', null),
('Pack Riz 25kg', 'Riz parfumé importé - 25 kg', 18000, 'Céréales', null),
('Huile végétale 20L', 'Bidon d''huile végétale raffinée 20 litres', 22000, 'Huiles', null),
('Sucre cristal 50kg', 'Sucre cristal blanc en sac de 50 kg', 32000, 'Épicerie', null);
