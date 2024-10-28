const DEBUG = false;
require('dotenv').config();
const Enmap = require("enmap");
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Normal enmap with default options
// non-cached, auto-fetch enmap: 
const summaryMap = new Enmap({
  name: "summary",
  autoFetch: true,
  fetchAll: false
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // Allow only the bot owner to use the bot in DEBUG mode.
  if (DEBUG && message.author.id !== "289137568144949248") {
    return;
  }

  // Check if the channel is a thread of the forum channel 1288154643859243089.
  if (message.channel.parentId !== "1288154643859243089") {
    return;
  }

  // Check if shorter tha 10 words
  if (message.content.split(" ").length < 10) {
    return;
  }

  // TODO: Implement a text summarization algorithm to summarize the first message.
  // Iterate and count messages before this to know if it's a just created thread.
  // if(message.content.length > 50) {
  //     if(!summaryMap.get(message.channel.id))
  //     {
  //       // Send the summary message
  //       await message.reply({
  //         content: "### Summary\n" + summaryMessage,
  //         allowedMentions: { repliedUser: false }
  //       });
    
  //   }
  // }

  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");
  myHeaders.append("Authorization", "Bearer gb_api_IoDQIzMcALsdWJtdkLEBVrSUSxySTca9ZaGlldZI");

  const raw = JSON.stringify({
    "query": message.content,
  });

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow"
  };

  await fetch("https://api.gitbook.com/v1/orgs/boes7AZS75MEh9rim0yC/ask", requestOptions).then(async (response) => {
    const text = await response.text();
    // Parse it as JSON
    const json = JSON.parse(text);
    if (!(json?.answer?.text)) {
      console.log("Failed to find answer for the question: ", message.content);
      return;
    }
    // Get the answer from answer.text
    let answer = json.answer.text;
    console.log(json);

    // Send the followupQuestions
    if (json.answer.followupQuestions?.length > 0) {
      let followupQuestions = json.answer.followupQuestions;
      followupQuestions = followupQuestions.map((question, index) => {
        return `-# - ${question}`;
      });
      followupQuestions = followupQuestions.join("\n");
      answer += "\n\n-# Related Questions:\n" + followupQuestions;
    }

    const messages = [];
    while (answer.length > 0) {
      messages.push(answer.substring(0, 2000));
      answer = answer.substring(2000);
    }

    // Make sure to parse messages special characters of discord, unescape them if they are escaped.
    messages.forEach((msg, index) => {
      messages[index] = msg
        .replace(/\\n/g, '\n') // Uneascape new lines
        .replace(/\\r/g, '\r') // Uneascape carriage returns
        .replace(/\\t/g, '\t') // Uneascape tabs
        .replace(/\\`/g, '`') // Unescape backticks
        .replace(/\n\n/g, '\n') // Remove double new lines
    });

    for (let i = 0; i < messages.length; i++) {
      await message.reply(messages[i]);
      if(i + 1 < messages.length - 1) {
        // Wait 200ms before sending the next message, to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
  });
});


client.login(process.env.DISCORD_BOT_TOKEN);
