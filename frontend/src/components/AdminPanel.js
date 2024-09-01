import React, { useState, useEffect } from "react";
import Modal from "react-modal";
import axios from "axios";
import { credentialeAdmin } from "./Auth";

const AdminPanel = ({ obtineProduse, onAdminStatusChange }) => {
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem("isAuthenticated") === "true"
  );
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isAddTransactionModalOpen, setIsAddTransactionModalOpen] =
    useState(false);
  const [produsNou, setProdusNou] = useState({
    nume_produs: "",
    um: "",
    tva: "",
    pret: "",
  });
  const [produsTranzactie, setProdusTranzactie] = useState({
    produs_id: "",
    cantitate: "",
  });

  const modificaStatutAdmin = (status) => {
    setIsAuthenticated(status);
    if (status) {
      localStorage.setItem("isAuthenticated", "true");
    } else {
      localStorage.removeItem("isAuthenticated");
    }
    onAdminStatusChange(status); // Notify parent of admin status change
  };

  useEffect(() => {
    // Configurare conexiune WebSocket
    const ws = new WebSocket("ws://localhost:3000");

    ws.onopen = () => {
      console.log("WebSocket connection opened");
    };

    ws.onmessage = (mesaj) => {
      const date = JSON.parse(mesaj.data);
      console.log("Received WebSocket message:", date);
      if (date.items) {
        obtineProduse();
      }
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
    };

    return () => {
      ws.close();
    };
  }, [obtineProduse]);

  // Gestioneaza autentificarea administratorului
  const gestioneazaAutentificareAdmin = (username, parola) => {
    if (credentialeAdmin(username, parola)) {
      modificaStatutAdmin(true);
      setIsAdminModalOpen(false);
      alert("Autentificare reusita");
    } else {
      alert("Credentiale invalide");
    }
  };

  // Gestioneaza adaugarea unui produs nou in tabelul Produse
  const adaugaProdusInStoc = async () => {
    try {
      const response = await axios.post(
        "http://localhost:3000/admin/add-stock",
        produsNou
      );
      console.log("Server response:", response.data);
      setProdusNou({ nume_produs: "", um: "", tva: "", pret: "" });
      setIsAddProductModalOpen(false);
      alert("Produs adaugat in stoc cu succes");
      obtineProduse();
    } catch (eroare) {
      console.error("Eroare la adaugarea produsului in stoc:", eroare);
      alert("Eroare la adaugarea produsului in stoc");
    }
  };

  // Gestioneaza adaugarea unui produs nou în tabelul tranzactii (cel care afiseaza in frontend)
  const adaugaProdusInTranzactii = async () => {
    try {
      await axios.post("http://localhost:3000/adauga-produs", produsTranzactie);
      setProdusTranzactie({ produs_id: "", cantitate: "" });
      setIsAddTransactionModalOpen(false);
      alert("Produs adaugat cu succes");
      obtineProduse();
    } catch (eroare) {
      alert("Eroare la adaugarea produsului");
    }
  };

  // Gestioneaza delogarea administratorului
  const delogareAdmin = () => {
    modificaStatutAdmin(false);
    alert("Deconectare reușită");
  };

  return (
    <div>
      {!isAuthenticated ? (
        <button
          onClick={() => setIsAdminModalOpen(true)}
          className="admin-button"
        >
          Autentificare Administrare
        </button>
      ) : (
        <>
          <button
            onClick={() => setIsAddProductModalOpen(true)}
            className="admin-button"
          >
            Adaugare Produs in stoc
          </button>
          <button
            onClick={() => setIsAddTransactionModalOpen(true)}
            className="admin-button"
          >
            Adaugare Produs
          </button>
          <button onClick={delogareAdmin} className="admin-button">
            Deconectare
          </button>
        </>
      )}
      {/* Modal de autentificare admin */}
      <Modal
        isOpen={isAdminModalOpen}
        onRequestClose={() => setIsAdminModalOpen(false)}
        contentLabel="Autentificare Admin"
        ariaHideApp={false}
        className="modal-content"
        overlayClassName="modal-overlay"
      >
        <FormularAutentificareAdmin onLogin={gestioneazaAutentificareAdmin} />
      </Modal>
      {/* Modal adaugare produs in stoc */}
      <Modal
        isOpen={isAddProductModalOpen}
        onRequestClose={() => setIsAddProductModalOpen(false)}
        contentLabel="Adaugare Produs in stoc"
        ariaHideApp={false}
        className="modal-content"
        overlayClassName="modal-overlay"
      >
        <FormularAdaugaProdusInStoc
          produsNou={produsNou}
          seteazaProdusNou={setProdusNou}
          onSubmit={adaugaProdusInStoc}
        />
      </Modal>
      {/* Modal adaugare produs */}
      <Modal
        isOpen={isAddTransactionModalOpen}
        onRequestClose={() => setIsAddTransactionModalOpen(false)}
        contentLabel="Adaugare Produs"
        ariaHideApp={false}
        className="modal-content"
        overlayClassName="modal-overlay"
      >
        <FormularAdaugaTranzactie
          produsTranzactie={produsTranzactie}
          seteazaProdusTranzactie={setProdusTranzactie}
          onSubmit={adaugaProdusInTranzactii}
        />
      </Modal>
    </div>
  );
};

const FormularAutentificareAdmin = ({ onLogin }) => {
  const [utilizator, setUtilizator] = useState("");
  const [parola, setParola] = useState("");

  const gestioneazaSubmit = (e) => {
    e.preventDefault();
    onLogin(utilizator, parola);
  };

  return (
    <form onSubmit={gestioneazaSubmit}>
      <h2>Autentificare Administrare</h2>
      <input
        type="text"
        placeholder="Utilizator"
        value={utilizator}
        onChange={(e) => setUtilizator(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Parola"
        value={parola}
        onChange={(e) => setParola(e.target.value)}
        required
      />
      <button type="submit">Autentificare</button>
    </form>
  );
};

const FormularAdaugaProdusInStoc = ({
  produsNou,
  seteazaProdusNou,
  onSubmit,
}) => {
  return (
    <form onSubmit={onSubmit}>
      <h2>Adaugare Produs Nou in Stoc</h2>
      <input
        type="text"
        placeholder="Nume Produs"
        value={produsNou.nume_produs}
        onChange={(e) =>
          seteazaProdusNou({ ...produsNou, nume_produs: e.target.value })
        }
        required
      />
      <input
        type="text"
        placeholder="Unitate de Masura (ex: kg/buc)"
        value={produsNou.um}
        onChange={(e) => seteazaProdusNou({ ...produsNou, um: e.target.value })}
        required
      />
      <input
        type="number"
        placeholder="TVA"
        value={produsNou.tva}
        onChange={(e) =>
          seteazaProdusNou({ ...produsNou, tva: e.target.value })
        }
        required
      />
      <input
        type="number"
        placeholder="Pret"
        value={produsNou.pret}
        onChange={(e) =>
          seteazaProdusNou({ ...produsNou, pret: e.target.value })
        }
        required
      />
      <button type="submit">Adaugare produs in stoc</button>
    </form>
  );
};

const FormularAdaugaTranzactie = ({
  produsTranzactie,
  seteazaProdusTranzactie,
  onSubmit,
}) => {
  return (
    <form onSubmit={onSubmit}>
      <h2>Adaugare produs</h2>
      <input
        type="number"
        placeholder="ID Produs"
        value={produsTranzactie.produs_id}
        onChange={(e) =>
          seteazaProdusTranzactie({
            ...produsTranzactie,
            produs_id: e.target.value,
          })
        }
        required
      />
      <input
        type="number"
        placeholder="Cantitate"
        value={produsTranzactie.cantitate}
        onChange={(e) =>
          seteazaProdusTranzactie({
            ...produsTranzactie,
            cantitate: e.target.value,
          })
        }
        required
      />
      <button type="submit">Adaugare produs</button>
    </form>
  );
};

export default AdminPanel;
