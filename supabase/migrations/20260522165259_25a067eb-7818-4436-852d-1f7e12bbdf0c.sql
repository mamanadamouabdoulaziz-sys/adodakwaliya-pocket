CREATE OR REPLACE FUNCTION public.approve_purchase_request(_request_id uuid, _reply text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id uuid := auth.uid();
  req record;
  product record;
  total numeric;
  user_balance numeric;
  user_suspended boolean;
  tx_id uuid;
  ref text;
BEGIN
  IF NOT public.has_role(admin_id, 'admin') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs';
  END IF;

  SELECT * INTO req FROM public.purchase_requests WHERE id = _request_id FOR UPDATE;
  IF req.id IS NULL THEN RAISE EXCEPTION 'Demande introuvable'; END IF;
  IF req.status <> 'pending' THEN RAISE EXCEPTION 'Demande déjà traitée'; END IF;

  SELECT * INTO product FROM public.products WHERE id = req.product_id;
  IF product.id IS NULL THEN RAISE EXCEPTION 'Produit introuvable'; END IF;
  total := product.price * req.quantity;

  SELECT balance, suspended INTO user_balance, user_suspended
  FROM public.profiles WHERE id = req.user_id FOR UPDATE;
  IF user_suspended THEN RAISE EXCEPTION 'Compte utilisateur suspendu'; END IF;
  IF user_balance < total THEN RAISE EXCEPTION 'Solde utilisateur insuffisant'; END IF;

  UPDATE public.profiles SET balance = balance - total, updated_at = now() WHERE id = req.user_id;
  UPDATE public.profiles SET balance = balance + total, updated_at = now() WHERE id = admin_id;

  ref := 'TX-' || to_char(now(),'YYYYMMDDHH24MISS') || '-' || substr(md5(random()::text),1,6);
  INSERT INTO public.transactions(reference, type, from_user, to_user, amount, note)
  VALUES (ref, 'user_to_admin', req.user_id, admin_id, total,
          'Achat: ' || product.name || ' ×' || req.quantity)
  RETURNING id INTO tx_id;

  UPDATE public.purchase_requests
  SET status = 'approved', admin_reply = _reply, updated_at = now()
  WHERE id = _request_id;

  INSERT INTO public.notifications(user_id, title, body)
  VALUES (req.user_id, 'Paiement effectué',
    'Votre commande ' || product.name || ' ×' || req.quantity ||
    ' a été approuvée. ' || total || ' XOF débité. Réf: ' || ref);

  RETURN tx_id;
END;
$$;