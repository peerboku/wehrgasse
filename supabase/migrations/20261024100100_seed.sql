-- Fixed data: the 4 flatmates, the 4 chores and the 4-week rotation (CLAUDE.md).

insert into public.members (name, emoji, color) values
  ('Peer', '🦊', '#e8833a'),
  ('Carla', '🐼', '#7a6ff0'),
  ('Noa', '🦉', '#2fa36b'),
  ('Manu', '🐻', '#d9534f');

insert into public.chores (name, icon, sort_order) values
  ('Müll rausbringen', '🗑️', 1),
  ('Bad Noa & Manu', '🛁', 2),
  ('Bad Carla & Peer', '🚿', 3),
  ('Küche & Staubsaugen', '🍳', 4);

-- Written like the table in CLAUDE.md; names are turned into ids by the joins.
insert into public.rotation_template (cycle_week, member_id, chore_id)
select r.cycle_week, m.id, c.id
from (values
  (0, 'Peer', 'Müll rausbringen'),
  (0, 'Carla', 'Bad Carla & Peer'),
  (0, 'Noa', 'Bad Noa & Manu'),
  (0, 'Manu', 'Küche & Staubsaugen'),

  (1, 'Peer', 'Bad Carla & Peer'),
  (1, 'Carla', 'Müll rausbringen'),
  (1, 'Noa', 'Küche & Staubsaugen'),
  (1, 'Manu', 'Bad Noa & Manu'),

  (2, 'Peer', 'Küche & Staubsaugen'),
  (2, 'Carla', 'Bad Carla & Peer'),
  (2, 'Noa', 'Bad Noa & Manu'),
  (2, 'Manu', 'Müll rausbringen'),

  (3, 'Peer', 'Bad Carla & Peer'),
  (3, 'Carla', 'Küche & Staubsaugen'),
  (3, 'Noa', 'Müll rausbringen'),
  (3, 'Manu', 'Bad Noa & Manu')
) as r (cycle_week, member_name, chore_name)
join public.members m on m.name = r.member_name
join public.chores c on c.name = r.chore_name;
