const FR_TO_EN: Record<string, string> = {
  // Viandes
  poulet: 'chicken', bœuf: 'beef', boeuf: 'beef', porc: 'pork',
  agneau: 'lamb', veau: 'veal', dinde: 'turkey', canard: 'duck',
  lapin: 'rabbit', jambon: 'ham', lardons: 'bacon', bacon: 'bacon',
  saucisse: 'sausage', saucisses: 'sausage', merguez: 'merguez',
  chorizo: 'chorizo', steak: 'steak', escalope: 'cutlet',
  côtelette: 'chop', cotelette: 'chop', viande: 'meat',
  filet: 'fillet', cuisse: 'thigh', blanc: 'breast',

  // Poissons & fruits de mer
  saumon: 'salmon', thon: 'tuna', cabillaud: 'cod', morue: 'cod',
  crevettes: 'shrimp', crevette: 'shrimp', moules: 'mussels',
  calamars: 'squid', calmar: 'squid', daurade: 'sea bream',
  truite: 'trout', sardine: 'sardine', sardines: 'sardine',
  anchois: 'anchovy', homard: 'lobster', crabe: 'crab',
  'noix de saint-jacques': 'scallop', maquereau: 'mackerel',
  bar: 'sea bass', lotte: 'monkfish', hareng: 'herring',
  dorade: 'sea bream',

  // Légumes
  tomate: 'tomato', tomates: 'tomato', oignon: 'onion', oignons: 'onion',
  ail: 'garlic', carotte: 'carrot', carottes: 'carrot',
  'pomme de terre': 'potato', 'pommes de terre': 'potato', patate: 'potato',
  courgette: 'zucchini', courgettes: 'zucchini',
  aubergine: 'eggplant', aubergines: 'eggplant',
  poivron: 'bell pepper', poivrons: 'bell pepper',
  champignon: 'mushroom', champignons: 'mushroom',
  épinard: 'spinach', epinard: 'spinach', épinards: 'spinach', epinards: 'spinach',
  brocoli: 'broccoli', 'chou-fleur': 'cauliflower', chou: 'cabbage',
  salade: 'lettuce', laitue: 'lettuce', concombre: 'cucumber',
  céleri: 'celery', celeri: 'celery', poireau: 'leek', poireaux: 'leek',
  navet: 'turnip', radis: 'radish', betterave: 'beet',
  'haricot vert': 'green bean', 'haricots verts': 'green bean',
  'petits pois': 'peas', maïs: 'corn', mais: 'corn',
  asperge: 'asparagus', asperges: 'asparagus',
  artichaut: 'artichoke', fenouil: 'fennel',
  courge: 'squash', potiron: 'pumpkin', citrouille: 'pumpkin',
  'patate douce': 'sweet potato', échalote: 'shallot', echalote: 'shallot',
  ciboulette: 'chives', endive: 'endive', cresson: 'watercress',
  épinards: 'spinach', mesclun: 'mixed greens', roquette: 'arugula',
  potimarron: 'butternut squash', butternut: 'butternut squash',

  // Fruits
  pomme: 'apple', pommes: 'apple', poire: 'pear', poires: 'pear',
  banane: 'banana', bananes: 'banana', orange: 'orange', oranges: 'orange',
  citron: 'lemon', citrons: 'lemon', fraise: 'strawberry', fraises: 'strawberry',
  framboise: 'raspberry', framboises: 'raspberry',
  cerise: 'cherry', cerises: 'cherry', pêche: 'peach', peche: 'peach',
  abricot: 'apricot', abricots: 'apricot', mangue: 'mango',
  ananas: 'pineapple', raisin: 'grape', raisins: 'grape',
  prune: 'plum', prunes: 'plum', figue: 'fig', figues: 'fig',
  kiwi: 'kiwi', avocat: 'avocado', avocats: 'avocado',
  myrtille: 'blueberry', myrtilles: 'blueberry',
  pastèque: 'watermelon', pasteque: 'watermelon', melon: 'melon',
  pamplemousse: 'grapefruit', mandarine: 'mandarin',
  'noix de coco': 'coconut', coco: 'coconut', litchi: 'lychee',

  // Produits laitiers & œufs
  lait: 'milk', beurre: 'butter', crème: 'cream', creme: 'cream',
  fromage: 'cheese', yaourt: 'yogurt', yaourts: 'yogurt',
  œuf: 'egg', oeuf: 'egg', œufs: 'eggs', oeufs: 'eggs',
  gruyère: 'gruyere', gruyere: 'gruyere', parmesan: 'parmesan',
  mozzarella: 'mozzarella', ricotta: 'ricotta', feta: 'feta',
  'crème fraîche': 'sour cream', 'creme fraiche': 'sour cream',
  emmental: 'emmental', camembert: 'camembert', roquefort: 'roquefort',
  mascarpone: 'mascarpone', comté: 'comte', comte: 'comte',

  // Céréales & féculents
  farine: 'flour', riz: 'rice', pâtes: 'pasta', pates: 'pasta',
  pain: 'bread', semoule: 'semolina', quinoa: 'quinoa',
  avoine: 'oats', blé: 'wheat', ble: 'wheat', maïzena: 'cornstarch',
  maizena: 'cornstarch', orge: 'barley', boulgour: 'bulgur',
  vermicelle: 'vermicelli', lasagne: 'lasagna', tagliatelle: 'tagliatelle',
  spaghetti: 'spaghetti', penne: 'penne', chapelure: 'breadcrumbs',

  // Légumineuses
  lentilles: 'lentils', lentille: 'lentils',
  'pois chiches': 'chickpeas', haricots: 'beans',
  'haricots rouges': 'kidney beans', 'haricots blancs': 'white beans',
  flageolets: 'flageolet beans', 'pois cassés': 'split peas',

  // Épices & herbes
  sel: 'salt', poivre: 'pepper', sucre: 'sugar', miel: 'honey',
  cannelle: 'cinnamon', cumin: 'cumin', curcuma: 'turmeric',
  paprika: 'paprika', basilic: 'basil', persil: 'parsley',
  thym: 'thyme', romarin: 'rosemary', laurier: 'bay leaf',
  origan: 'oregano', coriandre: 'coriander', gingembre: 'ginger',
  vanille: 'vanilla', muscade: 'nutmeg', safran: 'saffron',
  piment: 'chili', piments: 'chili', curry: 'curry',
  'herbes de provence': 'herbes de provence', aneth: 'dill',
  menthe: 'mint', estragon: 'tarragon', sarriette: 'savory',
  marjolaine: 'marjoram', cardamome: 'cardamom', 'clou de girofle': 'clove',
  anis: 'anise', fenouil: 'fennel seeds',

  // Condiments & autres
  huile: 'oil', "huile d'olive": 'olive oil', vinaigre: 'vinegar',
  'sauce tomate': 'tomato sauce', moutarde: 'mustard',
  mayonnaise: 'mayonnaise', ketchup: 'ketchup',
  soja: 'soy sauce', bouillon: 'broth', vin: 'wine',
  'vin blanc': 'white wine', 'vin rouge': 'red wine', bière: 'beer', biere: 'beer',
  noix: 'walnut', 'noix de cajou': 'cashew', amande: 'almond', amandes: 'almond',
  noisette: 'hazelnut', noisettes: 'hazelnut', pistache: 'pistachio',
  cacahuète: 'peanut', cacahuete: 'peanut', arachide: 'peanut',
  chocolat: 'chocolate', levure: 'yeast', tofu: 'tofu',
  croutons: 'croutons', câpres: 'capers', capres: 'capers',
  cornichon: 'pickle', cornichons: 'pickle', olive: 'olive', olives: 'olive',
  tahini: 'tahini', tamari: 'tamari',
};

/**
 * Traduit un ingrédient français en anglais.
 * Retourne l'original si pas de traduction trouvée.
 */
export const translateIngredient = (ingredient: string): string => {
  const normalized = ingredient.trim().toLowerCase();
  return FR_TO_EN[normalized] ?? ingredient;
};

/**
 * Traduit une liste d'ingrédients français en anglais.
 */
export const translateIngredients = (ingredients: string[]): string[] => {
  return ingredients.map(translateIngredient);
};
