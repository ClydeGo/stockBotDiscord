const express = require('express');
const app = express();
require('dotenv').config();
const { Client, Channel } = require('discord.js');

const client = new Client();
const PREFIX = "$"

client.login(process.env.BOTTOKEN);

client.on('ready', async () => {
    console.log(`bot is ready ${client.user.tag}`);

    const user = await client.users.fetch(process.env.USERID).catch(() => null);

    PingMe('TSLA', user);
});

async function PingMe(stock, user){
    // code to 
    user.send(`${stock} is crashing gotta take a look`);
}

client.on('message', (message) => {
    if(message.author.bot === true ) return;
    console.log(client.users.cache);

    if(message.content.startsWith(PREFIX)) {
        // keep this in mind
        const [commands, ...args] = message.content.substring(PREFIX.length).split(/\s+/);
        
        if(commands === 'kick') {
            args.forEach(el => {
                message.channel.send(`User ${el} has been kicked`);
                
            });
        }
    }
});


const port = process.env.PORT | 3000;
app.listen(port, (req,res) => {
    console.log(`listening to port ${port}`);
});