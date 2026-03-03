app.get("/api/denue", async (req, res) => {
    try {
        const { lat, lng, radio = 500, codigo } = req.query;

        if (!lat || !lng || !codigo) {
            return res.status(400).json({
                error: "Faltan parámetros lat, lng o codigo"
            });
        }

        const INEGI_TOKEN = process.env.INEGI_TOKEN;

        if (!INEGI_TOKEN) {
            return res.status(500).json({
                error: "Token INEGI no configurado"
            });
        }

        const url = `https://www.inegi.org.mx/app/api/denue/v1/consulta/buscar/${codigo}/?latitud=${lat}&longitud=${lng}&radio=${radio}&token=${INEGI_TOKEN}`;

        console.log("URL DENUE:", url);

        const response = await axios.get(url, { timeout: 10000 });

        const negocios = response.data.map(n => ({
            nombre: n.Nombre,
            direccion: n.Calle,
            latitud: n.Latitud,
            longitud: n.Longitud
        }));

        res.json({ negocios });

    } catch (error) {

        console.log("===== ERROR DETECTADO =====");
        console.log("STATUS:", error.response?.status);
        console.log("HEADERS:", error.response?.headers);
        console.log("DATA:", error.response?.data);
        console.log("MESSAGE:", error.message);

        res.status(500).json({
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
        });
    }
});
