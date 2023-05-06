# AutoMail-Replier
This is basically nodejs script that periodically checks for new emails that are available in your account and replies to them automatically when you are on vacations. Also it adds those emails to different folder so you can have a look at them later.

# What the Script is able to do?

      - Nodejs script check for new emails in given Gmail ID
      
      - Implemented the “Login with google” API for this

      - Script sends replies to Emails that have no prior replies
      
      - Script identifies and isolates the email threads in which no prior email has been sent by you means only reply to first time email threads sent by others to your mailbox.

      - Script adds up a Label to the email and move the email to the label
      
      - After sending the reply, the email is tagged with a label in Gmail.

      - If the label is not created already, label is created. Using Google’s APIs to accomplish this

      - Script repeats this sequence of steps to check for new mails in random intervals of 45 to 120 seconds
      
      

# How to start the application
- Download this repository and open in any ide.
- open terminal and write ```npm install googleapis```
- You may need to download your own credentials and delete the token file (that will be created automatically for your application)
- Run the script.
