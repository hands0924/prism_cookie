alter table submissions
add column if not exists support_message text not null default '';
