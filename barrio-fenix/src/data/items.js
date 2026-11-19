// Catálogo de objetos, ropa, mejoras y empleos.

export const ITEMS = {
  // Comida y bebida (energía / buffs)
  onigiri:   { name: 'Onigiri', icon: '🍙', price: 6, kind: 'food', energy: 15, shop: 'super', desc: 'Bola de arroz con alga. +15 energía.' },
  ramen:     { name: 'Ramen instantáneo', icon: '🍜', price: 8, kind: 'food', energy: 20, shop: 'super', desc: '3 minutos de felicidad. +20 energía.' },
  fruta:     { name: 'Fruta', icon: '🍎', price: 4, kind: 'food', energy: 8, shop: 'super', desc: 'Fresca y de temporada. +8 energía.' },
  cafe:      { name: 'Café', icon: '☕', price: 5, kind: 'food', energy: 15, buff: [{ attr: 'concentracion', amount: 2, hours: 2 }], shop: 'super', desc: '+15 energía y +2 Concentración (2 h).' },
  cerveza:   { name: 'Cerveza', icon: '🍺', price: 6, kind: 'food', energy: 5, buff: [{ attr: 'carisma', amount: 2, hours: 2 }, { attr: 'concentracion', amount: -2, hours: 2 }], shop: 'super', desc: '+2 Carisma, −2 Concentración (2 h). Con moderación.' },
  energetica:{ name: 'Bebida energética', icon: '🥫', price: 9, kind: 'food', energy: 35, shop: 'super', desc: '+35 energía. Sabor a "rayo azul".' },
  elixir:    { name: 'Elixir Fénix', icon: '🧪', priceF: 1, kind: 'food', energy: 20, buff: [{ attr: 'carisma', amount: 3, hours: 3 }, { attr: 'destreza', amount: 3, hours: 3 }, { attr: 'concentracion', amount: 3, hours: 3 }, { attr: 'cocina', amount: 3, hours: 3 }], shop: 'super', desc: 'Brilla como una brasa. +3 a todos los atributos (3 h).' },
  matcha:    { name: 'Té matcha', icon: '🍵', price: 10, kind: 'food', energy: 12, shop: 'super', desc: 'Amargo y elegante. +12 energía.' },

  // Ingredientes
  arroz:     { name: 'Arroz', icon: '🌾', price: 3, kind: 'ingredient', shop: 'super' },
  verduras:  { name: 'Verduras', icon: '🥬', price: 4, kind: 'ingredient', shop: 'super' },
  pescado:   { name: 'Pescado', icon: '🐟', price: 9, kind: 'ingredient', shop: 'super' },
  carne:     { name: 'Carne', icon: '🥩', price: 8, kind: 'ingredient', shop: 'super' },
  huevos:    { name: 'Huevos', icon: '🥚', price: 3, kind: 'ingredient', shop: 'super' },
  especias:  { name: 'Especias', icon: '🌶️', price: 5, kind: 'ingredient', shop: 'super' },
  chocolate: { name: 'Chocolate', icon: '🍫', price: 6, kind: 'ingredient', shop: 'super' },

  // Regalos
  flores:    { name: 'Ramo de flores', icon: '💐', price: 12, kind: 'gift', shop: 'super' },
  suculenta: { name: 'Planta suculenta', icon: '🪴', price: 18, kind: 'gift', shop: 'super' },
  retro:     { name: 'Videojuego retro', icon: '🎮', price: 40, kind: 'gift', shop: 'super' },
  pluma:     { name: 'Pluma estilográfica', icon: '🖋️', price: 35, kind: 'gift', shop: 'super' },
  pua:       { name: 'Púa de guitarra', icon: '🎸', price: 15, kind: 'gift', shop: 'super' },
  gorra:     { name: 'Gorra', icon: '🧢', price: 15, kind: 'gift', shop: 'moda' },
  gafas:     { name: 'Gafas de sol', icon: '🕶️', price: 25, kind: 'gift', shop: 'moda' },
  anillo:    { name: 'Anillo de compromiso', icon: '💍', price: 500, kind: 'key', shop: 'moda', desc: 'Para pedir matrimonio (9♥ y ser pareja).' },
  pluma_fenix:{ name: 'Pluma de fénix', icon: '🪶', kind: 'key', desc: 'Cálida al tacto.' },
};

export const RECIPES = {
  curry:  { name: 'Curry', icon: '🍛', needs: { arroz: 1, carne: 1, verduras: 1, especias: 1 }, energy: 60 },
  tortilla:{ name: 'Tortilla', icon: '🍳', needs: { huevos: 2, verduras: 1 }, energy: 40 },
  sushi:  { name: 'Sushi', icon: '🍣', needs: { arroz: 1, pescado: 1 }, energy: 45 },
  tarta:  { name: 'Tarta de chocolate', icon: '🍰', needs: { huevos: 1, chocolate: 2 }, energy: 50 },
};
// Los platos cocinados se guardan como "plato:<receta>:<nota>"
export function dishId(recipe, grade) { return `plato:${recipe}:${grade}`; }
export function parseDish(id) {
  if (!id.startsWith('plato:')) return null;
  const [, recipe, grade] = id.split(':');
  return { recipe, grade, ...RECIPES[recipe] };
}
export function itemInfo(id) {
  const d = parseDish(id);
  if (d) return { name: `${d.name} (${d.grade})`, icon: d.icon, kind: 'dish', energy: Math.round(d.energy * ({ S: 1.2, A: 1.1, B: 1, C: 0.8, D: 0.6 }[d.grade] || 1)), recipe: d.recipe, grade: d.grade };
  return ITEMS[id] || { name: id, icon: '❔', kind: 'misc' };
}

// Ropa. slot: top | bottom | shoes | set (set = sustituye top+bottom)
// style: modelos del generador de personaje (character.js)
export const CLOTHES = {
  // Iniciales
  ini_casual:  { name: 'Casual (camiseta + vaqueros)', slot: 'set', top: 'tshirt', bottom: 'pants', topColor: '#f4f1ea', bottomColor: '#3b5b8c', price: 0 },
  ini_sport:   { name: 'Deportivo (sudadera + shorts)', slot: 'set', top: 'hoodie', bottom: 'shorts', topColor: '#e85d5d', bottomColor: '#2b2b38', price: 0 },
  ini_smart:   { name: 'Elegante (camisa + pantalón)', slot: 'set', top: 'shirt', bottom: 'pants', topColor: '#cfe3f5', bottomColor: '#2e2e3a', price: 0 },
  // Rincón Moda
  top_cami_amarilla: { name: 'Camiseta mostaza', slot: 'top', top: 'tshirt', topColor: '#e8b84a', price: 20 },
  top_sudadera_lila: { name: 'Sudadera lila', slot: 'top', top: 'hoodie', topColor: '#9a7ad6', price: 35 },
  top_camisa_verde:  { name: 'Camisa verde salvia', slot: 'top', top: 'shirt', topColor: '#8fb59a', price: 30 },
  top_tirantes:      { name: 'Camiseta de tirantes', slot: 'top', top: 'tank', topColor: '#2b2b33', price: 22 },
  top_chaqueta:      { name: 'Americana gris', slot: 'top', top: 'suit', topColor: '#5b5f6b', price: 60 },
  bot_falda_plisada: { name: 'Falda plisada', slot: 'bottom', bottom: 'skirt', bottomColor: '#3a3f6b', price: 28 },
  bot_vaquero_claro: { name: 'Vaquero claro', slot: 'bottom', bottom: 'pants', bottomColor: '#7fa2cc', price: 30 },
  bot_shorts_beige:  { name: 'Shorts beige', slot: 'bottom', bottom: 'shorts', bottomColor: '#d8c39a', price: 22 },
  sh_blancas:        { name: 'Zapatillas blancas', slot: 'shoes', shoesColor: '#f6f6f6', price: 25 },
  sh_rojas:          { name: 'Zapatillas rojas', slot: 'shoes', shoesColor: '#d84a4a', price: 25 },
  sh_negras:         { name: 'Botas negras', slot: 'shoes', shoesColor: '#1d1d22', price: 35 },
  set_vestido_flores:{ name: 'Vestido de flores', slot: 'set', top: 'dress', bottom: 'none', topColor: '#f2a6b8', price: 45 },
  // Colecciones atrevidas (+18): requieren desbloqueo con Fenixios
  noche_vestido:   { name: 'Vestido de noche ajustado', slot: 'set', top: 'dress', bottom: 'none', topColor: '#a0142c', price: 80, collection: 'noche' },
  noche_camisa:    { name: 'Camisa de seda entreabierta', slot: 'top', top: 'open_shirt', topColor: '#1b1b24', price: 70, collection: 'noche' },
  playa_banador:   { name: 'Bañador', slot: 'set', top: 'swim', bottom: 'none', topColor: '#2fb3c4', bottomColor: '#2fb3c4', price: 40, collection: 'playa' },
  playa_shorts:    { name: 'Shorts vaqueros cortos', slot: 'bottom', bottom: 'shorts', bottomColor: '#5f86b8', price: 30, collection: 'playa' },
  club_top:        { name: 'Top corto', slot: 'top', top: 'croptop', topColor: '#ff4fa3', price: 45, collection: 'club' },
  club_falda:      { name: 'Minifalda de vinilo', slot: 'bottom', bottom: 'skirt', bottomColor: '#141418', price: 50, collection: 'club' },
  club_tirantes:   { name: 'Tirantes de red', slot: 'top', top: 'tank', topColor: '#0d0d10', price: 40, collection: 'club' },
};
export const COLLECTIONS = {
  noche: { name: 'Colección Noche', costF: 2, desc: 'Seda, terciopelo y miradas.' },
  playa: { name: 'Colección Playa', costF: 2, desc: 'Poca tela, mucho sol.' },
  club:  { name: 'Colección Club', costF: 3, desc: 'Para cuando cierra La Llama.' },
};
export const DARING = new Set(['noche_vestido', 'noche_camisa', 'playa_banador', 'playa_shorts', 'club_top', 'club_falda', 'club_tirantes']);

export const UPGRADES = {
  sofa:     { name: 'Sofá nuevo', biome: 'casa', price: 120, home: 15, desc: '+15 Índice de hogar. Siestas más cómodas (+40 energía).' },
  plantas:  { name: 'Plantas', biome: 'casa', price: 60, home: 15, desc: '+15 Índice de hogar.' },
  lampara:  { name: 'Lámpara cálida', biome: 'casa', price: 80, home: 15, desc: '+15 Índice de hogar. Luz acogedora de noche.' },
  tarjeta:  { name: 'Tarjeta cliente', biome: 'super', price: 150, desc: '−10% en todas las compras del Super Fénix.' },
  silla:    { name: 'Silla ergonómica', biome: 'trabajo', price: 200, desc: 'Los turnos cuestan 18 de energía en lugar de 25.' },
  mesa:     { name: 'Mesa reservada', biome: 'restaurante', price: 180, desc: 'Las citas en La Llama dan +4 de afinidad.' },
};

export const BIOMES = {
  casa:        { name: 'Casa', cost: 0, music: 'casa' },
  super:       { name: 'Supermercado', cost: 3, music: 'super' },
  trabajo:     { name: 'Trabajo', cost: 6, music: 'trabajo' },
  restaurante: { name: 'Restaurante', cost: 10, music: 'restaurante' },
};

export const JOBS = {
  reponedor: { name: 'Reponedor', place: 'Super Fénix', biome: 'super', minigame: 'restock', pay: [40, 60, 85], ranks: ['Reponedor', 'Reponedor jefe', 'Encargado de sala'], boss: 'aiko', bossIsBoss: false, hours: [7, 23] },
  barista:   { name: 'Barista', place: 'Café Ascua', biome: 'trabajo', minigame: 'barista', pay: [45, 65, 95], ranks: ['Barista', 'Barista sénior', 'Encargado del café'], boss: null, hours: [7, 22] },
  administrativo: { name: 'Administrativo', place: 'Oficina Centro Fénix', biome: 'trabajo', minigame: 'documents', pay: [50, 75, 110], ranks: ['Administrativo', 'Administrativo sénior', 'Coordinador de proyecto'], boss: 'valeria', bossIsBoss: true, hours: [8, 20], needsInterview: true },
  cocina:    { name: 'Ayudante de cocina', place: 'La Llama', biome: 'restaurante', minigame: 'cooking', pay: [50, 70, 100], ranks: ['Ayudante de cocina', 'Cocinero de partida', 'Segundo de cocina'], boss: 'marina', bossIsBoss: true, hours: [12, 1] },
};
export const GRADE_PAY = { S: 1.3, A: 1.15, B: 1, C: 0.8, D: 0.5 };
