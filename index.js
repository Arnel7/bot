const cors = require("cors");
const express = require("express");
const bodyParser = require("body-parser");
const compression = require("compression");
const axios = require("axios");

const app = express();
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

const WhatsappCloudAPI = require("whatsappcloudapi_wrapper");
const WHATSAPP_TOKEN = "";
const WHATSAPP_NUM_ID = 269504419586680;
const WHATSAPP_BUSINESS_NUM = 333463083173559;
const Whatsapp = new WhatsappCloudAPI({
  accessToken: WHATSAPP_TOKEN,
  senderPhoneNumberId: WHATSAPP_NUM_ID,
  WABA_ID: WHATSAPP_BUSINESS_NUM,
  graphAPIVersion: "v18.0",
});

app.get("/webhook", (request, response) => {
  try {
    console.log("veryfing the webhook!");

    let mode = request.query["hub.mode"];
    let token = request.query["hub.verify_token"];
    let challenge = request.query["hub.challenge"];

    // if (
    //     mode &&
    //     token &&
    //     mode === 'subscribe' &&
    //    "Token" === token
    // ) {
    //     return response.status(200).send(challenge);
    // } else {
    //     return response.sendStatus(403);
    // }
    response.send(request.query["hub.challenge"]);
  } catch (error) {
    console.error({ error });
    return response.sendStatus(500);
  }
});
app.post("/webhook", async (request, response) => {
  try {
    const data = Whatsapp.parseMessage(request.body);

    if (data?.isMessage) {
      let incomingMessage = data.message;
      let recipientPhone = incomingMessage.from.phone;
      let recipientName = incomingMessage.from.name;
      let typeOfMsg = incomingMessage.type;
      let message_id = incomingMessage.message_id;

      // mark a message as read, the blue tick will apprear
      await Whatsapp.markMessageAsRead({
        message_id: message_id,
      });
      try {
        switch (typeOfMsg) {
          case "text_message": {
            const messageBody = incomingMessage.text.body;

            if (messageBody === "1") {
              await sendSimpleButtons(recipientPhone);
            } else if (messageBody === "2") {
              await radionButons(recipientPhone);
            } else {
              await Whatsapp.sendText({
                recipientPhone: recipientPhone,
                message: incomingMessage.text.body,
              });
            }

            break;
          }
          case "simple_button_message": {
            let button_id = incomingMessage.button_reply.id;
            await Whatsapp.sendText({
              recipientPhone: recipientPhone,
              message: `Bouton with id ${button_id} was clicked`,
            });
            break;
          }
          case "radio_button_message": {
            let selectionId = incomingMessage.list_reply.id;

            await Whatsapp.sendText({
              recipientPhone: recipientPhone,
              message: `Radio bouton with id ${selectionId} selected`,
            });
            break;
          }
          default:
            break;
        }
      } catch (error) {}
    }
  } catch (error) {
    console.log(error);
  }
  response.status(200).send(request.body);
});

app.get("/check", (req, res) => {
  res.send("<html><body><h1>Tout fonctionne bien nelboss !</h1></body></html>");
});
async function sendSimpleButtons(recipientPhone) {
  await Whatsapp.sendSimpleButtons({
    recipientPhone: recipientPhone,
    message: "Test simple button",
    listOfButtons: [
      { title: "Button 1", id: "btn_id1" },
      { title: "Button 2", id: "btn_id2" },
    ],
  });
}

async function radionButons(recipientPhone) {
  return new Promise((resolve, reject) => {
    axios
      .post(
        `https://graph.facebook.com/v18.0/${WHATSAPP_NUM_ID}/messages`,
        {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipientPhone,
          type: "interactive",
          interactive: {
            type: "list",
            header: { type: "text", text: "Radio header" },
            body: { text: "Different radio buttons!" },
            action: { button: "select", sections: LIST_OF_RADIOS },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${WHATSAPP_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      )
      .then((response) => {
        console.log(response.data);
        resolve(response);
      })
      .catch((error) => {
        console.error(error);
        reject(error);
      });
  });
}

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
