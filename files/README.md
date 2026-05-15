# Motor de Inferencia Lógica como Servicio

API REST que actúa como motor de inferencia simbólica: el cliente envía consultas en sintaxis Prolog y el servidor responde con los resultados derivados mediante reglas declarativas.

Integra tres paradigmas de programación:

| Paradigma | Tecnología |
|---|---|
| Programación lógica | Prolog (Tau Prolog) |
| Programación funcional | JavaScript puro (funciones puras, sin efectos) |
| Programación asíncrona | Node.js con `async/await` y Promises |

---

## Requisitos

- [Node.js](https://nodejs.org/) v18 o superior
- npm (incluido con Node.js)

---

## Instalación local

```bash
# 1. Clonar el repositorio
git clone https://github.com/TU_USUARIO/motor-inferencia.git
cd motor-inferencia

# 2. Instalar dependencias
npm install
```

---

## Ejecución

```bash
node server.js
```

El servidor se iniciará en `http://localhost:3000`.

Salida esperada:

```
✓ Motor de Inferencia Logica corriendo en http://localhost:3000
  POST /query     → ejecutar consulta Prolog
  GET  /examples  → ver consultas de ejemplo
  GET  /health    → estado del servidor
```

---

## Endpoints

### `POST /query`

Ejecuta una consulta lógica sobre la base de conocimiento.

**Request:**

```json
POST http://localhost:3000/query
Content-Type: application/json

{
  "query": "penalty_applicable(contract2)."
}
```

**Response:**

```json
{
  "success": true,
  "query": "penalty_applicable(contract2).",
  "results": [
    { "result": "true", "bindings": null }
  ],
  "count": 1
}
```

**Consulta con variables:**

```json
{ "query": "overdue_contract(X)." }
```

```json
{
  "success": true,
  "query": "overdue_contract(X).",
  "results": [
    { "result": "true", "bindings": { "X": "contract2" } }
  ],
  "count": 1
}
```

---

### `GET /examples`

Lista las consultas de ejemplo disponibles.

```bash
curl http://localhost:3000/examples
```

---

### `GET /health`

Verifica que el servidor esté activo.

```bash
curl http://localhost:3000/health
```

---

## Consultas de ejemplo con curl

```bash
# ¿Aplica penalización a contract2?
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "penalty_applicable(contract2)."}'

# ¿Cuáles contratos están vencidos?
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "overdue_contract(X)."}'

# ¿Qué clientes están en incumplimiento?
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "client_in_default(X)."}'

# ¿Qué servicios puede usar client_a?
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "client_can_access(client_a, X)."}'

# ¿Qué clientes requieren intervención urgente?
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "requires_intervention(X)."}'
```

---

## Estructura del proyecto

```
motor-inferencia/
├── server.js        ← Servidor Express + lógica asíncrona + funcional
├── knowledge.pl     ← Base de conocimiento en Prolog
├── package.json
├── README.md
└── reporte.pdf      ← Reporte del proyecto
```

---

## Base de conocimiento

El archivo `knowledge.pl` contiene:

**Hechos:** contratos (`contract1`–`contract4`), clientes (`client_a`–`client_c`), servicios (`hosting`, `support`, `consulting`) y sus relaciones.

**Reglas:**
- `penalty_applicable/1` — penalización por mora o suspensión
- `overdue_contract/1` — contratos vencidos
- `at_risk_contract/1` — contratos con más de 10 días de mora
- `eligible_for_renewal/1` — contratos renovables
- `client_in_default/1` — clientes con 2+ pagos perdidos
- `premium_client/1` — clientes con contratos premium
- `service_available/1` — servicios con contrato activo
- `client_can_access/2` — acceso de cliente a servicio
- `requires_intervention/1` — casos urgentes (mora + incumplimiento)

---

## Tecnologías

- **Node.js + Express** — servidor HTTP
- **Tau Prolog** — motor de inferencia Prolog en JavaScript
- **async/await + Promises** — programación asíncrona
- **Funciones puras** — normalización de entrada sin efectos secundarios
