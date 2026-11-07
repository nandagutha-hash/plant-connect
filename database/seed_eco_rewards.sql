INSERT INTO rewards (id, reward_name, credit_cost, description)
VALUES
  (
    'reward-eco-certificate',
    'Eco Certificate',
    100,
    'A digital certificate recognizing verified plantation participation.'
  ),
  (
    'reward-green-warrior',
    'Green Warrior Badge',
    250,
    'A profile badge for citizens maintaining saplings beyond the first growth milestone.'
  ),
  (
    'reward-plantation-recognition',
    'Plantation Recognition Badge',
    500,
    'Recognition for consistent progress uploads and long-term sapling care.'
  ),
  (
    'reward-community-leader',
    'Community Leader Badge',
    900,
    'A premium badge for planters inspiring community participation.'
  )
ON CONFLICT (id) DO UPDATE
SET reward_name = EXCLUDED.reward_name,
    credit_cost = EXCLUDED.credit_cost,
    description = EXCLUDED.description;
