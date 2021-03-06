const express = require('express');
const app = express();
require('dotenv').config();
const { Client } = require('discord.js');
const { TradingViewAPI } = require('tradingview-scraper');
const puppeteer = require('puppeteer');
const MongoClient = require('mongodb').MongoClient;
const uri = process.env.DBURL;
const mongo =  MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
let channel;
const tv = new TradingViewAPI();
const client = new Client();
const PREFIX = "$"
const db = mongo.connect( err => {
    if(err) console.log(err);
    client.login(process.env.BOTTOKEN);
});
const stocks = [
    {
        name: 'GNUS',
        sl: '1.60',
    },
    {
        name: 'NIO',
        sl: '39.57'
    },
    {
        name: 'TSLA',
        sl: '649.33'
    },
    {
        name: 'JNJ',
        sl: '156.75'
    },
    {
        name: 'HEC',
        sl: '10.37'
    },
    {
        name: 'GBS',
        sl: '6.94'
    },
    {
        name: 'CLVR',
        sl: '12.75'
    },

];



client.on('ready', async () => {
    console.log(`bot is ready ${client.user.tag}`);

    const user = await client.users.fetch(process.env.USERID).catch(() => null);
    channel = await client.channels.cache.find(channel => channel.id === process.env.CHANNELID);

    // let timer = setInterval(() => {
    //     PingMe(stocks, channel);
    //     clearInterval(timer);
    // }, 1000);
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

client.on('message', (message) => {
    console.log('message');
    if(message.author.bot === true ) return;

    if(message.content.startsWith(PREFIX)) {
        // keep this in mind
        const [command, ...args] = message.content.substring(PREFIX.length).split(/\s+/);
        console.log(`this is command ${command}`);
        if(command === 'delete') {
            console.log('coommand is delete');
            channel.bulkDelete(100)
            .then(messages => console.log(`Bulk deleted ${messages.size} messages`))
            .catch(console.error); 
        }

        if(command === 'add') {
            console.log('command is add');
            addCommand(message, args);
        }
    }
});

async function addCommand(message, args){
    console.log(args);
    let test = args[0].split('+');
    console.log(test);
    let exist = await userExist(message.author.id);

    const data = {
        userID: message.author.id,
        username: message.author.username,
        usernumber: message.author.discriminator,
        stockAlerts: [
        ]
    }

    await args.forEach(stock => {
        let temp = stock.split('+');
        let obj = {
            stockName: temp[0],
            cutloss: temp[1]
        }
        data.stockAlerts.push(obj);
    });

    
    if(exist){
        console.log('user exist');
    } else {
        console.log('user does not exist');
        addNewUser(data);
    }
}

async function addNewUser(data){
    console.log(data);
    const collection = await mongo.db("stockAlerts").collection("Alerts");
    collection.insertOne(data, function(err , res){
        if(err) throw err;
        console.log(`${data.username}#${data.usernumber} has been inserted with the given data`);
    });
}



async function userExist(userID){
    const collection = await mongo.db("stockAlerts").collection("Alerts");
    const user = await collection.findOne({userID: userID});
    if(user){
        return true;
    } else {
        return false;
    }

}


const port = process.env.PORT | 3000;
app.listen(port, async (req,res) => {
    console.log(`listening to port ${port}`);
});

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