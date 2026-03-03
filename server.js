const express = require("express");

const cors = require("cors");
const { Pool } = require("pg");   // 👈 AQUÍ

const pool = new Pool({           // 👈 Y AQUÍ
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("GeoBusiness API funcionando 🚀");
});

app.get("/api/denue", async (req, res) => {
  try {
    const { lat, lng, radio = 500, codigo } = req.query;

    if (!lat || !lng || !codigo) {
      return res.status(400).json({
        error: "Faltan parámetros lat, lng o codigo"
      });
    }

    // 🔥 Consulta usando fórmula Haversine (radio en metros)
    const query = `
      SELECT nombre, codigo_actividad, latitud, longitud
      FROM denue
      WHERE codigo_actividad = $1
      AND (
        6371000 * acos(
          cos(radians($2)) *
          cos(radians(latitud)) *
          cos(radians(longitud) - radians($3)) +
          sin(radians($2)) *
          sin(radians(latitud))
        )
      ) <= $4
      LIMIT 500
    `;

    const values = [codigo, lat, lng, radio];

    const result = await pool.query(query, values);

    res.json({
      total: result.rows.length,
      negocios: result.rows
    });

  } catch (error) {
    console.error("Error BD:", error);
    res.status(500).json({
      error: "Error consultando base local"
    });
  }
});
