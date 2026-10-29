// Inhalte und Farben aus dem Pfadiprofil (PBS, Ausgabe 2025).
// Die Farben wurden direkt aus dem PDF ausgelesen.

// import.meta.glob gibt es nur in Vite (wird beim Bauen ersetzt); in Node (Testskripte) bleiben die Icons leer
function loadIcons(): Record<string, string> {
  try {
    return import.meta.glob('../../assets/**/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
  } catch {
    return {}
  }
}
const icons = loadIcons()

// macOS speichert Umlaute in Dateinamen zerlegt (NFD), darum normalisieren
const iconsNfc = new Map(Object.entries(icons).map(([k, v]) => [k.normalize('NFC'), v]))

function icon(path: string): string {
  return iconsNfc.get(`../../assets/${path}`.normalize('NFC')) ?? ''
}

export const BLACKBERRY = '#84456E'
export const BLACKBERRY_DARK = '#5C264A'

export type RelationshipId = 'personality' | 'body' | 'spirituality' | 'others' | 'environment'
export type MethodId =
  | 'law'
  | 'symbolism'
  | 'progress'
  | 'action'
  | 'smallGroup'
  | 'community'
  | 'outdoors'
  | 'play'

export interface SubPoint {
  id: string
  name: string
}

export interface ProfileElement<T extends string> {
  id: T
  chapter: string
  name: string
  short: string
  guidingPrinciple: string
  description: string
  color: string
  lightColor: string
  ink: string
  icon: string
  subPoints: SubPoint[]
}

function makeSubPoints(prefix: string, names: string[]): SubPoint[] {
  return names.map((name, i) => ({ id: `${prefix}.${i + 1}`, name }))
}

export const RELATIONSHIPS: ProfileElement<RelationshipId>[] = [
  {
    id: 'personality',
    chapter: '4.1',
    name: 'Beziehung zur Persönlichkeit',
    short: 'Persönlichkeit',
    guidingPrinciple: 'Selbstbewusst und selbstkritisch sein',
    description: 'Verantwortung übernehmen, eine eigene Meinung bilden, Entscheidungen treffen und das eigene Handeln reflektieren.',
    color: '#84A389',
    lightColor: '#D0DFCC',
    ink: '#3F5E45',
    icon: icon('beziehungen/Persönlichkeit.svg'),
    subPoints: makeSubPoints('personality', [
      'Aufgaben und Verantwortlichkeiten',
      'Meinung',
      'Entscheidungen',
      'Selbstbewusstsein',
      'Selbstreflexion',
    ]),
  },
  {
    id: 'body',
    chapter: '4.2',
    name: 'Beziehung zum Körper',
    short: 'Körper',
    guidingPrinciple: 'Sich annehmen und sich ausdrücken',
    description: 'Körperliche und emotionale Bedürfnisse und Grenzen kennenlernen, sich bewegen, Sinne nutzen und sich ausdrücken.',
    color: '#A6C5A1',
    lightColor: '#E3EDE0',
    ink: '#4C6B47',
    icon: icon('beziehungen/Körper.svg'),
    subPoints: makeSubPoints('body', [
      'Bewegung',
      'Bedürfnisse / Selbstakzeptanz',
      'Gesundheit',
      'Wahrnehmung / Sinne',
      'Ausdruck',
    ]),
  },
  {
    id: 'spirituality',
    chapter: '4.3',
    name: 'Beziehung zum Spirituellen',
    short: 'Spirituelles',
    guidingPrinciple: 'Offen sein und nachdenken',
    description: 'Lebensfreude, ruhige Momente, Traditionen, über Glauben und Werte nachdenken und sich als Teil der Pfadi fühlen.',
    color: '#E59155',
    lightColor: '#F2C4A0',
    ink: '#8A4A1C',
    icon: icon('beziehungen/Spirituellen.svg'),
    subPoints: makeSubPoints('spirituality', ['Lebensfreude', 'Ruhe', 'Traditionen', 'Glaube', 'Werte', 'Ich als Pfadi']),
  },
  {
    id: 'others',
    chapter: '4.4',
    name: 'Beziehung zu den Mitmenschen',
    short: 'Mitmenschen',
    guidingPrinciple: 'Anderen begegnen und sie respektieren',
    description: 'Zugehörigkeit erleben, Regeln für das Zusammenleben gestalten, offen sein, helfen, sich austauschen und gemeinsam feiern.',
    color: '#C4A4C2',
    lightColor: '#E6D8E5',
    ink: '#6E4A6B',
    icon: icon('beziehungen/Mitmenschen.svg'),
    subPoints: makeSubPoints('others', [
      'Zugehörigkeit',
      'Zusammenleben',
      'Offenheit',
      'Hilfsbereitschaft',
      'Austausch',
      'Feiern',
    ]),
  },
  {
    id: 'environment',
    chapter: '4.5',
    name: 'Beziehung zur Umwelt',
    short: 'Umwelt',
    guidingPrinciple: 'Kreativ sein und umweltbewusst handeln',
    description: 'Den Lebensraum entdecken, kreativ mit einfachen Mitteln gestalten, nachhaltig handeln und die Natur schützen.',
    color: '#DECEDE',
    lightColor: '#F0E8F0',
    ink: '#6E4A6B',
    icon: icon('beziehungen/Umwelt.svg'),
    subPoints: makeSubPoints('environment', ['Lebensraum', 'Nachhaltigkeit', 'Kreativität', 'Naturverbundenheit', 'Umweltschutz']),
  },
]

export const METHODS: ProfileElement<MethodId>[] = [
  {
    id: 'law',
    chapter: '5.1',
    name: 'Gesetz und Versprechen',
    short: 'Gesetz & Versprechen',
    guidingPrinciple: 'Gemeinsame Werte leben',
    description: 'Pfadigesetz als gemeinsame Regeln und geteilte Werte, Versprechen als Schritt zum persönlichen Ideal.',
    color: '#E59155',
    lightColor: '#F2C4A0',
    ink: '#8A4A1C',
    icon: icon('methoden/Gesetz_und_Versprechen.svg'),
    subPoints: makeSubPoints('law', [
      'Das Gesetz – gemeinsame Regeln',
      'Das Gesetz – geteilte Werte',
      'Das Versprechen – auf dem Weg zum persönlichen Ideal',
    ]),
  },
  {
    id: 'symbolism',
    chapter: '5.2',
    name: 'Symbolik und Rituale',
    short: 'Symbolik & Rituale',
    guidingPrinciple: 'Identität und Struktur schaffen',
    description: 'Stufensymbolik, Traditionen und Rituale geben Zugehörigkeit und Struktur, Erfolge werden gefeiert.',
    color: '#EBC572',
    lightColor: '#F4DFB3',
    ink: '#7A5A12',
    icon: icon('methoden/Symbolik_und_Rituale.svg'),
    subPoints: makeSubPoints('symbolism', [
      'Eine gemeinsame Identität bilden',
      'Gruppenzugehörigkeit stärken',
      'Alltag strukturieren',
      'Erfolge feiern',
    ]),
  },
  {
    id: 'progress',
    chapter: '5.3',
    name: 'Persönlicher Fortschritt',
    short: 'Pers. Fortschritt',
    guidingPrinciple: 'Selbstbestimmt lernen',
    description: 'Teilnehmende stehen im Zentrum ihres Lernprozesses, werden begleitet und entwickeln Fähigkeiten weiter.',
    color: '#A1D9D4',
    lightColor: '#CFEAE7',
    ink: '#2E6E68',
    icon: icon('methoden/Persönlicher_Fortschritt.svg'),
    subPoints: makeSubPoints('progress', [
      'Selbstbestimmtes Lernen',
      'Fortschritt fördern',
      'Fähigkeiten erlangen, nutzen und weiterentwickeln',
    ]),
  },
  {
    id: 'action',
    chapter: '5.4',
    name: 'Lernen durch Handeln',
    short: 'Lernen durch Handeln',
    guidingPrinciple: 'Erleben, ausprobieren, reflektieren',
    description: 'Lernen durch Erlebnisse statt Theorie: Dinge ausprobieren, scheitern dürfen und darüber nachdenken.',
    color: '#C4A4C2',
    lightColor: '#DECEDE',
    ink: '#6E4A6B',
    icon: icon('methoden/Lernen_durch_Handeln.svg'),
    subPoints: makeSubPoints('action', ['Erleben', 'Ausprobieren', 'Reflektieren']),
  },
  {
    id: 'smallGroup',
    chapter: '5.5',
    name: 'Leben in der kleinen Gruppe',
    short: 'Kleine Gruppe',
    guidingPrinciple: 'Gemeinsam Verantwortung tragen',
    description: 'In kleinen Gruppen zusammenleben, eine aktive Rolle übernehmen, mitbestimmen und Vielfalt schätzen.',
    color: '#E17850',
    lightColor: '#EBA685',
    ink: '#8A3517',
    icon: icon('methoden/Leben_in_der_kleinen_Gruppe.svg'),
    subPoints: makeSubPoints('smallGroup', ['Gruppenprinzip', 'Verantwortung tragen', 'Mitbestimmen', 'Zugehörigkeit und Diversität']),
  },
  {
    id: 'community',
    chapter: '5.6',
    name: 'Engagement für die Gemeinschaft',
    short: 'Gemeinschaft',
    guidingPrinciple: 'Sich für andere einsetzen',
    description: 'Gemeinnützige Aktionen, gemeinsames Handeln lernen und sich auf die Teilnahme an der Gesellschaft vorbereiten.',
    color: '#A6C5A1',
    lightColor: '#D0DFCC',
    ink: '#4C6B47',
    icon: icon('methoden/Engagement_für_die_Gemeinschaft.svg'),
    subPoints: makeSubPoints('community', [
      'Pfadi für die Gemeinschaft',
      'Gemeinsames Handeln erlernen',
      'Auf dem Weg zur gesellschaftlichen Teilnahme',
    ]),
  },
  {
    id: 'outdoors',
    chapter: '5.7',
    name: 'Leben im Freien',
    short: 'Leben im Freien',
    guidingPrinciple: 'Die Natur entdecken und schützen',
    description: 'Die Umwelt entdecken, mit einfachen Mitteln draussen leben, die Natur bewusst wahrnehmen und schützen.',
    color: '#81A3D5',
    lightColor: '#BCCBE9',
    ink: '#2F5288',
    icon: icon('methoden/Leben_im_Freien.svg'),
    subPoints: makeSubPoints('outdoors', [
      'Entdecken der Umwelt',
      'Einfachheit in der Natur',
      'Wahrnehmung im Freien',
      'Umweltschutz',
    ]),
  },
  {
    id: 'play',
    chapter: '5.8',
    name: 'Spiel und Bewegung',
    short: 'Spiel & Bewegung',
    guidingPrinciple: 'Mit Spass lernen',
    description: 'Spielen und Bewegung mit Motto und rotem Faden, Freizeit sowie Wettbewerb und Zusammenarbeit.',
    color: '#E9D4B4',
    lightColor: '#F3E7D6',
    ink: '#7A6034',
    icon: icon('methoden/Spiel_und_Bewegung.svg'),
    subPoints: makeSubPoints('play', ['Spass haben und lernen', 'Motto und roter Faden', 'Freizeit', 'Wettbewerb und Zusammenarbeit']),
  },
]

export const RELATIONSHIP_BY_ID = Object.fromEntries(RELATIONSHIPS.map((b) => [b.id, b])) as Record<
  RelationshipId,
  ProfileElement<RelationshipId>
>
export const METHOD_BY_ID = Object.fromEntries(METHODS.map((m) => [m.id, m])) as Record<
  MethodId,
  ProfileElement<MethodId>
>

export const SUBPOINT_BY_ID: Record<string, { name: string; parent: string }> = Object.fromEntries(
  [...RELATIONSHIPS, ...METHODS].flatMap((e) => e.subPoints.map((u) => [u.id, { name: u.name, parent: e.id }])),
)

export const LEVELS = ['Biberstufe', 'Wolfsstufe', 'Pfadistufe', 'Piostufe', 'Roverstufe', 'PTA', 'Gemischt'] as const
