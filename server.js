const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const Stripe = require("stripe");
const pool = require("./db/connection");
const fs = require("fs");
const { body, validationResult } = require("express-validator");
const {
  adaugaProdusDetectat,
  obtineProduseDetectate,
  obtineProdusDupaId,
  adaugaProdusInStoc,
} = require("./db/queries");
const {
  gestioneazaFinalizareaTranzactiei,
} = require("./db/transactionService");
const WebSocket = require("ws");

// Initializare aplicatie
const app = express();
app.use(bodyParser.json());
app.use(cors());

// Initializare Stripe
const stripe = Stripe(
  "sk_test_51Ppxn9C03kdICvcMZVRa0To8YHCsHLJUZVNYelRuS9qap0gnnAcQlH1AIK8q42ctyXfkx7kxQXcXHFv0EVwCRc5300uzJ1xGJx"
);

// Configurare server WebSocket
const wss = new WebSocket.Server({ noServer: true });
const clienti = new Set();

wss.on("connection", (ws) => {
  clienti.add(ws);

  ws.on("close", () => {
    clienti.delete(ws);
  });
});

function broadcast(data) {
  for (let client of clienti) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  }
}

// --------------------- ROUTE API ---------------------

// Adauga un produs in tabelul tranzactii
app.post(
  "/adauga-produs",
  [
    body("produs_id")
      .isInt()
      .withMessage("ID-ul produsului trebuie sa fie un numar intreg"),
    body("cantitate")
      .isFloat({ min: 0 })
      .withMessage("Cantitatea trebuie sa fie un numar pozitiv"),
  ],
  async (req, res) => {
    const erori = validationResult(req);
    if (!erori.isEmpty()) {
      return res.status(400).json({ errors: erori.array() });
    }

    const { produs_id, cantitate } = req.body;

    try {
      // Obtine detalii despre produs
      const produs = await obtineProdusDupaId(produs_id);
      if (!produs) {
        return res.status(404).send("Produsul nu a fost gasit");
      }
      const { nume_produs, pret, um } = produs;

      // Adauga in Tranzactii
      await adaugaProdusDetectat(produs_id, cantitate, nume_produs, pret);

      // Obtine produsele actualizate si transmite catre WebSocket
      const produse = await obtineProduseDetectate();
      broadcast({ produse });
      console.log("Transmitere produse actualizate:", produse);
      res.status(201).send("Produs detectat si adaugat la tranzactie");
    } catch (error) {
      console.error("Eroare la adaugarea produsului:", error);
      res.status(500).send(error.message);
    }
  }
);

// Adauga un produs in tabelul tranzactii
app.post("/admin/add-stock", async (req, res) => {
  const { nume_produs, um, tva, pret } = req.body;

  // Validate the input
  if (!nume_produs || !um || !tva || !pret) {
    return res.status(400).send("Toate campurile sunt obligatorii.");
  }

  try {
    const result = await adaugaProdusInStoc(nume_produs, um, tva, pret);
    res.status(201).send(result);
  } catch (error) {
    console.error("Eroare la adaugarea produsului in stoc:", error);
    res.status(500).send("Eroare la adaugarea produsului in stoc");
  }
});

// Obtine produsele detectate (GET /api/produse-detectate)
app.get("/api/produse-detectate", async (req, res) => {
  try {
    const produse = await obtineProduseDetectate();
    res.json(produse);
  } catch (error) {
    console.error("Eroare la obtinerea produselor detectate:", error);
    res.status(500).send("Eroare la obtinerea produselor detectate");
  }
});

// Endpoint pentru stergerea unui produs
app.delete("/sterge-produs/:produs_id", async (req, res) => {
  const { produs_id } = req.params;

  try {
    // Sterge produsul din tabelul Tranzactii
    await pool.query("DELETE FROM Tranzactii WHERE produs_id = $1", [
      parseInt(produs_id, 10),
    ]);

    // Obtine produsele actualizate si transmite catre WebSocket
    const produse = await obtineProduseDetectate();
    broadcast({ produse });

    res.status(200).send("Produs sters cu succes");
  } catch (error) {
    console.error("Eroare la stergerea produsului:", error);
    res.status(500).send("Eroare la stergerea produsului");
  }
});

// --------------------- FISIERE STATICE (FRONTEND) ---------------------

app.use(express.static(path.join(__dirname, "frontend/build")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname + "/frontend/build/index.html"));
});

// --------------------- CONFIGURARE SERVER ---------------------

// Configurare server
const server = app.listen(3000, () => {
  console.log("Server running on port 3000");
});

// Gestioneaza conexiunile WebSocket
server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

// --------------------- CONFIGURARE STRIPE ---------------------

// Endpoint pentru crearea unei Plati
app.post("/creeaza-payment-intent", async (req, res) => {
  const { suma } = req.body;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: suma,
      currency: "ron",
    });

    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error("Eroare la crearea PaymentIntent:", error);
    res.status(500).send("Eroare la crearea PaymentIntent");
  }
});

// Finalizarea tranzactiei
app.post("/finalizeaza-tranzactia", async (req, res) => {
  try {
    const rezultat = await gestioneazaFinalizareaTranzactiei();
    res.status(200).send(rezultat);
  } catch (error) {
    console.error("Eroare la finalizarea tranzactiei:", error);
    res.status(500).send({ error: error.message });
  }
});

// --------------------- ENDPOINT PROCESARE JSON ---------------------

app.post("/api/receive-measurement", async (req, res) => {
  try {
    const jsonFilePath = path.join(__dirname, "measurement_data.json");

    // Read the JSON file
    const data = fs.readFileSync(jsonFilePath, "utf8");
    const measurementData = JSON.parse(data);

    const { weight, label, confidence } = measurementData;

    // Map the label to produs_id
    const produsId = mapLabelToProdusId(label);

    if (!produsId) {
      return res.status(404).json({ error: "Produsul nu a fost gasit" });
    }

    // Update the tranzactii table
    await pool.query(
      "INSERT INTO Tranzactii (produs_id, cantitate) VALUES ($1, $2)",
      [produsId, weight]
    );

    // Obtain updated products and broadcast to WebSocket clients
    const produse = await obtineProduseDetectate();
    broadcast({ produse });

    res
      .status(200)
      .json({ message: "Data received and processed successfully" });
  } catch (error) {
    console.error("Error processing measurement data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

function mapLabelToProdusId(label) {
  // Define your mapping here
  const mapping = {
    apple: 1,
    banana: 2,
    lime: 3,
    // Add more mappings as needed
  };

  return mapping[label] || null;
}
