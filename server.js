const express = require('express');
const app = express();
require('dotenv').config();
const { Client } = require('discord.js');
const { TradingViewAPI } = require('tradingview-scraper');
const puppeteer = require('puppeteer');

const tv = new TradingViewAPI();
const client = new Client();
const PREFIX = "$"
const stocks = [
    {
        name: 'GNUS',
        sl: '1.60',
    },
    {
        name: 'NIO',
        sl: '41.34'
    },
    {
        name: 'TSLA',
        sl: '650'
    },
    {
        name: 'JNJ',
        sl: '159'
    },
    {
        name: 'HEC',
        sl: '10.15'
    },
    {
        name: 'GBS',
        sl: '7.60'
    },
    {
        name: 'CLVR',
        sl: '13.15'
    },

];

client.login(process.env.BOTTOKEN);

client.on('ready', async () => {
    console.log(`bot is ready ${client.user.tag}`);

    const user = await client.users.fetch(process.env.USERID).catch(() => null);
    const channel = await client.channels.cache.find(channel => channel.id === process.env.CHANNELID);
    
    let timer = setInterval(() => {
        PingMe(stocks, channel);
        clearInterval(timer);
    }, 1000);
});

async function PingMe(stocks, channel){
    console.log(stocks);
    stocks.forEach(async (stock) => {
        console.log(stock);
        let res = await scrapeStock(stock);
        if(res[0] === true) {
            console.log('alert triggered');
            channel.send(`${stock.name} is below stop loss of ${stock.sl}. Current price is ${res[1]}`);
        }
    });
}

async function scrapeStock(stock){
    try {
        let value = await tv.getTicker(stock.name);
        
        if(value.lp === undefined) {
            return false;
        }
        if(value.lp >= stock.sl){
            console.log(`safe ${stock.name}: ${value.lp}`);
            return [false, value.lp];
        }
        console.log(`cut ${stock.name}: ${value.lp}`);
        return [true, value.lp];
    }
    catch(err){
        console.log('error');
        return false;
    }
}

// google scrape old imp
// async function scrapeStock(stock) {

//     try {
//         const browser = await puppeteer.launch();
//         const page = await browser.newPage();
    
//         await page.goto('https://www.google.com/');
//         await page.click('[name = q]');
//         await page.keyboard.type(stock.name + ' stock');
//         await page.keyboard.press('Enter');
//         await page.waitForSelector('[jsname = vWLAgc]');
//         let element = await page.$('[jsname = vWLAgc]');
//         let value = await page.evaluate(el => el.textContent, element);
//         console.log(stock.name, value);
//         await browser.close();
//         if(value >= stock.sl){
//             return [false, value];
//         }
//         return [true, value];
//     }
//     catch(err){
//         console.log('error');
//         return false;
//     }
// }

client.on('message', (message) => {
    if(message.author.bot === true ) return;
    console.log(client.channels.cache, 'these are channels');

    if(message.content.startsWith(PREFIX)) {
        // keep this in mind
        const [commands, ...args] = message.content.substring(PREFIX.length).split(/\s+/);
        
        if(commands === 'add') {
            args.forEach(el => {
                // message.channel.send(`User ${el} has been kicked`); 
                // TODO add stock to watchlist
            });
        }
    }
});


const port = process.env.PORT | 3000;
app.listen(port, (req,res) => {
    console.log(`listening to port ${port}`);
});