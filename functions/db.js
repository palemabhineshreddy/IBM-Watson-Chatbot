function db(){

const {MongoClient} = require('mongodb')

const uri = "mongodb+srv://Abhi:password@123@freecluster.e18xp.mongodb.net/<dbname>?retryWrites=true&w=majority"
const client = new MongoClient(uri,{useNewUrlParser :true, useUnifiedTopology : true})

client.connect()
    .then(() => console.log('connected to Mongo Db'))
    .catch(err => console.log('Could not connect to Mongo DB'))



//Reading One Document
async function findOneByListingByName(client,nameOfListing){
    const result =  await client.db("approver_header").collection("approvers").findOne({ name : nameOfListing})
    if(result)
    {
        console.log(`Found a listing in the collection with the name ${nameOfListing} :`)
        console.log(result)
    }
    else{
        console.log(`No listings found with the name ${nameOfListing}`)
    }
  }

}

module.exports = db