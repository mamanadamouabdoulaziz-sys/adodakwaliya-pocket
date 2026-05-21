
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

INSERT INTO public.products (name, category, price, in_stock) VALUES
('Bazin Gezner', 'Bazin', 0, true),
('Bazin XL', 'Bazin', 0, true),
('Bazin Champion', 'Bazin', 0, true),
('Bazin Palman', 'Bazin', 0, true),
('Bazin Riche', 'Bazin', 0, true),
('Pagne Wax', 'Pagne', 0, true),
('Pagne UniWax', 'Pagne', 0, true),
('Pagne Chiganbi', 'Pagne', 0, true),
('Tissu', 'Tissu', 0, true),
('Tissu 3 étoiles', 'Tissu', 0, true),
('Tissu 5 étoiles', 'Tissu', 0, true),
('Tissu 7 étoiles', 'Tissu', 0, true),
('Leche Simple', 'Leche', 0, true),
('Leche Capacity', 'Leche', 0, true);

CREATE TYPE public.purchase_status AS ENUM ('pending', 'approved', 'rejected', 'fulfilled');

CREATE TABLE public.purchase_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  note TEXT,
  status public.purchase_status NOT NULL DEFAULT 'pending',
  admin_reply TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PR: user inserts own" ON public.purchase_requests
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "PR: user reads own or admin" ON public.purchase_requests
FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "PR: admin updates" ON public.purchase_requests
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_purchase_requests_updated_at
BEFORE UPDATE ON public.purchase_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.notify_admins_purchase_request()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p_name text; admin_rec record;
BEGIN
  SELECT name INTO p_name FROM public.products WHERE id = NEW.product_id;
  FOR admin_rec IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
    INSERT INTO public.notifications(user_id, title, body)
    VALUES (admin_rec.user_id, 'Nouvelle demande d''achat',
            'Quantité ' || NEW.quantity || ' de ' || COALESCE(p_name, 'produit'));
  END LOOP;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_admins_purchase
AFTER INSERT ON public.purchase_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_purchase_request();

CREATE OR REPLACE FUNCTION public.notify_user_purchase_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p_name text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status OR NEW.admin_reply IS DISTINCT FROM OLD.admin_reply THEN
    SELECT name INTO p_name FROM public.products WHERE id = NEW.product_id;
    INSERT INTO public.notifications(user_id, title, body)
    VALUES (NEW.user_id, 'Mise à jour de votre demande',
            'Produit: ' || COALESCE(p_name, '') || ' — Statut: ' || NEW.status::text ||
            COALESCE(E'\nRéponse: ' || NEW.admin_reply, ''));
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_user_purchase_update
AFTER UPDATE ON public.purchase_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_user_purchase_update();
