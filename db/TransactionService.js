// transactionService.js
const { v4: uuidv4 } = require("uuid");
const { calculeazaSumaTotala } = require("./utils");
const {
  obtineProduseDetectate,
  finalizeazaTranzactia,
  actualizeazaStocul,
  golesteTranzactii,
} = require("./queries");

async function gestioneazaFinalizareaTranzactiei() {
  const produseCos = await obtineProduseDetectate();

  if (produseCos.length === 0) {
    throw new Error("Nu au fost gasite produse pentru plata");
  }

  const pretTotal = calculeazaSumaTotala(produseCos);
  const idBon = uuidv4();

  await finalizeazaTranzactia(idBon, pretTotal);

  // Actualizează stocul pentru fiecare produs
  for (const produs of produseCos) {
    await actualizeazaStocul(produs.produs_id, produs.cantitate);
  }

  // Goleste tabelul tranzactii dupa finalizare
  await golesteTranzactii();

  return { message: "Tranzactia a fost finalizata cu succes", idBon }; // Returning idBon
}

module.exports = {
  gestioneazaFinalizareaTranzactiei,
};
