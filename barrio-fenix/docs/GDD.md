# Barrio Fénix: documento de diseño (v1)

> Simulador de vida acogedor con estética anime, para iPad, sin conexión. PEGI 18.
> Este documento es la referencia que usan los subasistentes de calidad. Si el juego y el documento no coinciden, es un fallo.

## 1. Concepto
Te mudas a **Barrio Fénix**, un barrio pequeño con cerezos, farolillos y vecinos peculiares. No hay combates: el juego va de **adaptarse a una vida nueva**. Limpias tu casa, haces la compra, encuentras trabajo, conoces gente, ligas, te casas... o lo estropeas todo.

- **Plataforma:** juego web instalable (PWA) para iPad en horizontal, con controles táctiles. Funciona sin conexión tras la primera carga.
- **Idioma:** español.
- **Público:** mayores de 18 años, con un aviso de edad la primera vez que se abre. Hay contenido adulto *sugerido*: ropa atrevida, coqueteo atrevido, alcohol, infidelidad y escenas de "quedarse a dormir" con fundido a negro. **No hay contenido sexual explícito.**
- **Personajes:** originales con estética anime. No se usa ninguna propiedad intelectual de terceros.

## 2. Pilares de calidad (el listón que deben cumplir los revisores)
1. **Rendimiento:** 60 fps como objetivo en un iPad de 2020 o posterior, y nunca por debajo de 30. Ninguna escena con más de unas 150 llamadas de dibujo.
2. **Cero bloqueos:** no puede haber ninguna misión imposible de completar, en ningún orden de juego ni a ninguna hora real.
3. **Cada misión tiene** quién la da, un objetivo claro en el registro, un paso guiado (marcador) y una recompensa visible.
4. **Cada personaje tiene** voz propia en sus diálogos, horario, gustos, una mecánica especial y frases sin repetir dentro de un mismo día.
5. **Cada bioma tiene** identidad visual (paleta y objetos), música propia y al menos una actividad exclusiva.
6. **Respuesta en cada acción:** sonido, animación o texto emergente. Nada ocurre sin que el jugador lo note.
7. **Guardado sólido:** guardado automático; aunque se cierre la app de golpe se pierden como mucho 10 segundos.

## 3. Bucle de juego
**Bucle corto (1–3 min):** caminar, interactuar, jugar un minijuego y ganar Deuros, Fenixios, afinidad o atributos.
**Bucle medio (un día):** hablar con cada persona, hacer el turno de trabajo, comer o dormir, completar las tareas del tablón.
**Bucle largo:** desbloquear los biomas con Fenixios, ascender o cambiar de trabajo, avanzar una relación hasta la boda y comprar mejoras y ropa.

## 4. Tiempo
- **Reloj real:** la hora del juego es la hora local del iPad **más un desfase** que guarda la partida.
- **Fases:** amanecer de 07:00 a 08:00, día de 08:00 a 18:00, atardecer de 18:00 a 20:00 y noche de 20:00 a 07:00.
- **Saltar tiempo** (aumenta el desfase):
  - Siesta en el sofá: +2 h y +30 de energía.
  - Dormir en la cama: hasta las 08:00 siguientes y energía al 100. Solo se puede dormir a partir de las 20:00 o con menos de 30 de energía.
  - En Ajustes, "Sincronizar con la hora real" pone el desfase a 0.
- **Horarios de apertura:**

| Lugar | Horario |
|---|---|
| Super Fénix | 07:00–23:00 |
| Centro Fénix | 08:00–20:00 |
| Café Ascua | 07:00–22:00 |
| La Llama | 12:00–01:00 |

  Si un lugar está cerrado se indica con un cartel, y se sugiere dormir una siesta para que pase el tiempo.
- **El día del juego** cambia a las 06:00. A esa hora se reinician la conversación diaria con cada personaje, el tablón y el límite de turnos de trabajo.

## 5. Economía
| Moneda | Cómo se gana | Para qué sirve |
|---|---|---|
| **Deuros (D)** | Turnos de trabajo, tareas del tablón y misiones | Comida, ingredientes, regalos, ropa, mejoras y el anillo |
| **Fenixios (F)** | Misiones, primer hito de amistad (3♥) con cada personaje, 20% de probabilidad en cada tarea del tablón | Desbloquear biomas, colecciones de ropa atrevida, Elixir Fénix y la misión secreta |

**Desbloqueo de biomas:** la Casa está abierta desde el principio. El Supermercado cuesta **3 F**, el Trabajo **6 F** y el Restaurante **10 F**.
**Partida nueva:** 60 D y 0 F. La nevera trae 2 onigiris y 1 café.

### Fenixios disponibles (para comprobar que no hay bloqueos)
- Misiones de la Casa: 7 F, que bastan para el Supermercado (3).
- Misiones del Supermercado: +5 F, con lo que quedan 9 y alcanza para el Trabajo (6).
- Misiones del Trabajo: +4 F, que dejan 7.
- Para el Restaurante (10) se completan con los hitos de amistad (hasta 9 F) y el tablón (de media 0,6 F al día).

## 6. Atributos, energía y consumibles
- **Atributos** (de 1 a 10, suben con la experiencia):
  - **Carisma** (conversación): suma +1 de afinidad por conversación por cada 3 puntos.
  - **Destreza** (minijuegos de limpieza y de calle): da +5% de tiempo por punto.
  - **Concentración** (trabajo): da +4% de puntuación por punto.
  - **Cocina** (cocinar): amplía la ventana de acierto en los minijuegos de cocina.
- **Energía:** de 0 a 100. Un minijuego cuesta entre 8 y 12 y un turno 25. Con 0 de energía no puedes hacer actividades y el juego te avisa de que comas o descanses.
- **Consumibles:**

| Objeto | Precio | Efecto |
|---|---|---|
| Onigiri | 6 D | +15 E |
| Ramen instantáneo | 8 D | +20 E |
| Fruta | 4 D | +8 E |
| Café | 5 D | +15 E y +2 de Concentración durante 2 h |
| Cerveza | 6 D | +2 de Carisma y −2 de Concentración durante 2 h |
| Bebida energética | 9 D | +35 E |
| Elixir Fénix | 1 F | +3 a todos los atributos durante 3 h |
| Platos cocinados | — | Entre +30 y +60 E según la nota; también son regalos de lujo |

- **Recetas** (en la cocina de casa o de La Llama):
  - Curry: arroz, carne, verduras y especias.
  - Tortilla: huevos y verduras.
  - Sushi: arroz y pescado.
  - Tarta de chocolate: huevos y chocolate.

## 7. Trabajo (solo uno a la vez)
| Puesto | Lugar | Minijuego | Paga por rango 1 / 2 / 3 | Desbloqueo |
|---|---|---|---|---|
| Reponedor | Super Fénix | Reponer estanterías | 40 / 60 / 85 | Supermercado |
| Barista | Café Ascua | Barista (memoria de pedidos) | 45 / 65 / 95 | Trabajo |
| Administrativo | Oficina del Centro Fénix | Clasificar documentos | 50 / 75 / 110 | Trabajo (requiere entrevista con Valeria) |
| Ayudante de cocina | La Llama | Cocina | 50 / 70 / 100 | Restaurante |

- Máximo **2 turnos por día de juego**. La paga se multiplica según la nota: S ×1,3, A ×1,15, B ×1, C ×0,8 y D ×0,5.
- **Ascenso:** 4 turnos con nota B o mejor en el rango actual.
- **Dimitir:** desde el menú Trabajo. No tiene penalización, salvo −5 de afinidad con tu jefe o jefa si lo era (Valeria o Marina).
- **El rango 3 de Administrativo** (Coordinador) deja de depender de Valeria, y eso desbloquea la ruta romántica con ella.

## 8. Relaciones
- **Afinidad:** de 0 a 100 puntos. Cada corazón son 10 puntos.
- **Estados:** Desconocido → Conocido → Amistad (3♥) → Citas (5♥, se le propone una cita) → Pareja (7♥ y 2 citas completadas, hay declaración) → Prometidos (9♥ y anillo de 500 D) → Casados (boda al día de juego siguiente).
  - **Ex:** tras una ruptura o un divorcio la afinidad queda limitada a 4♥ durante 3 días. Después puedes volver a intentarlo.
- **Conversación diaria:**
  - El personaje dice una frase y tú eliges entre 3 tonos posibles: **Dulce, Gracioso, Sincero, Seguro y Atrevido**.
  - Tono favorito: +5. Tono neutro: +2. Tono odiado: −3. El tono Atrevido por debajo de 5♥ cuenta como odiado salvo para Marina y Nora.
  - Bonus de Carisma: +1 por cada 3 puntos.
- **Regalos:** uno al día por personaje. Regalo que adora: +15. Que le gusta: +8. Neutro: +3. Que odia: −6.
- **Citas** (en estado Citas o superior): se elige un lugar entre plaza, restaurante, cine al aire libre o casa, y hay 3 elecciones de diálogo. Al terminar, la afinidad sube entre +6 y +18.
  - Si sois Pareja y es de noche, aparece la opción "¿Te quedas a dormir?". Lleva a una escena con fundido a negro y luego a una mañana juntos: +5 de afinidad, energía al 100 y la hora salta a las 08:00.
- **Preferencia romántica:** se elige al crear el personaje.
  - Por defecto, un hombre se interesa por mujeres y una mujer por hombres; existe también la opción "Ambos".
  - Los personajes que no encajan con tu preferencia siguen disponibles para la amistad.
- **Matrimonio:** tu cónyuge se va a vivir a tu casa (de 21:00 a 08:00). Al despertar juntos (dormir en tu cama) hay una escena de mañana: +3 de afinidad y +1 de Carisma durante 4 h.
- **Divorcio:** pierdes el 30% de tus Deuros y el estado pasa a Ex.
- **Infidelidad:** si tienes pareja o estás casado o casada con A y quedas o coqueteas (Atrevido) con B:
  - Riesgo de que te pillen: 20% base, +30% si A está a menos de 15 m y +15% si estáis casados.
  - Si te pillan: −40 de afinidad con A, ruptura (o divorcio, con su penalización) y −3 de afinidad con todo el barrio por los rumores.
  - Si no te pillan: A gana +1 de **sospecha**. Con 3 de sospecha lo descubre.

## 9. Personajes (9)
| Personaje | Rol | Bioma | Horario | Romance | Tonos favoritos / odiados | Mecánica especial |
|---|---|---|---|---|---|---|
| **Lucía Morales** (27) | Vecina, arquitecta freelance. Ordenada, irónica y perfeccionista | Casa | 08:00–20:00 en su jardín o en la plaza; de noche, en casa | Sí | Sincero, Gracioso / Atrevido (al principio) | **Ojo de arquitecta:** el *Índice de hogar* (limpieza de tu casa + mejoras) modifica la afinidad que ganas con ella |
| **Aiko Tanaka** (23) | Cajera del Super Fénix, estudia Enfermería. Tímida, gamer retro | Supermercado | 08:00–16:00 en la caja; de 16:00 a 22:00 en la plaza | Sí | Dulce, Gracioso / Atrevido, Seguro | **Memoria:** a veces te pregunta por algo que te contó; si aciertas, +12 |
| **Valeria Ríos** (31) | Directora de operaciones del Centro Fénix. Exigente y ambiciosa | Trabajo | 08:00–20:00 en la oficina; de 20:00 a 23:00 en La Llama | Sí | Seguro, Sincero / Dulce (le parece adulación) | **Línea profesional:** si eres su subordinado (Administrativo de rango 1 o 2), su afinidad no pasa de 5♥ |
| **Marina Costa** (29) | Chef de La Llama. Apasionada y temperamental | Restaurante | 12:00–01:00 en la cocina | Sí | Atrevido, Sincero / Dulce | **Paladar:** los platos de nota A o S cuentan como regalo que adora; los de nota C o D, como regalo que odia |
| **Nora Vega** (25) | Música callejera, espíritu libre | Casa (plaza) | Solo de 18:00 a 02:00, en la plaza | Sí | Atrevido, Gracioso / Sincero repetido | **Nocturna y anti-rutina:** escuchar su concierto sube la afinidad según la nota; usar el mismo tono 2 días seguidos da −4 |
| **Ren Kurogane** (28) | Estrella. Tu rival en la oficina, orgulloso, tipo tsundere | Trabajo | 08:00–20:00 en la oficina; de 20:00 a 23:00 en la plaza | Sí | Seguro, Gracioso / Dulce | **Rivalidad:** ganarle en un turno da +6; perder da −2 |
| **Kaito Aoyama** (26) | Estrella. Ex-idol del grupo ficticio STARLINE, escondido en el barrio | Supermercado | 10:00–19:00 en el super o la plaza; de noche, junto a la fuente | Sí | Gracioso, Dulce / Atrevido en público | **Incógnito:** si mencionas su pasado (opción "¿No eras de STARLINE?"), −8 |
| **Sensei Goro** (68) | Estrella. Antiguo maestro de artes marciales, ahora jardinero | Casa | 06:00–19:00 en el jardín de la plaza | No | Sincero / Atrevido | **El camino de la escoba:** misiones de limpieza perfecta |
| **Neko-san** | Estrella. Gato parlante que solo tú entiendes. Hace de guía | Casa | Siempre, cerca de tu casa | No | Gracioso / — | Tutorial y misión secreta |

**Regalos (adora / le gusta / odia):**

| Personaje | Adora | Le gusta | Odia |
|---|---|---|---|
| Lucía | Planta suculenta | Café, flores | Cerveza |
| Aiko | Videojuego retro | Onigiri, tarta | Cerveza |
| Valeria | Pluma estilográfica | Café, sushi | Flores |
| Marina | Plato de nota S o A | Especias, pescado | Ramen instantáneo |
| Nora | Púa de guitarra | Cerveza, fruta | Pluma |
| Ren | Bebida energética | Café, curry | Flores |
| Kaito | Tarta de chocolate | Onigiri, gorra | Gafas de sol tras la misión S3 |
| Goro | Té matcha | Fruta, planta | Bebida energética |
| Neko-san | Pescado | Sushi | Verduras |

## 10. Biomas
| Bioma | Coste | Contenido | Música |
|---|---|---|---|
| **Casa** | Gratis | Tu casa (cama, sofá, cocina, nevera, armario-espejo, ventanas y suelo para limpiar), la casa de Lucía, la plaza con la fuente del Fénix, los cerezos, el tablón del barrio y el jardín de Goro | Lo-fi |
| **Supermercado** | 3 F | Super Fénix: pasillos, caja y Rincón Moda (tienda de ropa) | City pop |
| **Trabajo** | 6 F | Centro Fénix: oficina con escritorios y Café Ascua | Jazz |
| **Restaurante** | 10 F | La Llama: mesas, cocina abierta y terraza con farolillos | Bossa nocturna |

**Mejoras compradas con Deuros:**
- Casa (cada una suma +15 al Índice de hogar): Sofá nuevo (120 D), Plantas (60 D), Lámpara cálida (80 D).
- Supermercado: Tarjeta cliente (150 D, −10% en compras).
- Trabajo: Silla ergonómica (200 D, los turnos cuestan 18 de energía en vez de 25).
- Restaurante: Mesa reservada (180 D, las citas en La Llama dan +4 de afinidad).

**Índice de hogar** (de 0 a 100): cristales limpios (+20) + suelo limpio (+20) + mejoras.
- La suciedad vuelve: los cristales se ensucian a los 2 días de juego y el suelo al día.

## 11. Ropa
- **Al crear el personaje:** nombre, sexo, tono de piel (6), peinado (8: 4 cortos y 4 largos), color de pelo (8), color de ojos (6), conjunto inicial (3) y preferencia romántica.
- **Rincón Moda:** partes de arriba, de abajo y calzado en varios colores (entre 20 y 60 D).
- **Colecciones atrevidas** (se desbloquean con Fenixios y luego se compran con Deuros): **Noche** (2 F), **Playa** (2 F) y **Club** (3 F). Incluyen top corto, vestido ajustado, bañador, camisa abierta, shorts, etc.
- Los personajes reaccionan a la ropa atrevida:
  - Nora y Marina: +2 de afinidad al día.
  - Valeria, en horario de trabajo: −2.

## 12. Misiones principales (15) y misión secreta
| ID | Título | Quién la da | Bioma | Pasos | Recompensa |
|---|---|---|---|---|---|
| C1 | Bienvenido a Barrio Fénix | Neko-san | Casa | Hablar con Neko-san → entrar en casa → abrir la nevera | 50 D, 1 F |
| C2 | Cristal de luna | Neko-san | Casa | Limpiar los cristales de casa | 30 D, 1 F |
| C3 | Huellas en el parqué | Neko-san | Casa | Fregar el suelo de casa | 30 D, 1 F |
| C4 | La vecina de al lado | Lucía | Casa | Hablar con Lucía → ayudarla con las bolsas (minijuego de la calle) | 40 D, 1 F, +10 Lucía |
| C5 | El camino de la escoba | Goro | Casa | Sacar nota A o S en cristales o suelo (requiere C2 y C3) | 2 F, +1 de Destreza |
| C6 | Bajo las farolas | Nora | Casa (noche) | Escuchar el concierto de Nora con nota C o mejor | 1 F, +10 Nora |
| S1 | Despensa vacía | Neko-san | Supermercado | Hacer la compra con la lista (minijuego) | 40 D, 1 F |
| S2 | Caja 3, sin descanso | Aiko | Supermercado | Hablar con Aiko → reponer una estantería | 40 D, 1 F, +10 Aiko |
| S3 | De incógnito | Kaito | Supermercado | Hablar con Kaito → comprar una gorra y unas gafas de sol → entregárselas | 2 F, +15 Kaito |
| S4 | Primer sueldo | Neko-san | Supermercado | Conseguir cualquier trabajo y completar un turno | 1 F |
| T1 | Entrevista en Centro Fénix | Valeria | Trabajo | Entrevista con 3 preguntas; cualquier combinación de respuestas aprueba. Puedes aceptar el puesto de Administrativo o no | 1 F, +5 Valeria |
| T2 | Rival a la vista | Ren | Trabajo | Superar los 1200 puntos de Ren en el minijuego de documentos; se puede intentar las veces que haga falta, sin necesidad de tener el empleo | 2 F, +6 Ren |
| T3 | Café para la jefa | Valeria | Trabajo | Preparar el café exacto de Valeria en Café Ascua (minijuego barista) | 1 F, +8 Valeria |
| R1 | Fuego en La Llama | Marina | Restaurante | Hablar con Marina → cocinar cualquier plato en La Llama | 2 F, +10 Marina |
| R2 | La prueba del fuego | Marina | Restaurante | Cocinar 3 platos con nota B o mejor | 3 F, 150 D |
| X1 | El origen del Fénix (secreta) | Neko-san | Todos | Se desbloquea por 5 F tras C1. Hay que encontrar 5 plumas de fénix repartidas por el mapa, que brillan de noche | 300 D, título "Hijo/Hija del Fénix" |

- **Disponibilidad:** las misiones de un bioma aparecen al desbloquearlo. C6 solo puede empezar de noche, pero se ofrece la siesta para que pase el tiempo.
- **Tablón del barrio:** cada día hay 3 tareas sacadas de este repertorio, con recompensa de 20–40 D y un 20% de probabilidad de dar 1 F:
  - limpiar el escaparate del super;
  - ayudar a una vecina con la compra;
  - fregar la entrada del Centro Fénix;
  - recoger pétalos;
  - escuchar a Nora.

## 13. Minijuegos (táctiles, de 20 a 60 s, con nota S, A, B, C o D)
1. **Cristales:** deslizar el dedo para limpiar manchas de una ventana, con contrarreloj.
2. **Fregar:** hacer círculos sobre las manchas del suelo; las difíciles necesitan varias pasadas.
3. **Ayudar en la calle:** caen cosas de una bolsa rota y hay que atraparlas con la cesta.
4. **Hacer la compra:** encontrar en la estantería los productos de la lista, entre productos señuelo.
5. **Reponer:** arrastrar cada producto a su balda del mismo color.
6. **Ritmo:** pulsar las notas en 3 carriles al compás de la música.
7. **Cocina:** tres fases: picar (toques), remover (círculos) y punto exacto (parar la barra).
8. **Barista:** memorizar un pedido de 3 a 5 ingredientes y reproducirlo.
9. **Documentos:** arrastrar papeles a la bandeja de su color; los papeles urgentes, en rojo, puntúan el doble.

## 14. Interfaz (táctil)
- **Joystick virtual** abajo a la izquierda y **botón de acción contextual** abajo a la derecha.
- **Barra superior:** hora, fase del día, energía, Deuros y Fenixios.
- **Menú:** Misiones, Mochila, Relaciones, Armario (en casa), Trabajo, Ajustes.
- **Diálogo** con retrato del personaje y opciones de tono con su icono.
- **Marcador** sobre el objetivo de la misión activa y flecha en el borde de la pantalla.
- También hay controles de teclado (WASD, E y Esc) para probar en ordenador.

## 15. Fuera del alcance de la v1
- Cinemáticas completas de boda y divorcio (en la v1 son escenas de diálogo con fundido).
- Más empleos, mascotas, decoración libre de la casa, voces habladas.
