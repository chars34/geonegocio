// ===============================
// 🔥 GEO BUSINESS API - PRODUCCION
// ===============================

const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

// 🔥 Render usa puerto dinámico
const PORT = process.env.PORT || 3000;

// ===============================
// 🔥 MIDDLEWARE
// ===============================

app.use(cors()); // Permite llamadas desde APK o web
app.use(express.json());

// ===============================
// 🔥 RUTA PRINCIPAL
// ===============================

app.get("/", (req, res) => {
    res.send("GeoBusiness API funcionando 🚀");
});

// ===============================
// 🔥 API DENUE
// ===============================

app.get("/api/denue", async (req, res) => {
    try {

        const { lat, lng, radio = 500, codigo } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({
                error: "Faltan parámetros lat o lng"
            });
        }

        // 🔥 AQUÍ VA TU TOKEN DE INEGI
        const INEGI_TOKEN = process.env.INEGI_TOKEN;

        if (!INEGI_TOKEN) {
            return res.status(500).json({
                error: "Token INEGI no configurado"
            });
        }

        // 🔥 Construcción de URL DENUE
        let url = `https://www.inegi.org.mx/app/api/denue/v1/consulta/buscar/${codigo || ""}/?latitud=${lat}&longitud=${lng}&radio=${radio}&token=${INEGI_TOKEN}`;

        const response = await axios.get(url, {
            timeout: 10000
        });

        const data = response.data;

        const negocios = data.map(n => ({
            nombre: n.Nombre,
            direccion: n.Calle,
            latitud: n.Latitud,
            longitud: n.Longitud
        }));

        res.json({ negocios });

    } catch (error) {

        console.error("Error DENUE:", error.message);

        res.status(500).json({
            error: "Error consultando DENUE"
        });
    }
});

// ===============================
// 🔥 MANEJO GLOBAL DE ERRORES
// ===============================

app.use((err, req, res, next) => {
    console.error("Error global:", err);
    res.status(500).json({ error: "Error interno del servidor" });
});

// ===============================
// 🔥 INICIAR SERVIDOR
// ===============================

app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});