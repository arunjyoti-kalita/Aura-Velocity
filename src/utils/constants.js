export const INITIAL_ACTIVITIES = [
  {
    name: 'Comatose',
    baseColor: '#94a3b8',
    lightColor: '#cbd5e1',
    defaultReferenceLink: null,
    subcategories: [],
    isCustom: false,
    allowsCustomSubcategories: false
  },
  {
    name: 'Spruce_Up',
    baseColor: '#eab308',
    lightColor: '#fde047',
    defaultReferenceLink: null,
    subcategories: [],
    isCustom: false,
    allowsCustomSubcategories: false
  },
  {
    name: 'Bio Fuel',
    baseColor: '#10b981',
    lightColor: '#34d399',
    defaultReferenceLink: null,
    subcategories: [
      { name: 'Lunch', defaultReferenceLink: null },
      { name: 'Dinner', defaultReferenceLink: null }
    ],
    isCustom: false,
    allowsCustomSubcategories: false
  },
  {
    name: 'Boondoggle',
    baseColor: '#94a3b8',
    lightColor: '#cbd5e1',
    defaultReferenceLink: null,
    subcategories: [],
    isCustom: false,
    allowsCustomSubcategories: false
  },
  {
    name: 'PM Archives',
    baseColor: '#3b82f6',
    lightColor: '#60a5fa',
    defaultReferenceLink: null,
    subcategories: [
      { name: 'Basic', defaultReferenceLink: 'https://claude.ai/chat/45950621-f635-4a63-81d9-e371380f614c' },
      { name: 'Technical', defaultReferenceLink: 'https://claude.ai/project/019d5819-f03c-739d-94fd-f999a8ff9be6' }
    ],
    isCustom: false,
    allowsCustomSubcategories: false,
    isSkillBased: true,
    intensity: 85
  },
  {
    name: 'Tech and AI',
    baseColor: '#a855f7',
    lightColor: '#c084fc',
    defaultReferenceLink: null,
    subcategories: [
      { name: 'Data Analytics', defaultReferenceLink: 'https://claude.ai/chat/b5ae3715-3982-40db-9bb2-e583ff19a8ea' },
      { name: 'AI PM', defaultReferenceLink: 'https://claude.ai/chat/bd25b7a7-ef62-471b-a174-fdd3e14711e0' }
    ],
    isCustom: false,
    allowsCustomSubcategories: false,
    isSkillBased: true,
    intensity: 95
  },
  {
    name: 'Tool',
    baseColor: '#06b6d4',
    lightColor: '#67e8f9',
    defaultReferenceLink: null,
    subcategories: [
      { name: 'Python', defaultReferenceLink: null },
      { name: 'SQL', defaultReferenceLink: null },
      { name: 'Excel', defaultReferenceLink: null },
      { name: 'Power BI', defaultReferenceLink: null },
      { name: 'n8n', defaultReferenceLink: null }
    ],
    isCustom: false,
    allowsCustomSubcategories: true,
    isSkillBased: true,
    intensity: 60
  },
  {
    name: 'Isometrics',
    baseColor: '#ef4444',
    lightColor: '#f87171',
    defaultReferenceLink: 'https://my-90-day-glow.lovable.app/',
    subcategories: [
      { name: 'Home Workout', defaultReferenceLink: null },
      { name: 'Walking', defaultReferenceLink: null },
      { name: 'Running', defaultReferenceLink: null }
    ],
    isCustom: false,
    allowsCustomSubcategories: false
  },
  {
    name: 'Cognitive',
    baseColor: '#0ea5e9',
    lightColor: '#38bdf8',
    defaultReferenceLink: null,
    subcategories: [
      { name: 'Spotify', defaultReferenceLink: null },
      { name: 'Movies', defaultReferenceLink: null },
      { name: 'Games', defaultReferenceLink: null },
      { name: 'English', defaultReferenceLink: 'https://claude.ai/chat/c5cf279e-9212-49b4-abaa-c72d6178caa1' },
      { name: 'Books', defaultReferenceLink: 'https://claude.ai/project/019d6ba4-8a06-7101-9f14-050def66e432' }
    ],
    isCustom: false,
    allowsCustomSubcategories: false
  },
  {
    name: 'Armor Equipping',
    baseColor: '#f97316',
    lightColor: '#fb923c',
    defaultReferenceLink: null,
    subcategories: [
      { name: 'Insurance', defaultReferenceLink: 'https://claude.ai/project/019d5e6d-6ce8-7591-a79b-ab3504686da8' },
      { name: 'Finance', defaultReferenceLink: 'https://claude.ai/chat/7c4f4ca9-21a8-44c5-bbba-da4c83cd0753' },
      { name: 'Marketing', defaultReferenceLink: 'https://claude.ai/project/019d67e5-935b-712f-a038-e898ba584fbb' }
    ],
    isCustom: false,
    allowsCustomSubcategories: false,
    isSkillBased: true,
    intensity: 75
  },
  {
    name: 'Extra',
    baseColor: '#ec4899',
    lightColor: '#f472b6',
    defaultReferenceLink: null,
    subcategories: [],
    isCustom: false,
    allowsCustomSubcategories: true
  }
];
