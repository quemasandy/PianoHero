# 🎹 PianoHero

![React](https://img.shields.io/badge/React-18.0.0-61DAFB?style=flat&logo=react&logoColor=black)
![Electron](https://img.shields.io/badge/Electron-28.0.0-47848F?style=flat&logo=electron&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.0.0-646CFF?style=flat&logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0.0-3178C6?style=flat&logo=typescript&logoColor=white)
![PixiJS](https://img.shields.io/badge/PixiJS-7.4.2-E34F26?style=flat)
![ToneJS](https://img.shields.io/badge/Tone.js-14.7.77-000000?style=flat)

**PianoHero** es una aplicación de escritorio open-source diseñada para simular la experiencia de un tutor interactivo de teclado (al estilo *Synthesia*). La plataforma provee herramientas visuales avanzadas en tiempo real para practicar e internalizar escalas, armonía vocal (shell voicings) y progresiones, conectándose directamente con periféricos MIDI físicos.

Construido utilizando la potencia envolvente de **Vite/React** bajo el ecosistema de **Electron**, con librerías nativas de bajo nivel como `@julusian/midi`, **Tone.js** y **Pixi.js** para la lógica audiovisual.

---

## ✨ Características Principales

- **Soporte MIDI Nativo Plug & Play**: Reconocimiento dinámico y bi-direccional de hardware MIDI (probado en controladores de 25, 49 y 88 teclas, como los dispositivos Worlde/Easykey).
- **Interfaz "Glassmorphism" Inmersiva**: Diseño Premium UI con retroalimentación visual en tiempo real. Soporta transiciones suaves, diseño magnético (carruseles) e iluminación interactiva neo-retro.
- **Rutinas de Práctica Avanzadas**: 
  - **Motor de Escalas**: Validaciones uno a uno con auto avance. (Ej: Escala Blues, Pentatónica Mayor/Menor).
  - **Progresiones Armónicas**: Deslizador dinámico de acordes (Carousel) para estudiar *Voicings* y partituras de jazz (Ej: Estándar *C Jam Blues* en progresión 1-3-b7).
  - Evaluación de simultaneidad y latencia paramétrica durante presiones complejas (Tolerancia *ms*). 
- **Gráficos Vectoriales Optimizados**: El componente base del piano (construido 100% en SVG dinámico interactivo) cuenta con geometría de precisión y escalado libre de distorsiones o pixelados.

---

## 🛠️ Stack Tecnológico

1. **Core & Empaquetado:** `Electron` 28 | `electron-vite` 2 | `electron-builder`
2. **Framework Frontend:** `React 18` + `TypeScript 5`
3. **Control y Latencia:** 
   - `@julusian/midi` para la ingesta crítica de drivers MIDI.
   - `Tone.js` y `@tonejs/midi` para interpretación musical y síntesis de respaldo.
4. **Render Visual:** Integración SVG y canvas motorizado vía `pixi.js` + `@pixi/react`.

---

## 📦 Instalación y Configuración

El proyecto requiere **Node.js (v20+)** para el correcto funcionamiento de los bindings C++ de MIDI de bajo nivel.

```bash
# 1. Clona el repositorio
git clone <tu-repositorio>

# 2. Entra al directorio
cd PianoHero

# 3. Instala las dependencias de Node
npm install
```

---

## 🚀 Uso y Desarrollo Local

Puedes correr el entorno de Vite de desarrollo con soporte de Auto-Recarga (Hot Reload) directamente integrado a la capa UI de Electron:

```bash
# Ejecutar entorno interactivo de desarrollo
npm run dev
```

### Comandos de Construcción

Para generar el compilado base del código:
```bash
npm run build
```

Para generar los instaladores empaquetados pesados listos para distribución / cliente final (generará versiones dependiendo de tu sistema operativo actual: `.dmg`, `.exe` o `.AppImage`):
```bash
npm run package
```

---

## 🎹 Solución de Problemas con Hardware (MIDI)

Si notas problemas para captar el controlador MIDI:
1. Asegúrate de conectar físicamente vía USB el controlador **antes** de lanzar la aplicación.
2. Si lo reconectas posteriormente, haz clic en el botón de la interfaz **"Reconectar MIDI"** anclado arriba a la derecha de las pantallas principales, lo cual gatillará el Hook de recarga de drivers de Node.

---

## 📜 Licencia y Contribución

Todo el código está abierto al aprendizaje libre. Siéntete libre de enviar _Pull Requests_ para agregar nuevos listados de ejercicios en la librería estática (`src/renderer/src/lib/practiceCatalog.ts`).
