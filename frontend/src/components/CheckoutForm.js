import React from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import axios from "axios";

const CheckoutForm = ({
  clientSecret,
  seteazaProduse,
  openReceiptModal,
  setReceiptDetails,
}) => {
  const stripe = useStripe();
  const elements = useElements();

  const proceseazaPlata = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    const cardElement = elements.getElement(CardElement);

    // Confirmarea plății cu Stripe
    const { error, paymentIntent } = await stripe.confirmCardPayment(
      clientSecret,
      {
        payment_method: {
          card: cardElement,
        },
      }
    );

    if (error) {
      console.error("Eroare la plata:", error);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      try {
        // Finalizarea tranzactiei dupa plata
        const response = await axios.post(
          "http://localhost:3000/finalizeaza-tranzactia"
        );
        const { idBon } = response.data;
        seteazaProduse([]);

        // Pass the details to the receipt modal
        setReceiptDetails({
          amountPaid: (paymentIntent.amount / 100).toFixed(2),
          idBon,
        });

        openReceiptModal();
        console.log("Tranzactia a fost finalizata:", response.data);
      } catch (eroareTranzactie) {
        console.error("Eroare la finalizarea tranzactiei:", eroareTranzactie);
      }
    }
  };

  return (
    <form onSubmit={proceseazaPlata}>
      <CardElement />
      <button type="submit" disabled={!stripe}>
        Plătește
      </button>
    </form>
  );
};

export default CheckoutForm;
