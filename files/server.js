'use strict';

const express = require('express');
const pl = require('tau-prolog');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());

// ─── Programacion Funcional: funciones puras de normalizacion ────────────────

/**
 * Normaliza una consulta Prolog:
 * - Elimina espacios innecesarios
 * - Asegura que termine con punto
 * - Rechaza entradas vacias
 */
const normalizeQuery = (raw) => {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
};

/**
 * Extrae los bindings (variables) de una solucion Prolog
 * Funcion pura: no modifica estado externo
 */
const extractBindings = (session, query) => {
  const vars = query
    .replace(/[^A-Za-z0-9_,\s()]/g, ' ')
    .split(/[\s,()]+/)
    .filter(tok => /^[A-Z_][A-Za-z0-9_]*$/.test(tok) && tok !== '_');

  const uniqueVars = [...new Set(vars)];

  return uniqueVars.reduce((acc, varName) => {
    const val = session.get_answer(varName);
    if (val) {
      acc[varName] = pl.format_answer(val);
    }
    return acc;
  }, {});
};

/**
 * Formatea una respuesta de exito
 */
const formatSuccess = (solutions, query) => ({
  success: true,
  query,
  results: solutions,
  count: solutions.length,
});

/**
 * Formatea una respuesta de error
 */
const formatError = (message, query = null) => ({
  success: false,
  error: message,
  ...(query && { query }),
});

// ─── Programacion Asincrona: carga de la base de conocimiento ────────────────

/**
 * Carga la base de conocimiento Prolog de forma asincrona
 * Retorna una Promise que resuelve con el contenido del archivo
 */
const loadKnowledgeBase = async () => {
  const kbPath = path.join(__dirname, 'knowledge.pl');
  return fs.readFile(kbPath, 'utf-8');
};

/**
 * Inicializa una sesion Tau Prolog y consulta con async/await y Promises
 * Demuestra programacion asincrona envolviendo callbacks en Promises
 */
const runPrologQuery = (knowledgeBase, queryStr) => {
  return new Promise((resolve, reject) => {
    // Crear sesion Prolog
    const session = pl.create(1000);

    // Cargar la base de conocimiento
    session.consult(knowledgeBase, {
      success: () => {
        // Ejecutar la consulta
        session.query(queryStr, {
          success: () => {
            const solutions = [];

            // Funcion recursiva para obtener todas las soluciones
            const getNextAnswer = () => {
              session.answer({
                success: (answer) => {
                  // Extraer variables de la solucion usando programacion funcional
                  const vars = Object.keys(session.thread.env || {})
                    .filter(k => /^[A-Z_][A-Za-z0-9_]*$/.test(k) && k !== '_');

                  const bindings = vars.reduce((acc, varName) => {
                    const val = session.get_answer(varName);
                    if (val !== undefined && val !== null) {
                      acc[varName] = pl.format_answer(val);
                    }
                    return acc;
                  }, {});

                  solutions.push({
                    result: 'true',
                    bindings: Object.keys(bindings).length > 0 ? bindings : null,
                  });

                  // Buscar siguiente solucion
                  getNextAnswer();
                },
                fail: () => {
                  // No hay mas soluciones
                  if (solutions.length === 0) {
                    resolve([{ result: 'false', bindings: null }]);
                  } else {
                    resolve(solutions);
                  }
                },
                error: (err) => {
                  reject(new Error(`Error al evaluar: ${pl.format_answer(err)}`));
                },
                limit: () => {
                  reject(new Error('Limite de inferencias alcanzado'));
                },
              });
            };

            getNextAnswer();
          },
          error: (err) => {
            reject(new Error(`Consulta invalida: ${pl.format_answer(err)}`));
          },
        });
      },
      error: (err) => {
        reject(new Error(`Error al cargar base de conocimiento: ${err}`));
      },
    });
  });
};

// ─── Endpoints ────────────────────────────────────────────────────────────────

/**
 * POST /query
 * Recibe una consulta Prolog y retorna los resultados inferidos
 *
 * Body: { "query": "penalty_applicable(contract1)." }
 * Response: { success, query, results, count }
 */
app.post('/query', async (req, res) => {
  const rawQuery = req.body?.query;

  // Normalizacion funcional de la entrada
  const query = normalizeQuery(rawQuery);

  if (!query) {
    return res.status(400).json(
      formatError('El campo "query" es obligatorio y debe ser un string no vacio.')
    );
  }

  try {
    // Carga asincrona de la base de conocimiento
    const knowledgeBase = await loadKnowledgeBase();

    // Inferencia logica asincrona
    const solutions = await runPrologQuery(knowledgeBase, query);

    return res.json(formatSuccess(solutions, query));

  } catch (error) {
    console.error('[ERROR]', error.message);

    if (error.message.includes('invalida') || error.message.includes('invalid')) {
      return res.status(422).json(formatError(error.message, query));
    }

    return res.status(500).json(formatError(error.message, query));
  }
});

/**
 * GET /health
 * Verifica que el servidor esta activo
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * GET /facts
 * Lista los ejemplos de consultas disponibles
 */
app.get('/examples', (req, res) => {
  res.json({
    description: 'Ejemplos de consultas para el motor de inferencia',
    examples: [
      { query: 'penalty_applicable(contract2).', description: 'Verifica si aplica penalizacion a un contrato' },
      { query: 'overdue_contract(X).', description: 'Lista todos los contratos vencidos' },
      { query: 'at_risk_contract(X).', description: 'Lista contratos en riesgo' },
      { query: 'eligible_for_renewal(X).', description: 'Contratos elegibles para renovacion' },
      { query: 'client_in_default(X).', description: 'Clientes en incumplimiento' },
      { query: 'premium_client(X).', description: 'Lista clientes premium' },
      { query: 'service_available(X).', description: 'Servicios actualmente disponibles' },
      { query: 'client_can_access(client_a, X).', description: 'Servicios accesibles para client_a' },
      { query: 'requires_intervention(X).', description: 'Clientes que requieren intervencion urgente' },
    ],
  });
});

// ─── Inicio del servidor ──────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✓ Motor de Inferencia Logica corriendo en http://localhost:${PORT}`);
  console.log(`  POST /query     → ejecutar consulta Prolog`);
  console.log(`  GET  /examples  → ver consultas de ejemplo`);
  console.log(`  GET  /health    → estado del servidor`);
});

module.exports = app;
