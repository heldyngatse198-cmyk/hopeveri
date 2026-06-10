-- Ce fichier est une aide. Le backend exécute déjà les CREATE TABLE IF NOT EXISTS.
-- Utilisez-le seulement si vous préférez pré-créer le schéma.

-- Remarque: Supabase peut nécessiter l'exécution en mode SQL Editor.
-- Le schéma ci-dessous est compatible avec les colonnes utilisées par server/src/db.js et server/src/api.js.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key,
  email text unique not null,
  password text not null,
  role text not null default 'user',
  subscription text not null default 'free',
  subscription_end_at timestamptz,
  email_connected boolean not null default false,
  email_provider text,
  confirmed boolean not null default false,
  confirmation_token text,
  confirmation_token_expires_at timestamptz,
  active boolean not null default true,
  daily_quota integer not null default 5,
  quota_reset_at date,
  document_preferences text default '[]',
  auto_sync_enabled boolean not null default false,
  custom_rules text default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.analyses (
  id uuid primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  text_excerpt text not null,
  score integer not null,
  classification text not null,
  profile text not null,
  doc_type text not null,
  action_type text not null default 'detect',
  is_humanized boolean not null default false,
  humanized_text text,
  created_at timestamptz not null default now()
);

create index if not exists idx_analyses_user_id on public.analyses(user_id);
create index if not exists idx_analyses_created_at on public.analyses(created_at);

