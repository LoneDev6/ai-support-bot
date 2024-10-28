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

  // Check if author is 289137568144949248, for debug purpose.
  // if (message.author.id !== "289137568144949248" && message.author.id !== "424945423632039937" && message.author.id !== "204232208049766400") {npm
  //   return;
  // }
  // Debug to allow only me to use the bot.
  if (message.author.id !== "289137568144949248") {
    return;
  }

  // Check if the channel is a thread of the forum channel 1288154643859243089
  if (message.channel.parentId !== "1288154643859243089") {
    return;
  }

  // Check if shorter than 50 characters
  if (message.content.length < 20) {
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

  await fetch("https://api.gitbook.com/v1/orgs/boes7AZS75MEh9rim0yC/ask", requestOptions)
    .then(async (response) => {

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

      // Print sources by first resolving the page URL with this API call, for example: https://api.gitbook.com/v1/spaces/5WZMZPWMJbwGKAiRojzu/content/page/-MfCRr6wCOhkbuMq3bZt
      // https://api.gitbook.com/v1/spaces/{space}/content/page/{page}
      // let sourcesMessage = "";
      // if (json.answer.sources?.length > 0) {
      //   for (const source of json.answer.sources) {
      //     const requestOptions = {
      //       method: "GET",
      //       headers: myHeaders,
      //       redirect: "follow"
      //     };

      //     try {
      //       console.log("source.space " + source.space);
      //       const response = await fetch(`https://api.gitbook.com/v1/spaces/${source.space}/content/page/${source.page}`, requestOptions);
      //       const text = await response.text();
      //       const json2 = JSON.parse(text);
      //       if (json2?.path) {
      //         console.log("json2.path " + json2.path);

      //         // Check if base URL is cached, otherwise get it from https://api.gitbook.com/v1/spaces/${space.space}/content -> urld.public
      //         // Use a map as cache:
      //         let foundUrl = cache.get(source.space + source.page);
      //         if(!foundUrl) {
      //           const requestOptions = {
      //             method: "GET",
      //             headers: myHeaders,
      //             redirect: "follow"
      //           };
                
      //           const response = await fetch(`https://api.gitbook.com/v1/spaces/${source.space}/content`, requestOptions);
      //           const text = await response.text();
      //           const json3 = JSON.parse(text);
      //           if (json3?.urls?.public) {
      //             console.log("json3.urls.public " + json3.urls.public);
      //             // Get before last slash, if any. 
      //             // For example to ignore https://itemsadder.devs.beer/~/revisions/ziJdZltk9ll31480VDZj/faq/identify-why-textures-are-not-show
      //             // Become https://itemsadder.devs.beer/faq/identify-why-textures-are-not-show
      //             const lastSlashIndex = json3.urls.public.lastIndexOf("~/");
      //             if (lastSlashIndex > 0) {
      //               json3.urls.public = `${json3.urls.public.substring(0, lastSlashIndex)}/`;
      //             }
      //             foundUrl = json3.urls.public + json2.path;
      //           } else {
      //             console.error("Failed to find public URL for space: ", source.space);
      //           }
      //         }

      //         cache.set(source.space + source.page, foundUrl);

      //         console.log("foundUrl " + foundUrl);
      //         sourcesMessage += `<${foundUrl}>\n`;
      //       }
      //     } catch (error) {
      //       console.error(error);
      //     }
      //   }
      // }

      // if (sourcesMessage !== "") {
      //   await message.reply("Sources:\n" + sourcesMessage);
      // }
      
      // Split the mesaage to 2000 characters and send it in messages of 2000 characters each.
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
        // Wait 200ms before sending the next message, to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 200));
        await message.reply(messages[i]);
      }
    });
});


client.login(process.env.DISCORD_BOT_TOKEN);
