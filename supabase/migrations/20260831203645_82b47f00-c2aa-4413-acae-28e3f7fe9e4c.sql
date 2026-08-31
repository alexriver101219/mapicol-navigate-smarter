CREATE TYPE public.plan_tier AS ENUM ('free','pro');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  city TEXT,
  plate TEXT,
  vehicle_type TEXT NOT NULL DEFAULT 'car',
  plan public.plan_tier NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.route_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  origin_label TEXT NOT NULL,
  destination_label TEXT NOT NULL,
  origin_lat DOUBLE PRECISION,
  origin_lng DOUBLE PRECISION,
  destination_lat DOUBLE PRECISION,
  destination_lng DOUBLE PRECISION,
  distance_meters INTEGER,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.route_history TO authenticated;
GRANT ALL ON public.route_history TO service_role;
ALTER TABLE public.route_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own routes" ON public.route_history FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX route_history_user_created_idx ON public.route_history(user_id, created_at DESC);

CREATE TABLE public.saved_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  category TEXT NOT NULL DEFAULT 'favorito',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_places TO authenticated;
GRANT ALL ON public.saved_places TO service_role;
ALTER TABLE public.saved_places ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own places" ON public.saved_places FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan public.plan_tier NOT NULL DEFAULT 'pro',
  status TEXT NOT NULL DEFAULT 'inactive',
  currency TEXT NOT NULL DEFAULT 'COP',
  amount_cents INTEGER NOT NULL DEFAULT 3000000,
  current_period_end TIMESTAMPTZ,
  provider TEXT,
  provider_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subscription select" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.pico_y_placa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  vehicle_type TEXT NOT NULL DEFAULT 'car',
  weekday SMALLINT NOT NULL,
  digits TEXT NOT NULL,
  schedule TEXT NOT NULL,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pico_y_placa TO anon, authenticated;
GRANT ALL ON public.pico_y_placa TO service_role;
ALTER TABLE public.pico_y_placa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read pyp" ON public.pico_y_placa FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.pico_y_placa (city, vehicle_type, weekday, digits, schedule, notes) VALUES
('Bogotá','car',1,'6,7,8,9,0','6:00 a 21:00','Lunes'),
('Bogotá','car',2,'1,2,3,4,5','6:00 a 21:00','Martes'),
('Bogotá','car',3,'6,7,8,9,0','6:00 a 21:00','Miércoles'),
('Bogotá','car',4,'1,2,3,4,5','6:00 a 21:00','Jueves'),
('Bogotá','car',5,'6,7,8,9,0','6:00 a 21:00','Viernes'),
('Medellín','car',1,'6,7','5:00 a 20:00','Lunes'),
('Medellín','car',2,'8,9','5:00 a 20:00','Martes'),
('Medellín','car',3,'0,1','5:00 a 20:00','Miércoles'),
('Medellín','car',4,'2,3','5:00 a 20:00','Jueves'),
('Medellín','car',5,'4,5','5:00 a 20:00','Viernes'),
('Cali','car',1,'1,2','6:00 a 19:00','Lunes'),
('Cali','car',2,'3,4','6:00 a 19:00','Martes'),
('Cali','car',3,'5,6','6:00 a 19:00','Miércoles'),
('Cali','car',4,'7,8','6:00 a 19:00','Jueves'),
('Cali','car',5,'9,0','6:00 a 19:00','Viernes'),
('Barranquilla','car',1,'1,2','7:00 a 19:00','Lunes'),
('Barranquilla','car',2,'3,4','7:00 a 19:00','Martes'),
('Barranquilla','car',3,'5,6','7:00 a 19:00','Miércoles'),
('Barranquilla','car',4,'7,8','7:00 a 19:00','Jueves'),
('Barranquilla','car',5,'9,0','7:00 a 19:00','Viernes'),
('Bucaramanga','car',1,'1,2','6:30 a 19:30','Lunes'),
('Bucaramanga','car',2,'3,4','6:30 a 19:30','Martes'),
('Bucaramanga','car',3,'5,6','6:30 a 19:30','Miércoles'),
('Bucaramanga','car',4,'7,8','6:30 a 19:30','Jueves'),
('Bucaramanga','car',5,'9,0','6:30 a 19:30','Viernes');

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();