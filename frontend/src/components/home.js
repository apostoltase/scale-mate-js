import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Home.css";
import logo from "./logo.png";
import shoppingCartGif from "./shopping-cart.gif";
import CheckoutForm from "./CheckoutForm";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import Modal from "react-modal";
import AdminPanel from "./AdminPanel";

// Cheie publica STRIPE
const stripePromise = loadStripe(
  "pk_test_51Ppxn9C03kdICvcM1kvsmqvLZ41GmpbtuTehGZIT5EH5JXCxcT2BMYKefmkYvUJ0Ia0VhLseNywl5exjKrB9Ng5Y00aDbrTXCa"
);

const Home = () => {
  const [produse, seteazaProduse] = useState([]);
  const [stripeClientSecret, setStripeClientSecret] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [sumaTotala, setSumaTotala] = useState(0);
  const [receiptDetails, setReceiptDetails] = useState(null);
  const [isAdmin, setIsAdmin] = useState(
    localStorage.getItem("isAuthenticated") === "true"
  );

  // Functie pentru a obtine produsele
  const obtineProduse = async () => {
    try {
      const response = await axios.get(
        "http://localhost:3000/api/produse-detectate"
      );
      seteazaProduse(Array.isArray(response.data) ? response.data : []);
    } catch (eroare) {
      alert("Eroare la obținerea produselor.");
      seteazaProduse([]);
    }
  };

  // Gestioneaza finalizarea cumparaturilor
  const proceseazaPlata = async () => {
    try {
      const suma = Math.round(
        produse.reduce(
          (total, produs) =>
            total +
            (produs.um === "kg" ? produs.cantitate / 1000 : produs.cantitate) *
              produs.pret,
          0
        ) * 100
      );

      setSumaTotala(suma / 100);

      const response = await axios.post(
        "http://localhost:3000/creeaza-payment-intent",
        {
          suma,
        }
      );

      setStripeClientSecret(response.data.clientSecret);
      setIsModalOpen(true);
    } catch (eroare) {
      alert("Eroare la procesarea platii.");
    }
  };

  // Gestioneaza stergerea produselor
  const stergereProdus = async (produs_id) => {
    if (!isAdmin) {
      return;
    }

    try {
      await axios.delete(`http://localhost:3000/sterge-produs/${produs_id}`);
      obtineProduse();
      alert("Produs sters cu succes");
    } catch (eroare) {
      alert("Eroare la stergerea produsului.");
    }
  };

  // Functia pentru inchiderea modalului de plata
  const inchideModal = () => {
    setIsModalOpen(false);
  };

  // Functia pentru deschiderea modalului de chitanta
  const openReceiptModal = () => {
    setIsModalOpen(false);
    setIsReceiptModalOpen(true);
  };

  // Functia pentru inchiderea modalului de chitanta
  const inchideReceiptModal = () => {
    setIsReceiptModalOpen(false);
    setReceiptDetails(null);
  };

  // Gestioneaza autentificarea / delogare admin
  const statusAdmin = (statut) => {
    setIsAdmin(statut);
    obtineProduse();
  };

  useEffect(() => {
    obtineProduse();

    // Configurare conexiune WebSocket
    const ws = new WebSocket("ws://localhost:3000");

    ws.onopen = () => {
      console.log("WebSocket connection opened");
    };

    ws.onmessage = (mesaj) => {
      const date = JSON.parse(mesaj.data);
      if (date.produse) {
        seteazaProduse(date.produse);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
    };
    return () => {
      ws.close();
    };
  }, []);

  return (
    <div className="home-container">
      <div className="top-section">
        <img src={logo} alt="Logo" className="logo" />
      </div>
      {produse.length === 0 ? (
        <div>
          <p>Plasati produsele pe cantar</p>
          <img
            src={shoppingCartGif}
            alt="Shopping cart"
            className="loading-gif"
          />
        </div>
      ) : (
        <>
          <table className="items-table">
            <thead>
              <tr>
                <th>Nr. crt.</th>
                <th>Denumire</th>
                <th>Cantitate</th>
                <th>Pret</th>
                {isAdmin && <th>Actiune</th>}{" "}
                {/* Se afiseaza butonul de delete doar pentru admin */}
              </tr>
            </thead>
            <tbody>
              {Array.isArray(produse) && produse.length > 0 ? (
                produse.map((produs, index) => (
                  <tr key={produs.produs_id}>
                    <td>{index + 1}</td>
                    <td>{produs.nume_produs}</td>
                    <td>{produs.cantitate}</td>
                    <td>
                      {(produs.um === "kg"
                        ? produs.cantitate / 1000
                        : produs.cantitate) * produs.pret}{" "}
                      lei
                    </td>
                    {isAdmin && (
                      <td>
                        <button
                          onClick={() => stergereProdus(produs.produs_id)}
                        >
                          Șterge
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5">Nu au fost găsite produse</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="total-price">
            <h3>
              Total: RON{" "}
              {produse
                .reduce(
                  (total, produs) =>
                    total +
                    (produs.um === "kg"
                      ? produs.cantitate / 1000
                      : produs.cantitate) *
                      produs.pret,
                  0
                )
                .toFixed(2)}
            </h3>
          </div>

          <button onClick={proceseazaPlata} className="checkout-button">
            Continuati catre plata
          </button>
        </>
      )}
      {/* Componenta AdminPanel */}
      <AdminPanel
        obtineProduse={obtineProduse}
        onAdminStatusChange={statusAdmin}
      />
      {/* Modal de plata */}
      <Modal
        isOpen={isModalOpen}
        onRequestClose={inchideModal}
        contentLabel="Modal de plata"
        ariaHideApp={false}
        className="modal-content"
        overlayClassName="modal-overlay"
      >
        <h2>Finalizati plata</h2>
        <p>Total de plata: {sumaTotala.toFixed(2)} lei</p>
        {stripeClientSecret && (
          <Elements stripe={stripePromise}>
            <CheckoutForm
              clientSecret={stripeClientSecret}
              seteazaProduse={seteazaProduse}
              openReceiptModal={openReceiptModal}
              setReceiptDetails={setReceiptDetails}
            />
          </Elements>
        )}
        <button onClick={inchideModal} className="close-button">
          Anulare
        </button>
      </Modal>

      {/* Modal de chitanta */}
      <Modal
        isOpen={isReceiptModalOpen}
        onRequestClose={inchideReceiptModal}
        contentLabel="Receipt"
        ariaHideApp={false}
        className="modal-content"
        overlayClassName="modal-overlay"
      >
        {receiptDetails && (
          <>
            <h2>Plata a fost efectuata cu succes!</h2>
            <p>Total platit: {receiptDetails.amountPaid} lei</p>
            <p>ID Bon: {receiptDetails.idBon}</p>
            <button onClick={inchideReceiptModal} className="close-button">
              Inchide
            </button>
          </>
        )}
      </Modal>
    </div>
  );
};

export default Home;
