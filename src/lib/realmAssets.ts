import { RealmId, TournamentTaskType } from '../shared/gameTypes.ts';

export const REALM_IMAGES: Record<RealmId, string> = {
  jungle: '/src/assets/images/track_jungle_forest_1795001060343.jpg',
  desert: '/src/assets/images/track_desert_scarab_1795001060428.jpg',
  dragon: '/src/assets/images/track_dragon_volcano_1795001060340.jpg',
  neon: '/src/assets/images/track_hyperion_skyfall_1795001061506.jpg',
};

export const REALM_IMAGE_TITLES: Record<RealmId, string> = {
  jungle: 'Rainforest Canopy, Waterfalls, Bridges & Forest Pits',
  desert: 'Sunlit Sand Dunes, Pyramids, Scorpions & Mummies',
  dragon: 'Volcanic Mountains, Lava Rivers, Dragon Eggs & Dragons',
  neon: 'Futuristic Skyways, Skyscrapers, Drones & Road Bumps',
};

export const TOURNAMENT_GRAPHICS: Record<
  TournamentTaskType,
  { src: string; underlyingTitle: string }
> = {
  collect_boosts: {
    src: '/src/assets/images/tourney_boost_sprint_1795003179712.jpg',
    underlyingTitle: 'Velocity Boost Trial — Collect green boost perks to clear the stage',
  },
  collect_hearts: {
    src: '/src/assets/images/tourney_life_endurance_1795003180147.jpg',
    underlyingTitle: 'Lifeline Survival Trial — Gather blue life springs & protect your 3 lives',
  },
  collect_caches: {
    src: '/src/assets/images/tourney_relic_hunt_1795003180154.jpg',
    underlyingTitle: 'Relic Cache Hunt — Secure green power-up cache icons along the trail',
  },
  collect_perks: {
    src: '/src/assets/images/tourney_relic_hunt_1795003180154.jpg',
    underlyingTitle: 'Perk Sweep Tournament — Collect green & blue beneficial icons to win',
  },
  clear_obstacles: {
    src: '/src/assets/images/tourney_life_endurance_1795003180147.jpg',
    underlyingTitle: 'Obstacle Hurdle Qualifier — Dodge or jump cleanly past red obstacles to qualify',
  },
  distance_sprint: {
    src: '/src/assets/images/tourney_apex_finale_1795003181214.jpg',
    underlyingTitle: 'Finish Gate Sprint — Outrun rivals & cross the golden finish arch first',
  },
};
