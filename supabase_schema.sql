-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create tables
create table months (
  id text primary key, -- "yyyy-MM"
  user_id uuid references auth.users not null default auth.uid(),
  expected_income numeric not null default 0,
  savings_goal numeric not null default 0,
  updated_at timestamptz default now()
);

create table budgets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null default auth.uid(),
  month_id text not null, -- No FK to months to avoid constraint issues with out-of-order sync
  category text not null,
  planned_amount numeric not null default 0,
  tag text not null default 'Variable',
  updated_at timestamptz default now()
);

create table transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null default auth.uid(),
  budget_id uuid not null, -- No FK to avoid sync issues
  description text not null,
  amount numeric not null default 0,
  date timestamptz not null default now(),
  updated_at timestamptz default now()
);

create table bonds (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null default auth.uid(),
  name text not null,
  amount numeric not null default 0,
  rate numeric not null default 0,
  purchase_date timestamptz not null default now(),
  term_months integer not null default 12,
  updated_at timestamptz default now()
);

-- RLS Policies
alter table months enable row level security;
alter table budgets enable row level security;
alter table transactions enable row level security;
alter table bonds enable row level security;

-- Months Policies
create policy "Users can all their own months" on months for all using (auth.uid() = user_id);

-- Budgets Policies
create policy "Users can all their own budgets" on budgets for all using (auth.uid() = user_id);

-- Transactions Policies
create policy "Users can all their own transactions" on transactions for all using (auth.uid() = user_id);

-- Bonds Policies
create policy "Users can all their own bonds" on bonds for all using (auth.uid() = user_id);
