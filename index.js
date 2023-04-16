// Importing Required Dependencies
const fs = require("fs");
const { google } = require("googleapis");
const readline = require("readline");

const TOKEN_PATH = "./token.json";


// Reading credentials for authorization from credentials json file
setInterval(() => {
  fs.readFile("./credentials.json", (err, content) => {
    if (err) return console.log("Error loading client secret file:", err);
    // Authorize a client with credentials, then call the Gmail API.
    authorize(JSON.parse(content), createLabel);
  });
}, 4500);


// Boilerplate from Google api page

async function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

async function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://mail.google.com/",
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/gmail.compose",
      "https://www.googleapis.com/auth/gmail.send",
    ],
  });
  console.log("Authorize this app by visiting this url:", authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question("Enter the code from that page here: ", (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error("Error retrieving access token", err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) console.error(err);
        console.log("Token stored to", TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}


// Creating label and sending mails and adding replied mails to custom label folder
const labelName = "Auto-Replied"; // Customize the label name here

function createLabel(auth) {
  const gmail = google.gmail({ version: "v1", auth });

  // getting all the labels
  gmail.users.labels.list(
    {
      userId: "me",
    },
    (err, res) => {
      if (err) return console.log("The API returned an error: " + err);
      const labels = res.data.labels;
      let labelExists = false;
      let labelId;
      labels.forEach((label) => {
        if (label.name === labelName) {
          labelExists = true;
          labelId = label.id;
          return;
        }
      });
      if (!labelExists) {
        gmail.users.labels.create(
          {
            userId: "me",
            resource: {
              name: labelName,
              labelListVisibility: "labelShow",
              messageListVisibility: "show",
            },
          },
          (err, res) => {
            if (err) return console.log("The API returned an error: " + err);
            console.log(`Label '${labelName}' created successfully!`);
            labelId = res.data.id;
            checkEmails(auth, labelId);
          }
        );
      } else {
        console.log(`Label '${labelName}' already exists.`);
        checkEmails(auth, labelId);
      }
    }
  );
}

function checkEmails(auth, labelId) {
  const gmail = google.gmail({ version: "v1", auth });

  // listing all the mails
  gmail.users.messages.list(
    {
      userId: "me",
      labelIds: ["INBOX", "UNREAD"],
    },
    (err, res) => {
      if (err) return console.log("The API returned an error: " + err);
      const messages = res.data.messages;
      if (messages) {
        messages.forEach((message) => {
          gmail.users.messages.get(
            {
              userId: "me",
              id: message.id,
            },
            (err, res) => {
              if (err) return console.log("The API returned an error: " + err);

              const threadId = res.data.threadId;

              const headers = res.data.payload.headers;

              const fromHeader = headers.find(
                (header) => header.name === "From"
              );

              const toHeader = headers.find((header) => header.name === "To");
              const subjectHeader = headers.find(
                (header) => header.name === "Subject"
              );

              const messageIdHeader = headers.find(
                (header) => header.name === "Message-ID"
              );
              
              const body = res.data.snippet;

              const reply = `Hi ${
                fromHeader.value.split(" ")[0]
              },\n\nThanks for your email. I have received it and will get back to you as soon as possible.\n\nBest regards,\nMail Project Tester`;

              const raw = [
                `From: ${toHeader.value}`,
                `To: ${fromHeader.value}`,
                `Subject: Re: ${subjectHeader.value}`,
                `In-Reply-To: ${messageIdHeader.value}`,
                `References: ${messageIdHeader.value}`,
                `Thread-Id: ${threadId}`,
                `Content-Type: text`,
                `Content-Disposition: inline`,
                `Content-Transfer-Encoding: quoted-printable\n\n`,
                reply,
              ].join("\n");

              const buff = Buffer.from(raw, "utf-8");
              const encoded = buff
                .toString("base64")
                .replace(/\+/g, "-")
                .replace(/\//g, "_")
                .replace(/=+$/, "");

              // sending auto message reply
              gmail.users.messages.send(
                {
                  userId: "me",
                  resource: {
                    raw: encoded,
                    threadId: message.threadId,
                  },
                },
                (err, res) => {
                  // console.log(res);
                  if (err)
                    return console.log("The API returned an error: " + err);
                  console.log(
                    `Auto-reply sent to '${fromHeader.value}' with subject '${subjectHeader.value}'.`
                  );

                  // Moving auto replied messages to custom label
                  gmail.users.messages.modify(
                    {
                      userId: "me",
                      id: message.id,
                      addLabelIds: [labelId],
                      removeLabelIds: ["INBOX", "UNREAD"],
                    },
                    (err, res) => {
                      if (err)
                        return console.log("The API returned an error: " + err);
                      console.log(
                        `Email moved to label '${labelName}' successfully.`
                      );
                    }
                  );
                }
              );
            }
          );
        });
      } else {
        console.log("No new messages.");
      }
    }
  );
}

