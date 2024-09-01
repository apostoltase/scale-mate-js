const calculeazaSumaTotala = (produse) => {
  return produse.reduce((total, produs) => {
    const sumaProdus =
      (produs.um === "kg" ? produs.cantitate / 1000 : produs.cantitate) *
      produs.pret;
    return total + sumaProdus;
  }, 0);
};

module.exports = {
  calculeazaSumaTotala,
};
