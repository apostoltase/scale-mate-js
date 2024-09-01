const pool = require("./connection");

// Adauga un produs detectat in tabelul Tranzactii
// Adauga un produs detectat in tabelul Tranzactii
async function adaugaProdusDetectat(produs_id, cantitate, nume_produs, pret) {
  try {
    const result = await pool.query(
      "INSERT INTO Tranzactii (produs_id, cantitate, nume_produs, pret) VALUES ($1, $2, $3, $4) RETURNING *",
      [produs_id, cantitate, nume_produs, pret]
    );
    return result.rows[0]; // Return the inserted row
  } catch (error) {
    console.error("Error inserting product into Tranzactii table:", error);
    throw new Error("Could not insert product into Tranzactii table.");
  }
}

// Obtine toate produsele detectate din Tranzactii
async function obtineProduseDetectate() {
  const result = await pool.query(
    `SELECT t.produs_id, t.cantitate, p.nume_produs, p.pret, p.um 
     FROM Tranzactii t
     JOIN Produse p ON t.produs_id = p.produs_id`
  );
  return result.rows;
}

// Completeaza tranzactia si actualizeaza stocul in tabelul Stoc
async function finalizeazaTranzactia(nr_bon_fiscal, pret_total) {
  await pool.query(
    "INSERT INTO Istoric_Tranzactii (nr_bon_fiscal, data_tranzactie, pret_total) VALUES ($1, NOW(), $2)",
    [nr_bon_fiscal, pret_total]
  );
}

// Actualizeaza stocul in tabelul stoc
async function actualizeazaStocul(produs_id, cantitate) {
  try {
    await pool.query(
      "UPDATE Stoc SET cantitate = cantitate - $1 WHERE produs_id = $2",
      [cantitate, produs_id]
    );
  } catch (error) {
    throw new Error(error.message);
  }
}

// Goleste tabelul Tranzactii
async function golesteTranzactii() {
  await pool.query("DELETE FROM Tranzactii");
}

// Obtine un produs dupa ID-ul sau
async function obtineProdusDupaId(produs_id) {
  try {
    const result = await pool.query(
      "SELECT * FROM Produse WHERE produs_id = $1",
      [produs_id]
    );
    if (result.rows.length === 0) {
      throw new Error("Produsul nu a fost găsit");
    }
    return result.rows[0];
  } catch (error) {
    throw new Error(error.message);
  }
}

// Adauga un produs nou in stoc
async function adaugaProdusInStoc(nume_produs, um, tva, pret) {
  try {
    await pool.query(
      "INSERT INTO Produse (nume_produs, um, tva, pret) VALUES ($1, $2, $3, $4)",
      [nume_produs, um, tva, pret]
    );
    return "Produs adaugat in stoc cu succes";
  } catch (error) {
    throw new Error(error.message);
  }
}

// Sterge un produs din Tranzactii
async function stergeProdusDinTranzactii(produs_id) {
  await pool.query("DELETE FROM Tranzactii WHERE produs_id = $1", [produs_id]);
}

module.exports = {
  adaugaProdusDetectat,
  obtineProduseDetectate,
  finalizeazaTranzactia,
  actualizeazaStocul,
  golesteTranzactii,
  obtineProdusDupaId,
  adaugaProdusInStoc,
  stergeProdusDinTranzactii,
};
