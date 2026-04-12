Original prompt: [roadMap.md](roadMap.md) Arreglar un bug en la pantalla principal. Ya pongo el archivo MIDI y luego me sale una pantalla vacía donde debería ya salir la aplicación. No entro porque

osea veo la pantalla un momento y luego se pone sin nada

2026-04-11
- Revisado `roadMap.md`, `App.tsx`, `Play.tsx` y `Waterfall.tsx`.
- Confirmado que no existía `progress.md`; se inicializa para seguir el bucle de depuración y validación visual.
- Próximo paso: reproducir el fallo al cargar un MIDI para capturar errores y confirmar si el problema está en `Play`, `Waterfall` o el flujo de audio/scheduler.
- Investigado `Library.tsx`, `Scheduler.ts`, `AudioPlayer.ts`, `Piano.tsx`, `Controls.tsx`, `useMidiDevice.ts`, `electron/main.ts`, `preload.ts` y `MidiParser.ts`.
- Detectado que el entorno local del agente tenía Node 14 por defecto; se verificó compilación con Node 20 desde `~/.nvm/versions/node/v20.19.6/bin`.
- Ajustado `Play.tsx` para fijar la pantalla al viewport con grid `auto / minmax(0,1fr) / auto / auto`, evitando que el área del waterfall empuje piano/controles fuera de la ventana.
- Endurecido `Waterfall.tsx`:
  - fallback manual para rectángulos redondeados cuando `ctx.roundRect` no esté disponible;
  - `draw()` protegido con `try/catch` para no dejar el renderer en blanco por una excepción del canvas;
  - contenedor del canvas forzado a `width/height: 100%` y `minHeight: 0`.
- Validación completada: `npm run build` exitoso usando Node 20.
- Limitación del entorno: no fue posible lanzar Chromium/Electron dentro del sandbox para inspección visual directa; se necesita reiniciar la app en la máquina del usuario para confirmar el fix end-to-end.
- Nueva instrumentación añadida para capturar la causa exacta del renderer blank/crash:
  - logs persistentes en proceso principal de Electron con eventos de carga, navegación, `console-message`, `render-process-gone`, `child-process-gone`, `uncaughtException` y `unhandledRejection`;
  - IPC de diagnóstico en preload para enviar eventos del renderer y leer el snapshot reciente;
  - listeners globales `window.error` y `unhandledrejection` en renderer;
  - `ErrorBoundary` de React para evitar pantalla blanca silenciosa cuando el renderer sigue vivo;
  - panel flotante `Logs` dentro de la app para ver los últimos eventos y abrir/copiar la ruta del archivo de log;
  - eventos explícitos en `Library.tsx`, `App.tsx` y `Play.tsx` para trazar `loadFile -> parse -> cambio de pantalla -> mount de Play -> inicialización de scheduler/audio`.
- Validación posterior a la instrumentación: `npm run build` exitoso usando Node 20.
- Próximo paso real en la máquina del usuario: reiniciar la app, reproducir el bug, abrir el panel `Logs` y revisar los últimos eventos o el archivo `pianohero-diagnostics.log` para identificar si el problema es crash del renderer, reload inesperado o error JS/React.
- Resultado del diagnóstico en la máquina del usuario:
  - el log persistente mostró `render-process-gone` con `reason: "crashed"` y `exitCode: 11`;
  - no hubo `window.error`, `unhandledrejection` ni error de React antes del fallo;
  - el crash ocurrió inmediatamente después del segundo `play.mount`, lo que señala el doble montaje de `React.StrictMode` en dev;
  - el último paso antes del crash fue `play.audio.load.started`, así que el sospechoso principal quedó en la inicialización temprana de Tone/AudioPlayer al entrar a la pantalla de reproducción.
- Arreglo aplicado:
  - removido `React.StrictMode` del bootstrap del renderer para evitar el doble montaje en desarrollo;
  - simplificado `AudioPlayer` a sintetizador local estable, quitando la carga temprana del `Tone.Sampler` por red;
  - `broadcastDiagnostics` blindado con `try/catch` para no generar ruido al enviar eventos a un frame ya destruido.
- Validación después del arreglo: `npm run build` exitoso usando Node 20.
- Nuevo requerimiento implementado:
  - conexión automática del primer dispositivo MIDI detectado al entrar en `Play`;
  - indicador visible de estado MIDI en la pantalla de reproducción;
  - modo aprendizaje activado por defecto;
  - el scheduler ahora bloquea realmente el avance cuando una nota ya llegó al play line y no ha sido pulsada;
  - las notas presionadas un poco antes en el teclado MIDI cuentan como válidas para liberar la espera.
- Archivos tocados para esto:
  - `src/renderer/src/screens/Play.tsx`
  - `src/renderer/src/lib/Scheduler.ts`
  - `src/renderer/src/components/Controls.tsx`
- Validación posterior: `npm run build` exitoso usando Node 20.
