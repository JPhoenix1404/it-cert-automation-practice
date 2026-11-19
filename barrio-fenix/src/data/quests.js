// Misiones. Cada paso avanza con un evento del bus "quest:*" (ver quests.js).
// Líneas de diálogo: [quien, texto]  quien = id de personaje | 'you' | 'narr'

export const QUESTS = {
  C1: {
    title: 'Bienvenido a Barrio Fénix', giver: 'neko', biome: 'casa', order: 1,
    intro: [
      ['neko', '¡Por fin llegas! Soy Neko-san, el guardián de este barrio. Sí, hablo. No, no estás loc{o}. Bueno, un poco.'],
      ['neko', 'Esta casa de aquí es la tuya. Está... "con carácter". Entra y echa un vistazo.'],
      ['neko', 'Y abre la nevera. Si hay pescado, es mío.'],
    ],
    steps: [
      { desc: 'Entra en tu casa', marker: 'spot:home_in', ev: 'interact', match: (e) => e.id === 'enter:home' },
      { desc: 'Abre la nevera', marker: 'obj:fridge', ev: 'interact', match: (e) => e.id === 'fridge' },
    ],
    outro: [
      ['neko', 'Dos onigiris y un café. Ni un triste pescado. Vas a tener que trabajar, human{o}.'],
      ['neko', 'Te doy una pista: en este barrio cada favor que haces brilla. Esas chispas se llaman Fenixios. Con ellos se abren las puertas del barrio.'],
      ['narr', 'El Supermercado se desbloquea con 3 Fenixios. Mira la barrera del norte de la plaza.'],
    ],
    reward: { d: 50, f: 1 },
  },
  C2: {
    title: 'Cristal de luna', giver: 'neko', biome: 'casa', order: 2, req: ['C1'],
    intro: [
      ['neko', 'Tus ventanas tienen tanta mugre que la luna se niega a entrar. Límpialas.'],
      ['you', '¿Y tú qué vas a hacer?'],
      ['neko', 'Supervisar. Es un trabajo muy duro.'],
    ],
    steps: [{ desc: 'Limpia los cristales de casa', marker: 'obj:windows', ev: 'minigame', match: (e) => e.type === 'windows' }],
    outro: [['neko', 'Mira eso. Brillan. Ahora sí que entra la luna. Y el sol. Y los cotilleos de Lucía.']],
    reward: { d: 30, f: 1, attr: { destreza: 1 } },
  },
  C3: {
    title: 'Huellas en el parqué', giver: 'neko', biome: 'casa', order: 3, req: ['C1'],
    intro: [
      ['neko', 'El suelo de tu casa está pegajoso. He dejado una huella y me ha costado sacar la pata.'],
      ['neko', 'Coge la fregona. Haz círculos. Con amor.'],
    ],
    steps: [{ desc: 'Friega el suelo de casa', marker: 'obj:mop', ev: 'minigame', match: (e) => e.type === 'floor' }],
    outro: [['neko', 'Impecable. Ahora puedo tumbarme en él sin miedo. Gracias, human{o}.']],
    reward: { d: 30, f: 1 },
  },
  C4: {
    title: 'La vecina de al lado', giver: 'lucia', biome: 'casa', order: 4, req: ['C1'],
    intro: [
      ['lucia', 'Así que tú eres quien se ha mudado a la casa de la persiana rota. Lucía. Arquitecta. Vecina. En ese orden.'],
      ['you', 'Encantad{o}. Soy {name}.'],
      ['lucia', 'Ya que estás aquí... se me ha roto la bolsa de la compra. Otra vez. ¿Me echas una mano? Las naranjas tienen vida propia.'],
    ],
    steps: [{ desc: 'Ayuda a Lucía con las bolsas', marker: 'npc:lucia', ev: 'minigame', match: (e) => e.type === 'street' && e.context === 'lucia', talkAction: { label: '🧺 Ayudarla con las bolsas', run: { minigame: 'street', context: 'lucia' } } }],
    outro: [
      ['lucia', 'Vaya. Ni una naranja en el suelo. Me has impresionado. Un poco.'],
      ['lucia', 'Bienvenid{o} al barrio, {name}. Si necesitas algo... llama al timbre. Una vez. No tres.'],
    ],
    reward: { d: 40, f: 1, aff: { lucia: 10 } },
  },
  C5: {
    title: 'El camino de la escoba', giver: 'goro', biome: 'casa', order: 5, req: ['C2', 'C3'], star: true,
    intro: [
      ['goro', 'Te he visto limpiar, aprendiz. Limpias como quien huye de algo.'],
      ['goro', 'El camino de la escoba no se camina. Se barre. Demuéstrame un cristal o un suelo perfecto. Nota A o superior.'],
      ['you', '¿Y si no lo consigo?'],
      ['goro', 'Lo vuelves a intentar. La suciedad es paciente. Tú debes serlo más.'],
    ],
    steps: [{ desc: 'Consigue nota A o S limpiando cristales o fregando', marker: 'obj:windows', ev: 'minigame', match: (e) => (e.type === 'windows' || e.type === 'floor') && ['A', 'S'].includes(e.grade) }],
    outro: [
      ['goro', 'Ho, ho. Eso, aprendiz, es tener el centro. Tu casa respira.'],
      ['goro', 'Toma. Dos Fenixios. No los gastes en tonterías. O sí. Eres joven.'],
    ],
    reward: { f: 2, attr: { destreza: 1 } },
  },
  C6: {
    title: 'Bajo las farolas', giver: 'nora', biome: 'casa', order: 6, req: ['C1'], night: true,
    intro: [
      ['nora', '¿Te vas a quedar ahí parad{o} o vas a escuchar de verdad?'],
      ['nora', 'Toco una canción. Si sigues el ritmo, te cuento un secreto. Si no, te vas a casa.'],
    ],
    steps: [{ desc: 'Escucha a Nora y sigue el ritmo (nota C o mejor)', marker: 'npc:nora', ev: 'minigame', match: (e) => e.type === 'rhythm' && e.context === 'nora' && ['S', 'A', 'B', 'C'].includes(e.grade), talkAction: { label: '🎸 Escuchar el concierto', run: { minigame: 'rhythm', context: 'nora' } } }],
    outro: [
      ['nora', 'No está mal. El secreto: esta plaza suena mejor contigo delante. Ya está, ya te lo he dicho.'],
    ],
    reward: { f: 1, aff: { nora: 10 } },
  },
  S1: {
    title: 'Despensa vacía', giver: 'neko', biome: 'super', order: 7,
    intro: [
      ['neko', 'Has abierto el Super Fénix. Huele a pan recién hecho y a oportunidades. Y a pescado. Sobre todo a pescado.'],
      ['neko', 'Coge un carro y haz la compra de la lista. Concéntrate: hay productos de marca blanca que intentan engañarte.'],
    ],
    steps: [{ desc: 'Haz la compra con la lista (coge un carro en la entrada)', marker: 'obj:super_cart', ev: 'minigame', match: (e) => e.type === 'shopping' }],
    outro: [['neko', 'Arroz, huevos, verduras... y, ¿dónde está mi pescado? Bueno. Te perdono. Por hoy.']],
    reward: { d: 40, f: 1, items: { arroz: 1, huevos: 2, verduras: 1 } },
  },
  S2: {
    title: 'Caja 3, sin descanso', giver: 'aiko', biome: 'super', order: 8,
    intro: [
      ['aiko', '¡Ay! P-perdona, no te había visto. Soy Aiko. De la caja 3. Bueno, de todas las cajas, hoy estoy sola.'],
      ['aiko', 'El reponedor no ha venido y la estantería de conservas está vacía... ¿Podrías...? No, olvídalo, qué vergüenza.'],
      ['you', 'Claro que te ayudo. ¿Qué hay que hacer?'],
      ['aiko', '¡Gracias! Cada producto va en la balda de su color. ¡Es como un puzle!'],
    ],
    steps: [{ desc: 'Repón la estantería del Super Fénix', marker: 'obj:super_shelf', ev: 'minigame', match: (e) => e.type === 'restock' }],
    outro: [
      ['aiko', '¡Ha quedado perfecta! Como en el nivel 4 de "Shelf Master"... perdona, es un juego. Un juego muy bueno.'],
      ['aiko', 'Si algún día quieres trabajo aquí... la plaza de reponedor sigue libre. Solo digo.'],
    ],
    reward: { d: 40, f: 1, aff: { aiko: 10 } },
  },
  S3: {
    title: 'De incógnito', giver: 'kaito', biome: 'super', order: 9, star: true,
    intro: [
      ['kaito', 'Psst. Oye. Tú no me conoces, ¿verdad? Perfecto. Soy Kaito. Solo Kaito.'],
      ['kaito', 'Una señora me ha mirado raro en la sección de lácteos. Necesito un disfraz. Una gorra y unas gafas de sol. Te las pago, lo prometo.'],
      ['you', '¿Por qué no vas tú?'],
      ['kaito', 'Porque Rincón Moda tiene espejos. Y en los espejos me reconozco hasta yo.'],
    ],
    steps: [
      { desc: 'Compra una gorra y unas gafas de sol en Rincón Moda', marker: 'obj:moda', ev: 'inv', match: (e, s) => (s.inventory.gorra || 0) > 0 && (s.inventory.gafas || 0) > 0 },
      { desc: 'Dale el disfraz a Kaito', marker: 'npc:kaito', ev: 'give', match: (e) => e.npc === 'kaito' && e.item === 'disfraz', talkAction: { label: '🕶️ Darle la gorra y las gafas', run: { give: ['gorra', 'gafas'], as: 'disfraz' } } },
    ],
    outro: [
      ['kaito', '¿Qué tal estoy? ¿Parezco una persona normal? ¿Una persona que hace la compra con normalidad?'],
      ['you', 'Pareces un espía muy malo.'],
      ['kaito', '¡Perfecto! Los espías malos son los que nadie mira. Gracias, de verdad. Te debo una. Y te debo 40 Deuros.'],
    ],
    reward: { d: 40, f: 2, aff: { kaito: 15 } },
  },
  S4: {
    title: 'Primer sueldo', giver: 'neko', biome: 'super', order: 10,
    intro: [
      ['neko', 'Los onigiris no crecen en los árboles. Bueno, el arroz sí, más o menos. Pero no te desvíes.'],
      ['neko', 'Necesitas un trabajo. Aiko dijo que buscan reponedor. Pregúntale y haz un turno.'],
    ],
    steps: [{ desc: 'Consigue un trabajo y completa un turno (menú ☰ → Trabajo)', marker: 'npc:aiko', ev: 'shift', match: () => true }],
    outro: [['neko', '¡Tu primer sueldo! Lo celebraremos con pescado. Tú pagas. Es la tradición.']],
    reward: { f: 1 },
  },
  T1: {
    title: 'Entrevista en Centro Fénix', giver: 'valeria', biome: 'trabajo', order: 11,
    intro: [
      ['valeria', 'Valeria Ríos, directora de operaciones. Me han dicho que buscas trabajo. Tienes cinco minutos para convencerme.'],
    ],
    steps: [{ desc: 'Haz la entrevista con Valeria', marker: 'npc:valeria', ev: 'interview', match: () => true, talkAction: { label: '💼 Empezar la entrevista', run: { interview: true } } }],
    outro: [['valeria', 'Bien. Te tendré en cuenta. Y ahora, si me disculpas, tengo catorce errores que corregir.']],
    reward: { f: 1, aff: { valeria: 5 } },
  },
  T2: {
    title: 'Rival a la vista', giver: 'ren', biome: 'trabajo', order: 12, star: true,
    intro: [
      ['ren', 'Así que tú eres quien Valeria tiene en el radar. Ren Kurogane. Recuérdalo, porque lo vas a oír mucho.'],
      ['ren', 'Ayer clasifiqué expedientes por valor de 1.200 puntos. Si me superas, te invito a un café. No vas a superarme.'],
    ],
    steps: [{ desc: 'Supera los 1.200 puntos de Ren clasificando documentos', marker: 'npc:ren', ev: 'minigame', match: (e) => e.type === 'documents' && e.context === 'ren' && e.score > 1200, talkAction: { label: '📂 Aceptar el reto', run: { minigame: 'documents', context: 'ren' } } }],
    outro: [
      ['ren', '¡¿Qu-qué?! Ha sido suerte. La impresora estaba de tu parte.'],
      ['ren', '...Vale. Bien hecho. El café te lo debo. No te acostumbres.'],
    ],
    reward: { f: 2, aff: { ren: 6 } },
  },
  T3: {
    title: 'Café para la jefa', giver: 'valeria', biome: 'trabajo', order: 13, req: ['T1'],
    intro: [
      ['valeria', 'Una prueba más. Bájame un café de Café Ascua.'],
      ['valeria', 'Doble de expreso, leche de avena, sin azúcar, con canela. Ni más ni menos. Lo sabré.'],
    ],
    steps: [{ desc: 'Prepara el café exacto de Valeria en Café Ascua', marker: 'obj:cafe_counter', ev: 'minigame', match: (e) => e.type === 'barista' && e.context === 'valeria' && e.exact }],
    outro: [
      ['valeria', '...Perfecto. Exactamente como lo pedí.'],
      ['valeria', 'Hay gente que lleva años aquí y aún me trae azúcar. Bien hecho.'],
    ],
    reward: { f: 1, aff: { valeria: 8 } },
  },
  R1: {
    title: 'Fuego en La Llama', giver: 'marina', biome: 'restaurante', order: 14,
    intro: [
      ['marina', '¡Tú! Sí, tú. ¿Sabes cocinar? No me contestes, demuéstramelo.'],
      ['marina', 'Soy Marina, y esta es mi cocina. Tienes un fogón libre. Prepara un plato. El que quieras. Pero hazlo con ganas.'],
    ],
    steps: [{ desc: 'Cocina cualquier plato en el fogón de La Llama', marker: 'obj:llama_stove', ev: 'cook', match: (e) => e.place === 'llama' }],
    outro: [
      ['marina', 'Hmm... Tiene alma. Le falta fuego, pero tiene alma.'],
      ['marina', 'Vuelve cuando quieras. La cocina te va a hacer falta. Y yo también, ya verás.'],
    ],
    reward: { f: 2, aff: { marina: 10 } },
  },
  R2: {
    title: 'La prueba del fuego', giver: 'marina', biome: 'restaurante', order: 15, req: ['R1'],
    intro: [
      ['marina', 'Esta noche viene un crítico. O eso dicen. Necesito que alguien demuestre que en mi cocina no se trabaja a medias.'],
      ['marina', 'Tres platos con nota B o mejor. En La Llama. ¿Te atreves?'],
    ],
    steps: [{ desc: 'Cocina 3 platos con nota B o superior en La Llama', marker: 'obj:llama_stove', ev: 'cook', count: 3, match: (e) => e.place === 'llama' && ['S', 'A', 'B'].includes(e.grade) }],
    outro: [
      ['marina', '¡ESO ES! ¡Eso es cocinar! El crítico se ha ido llorando. De emoción.'],
      ['marina', 'Toma, te lo has ganado. Y que sepas que en mi cocina siempre tendrás sitio.'],
    ],
    reward: { d: 150, f: 3, aff: { marina: 10 } },
  },
  X1: {
    title: 'El origen del Fénix', giver: 'neko', biome: 'casa', order: 16, req: ['C1'], secret: true, costF: 5,
    intro: [
      ['neko', 'Te voy a contar un secreto, human{o}. Pero los secretos cuestan. Cinco Fenixios.'],
      ['neko', 'Hace mucho, un fénix se posó en esta plaza. Al renacer, dejó caer cinco plumas por el barrio. Quien las reúna, descubrirá por qué este sitio te ha elegido.'],
      ['neko', 'Brillan más de noche. Búscalas en cada rincón: la casa, el super, el trabajo y el restaurante.'],
    ],
    steps: [{ desc: 'Encuentra las 5 plumas de fénix', marker: 'feather', ev: 'feather', count: 5, match: () => true }],
    outro: [
      ['neko', 'Cinco plumas. Están calientes, ¿verdad? Como una chimenea. Como un hogar.'],
      ['neko', 'El fénix no elige a los fuertes, human{o}. Elige a quien se atreve a empezar de cero. Bienvenid{o} a casa. De verdad.'],
      ['narr', 'Has obtenido el título «Hij{o} del Fénix».'],
    ],
    reward: { d: 300, title: true },
  },
};

export const QUEST_ORDER = Object.keys(QUESTS).sort((a, b) => QUESTS[a].order - QUESTS[b].order);

// Entrevista de Valeria (T1)
export const INTERVIEW = [
  { q: '¿Por qué debería contratarte a ti y no a cualquier otra persona?', opts: [['seguro', 'Porque aprendo rápido y no necesito que me lleven de la mano.', 6], ['sincero', 'No tengo mucha experiencia, pero me esfuerzo más que nadie.', 4], ['dulce', 'Porque soy muy buena persona y me encanta este sitio.', 0]] },
  { q: 'Un compañero comete un error grave y nadie lo ha visto. ¿Qué haces?', opts: [['sincero', 'Hablo con él primero y, si no lo arregla, lo comunico.', 6], ['seguro', 'Lo arreglo yo y luego hablamos.', 4], ['gracioso', 'Finjo que no he visto nada y me como una galleta.', -2]] },
  { q: 'Última pregunta: ¿dónde te ves dentro de cinco años?', opts: [['seguro', 'Coordinando un proyecto en este mismo edificio.', 6], ['sincero', 'No lo sé. Pero quiero que sea un sitio donde crezca.', 4], ['atrevido', 'En tu despacho. Con tu silla.', 2]] },
];

// Tablón del barrio
export const BOARD_TASKS = [
  { id: 'escaparate', title: 'Limpiar el escaparate del Super', minigame: 'windows', context: 'board', biome: 'super', reward: [25, 35] },
  { id: 'vecina', title: 'Ayudar a una vecina con la compra', minigame: 'street', context: 'board', biome: 'casa', reward: [20, 30] },
  { id: 'entrada', title: 'Fregar la entrada del Centro Fénix', minigame: 'floor', context: 'board', biome: 'trabajo', reward: [25, 40] },
  { id: 'petalos', title: 'Recoger los pétalos de la plaza', minigame: 'street', context: 'petals', biome: 'casa', reward: [20, 30] },
  { id: 'concierto', title: 'Hacer de público para Nora (noche)', minigame: 'rhythm', context: 'board', biome: 'casa', reward: [25, 35], night: true },
  { id: 'ventanas_lucia', title: 'Limpiar las ventanas de Lucía', minigame: 'windows', context: 'board', biome: 'casa', reward: [25, 35] },
  { id: 'terraza', title: 'Fregar la terraza de La Llama', minigame: 'floor', context: 'board', biome: 'restaurante', reward: [30, 40] },
];

// Plumas de fénix (X1). Coordenadas en world.js (spots feather_0..4)
export const FEATHER_COUNT = 5;
