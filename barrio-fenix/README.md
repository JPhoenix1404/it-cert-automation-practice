# Barrio Fénix

Simulador de vida acogedor con estética anime para **iPad**, sin conexión. PEGI 18.
Te mudas a un barrio nuevo: limpias tu casa, haces la compra, trabajas, haces amigos, ligas y quizá te casas.

- Documento de diseño: [`docs/GDD.md`](docs/GDD.md)
- Tecnología: HTML + JavaScript + [three.js](https://threejs.org) (incluido en `vendor/`). No necesita compilación ni dependencias.

## Instalarlo en el iPad
1. Publica esta carpeta en un servidor HTTPS. Lo más sencillo es GitHub Pages:
   - En GitHub ve a **Settings → Pages**.
   - En «Source» elige la rama `claude/anime-life-sim-ipad` y la carpeta `/ (root)`.
   - El juego quedará en `https://<tu-usuario>.github.io/<repo>/barrio-fenix/`.
2. Abre esa dirección en **Safari** desde el iPad.
3. Pulsa **Compartir → Añadir a pantalla de inicio**.
4. Ábrelo desde el icono: se ve a pantalla completa y, tras la primera carga, **funciona sin conexión**. La partida se guarda en el propio iPad.

## Probarlo en un ordenador
```bash
cd barrio-fenix
python3 -m http.server 8000
# abre http://localhost:8000
```
Controles de teclado: WASD o flechas para moverte, E o Espacio para interactuar, Esc para cerrar menús y la rueda del ratón para el zoom.

## Estructura
| Ruta | Contenido |
|---|---|
| `src/main.js` | Arranque, creador de personaje, bucle principal y retratos |
| `src/world.js` | Mapa, biomas, edificios, cielo día/noche |
| `src/character.js` | Personajes procedurales estilo anime (cel-shading) |
| `src/gameplay.js` | Interacciones, conversaciones, citas, trabajo, tiendas y menús |
| `src/quests.js`, `src/relations.js` | Motor de misiones y de relaciones |
| `src/minigames/` | Los 9 minijuegos táctiles |
| `src/data/` | Personajes, diálogos, misiones y objetos (aquí se edita el contenido) |
| `assets/music/` | Música original (Suno) |
| `tools/build-sw.mjs` | Regenera `sw.js` (lista de archivos para jugar sin conexión) |

**Si cambias cualquier archivo**, ejecuta `node tools/build-sw.mjs` para que el iPad descargue la versión nueva.

## Créditos de recursos
- Edificios, mobiliario urbano y muebles: **KayKit** de Kay Lousberg (www.kaylousberg.com), licencia CC0.
- Gato animado de Neko-san: **Vuena**, «Free Low-Poly Animals», licencia CC0.
- Personajes 3D: creados con VRoid Studio.
- Motor: three.js y @pixiv/three-vrm (MIT).
- Texturas de suelo, caminos, setos, paredes, tejados y suelos interiores: **Poly Haven** (polyhaven.com), licencia CC0.
- Mobiliario realista (farolas, bancos, jardineras, papeleras, mesas de terraza, escritorios, estantería, mesas de comedor, barriles, mesas y taburetes de café): **Poly Haven**, licencia CC0.
- Efecto de resplandor nocturno: three.js (UnrealBloomPass, MIT).
