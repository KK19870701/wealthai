-- =============================================
-- WealthAI - Supabase Database Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =============================================
-- PROFILES TABLE
-- =============================================
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  monthly_income numeric(12,2) default 0,
  savings_goal numeric(12,2) default 0,
  currency text default 'INR',
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- =============================================
-- TRANSACTIONS TABLE
-- =============================================
create table transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  amount numeric(12,2) not null,
  type text check (type in ('income', 'expense')) not null,
  category text not null,
  date date not null default current_date,
  note text,
  created_at timestamptz default now()
);

-- Category options: food, transport, shopping, bills, health, entertainment, salary, freelance, other

-- =============================================
-- BUDGETS TABLE
-- =============================================
create table budgets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  category text not null,
  limit_amount numeric(12,2) not null,
  month int not null, -- 1-12
  year int not null,
  created_at timestamptz default now(),
  unique(user_id, category, month, year)
);

-- =============================================
-- BILLS TABLE
-- =============================================
create table bills (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  amount numeric(12,2) not null,
  due_day int not null check (due_day between 1 and 31),
  category text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- Users can only see their own data
-- =============================================
alter table profiles enable row level security;
alter table transactions enable row level security;
alter table budgets enable row level security;
alter table bills enable row level security;

-- Profiles policies
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Transactions policies
create policy "Users can view own transactions" on transactions for select using (auth.uid() = user_id);
create policy "Users can insert own transactions" on transactions for insert with check (auth.uid() = user_id);
create policy "Users can update own transactions" on transactions for update using (auth.uid() = user_id);
create policy "Users can delete own transactions" on transactions for delete using (auth.uid() = user_id);

-- Budgets policies
create policy "Users can view own budgets" on budgets for select using (auth.uid() = user_id);
create policy "Users can insert own budgets" on budgets for insert with check (auth.uid() = user_id);
create policy "Users can update own budgets" on budgets for update using (auth.uid() = user_id);
create policy "Users can delete own budgets" on budgets for delete using (auth.uid() = user_id);

-- Bills policies
create policy "Users can view own bills" on bills for select using (auth.uid() = user_id);
create policy "Users can insert own bills" on bills for insert with check (auth.uid() = user_id);
create policy "Users can update own bills" on bills for update using (auth.uid() = user_id);
create policy "Users can delete own bills" on bills for delete using (auth.uid() = user_id);

-- =============================================
-- SAMPLE DATA (Optional - for testing)
-- Replace 'your-user-id' with actual UUID after signup
-- =============================================
-- insert into transactions (user_id, title, amount, type, category, date) values
--   ('your-user-id', 'Salary - May', 85400, 'income', 'salary', '2026-05-01'),
--   ('your-user-id', 'Swiggy Order', 680, 'expense', 'food', '2026-05-07'),
--   ('your-user-id', 'Ola Ride', 215, 'expense', 'transport', '2026-05-06');
