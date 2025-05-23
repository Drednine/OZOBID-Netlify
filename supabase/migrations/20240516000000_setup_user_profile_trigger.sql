-- Удаляем старую политику INSERT для public.users, если она существует
DROP POLICY IF EXISTS "Users can insert their own data" ON public.users;

-- Создаем функцию для автоматического создания профиля пользователя в public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public -- SECURITY DEFINER нужен для доступа к auth.users и вставки в public.users
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, company_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'fullName',  -- Используем fullName
    NEW.raw_user_meta_data->>'companyName' -- Используем companyName
  );
  RETURN NEW;
END;
$$;

-- Удаляем старый триггер, если он вдруг существует с таким же именем
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Создаем триггер, который вызывает handle_new_user после каждой вставки в auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); 