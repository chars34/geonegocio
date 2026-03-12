const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Servir archivos estáticos (si tienes index.html)
app.use(express.static(__dirname));

let negocios = [];
let csvCargado = false;

// Ruta del CSV
const CSV_PATH = path.join(__dirname, "conjunto_de_datos", "denue_puebla.csv");

// ============================
// CARGAR CSV EN MEMORIA
// ============================
if (fs.existsSync(CSV_PATH)) {

    console.log("⏳ Iniciando carga de CSV...");

    fs.createReadStream(CSV_PATH)
        .pipe(csv())
        .on("data", (row) => {

            const lat = parseFloat(row.latitud);
            const lng = parseFloat(row.longitud);

            if (isNaN(lat) || isNaN(lng)) return;

            const negocio = {
                nombre: row.nom_estab?.trim() || "SIN NOMBRE",
                codigo_act: String(row.codigo_act || "").trim(),
                latitud: lat,
                longitud: lng,
                direccion: `${row.nom_vial || ""} ${row.numero_ext || ""}, ${row.nom_col || ""}`
                    .replace(/\s+/g, " ")
                    .trim()
            };

            negocios.push(negocio);

        })
        .on("end", () => {

            csvCargado = true;

            console.log("✅ CSV cargado correctamente");
            console.log(`📊 Total negocios indexados: ${negocios.length.toLocaleString()}`);

        })
        .on("error", (err) => {

            console.error("❌ Error leyendo CSV:", err.message);

        });

} else {

    console.error("❌ No se encontró el CSV:", CSV_PATH);

}

// ============================
// FUNCIÓN DISTANCIA HAVERSINE
// ============================
function distancia(lat1, lon1, lat2, lon2) {

    const R = 6371000;
    const toRad = x => (x * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

// ============================
// RUTA PRINCIPAL
// ============================
app.get("/", (req, res) => {

    res.send("🚀 GeoBusiness API funcionando");

});

// ============================
// STATUS DEL SERVIDOR
// ============================
app.get("/api/status", (req, res) => {

    res.json({
        online: true,
        datosCargados: csvCargado,
        totalNegocios: negocios.length
    });

});

// ============================
// API BUSCAR NEGOCIOS DENUE
// ============================
app.get("/api/denue", (req, res) => {

    if (!csvCargado) {

        return res.status(503).json({
            error: "Servidor indexando datos, intenta en unos segundos"
        });

    }

    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radio = parseFloat(req.query.radio) || 500;
    const codigo = req.query.codigo?.trim();

    if (isNaN(lat) || isNaN(lng)) {

        return res.status(400).json({
            error: "Debes enviar lat y lng válidos"
        });

    }

    let sumaDistancias = 0;

    const resultados = negocios.filter(n => {

        if (codigo && n.codigo_act !== codigo) return false;

        const d = distancia(lat, lng, n.latitud, n.longitud);

        if (d <= radio) {

            n.distanciaMetros = Math.round(d);
            sumaDistancias += d;
            return true;

        }

        return false;

    });

    resultados.sort((a, b) => a.distanciaMetros - b.distanciaMetros);

    const areaKm2 = Math.PI * Math.pow(radio / 1000, 2);
    const densidadKm2 = resultados.length / areaKm2;

    const distanciaPromedio =
        resultados.length > 0
            ? Math.round(sumaDistancias / resultados.length)
            : 0;

    res.json({

        parametros: { lat, lng, radio, codigo },

        metricas: {
            totalEncontrados: resultados.length,
            densidadPorKm2: parseFloat(densidadKm2.toFixed(2)),
            distanciaPromedioMts: distanciaPromedio,
            radioAnalisisMts: radio
        },

        negocios: resultados.slice(0, 500)

    });

});

// ============================
// API MACHINE LEARNING
// ============================
app.post("/api/ml", async (req, res) => {

    try {

        const response = await axios.post(
            "http://127.0.0.1:5001/predecir",
            req.body,
            { timeout: 8000 }
        );

        res.json(response.data);

    } catch (error) {

        console.error("❌ Error conectando ML:", error.message);

        res.status(502).json({
            error: "No se pudo conectar al motor de ML",
            details: error.message
        });

    }

});

// ============================
// INICIAR SERVIDOR
// ============================
app.listen(PORT, () => {

    console.log(`\n🚀 GeoBusiness API iniciada`);
    console.log(`🌐 http://localhost:${PORT}`);

});
