# PianoHero — Agente Product Manager

Datos y conocimiento del agente PM. La definición del agente vive en `.claude/agents/pm.md`.

## Estructura

```
.claude/agents/
  pm.md              ← definición del agente (Claude Code la carga aquí)
  pm/
    app-overview.md  ← panorama completo de la app (auto-generado)
    research/        ← copia aquí tu investigación
    features/        ← el agente guarda propuestas de features aquí
    roadmap/         ← documentos de priorización y versiones
```

## Cómo agregar investigación

Copia cualquier archivo de texto, markdown o notas en `research/`:

```
.claude/agents/pm/research/metodo-suzuki.md
.claude/agents/pm/research/synthesia-competitor-analysis.md
.claude/agents/pm/research/jazz-pedagogy-notes.txt
```

Luego dile al agente: _"Hay nueva investigación en research/, analízala y propón features."_

## Cómo invocar al agente

Desde el chat de Claude Code:

> _"Usa el agente PM para..."_  
> _"Analiza la investigación en research/ y propón features para el catálogo de escalas"_  
> _"El PM debería revisar el roadmap y priorizar para v0.2"_

## Otros agentes (estructura futura)

```
.claude/agents/
  pm.md / pm/          ← Product Manager
  qa.md / qa/          ← QA / Testing
  devrel.md / devrel/  ← Developer Relations / Docs
```
