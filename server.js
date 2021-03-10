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
let job = [];
const tv = new TradingViewAPI();
const client = new Client();
const PREFIX = "$"
const schedule = require('node-schedule');
mongo.connect( err => {
    if(err) console.log(err);
    client.login(process.env.BOTTOKEN);
});

client.on('ready', async () => {
    console.log(`bot is ready ${client.user.tag}`);

    const user = await client.users.fetch(process.env.USERID).catch(() => null);
    channel = await client.channels.cache.find(channel => channel.id === process.env.CHANNELID);
});

async function PingMe(stocks, channel, user){
    stocks.forEach(async (stock) => {
        let res = await scrapeStock(stock);
        if(res[0] === true) {
            console.log('alert triggered');
            channel.send(`<@${user.id}> position ${stock.stockName} is below stop loss of ${stock.cutloss}. Current price is ${res[1]}`);
        }
    });
}

async function scrapeStock(stock){
    try {
        let value = await tv.getTicker(stock.stockName);
        if(value.lp === undefined) {
            return false;
        }
        if(value.lp >= stock.cutloss){
            console.log(`safe ${stock.stockName}: ${value.lp}`);
            return [false, value.lp];
        }
        console.log(`cut ${stock.stockName}: ${value.lp}`);
        return [true, value.lp];
    }
    catch(err){
        console.log(err);
        return false;
    }
}

client.on('message', (message) => {
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
            let temp = /^((\$add)(\ [A-Z]*\+([0-9]*)(\.([0-9]){1,4})?)*)$/.test(message.content);
            if(temp === false){
                message.channel.send('Please follow add message format');
            }else {
                addCommand(message, args);
            };
        }

        if(command === 'clear'){
            if(userExist(message.author.id)){
                try{
                    clearAlerts(message);
                } catch(e){
                    console.log(e);
                }
            } else {
                message.channel.send("Please create stock alerts with $add");
            }
        }

        if(command === 'start'){
            sendAlerts(message);
        }

        if(command === 'stop'){
            if(job[message.author.id] !== undefined){
                job[message.author.id].cancel();
                channel.send(`<@${message.author.id}> has ended alerts`);
            } else {
                channel.send(`<@${message.author.id}> no ongoing alerts`);
            }
        }

        if(command === 'set'){
            try {
                setTimer(message, args[0]);
            } catch(e) {
                console.log(e);
            }
        }
    }
});

async function setTimer(message, min){
    let exist = await userExist(message.author.id);
    if(exist) {
        const collection = await mongo.db('stockAlerts').collection('Alerts');
        collection.updateOne({userID: message.author.id}, {$set: {interval: min}}, function(err, res){
            if(err) throw err;
            channel.send(`<@${message.author.id}> has set alert interval to ${min}`);
        });
    } else {
        channel.send(`<@${message.author.id}> please add an alert list first`);
    }
}

async function sendAlerts(message){

    let user = await getUser(message.author.id);
    let stocks = user.stockAlerts;
    if(stocks){
        channel.send(`<@${message.author.id}> has started alerts interval of ${user.interval}`);
        job[message.author.id] = schedule.scheduleJob(`${user.interval} * * * * *`, function(){
            var current = new Date();
            console.log(current);
            PingMe(stocks, channel, message.author);
        });
    } else {
        message.channel.send(`User has no stocks in alert list`);
    }

}

async function clearAlerts(data){
    const tempAlerts = null;
    const collection = await mongo.db("stockAlerts").collection("Alerts");
    collection.updateOne({userID: data.author.id}, {$set: {stockAlerts: tempAlerts}, function(err, res){
        if(err) throw err;
        console.log('cleared');
        data.channel.send(`your alerts have been cleared`);
    }});
}

async function addCommand(message, args){
    let test = args[0].split('+');
    let exist = await userExist(message.author.id);

    const data = {
        userID: message.author.id,
        username: message.author.username,
        usernumber: message.author.discriminator,
        interval: '1',
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
        try {
            updateUserAlerts(data);
        } catch(err) {
            console.log(err);
        }
    } else {
        console.log('user does not exist');
        try {
            addNewUser(data);
        } catch(err) {
            console.log(err);
        }
    }
}

async function addNewUser(data){
    const collection = await mongo.db("stockAlerts").collection("Alerts");
    collection.insertOne(data, function(err , res){
        if(err) throw err;
        console.log(`${data.username}#${data.usernumber} has been inserted with the given data`);
    });
}

async function updateUserAlerts(data){
    const collection = await mongo.db("stockAlerts").collection("Alerts");
    let user = await getUser(data.userID);
    let tempAlerts = await removeDuplicates(user.stockAlerts, data.stockAlerts);
    collection.updateOne({userID: user.userID}, {$set : {stockAlerts: tempAlerts}}, function(err, res){
        if(err) throw err;
        console.log(`${data.username} has updated alert list`, tempAlerts);
        channel.send(`<@${data.userID}> has updated alert list`);
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

async function getUser(userID) {
    const collection = await mongo.db("stockAlerts").collection("Alerts");
    const user = await collection.findOne({userID: userID});
    return user;
}

async function removeDuplicates(currentData, newData) {
    //TODO
    let tempStocks = newData;
    if(!currentData) {
        return newData;
    }

    await currentData.forEach(el => {
        let tempStock = newData.find(x => x.stockName === el.stockName);
        if(!tempStock){
            tempStocks.push(el);
        }
    });
    return tempStocks;
}

const port = process.env.PORT | 3000;
app.listen(port, async (req,res) => {
    console.log(`listening to port ${port}`);
    res.send("Bot is running, Hello!");
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